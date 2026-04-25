export class ScanLock {
  private readonly inFlight = new Set<string>();

  acquire(shipmentId: string): boolean {
    if (this.inFlight.has(shipmentId)) {
      console.warn(`[Lock] ${shipmentId} scan already in progress — skipping`);
      return false;
    }
    this.inFlight.add(shipmentId);
    return true;
  }

  release(shipmentId: string): void {
    this.inFlight.delete(shipmentId);
  }
}

export const scanLock = new ScanLock();

