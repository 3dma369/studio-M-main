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

export const userService = {
  // --- AUTH HUB ---
  async loginWithEmail(email: string, pass: string): Promise<UserProfile | null> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return this.getUserProfile(userCredential.user.uid);
  },

  async signupWithEmail(email: string, pass: string, name: string): Promise<UserProfile | null> {
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
  },

  async loginWithGoogle(): Promise<UserProfile | null> {
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
