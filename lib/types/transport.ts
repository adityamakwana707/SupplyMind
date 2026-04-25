export type VehicleType = 'TRUCK' | 'FERRY' | 'AIR' | 'RAIL';
export type PartnerType = 'TIED' | 'GIG';
export type PartnerStatus = 'AVAILABLE' | 'ON_JOB' | 'OFFLINE';

export interface TransportPartner {
  id: string;
  businessId: string | null;
  partnerType: PartnerType;
  name: string;
  phone: string;
  vehicleTypes: VehicleType[];
  vehicleCapacityKg: number;
  licenseNumber: string;
  currentLat: number | null;
  currentLng: number | null;
  status: PartnerStatus;
  reliabilityScore: number;
  hoursLoggedToday: number;
  lastRestAt: Date | null;
  createdAt: Date;
}
