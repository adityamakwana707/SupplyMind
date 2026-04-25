import { Metadata } from 'next';
import TransportClient from './TransportClient';

export const metadata: Metadata = {
  title: 'Driver Portal | SupplyMind',
  description: 'View assigned shipments and access the driver PWA interface.',
};

export default function TransportPage() {
  return <TransportClient />;
}
