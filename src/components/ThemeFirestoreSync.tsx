import { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Bridges ThemeContext (which sits above AuthProvider) with Firestore so the
 * user's theme preference syncs across sessions and devices. Mounts inside
 * AuthProvider where useAuth is available.
 */
const ThemeFirestoreSync: React.FC = () => {
  const { uid } = useAuth();
  const { theme, setTheme } = useTheme();
  const hydratedRef = useRef(false);

  // Hydrate from Firestore on sign-in
  useEffect(() => {
    if (!uid) {
      hydratedRef.current = false;
      return;
    }
    hydratedRef.current = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
        const t = (snap.data() as { theme?: 'light' | 'dark' } | undefined)?.theme;
        if (t === 'light' || t === 'dark') setTheme(t);
      } catch (e) {
        console.warn('[Theme] hydrate failed', e);
      } finally {
        hydratedRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Persist on subsequent changes (user-initiated theme toggle only).
  useEffect(() => {
    if (!uid || !hydratedRef.current) return;
    console.log('[FirestoreWrite] trigger=theme-change → users/%s/settings/preferences', uid);
    setDoc(doc(db, 'users', uid, 'settings', 'preferences'), { theme }, { merge: true })
      .catch((e) => console.warn('[Theme] save failed', e));
  }, [theme, uid]);

  return null;
};

export default ThemeFirestoreSync;
