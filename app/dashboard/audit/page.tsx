import AuditClient from './AuditClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Network Flight Recorder | SupplyMind AI',
  description: 'Chronological audit trail of all AI-driven decisions and autonomous risk interventions.',
};

export default function AuditPage() {
  return <AuditClient />;
}
