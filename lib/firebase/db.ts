import { adminDb, adminAuth } from './admin';

// Types
export type Role = 'ADMIN' | 'OPERATOR' | 'MANAGER' | 'VENDOR' | 'TRANSPORT' | null;
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  
  assignedWarehouses: string[]; 
  primaryWarehouseId: string | null;
  
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export interface Warehouse {
  id?: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const mapDate = (data: any) => {
  if (!data) return data;
  const newData = { ...data };
  if (newData.createdAt && newData.createdAt.toDate) {
    newData.createdAt = newData.createdAt.toDate();
  }
  if (newData.updatedAt && newData.updatedAt.toDate) {
    newData.updatedAt = newData.updatedAt.toDate();
  }
  return newData;
};

const sanitizeFirestoreData = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, item]) => {
      const sanitizedItem = sanitizeFirestoreData(item);
      if (sanitizedItem !== undefined) {
        acc[key] = sanitizedItem;
      }
      return acc;
    }, {} as Record<string, any>);
  }

  return value;
};

// Generic get
export async function getDocument<T>(collection: string, id: string): Promise<T | null> {
  const doc = await adminDb.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, _id: doc.id, ...mapDate(doc.data()) } as T;
}

// Generic get all
export async function getCollection<T>(collection: string): Promise<T[]> {
  const snapshot = await adminDb.collection(collection).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...mapDate(doc.data()) } as T));
}

// Generic add
export async function addDocument<T>(collection: string, data: any): Promise<T> {
  const now = new Date();
  const payload = sanitizeFirestoreData({
    ...data,
    createdAt: now,
    updatedAt: now
  });
  const docRef = await adminDb.collection(collection).add(payload);
  const doc = await docRef.get();
  return { id: doc.id, ...mapDate(doc.data()) } as T;
}

// Generic update
export async function updateDocument<T>(collection: string, id: string, data: any): Promise<T | null> {
  const docRef = adminDb.collection(collection).doc(id);
  const payload = sanitizeFirestoreData({
    ...data,
    updatedAt: new Date()
  });
  await docRef.update(payload);
  const doc = await docRef.get();
  return { id: doc.id, ...mapDate(doc.data()) } as T;
}

// Generic delete
export async function deleteDocument(collection: string, id: string): Promise<void> {
  await adminDb.collection(collection).doc(id).delete();
}

// Custom specialized query (Example)
export async function queryCollection<T>(collection: string, field: string, operator: any, value: any): Promise<T[]> {
  const snapshot = await adminDb.collection(collection).where(field, operator, value).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...mapDate(doc.data()) } as T));
}
