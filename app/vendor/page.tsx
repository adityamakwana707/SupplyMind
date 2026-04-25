import VendorClient from './VendorClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lifeline Pharma Analytics | Vendor Portal',
  description: 'Manage clinical supply chains and monitor reliability with AI intelligence.',
};

export default function VendorPage() {
  return <VendorClient />;
}
