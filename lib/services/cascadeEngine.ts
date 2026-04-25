import { adminDb } from '../firebase/admin';
import { generateDecision } from './vertexAiService';
import { logEvent } from './loggerService';
import { vertexAiLimit } from '@/lib/rateLimit';

interface ShipmentCargoLine {
  productId: string;
  quantity: number;
}

interface DeliveryLine {
  productId: string;
  quantity: number;
}

interface AffectedProduct {
  sku: string;
  name: string;
  productId: string;
  currentStock: number;
  projectedOnArrival: number;
  reorderLevel: number;
}

interface OrderAtRisk {
  orderId: string;
  customer: string;
  value: number;
  deadline: string;
}

const toDate = (value: any, fieldName: string): Date => {
  if (!value) {
    throw new Error(`Missing required date field: ${fieldName}`);
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value for field: ${fieldName}`);
  }
  return parsed;
};

const toNumber = (value: any): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const runCascadeSimulation = async (shipmentId: string, riskScore: number, delayEstimateHours: number) => {
    const shipmentDoc = await adminDb.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
      throw new Error(`Cascade simulation failed: shipment ${shipmentId} not found.`);
    }
    const shipment = shipmentDoc.data() as any;
    const destinationWarehouseId = shipment?.destination?.warehouseId;
    if (!destinationWarehouseId) {
      throw new Error(`Cascade simulation failed: shipment ${shipmentId} is missing destination warehouse.`);
    }

    const shipmentEta = toDate(shipment?.eta, 'shipment.eta');
    const projectedArrival = new Date(shipmentEta.getTime() + delayEstimateHours * 3600000);
    const now = new Date();
    const cargoLines = (shipment?.cargo || []) as ShipmentCargoLine[];
    const affectedProducts: AffectedProduct[] = [];
    const affectedProductIds = new Set<string>();

    for (const cargoLine of cargoLines) {
      const productId = cargoLine.productId;
      if (!productId) {
        throw new Error(`Cascade simulation failed: shipment ${shipmentId} has a cargo line without productId.`);
      }

      const productDoc = await adminDb.collection('products').doc(productId).get();
      if (!productDoc.exists) {
        throw new Error(`Cascade simulation failed: product ${productId} not found for shipment ${shipmentId}.`);
      }
      const product = productDoc.data() as any;
      const reorderLevel = toNumber(product?.reorderLevel);

      let stockLevelsSnap: FirebaseFirestore.QuerySnapshot;
      try {
        stockLevelsSnap = await adminDb.collection('stockLevels')
          .where('warehouseId', '==', destinationWarehouseId)
          .where('productId', '==', productId)
          .get();
      } catch (error: any) {
        throw new Error(`Cascade simulation failed: unable to query stockLevels for product ${productId} at warehouse ${destinationWarehouseId}.`);
      }
      const currentStock = stockLevelsSnap.docs.reduce((sum, doc) => sum + toNumber(doc.data()?.quantity), 0);

      let movementQueryByWarehouse: FirebaseFirestore.QuerySnapshot;
      try {
        movementQueryByWarehouse = await adminDb.collection('stockMovements')
          .where('warehouseId', '==', destinationWarehouseId)
          .where('productId', '==', productId)
          .where('type', '==', 'DELIVERY')
          .where('createdAt', '>=', now)
          .where('createdAt', '<=', projectedArrival)
          .get();
      } catch (error: any) {
        throw new Error(`Cascade simulation failed: unable to query stockMovements for product ${productId} using warehouseId at warehouse ${destinationWarehouseId}.`);
      }

      let movementQueryByWarehouseFrom: FirebaseFirestore.QuerySnapshot;
      try {
        movementQueryByWarehouseFrom = await adminDb.collection('stockMovements')
          .where('warehouseFromId', '==', destinationWarehouseId)
          .where('productId', '==', productId)
          .where('type', '==', 'DELIVERY')
          .where('createdAt', '>=', now)
          .where('createdAt', '<=', projectedArrival)
          .get();
      } catch (error: any) {
        throw new Error(`Cascade simulation failed: unable to query stockMovements for product ${productId} using warehouseFromId at warehouse ${destinationWarehouseId}.`);
      }

      const uniqueMovementDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      movementQueryByWarehouse.docs.forEach((doc) => uniqueMovementDocs.set(doc.id, doc));
      movementQueryByWarehouseFrom.docs.forEach((doc) => uniqueMovementDocs.set(doc.id, doc));

      const expectedOutflow = Array.from(uniqueMovementDocs.values()).reduce((sum, movementDoc) => {
        const movement = movementDoc.data() as any;
        const quantityAbs = Math.abs(toNumber(movement?.change ?? movement?.quantity));
        return sum + quantityAbs;
      }, 0);

      const projectedOnArrival = currentStock - expectedOutflow;

      if (projectedOnArrival < reorderLevel) {
        affectedProductIds.add(productId);
        affectedProducts.push({
          sku: product?.sku || 'UNKNOWN_SKU',
          name: product?.name || 'Unknown Product',
          productId,
          currentStock,
          projectedOnArrival,
          reorderLevel
        });
      }
    }

    const ordersAtRisk: OrderAtRisk[] = [];
    let totalRevenueAtRisk = 0;

    if (affectedProductIds.size > 0) {
      let pendingDeliveriesSnap: FirebaseFirestore.QuerySnapshot;
      try {
        pendingDeliveriesSnap = await adminDb.collection('deliveries')
          .where('warehouseId', '==', destinationWarehouseId)
          .where('status', 'in', ['DRAFT', 'WAITING', 'READY'])
          .get();
      } catch (error: any) {
        throw new Error(`Cascade simulation failed: unable to query deliveries for warehouse ${destinationWarehouseId}.`);
      }

      const productPriceCache = new Map<string, number>();
      const getProductPrice = async (productId: string): Promise<number> => {
        if (productPriceCache.has(productId)) {
          return productPriceCache.get(productId) as number;
        }
        const productDoc = await adminDb.collection('products').doc(productId).get();
        if (!productDoc.exists) {
          throw new Error(`Cascade simulation failed: product ${productId} not found while pricing delivery lines.`);
        }
        const productData = productDoc.data() as any;
        const productPrice = toNumber(productData?.price);
        productPriceCache.set(productId, productPrice);
        return productPrice;
      };

      for (const deliveryDoc of pendingDeliveriesSnap.docs) {
        const delivery = deliveryDoc.data() as any;
        const deliveryLines = (delivery?.lines || []) as DeliveryLine[];
        const hasAffectedProduct = deliveryLines.some((line) => affectedProductIds.has(line.productId));
        if (!hasAffectedProduct) {
          continue;
        }

        const customer = typeof delivery.customerName === 'string' && delivery.customerName.trim().length > 0
          ? delivery.customerName
          : 'Unknown Customer';

        let deadline: Date;
        if (delivery.requiredBy) {
          deadline = toDate(delivery.requiredBy, 'delivery.requiredBy');
        } else {
          const createdAt = toDate(delivery.createdAt, 'delivery.createdAt');
          deadline = new Date(createdAt.getTime() + 7 * 24 * 3600000);
        }

        let orderValue = 0;
        for (const line of deliveryLines) {
          const productPrice = await getProductPrice(line.productId);
          orderValue += toNumber(line.quantity) * productPrice;
        }

        ordersAtRisk.push({
          orderId: deliveryDoc.id,
          customer,
          value: orderValue,
          deadline: deadline.toISOString()
        });
        totalRevenueAtRisk += orderValue;
      }
    }

    if (ordersAtRisk.length === 0) return null;

    const cascadePayload = {
       shipmentId,
       triggerRiskScore: riskScore,
       delayEstimateHours,
       affectedWarehouseId: destinationWarehouseId,
       affectedProducts,
       ordersAtRisk,
       totalRevenueAtRisk,
       cascadeDepth: 1
    };

    // 4. Generate Mitigation Options with Google Vertex AI
    let aiOptions: any[] = [];
    let aiGenerated = true;
    let fallbackReason: string | null = null;
    try {
        const prompt = `
            You are an advanced Supply Chain Intelligence Agent. 
            A shipment (${shipmentId}) containing critical goods has hit a bottleneck (Risk Score: ${riskScore}) causing a delay of ${delayEstimateHours} hours.
            This will cascade and cause stockouts for ${affectedProducts.length} unique products, putting ${ordersAtRisk.length} delivery orders at risk, totaling ₹${totalRevenueAtRisk} in revenue.

            Generate 3 ranked mitigation options as valid JSON.
            Structure MUST precisely match:
            [
              {
                "type": "REROUTE" | "REDISTRIBUTE" | "BACKUP_SUPPLIER" | "GIG_TRANSPORT",
                "label": "Brief Action Title",
                "summary": "Human readable explanation of why this fixes the issue and what happens.",
                "timeSavedMinutes": number,
                "costPremium": number,
                "confidenceScore": number (0-100)
              }
            ]
            Return strictly the JSON array. Make the REROUTE option the highest confidence.
        `;

        await logEvent('INFO', `Requesting Vertex AI Decision for Shipment ${shipmentId}`, { riskScore });
        const text = await vertexAiLimit.waitAndCall(() => generateDecision(prompt));
        if (text === null) {
          aiGenerated = false;
          fallbackReason = 'rate_limited';
          throw new Error('Vertex AI rate limited');
        }
        
        if (text) {
           const jsonMatch = text.match(/\[.*\]/s);
           if (jsonMatch) {
               aiOptions = JSON.parse(jsonMatch[0]);
               await logEvent('INFO', `Vertex AI Decision Generated Successfully`, { shipmentId, optionsCount: aiOptions.length });
           }
        }
    } catch(err: any) {
        await logEvent('ERROR', `Vertex AI Generation Failed`, { shipmentId, error: err.message });
        // Fallback
        if (aiGenerated) {
          aiGenerated = false;
          fallbackReason = fallbackReason || 'generation_failed';
        }
        aiOptions = [{
           type: 'REROUTE', label: 'Reroute via Highway', summary: 'Emergency fall back reroute computed.',
           timeSavedMinutes: Math.floor(delayEstimateHours*60) / 2, costPremium: 500, confidenceScore: 85
        }];
    }

    // 5. Build Decision Card
    const cardRef = adminDb.collection('decisionCards').doc();
    await cardRef.set({
        businessId: shipment?.businessId || null,
        shipmentId,
        cascadePayload,
        options: aiOptions,
        aiGenerated,
        fallbackReason,
        recommendedOptionIndex: 0,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 3600000).toISOString()
    });

    return cardRef.id;
};
