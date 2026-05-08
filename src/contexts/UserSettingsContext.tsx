import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

export type DndMode = 'silent' | 'vibrate';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface UserSettings {
  activeListening: boolean;
  dnd: { enabled: boolean; start: string; end: string; mode: DndMode };
  notifications: {
    master: boolean;
    wellness: boolean;
    lowParticipation: boolean;
    contextSuggestions: boolean;
  };
  textSize: TextSize;
  dataRetentionDays: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  activeListening: true,
  dnd: { enabled: false, start: '22:00', end: '07:00', mode: 'silent' },
  notifications: {
    master: true,
    wellness: true,
    lowParticipation: true,
    contextSuggestions: true,
  },
  textSize: 'normal',
  dataRetentionDays: 30,
};

const CACHE_KEY = (uid: string) => `mud:settings:${uid}`;

const mergeSettings = (base: UserSettings, patch: Partial<UserSettings>): UserSettings => ({
  ...base,
  ...patch,
  dnd: { ...base.dnd, ...(patch.dnd || {}) },
  notifications: { ...base.notifications, ...(patch.notifications || {}) },
});

const readCached = (uid: string | null): UserSettings => {
  if (!uid || typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(uid));
    if (!raw) return DEFAULT_USER_SETTINGS;
    return mergeSettings(DEFAULT_USER_SETTINGS, JSON.parse(raw));
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
};

interface UserSettingsContextValue {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => readCached(uid));

  // Background hydrate from Firestore once per uid — never blocks UI.
  useEffect(() => {
    if (!uid) {
      setSettings(DEFAULT_USER_SETTINGS);
      return;
    }
    setSettings(readCached(uid));
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
        if (cancelled) return;
        if (snap.exists()) {
          const next = mergeSettings(DEFAULT_USER_SETTINGS, snap.data() as Partial<UserSettings>);
          setSettings(next);
          try {
            window.localStorage.setItem(CACHE_KEY(uid), JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.warn('[UserSettings] background load failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => {
      let next: UserSettings = settings;
      setSettings((prev) => {
        next = typeof patch === 'function' ? patch(prev) : mergeSettings(prev, patch);
        return next;
      });
      if (uid) {
        try {
          window.localStorage.setItem(CACHE_KEY(uid), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        try {
          await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), next, { merge: true });
        } catch (err) {
          console.error('[UserSettings] persist failed', err);
        }
      }
    },
    [uid, settings],
  );

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettings must be used within a UserSettingsProvider');
  return ctx;
}
