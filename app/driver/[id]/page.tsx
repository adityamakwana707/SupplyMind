import DriverClient from './DriverClient';
import { Metadata } from 'next';
import { Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Driver Dispatch | SupplyMind AI',
  description: 'Mobile interface for real-time shipment tracking and HOS management.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverClient shipmentId={id} />;
}
