'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface SessionData {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    status?: string | null;
    assignedWarehouses?: string[];
    primaryWarehouseId?: string | null;
  };
}

interface SessionContextType {
  data: SessionData | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const SessionContext = createContext<SessionContextType>({ data: null, status: 'loading' });

export const useSession = () => useContext(SessionContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionContextType>({ data: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async (firebaseUser: any) => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const serverSession = await response.json();
          // Ignore stale server cookies that point to a different user.
          if (!cancelled && serverSession?.user?.id === firebaseUser.uid) {
            setSession({
              data: {
                user: {
                  id: serverSession?.user?.id || firebaseUser.uid,
                  name: serverSession?.user?.name ?? firebaseUser.displayName,
                  email: serverSession?.user?.email ?? firebaseUser.email,
                  role: serverSession?.user?.role ?? null,
                  status: serverSession?.user?.status ?? null,
                  assignedWarehouses: serverSession?.user?.assignedWarehouses || [],
                  primaryWarehouseId: serverSession?.user?.primaryWarehouseId || null,
                }
              },
              status: 'authenticated'
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to hydrate session role from server:', error);
      }

      try {
        // Fallback to Firestore profile for the currently authenticated Firebase user.
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;

        if (!cancelled) {
          setSession({
            data: {
              user: {
                id: firebaseUser.uid,
                name: userData?.name ?? firebaseUser.displayName,
                email: userData?.email ?? firebaseUser.email,
                role: userData?.role ?? null,
                status: userData?.status ?? null,
                assignedWarehouses: userData?.assignedWarehouses || [],
                primaryWarehouseId: userData?.primaryWarehouseId || null,
              }
            },
            status: 'authenticated'
          });
        }
        return;
      } catch (error) {
        console.error('Failed to read Firestore user profile:', error);
      }

      if (!cancelled) {
        setSession({
          data: {
            user: {
              id: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              role: null,
              status: null,
              assignedWarehouses: [],
              primaryWarehouseId: null,
            }
          },
          status: 'authenticated'
        });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await hydrateSession(firebaseUser);
      } else {
        if (!cancelled) {
          setSession({ data: null, status: 'unauthenticated' });
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
