import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useMonitoring } from './MonitoringContext';

export type TrustedPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  position: TrustedPosition;
  addedAt?: Date;
}

interface TrustedCircleContextType {
  contacts: TrustedContact[];
  contactByPosition: Record<TrustedPosition, TrustedContact | undefined>;
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  toggleActive: () => void;
  addContact: (data: { name: string; phone: string; position: TrustedPosition }) => Promise<void>;
  removeContact: (position: TrustedPosition) => Promise<void>;
}

const TrustedCircleContext = createContext<TrustedCircleContextType | null>(null);

export const useTrustedCircle = () => {
  const ctx = useContext(TrustedCircleContext);
  if (!ctx) throw new Error('useTrustedCircle must be used within TrustedCircleProvider');
  return ctx;
};

export const TrustedCircleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid } = useAuth();
  const { currentEmergency } = useMonitoring();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Subscribe to Firestore subcollection
  useEffect(() => {
    if (!uid) {
      setContacts([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'trustedCircle'),
      (snap) => {
        const next: TrustedContact[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<TrustedContact> & { addedAt?: { toDate?: () => Date } };
          if (data.name && data.phone && data.position) {
            next.push({
              id: d.id,
              name: data.name,
              phone: data.phone,
              position: data.position,
              addedAt: data.addedAt?.toDate ? data.addedAt.toDate() : undefined,
            });
          }
        });
        setContacts(next.slice(0, 4));
      },
      (err) => console.warn('[TrustedCircle] snapshot error', err),
    );
    return () => unsub();
  }, [uid]);

  // Auto-activate on distress signal; deactivate when resolved
  useEffect(() => {
    if (currentEmergency !== 'none') {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [currentEmergency]);

  const contactByPosition = {
    topLeft: contacts.find((c) => c.position === 'topLeft'),
    topRight: contacts.find((c) => c.position === 'topRight'),
    bottomLeft: contacts.find((c) => c.position === 'bottomLeft'),
    bottomRight: contacts.find((c) => c.position === 'bottomRight'),
  };

  const addContact = useCallback(
    async ({ name, phone, position }: { name: string; phone: string; position: TrustedPosition }) => {
      if (!uid) throw new Error('Not authenticated');
      if (contacts.length >= 4 && !contactByPosition[position]) {
        throw new Error('Maximum 4 contacts in Trusted Circle');
      }
      await setDoc(doc(db, 'users', uid, 'trustedCircle', position), {
        name: name.trim(),
        phone: phone.trim(),
        position,
        addedAt: serverTimestamp(),
      });
    },
    [uid, contacts.length, contactByPosition],
  );

  const removeContact = useCallback(
    async (position: TrustedPosition) => {
      if (!uid) return;
      await deleteDoc(doc(db, 'users', uid, 'trustedCircle', position));
    },
    [uid],
  );

  const activate = useCallback(() => setIsActive(true), []);
  const deactivate = useCallback(() => setIsActive(false), []);
  const toggleActive = useCallback(() => setIsActive((v) => !v), []);

  return (
    <TrustedCircleContext.Provider
      value={{
        contacts,
        contactByPosition,
        isActive,
        activate,
        deactivate,
        toggleActive,
        addContact,
        removeContact,
      }}
    >
      {children}
    </TrustedCircleContext.Provider>
  );
};
