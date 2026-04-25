import { adminDb } from '../firebase/admin';
import * as admin from 'firebase-admin';

export async function increaseStock(
  productId: string,
  warehouseId: string,
  locationId: string | undefined,
  quantity: number,
  t?: admin.firestore.Transaction
) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive for increaseStock');
  }

  const stockLevelsRef = adminDb.collection('stockLevels');
  let query = stockLevelsRef
    .where('productId', '==', productId)
    .where('warehouseId', '==', warehouseId);

  if (locationId) {
    query = query.where('locationId', '==', locationId);
  }

  const snapshot = t ? await t.get(query) : await query.get();

  if (snapshot.empty) {
    // Create new stock level
    const newStockLevel = {
      productId,
      warehouseId,
      locationId: locationId || null,
      quantity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (t) {
      const newRef = stockLevelsRef.doc();
      t.set(newRef, newStockLevel);
      return { ...newStockLevel, _id: newRef.id, id: newRef.id };
    } else {
      const docRef = await stockLevelsRef.add(newStockLevel);
      return { ...newStockLevel, _id: docRef.id, id: docRef.id };
    }
  } else {
    // Update existing
    const doc = snapshot.docs[0];
    const newQuantity = (doc.data().quantity || 0) + quantity;
    
    if (t) {
      t.update(doc.ref, {
        quantity: admin.firestore.FieldValue.increment(quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { ...doc.data(), quantity: newQuantity, _id: doc.id, id: doc.id };
    } else {
      await doc.ref.update({
        quantity: admin.firestore.FieldValue.increment(quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      const updated = await doc.ref.get();
      return { ...updated.data(), _id: updated.id, id: updated.id };
    }
  }
}

export async function decreaseStock(
  productId: string,
  warehouseId: string,
  locationId: string | undefined,
  quantity: number,
  t?: admin.firestore.Transaction
) {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive for decreaseStock');
  }

  const stockLevelsRef = adminDb.collection('stockLevels');
  let query = stockLevelsRef
    .where('productId', '==', productId)
    .where('warehouseId', '==', warehouseId);

  if (locationId) {
    query = query.where('locationId', '==', locationId);
  }

  const snapshot = t ? await t.get(query) : await query.get();

  if (snapshot.empty) {
    throw new Error('Insufficient stock: no stock record found');
  }

  const doc = snapshot.docs[0];
  const currentQuantity = doc.data().quantity || 0;

  if (currentQuantity < quantity) {
    throw new Error(`Insufficient stock: have ${currentQuantity}, requested ${quantity}`);
  }

  const newQuantity = currentQuantity - quantity;

  if (t) {
    t.update(doc.ref, {
      quantity: admin.firestore.FieldValue.increment(-quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { ...doc.data(), quantity: newQuantity, _id: doc.id, id: doc.id };
  } else {
    await doc.ref.update({
      quantity: admin.firestore.FieldValue.increment(-quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const updated = await doc.ref.get();
    return { ...updated.data(), _id: updated.id, id: updated.id };
  }
}

export async function checkStockAvailability(productId: string, warehouseId: string, locationId: string | undefined, requiredQuantity: number, t?: admin.firestore.Transaction) {
  const stockLevelsRef = adminDb.collection('stockLevels');
  let query = stockLevelsRef
    .where('productId', '==', productId)
    .where('warehouseId', '==', warehouseId);

  if (locationId) {
    query = query.where('locationId', '==', locationId);
  }

  const snapshot = t ? await t.get(query) : await query.get();

  if (snapshot.empty) {
    return { isAvailable: false, currentStock: 0, shortage: requiredQuantity };
  }

  const currentQuantity = snapshot.docs[0].data().quantity || 0;
  return {
    isAvailable: currentQuantity >= requiredQuantity,
    currentStock: currentQuantity,
    shortage: currentQuantity >= requiredQuantity ? 0 : requiredQuantity - currentQuantity
  };
}

export async function getTotalStock(productId: string, warehouseId: string, t?: admin.firestore.Transaction) {
  const stockLevelsRef = adminDb.collection('stockLevels')
    .where('productId', '==', productId)
    .where('warehouseId', '==', warehouseId);

  const snapshot = t ? await t.get(stockLevelsRef) : await stockLevelsRef.get();
  
  if (snapshot.empty) return 0;
  
  return snapshot.docs.reduce((sum, doc) => sum + (doc.data().quantity || 0), 0);
}

export async function updateStock(productId: string, warehouseId: string, locationId: string | undefined, quantityChange: number, t?: admin.firestore.Transaction) {
  if (quantityChange > 0) return increaseStock(productId, warehouseId, locationId, quantityChange, t);
  if (quantityChange < 0) return decreaseStock(productId, warehouseId, locationId, Math.abs(quantityChange), t);
}
const stockService = { increaseStock, decreaseStock, checkStockAvailability, getTotalStock, updateStock };
export { stockService };
