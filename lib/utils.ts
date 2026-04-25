import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: any): string {
  if (!input) return '-';
  
  let date: Date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' || typeof input === 'number') {
    date = new Date(input);
  } else if (input && typeof input.toDate === 'function') {
    date = input.toDate();
  } else if (input && input._seconds) {
    date = new Date(input._seconds * 1000);
  } else if (input && input.seconds) {
    date = new Date(input.seconds * 1000);
  } else {
    date = new Date(input);
  }

  if (!date.getTime || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateReferenceNumber(
  prefix: string,
  warehouseCode: string,
  direction: string,
  count: number
): string {
  return `${prefix}-${warehouseCode}-${direction}-${String(count).padStart(4, '0')}`;
}
