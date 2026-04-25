export class ScanDeduplicator {
  private readonly lastScanByShipment = new Map<string, number>();
  private readonly windowMs = 10 * 60 * 1000;

  canScan(shipmentId: string): boolean {
    const now = Date.now();
    const last = this.lastScanByShipment.get(shipmentId);
    if (!last) return true;

    const elapsedMs = now - last;
    if (elapsedMs >= this.windowMs) return true;

    const mins = Math.max(0, Math.floor(elapsedMs / 60000));
    console.warn(`[Dedup] ${shipmentId} scanned ${mins}m ago — skipping duplicate scan`);
    return false;
  }

  markScanned(shipmentId: string): void {
    this.lastScanByShipment.set(shipmentId, Date.now());
  }

  clear(shipmentId: string): void {
    this.lastScanByShipment.delete(shipmentId);
  }
}

export const scanDeduplicator = new ScanDeduplicator();

