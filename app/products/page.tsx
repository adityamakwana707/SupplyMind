import ProductsClient from './ProductsClient';

export const metadata = {
  title: 'Products | SupplyMind AI',
  description: 'Manage your global product catalog and inventory levels.',
};

export default function ProductsPage() {
  return <ProductsClient />;
}
