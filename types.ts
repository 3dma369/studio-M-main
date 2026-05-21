
export type UserRole = 'Guest' | 'Subscriber' | 'Pro' | 'Associate' | 'Corporate' | 'Admin';

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
  dislikes: number;
  time: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Episode {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  summary: string;
}

export interface Credit {
  name: string;
  role: string;
  link?: string;
}

export interface FundSource {
  id: string;
  type: 'Card' | 'Crypto' | 'ICP';
  lastFour: string;
  isDefault?: boolean;
}

export interface PayoutAccount {
  id: string;
  method: 'Bank Transfer' | 'Crypto Wallet' | 'ICP Neuron';
  details: string;
}

export interface EarningsRecord {
  id: string;
  date: string;
  source: string;
  amount: number;
  status: 'Pending' | 'Available' | 'Paid';
}

export interface Agreement {
  id: string;
  title: string;
  version: string;
  signedAt?: string;
  content: string;
}

export interface TalentSubmission {
  id: string;
  name: string;
  email: string;
  contact: string;
  bio: string;
  fileType: 'Headshot' | 'Video' | 'Voice' | 'Doc';
  fileName: string;
  status: 'Pending' | 'Reviewing' | 'Accepted';
  timestamp: string;
}

export interface FeaturedMember {
  id: string;
  name: string;
  avatar: string;
  tier: SubscriptionTier;
  contribution: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  orders: Product[];
  submissions: TalentSubmission[];
  joinedDate: string;
  bio?: string;
  funds?: FundSource[];
  payoutAccounts?: PayoutAccount[];
  earnings?: EarningsRecord[];
  agreements?: Agreement[];
  activeSubscription?: string;
  agreementsSigned: boolean;
  shippingAddress?: {
    street: string;
    city: string;
    zip: string;
    country: string;
  };
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Income' | 'Expense' | 'Payout';
  description: string;
  amount: number;
  category: 'Subscription' | 'Merch' | 'Ad Revenue' | 'Creator Payout' | 'Infrastructure';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  program: 'Dating' | 'Toys' | 'Food' | 'General';
  trackingNumber?: string;
  status?: 'Processing' | 'Shipped' | 'Delivered';
  fullDescription?: string;
  reviews?: Review[];
}

export interface Program {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  videoUrl?: string;
  platform?: 'YouTube' | 'Odysee';
  summary?: string;
  credits?: Credit[];
  episodes?: Episode[];
  reviews?: Review[];
}

export interface ServiceOffering {
  id: string;
  title: string;
  description: string;
  features: string[];
  type: 'Corporate' | 'Private';
  icon: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export enum SubscriptionTier {
  FREE = 'Free',
  FAN = 'Fan',
  MEMBER = 'Member',
  PRO = 'Pro',
  PLATINUM = 'Platinum',
  CORPORATE = 'Corporate'
}

export interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  network: string;
  enabled: boolean;
  logo?: string;
}

export interface DigitalWallet {
  id: string;
  network: string;
  address: string;
  label: string;
  isDefault?: boolean;
}

export interface StudioSettings {
  acceptedCryptos: CryptoOption[];
  adminWallets: DigitalWallet[];
}
