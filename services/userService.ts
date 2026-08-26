import { 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { auth, db, googleProvider } from "./firebaseSetup";
import { UserProfile, UserRole, SubscriptionTier, TalentSubmission, Transaction, Product, Program, StudioSettings } from "../types";

export const USERS_COLLECTION = "users";
const SETTINGS_COLLECTION = "settings";
const STUDIO_SETTINGS_DOC = "studio";

const SUBMISSIONS_COLLECTION = "submissions";
const TRANSACTIONS_COLLECTION = "transactions";
const PROGRAMS_COLLECTION = "programs";
const PRODUCTS_COLLECTION = "products";

// ── Friendly error translator ─────────────────────────────────────────────
// Firebase Auth returns opaque codes. Translate them to plain English so the
// user knows what to do — and so the developer can debug from the message.
function friendlyAuthError(e: any): Error {
  const code = e?.code || '';
  const msg = e?.message || 'Authentication failed';
  const map: Record<string, string> = {
    'auth/api-key-not-valid': '🚨 FIREBASE API KEY REVOKED — Google revoked the deployed API key. Go to Google Cloud Console → rotate + restrict the key → update Firebase env vars → redeploy. See SECURITY_DOCTRINE.md.',
    'auth/operation-not-allowed': '🚨 SIGN-IN METHOD DISABLED — Email/Password and/or Google sign-in is disabled in the Firebase Console. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password and Google.',
    'auth/invalid-credential': 'Invalid email or password. Try again or click "Sign Up" to create an account.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/user-not-found': 'No account with that email. Click "Sign Up" to create one.',
    'auth/email-already-in-use': 'An account with that email already exists. Try signing in instead.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Try again.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Allow popups for this site.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/too-many-requests': 'Too many failed attempts. Wait a few minutes and try again.',
    'auth/unauthorized-domain': '🚨 DOMAIN NOT WHITELISTED — This domain is not in the Firebase authorized domains list. Go to Firebase Console → Authentication → Settings → Authorized domains → add this domain.',
    'auth/configuration-not-found': '🚨 FIREBASE NOT CONFIGURED — Firebase project is missing auth config. Check .env or Firebase env vars.',
  };
  if (code === 'auth/api-key-not-valid' || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return new Error(map['auth/api-key-not-valid'] + ' [code: ' + code + ']');
  }
  if (code in map) return new Error(map[code] + ' [code: ' + code + ']');
  return new Error(`[${code}] ${msg}`);
}

export const userService = {
  // --- AUTH HUB ---
  async loginWithEmail(email: string, pass: string): Promise<UserProfile | null> {
    try {
      // Force sign-out any existing session first so switching accounts works
      if (auth.currentUser) await signOut(auth);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return this.getUserProfile(userCredential.user.uid);
    } catch (e: any) {
      throw friendlyAuthError(e);
    }
  },

  async signupWithEmail(email: string, pass: string, name: string): Promise<UserProfile | null> {
    try {
      // Force sign-out any existing session first
      if (auth.currentUser) await signOut(auth);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const initialProfile: UserProfile = {
        name,
        email,
        role: 'Subscriber',
        orders: [],
        submissions: [],
        joinedDate: new Date().toLocaleDateString(),
        agreementsSigned: false,
        activeSubscription: 'Free',
        funds: [],
        payoutAccounts: [],
        earnings: []
      };
      await setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), initialProfile);
      return initialProfile;
    } catch (e: any) {
      throw friendlyAuthError(e);
    }
  },

  async loginWithGoogle(): Promise<UserProfile | null> {
    try {
      // Force sign-out any existing session first so switching accounts works
      if (auth.currentUser) await signOut(auth);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const profile = await this.getUserProfile(userCredential.user.uid);
      if (!profile) {
        const initialProfile: UserProfile = {
          name: userCredential.user.displayName || "Studio Guest",
          email: userCredential.user.email || "",
          role: 'Subscriber',
          orders: [],
          submissions: [],
          joinedDate: new Date().toLocaleDateString(),
          agreementsSigned: false,
          activeSubscription: 'Free'
        };
        await setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), initialProfile);
        return initialProfile;
      }
      return profile;
    } catch (e: any) {
      throw friendlyAuthError(e);
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  onAuthChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // --- PROFILE HUB ---
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (docSnap.exists()) return docSnap.data() as UserProfile;
    return null;
  },

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), data);
  },

  // --- SUBMISSIONS HUB ---
  async submitTalent(uid: string, submission: Omit<TalentSubmission, "id" | "timestamp">): Promise<void> {
    const newDoc = await addDoc(collection(db, USERS_COLLECTION, uid, SUBMISSIONS_COLLECTION), {
      ...submission,
      timestamp: Timestamp.now(),
      status: 'Pending'
    });
    // Also add to global submissions for admin
    await setDoc(doc(db, SUBMISSIONS_COLLECTION, newDoc.id), {
       ...submission,
       uid,
       timestamp: Timestamp.now(),
       status: 'Pending'
    });
  },

  async submitProjectRequest(uid: string, request: any): Promise<void> {
    const newDoc = await addDoc(collection(db, "projectRequests"), {
      ...request,
      uid,
      timestamp: Timestamp.now(),
      status: 'Pending'
    });
  },

  // --- ADMIN & DATA HUB ---

  async getPrograms(): Promise<Program[]> {
    const snap = await getDocs(collection(db, PROGRAMS_COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Program));
  },

  async getProducts(): Promise<Product[]> {
    const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  },

  async getTransactions(): Promise<Transaction[]> {
    const snap = await getDocs(query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"), limit(50)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
  },

  async getMetrics(): Promise<any> {
    // Simple mock for now, but will connect to cloud function or aggregation later
    return {
      totalRev: 142500,
      activeMembers: 4200,
      productions: 12
    };
  },

  async getStudioSettings(): Promise<StudioSettings | null> {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, STUDIO_SETTINGS_DOC));
    if (docSnap.exists()) return docSnap.data() as StudioSettings;
    return null;
  },

  async updateStudioSettings(settings: StudioSettings): Promise<void> {
    await setDoc(doc(db, SETTINGS_COLLECTION, STUDIO_SETTINGS_DOC), settings);
  }
};
