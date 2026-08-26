
import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { STUDIO_APPS, PROGRAMS, PRODUCTS, SUBSCRIPTIONS, SERVICES, TEAM, TIMELINE, CORE_VALUES, FEATURED_MEMBERS } from './constants';
import { GeminiAssistant } from './services/geminiService';
import { USERS_COLLECTION, userService } from './services/userService';
import { stripeService } from './services/stripeService';
import { auth } from './services/firebaseSetup';
import { addDoc, collection } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { web3Service } from './services/web3Service';
import { InboxPanel } from './components/InboxPanel';
import { UserPaymentsPanel } from './components/UserPaymentsPanel';
import { AvatarPicker } from './components/AvatarPicker';
import { UserProfile, Product, Program, UserRole, ChatMessage, ServiceOffering, CartItem, FundSource, SubscriptionTier, TalentSubmission, FeaturedMember, Transaction, Agreement, PayoutAccount, StudioSettings, CryptoOption, DigitalWallet } from './types';
// T.U Empire Admin Suite — shared package, 14+ sections, projects + business intelligence
const EmpireAdmin = lazy(() => import('./admin-suite').then(m => ({ default: m.AdminDashboard })));
// T.U Empire Ops — inventory editor + order manager + community moderation
const EmpireOps = lazy(() => import('./empire-ops').then(m => ({ default: m.OpsConsole })));
import { tuStudioConfig } from './admin.config';
import { tuStudioOpsConfig } from './empire.config';
import { db } from './services/firebaseSetup';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // Read initial tab from URL — enables deep linking to /programs, /services, etc.
    const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
    const validTabs = ['home', 'programs', 'services', 'products', 'membership', 'mission', 'community', 'contact', 'profile', 'admin'];
    return validTabs.includes(path) ? path : 'home';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Sync activeTab to URL on change (without page reload)
  useEffect(() => {
    const newPath = activeTab === 'home' ? '/' : `/${activeTab}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState(null, '', newPath);
    }
  }, [activeTab]);

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').toLowerCase() || 'home';
      const validTabs = ['home', 'programs', 'services', 'products', 'membership', 'mission', 'community', 'contact', 'profile', 'admin'];
      if (validTabs.includes(path)) {
        setActiveTab(path);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginRole, setLoginRole] = useState<UserRole>('Subscriber');
  
  // Selection State for Detailed Views
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // sync guard against rapid double-clicks
  const [toast, setToast] = useState<{msg: string; kind: 'success'|'warn'|'error'}|null>(null);

  // File upload limits — surfaced to user BEFORE upload so they're never surprised.
  // Inline base64 attach is capped at 1.8MB to stay under Firestore doc size limit.
  // Storage rule (storage.rules) allows up to 50MB but we keep user cap consistent
  // with the inline path until Storage bucket is enabled in the project console.
  const MAX_ATTACH_BYTES = 1800000; // ~1.8MB
  const MAX_ATTACH_LABEL = '1.8 MB';
  function byteFormat(n: number): string {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }
  function emailValid(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, kind: 'success'|'warn'|'error' = 'success') => {
    setToast({ msg, kind });
  };
  
  // Membership Dynamic State
  const [fanAmount, setFanAmount] = useState(5.00);
  
  // Contact Page State
  const [contactMode, setContactMode] = useState<'general' | 'project'>('general');
  
  // Shopping Cart & Checkout State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'shipping' | 'payment' | 'success'>('review');
  const [shippingAddress, setShippingAddress] = useState({ name: '', street: '', city: '', zip: '', country: 'USA' });
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [cryptoStatus, setCryptoStatus] = useState<'idle' | 'connecting' | 'paying' | 'success' | 'error'>('idle');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Profile & Financial Specific State
  const [profileSubTab, setProfileSubTab] = useState<'identity' | 'financials' | 'agreements' | 'orders'>('identity');

  // Studio Data
  const [adminPrograms, setAdminPrograms] = useState<Program[]>(PROGRAMS);
  const [adminProducts, setAdminProducts] = useState<Product[]>(PRODUCTS);
  const [adminMembers, setAdminMembers] = useState<FeaturedMember[]>(FEATURED_MEMBERS);
  const [talentSubmissions, setTalentSubmissions] = useState<TalentSubmission[]>([
    { id: 'sub1', name: 'John Doe', email: 'john@example.com', contact: '@johndoe', bio: 'Expert VFX artist from SF.', fileType: 'Video', fileName: 'reel.mp4', status: 'Pending', timestamp: '2024-03-01' }
  ]);
  const [studioTransactions, setStudioTransactions] = useState<Transaction[]>([
    { id: 't1', date: '2024-11-20', type: 'Income', description: 'Monthly Subscription Rev', amount: 45200, category: 'Subscription' },
    { id: 't2', date: '2024-11-21', type: 'Income', description: 'Merch Sale: Hoodie', amount: 65, category: 'Merch' },
    { id: 't3', date: '2024-11-22', type: 'Payout', description: 'Creator Payment: Liam Vance', amount: 1200, category: 'Creator Payout' },
    { id: 't4', date: '2024-11-23', type: 'Expense', description: 'AWS Infrastructure', amount: 450, category: 'Infrastructure' },
  ]);

  const [globalAgreements, setGlobalAgreements] = useState<Agreement[]>([
    { id: 'a1', title: 'Content Creation Collaboration', version: '2.1', content: 'Standard terms for content creation, IP rights, and revenue sharing. Molina Studio retains 20% commission on gross sales.' },
    { id: 'a2', title: 'Dividend Share Agreement', version: '1.0', content: 'Profit sharing structure for studio-original productions. Dividends paid quarterly.' },
    { id: 'a3', title: 'Terms of Use', version: '4.0', content: 'Standard studio platform terms of service and acceptable use policy.' }
  ]);
  
  // Admin UI State
  const [adminView, setAdminView] = useState<'dashboard' | 'treasury' | 'legal' | 'programs' | 'shop' | 'web3' | 'empire' | 'ops'>('dashboard');
  const [studioSettings, setStudioSettings] = useState<StudioSettings>({
    acceptedCryptos: [
      { id: 'eth', name: 'Ethereum', symbol: 'ETH', network: 'Ethereum Mainnet', enabled: true },
      { id: 'usdc', name: 'USD Coin', symbol: 'USDC', network: 'Ethereum Mainnet', enabled: false },
      { id: 'usdt', name: 'Tether', symbol: 'USDT', network: 'Ethereum Mainnet', enabled: false },
    ],
    adminWallets: [
      { id: 'w1', network: 'Ethereum Mainnet', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', label: 'Main Savings', isDefault: true }
    ]
  });

  // User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [shopFilter, setShopFilter] = useState('All');

  // Chat/AI State
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiInput, setAiInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', user: 'Eric Molina', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100', text: 'Welcome to the studio live stream! 🎥✨ Let\'s create something bold.', likes: 12, dislikes: 0, time: '2:30 PM' },
    { id: '2', user: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', text: 'Today we are discussing the new Toy Verses drop. Stay tuned! 🔥🚀', likes: 8, dislikes: 1, time: '2:32 PM' },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [signupName, setSignupName] = useState("");

  // Firebase Real-time Sync
  useEffect(() => {
    const unsub = userService.onAuthChanged(async (fUser) => {
      if (fUser) {
        setIsLoggedIn(true);
        const profile = await userService.getUserProfile(fUser.uid);
        setUserProfile(profile);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    });

    const loadData = async () => {
      const progs = await userService.getPrograms();
      if (progs.length > 0) setAdminPrograms(progs);

      const prods = await userService.getProducts();
      if (prods.length > 0) setAdminProducts(prods);

      const trans = await userService.getTransactions();
      if (trans.length > 0) setStudioTransactions(trans);
      const settings = await userService.getStudioSettings();
      if (settings) setStudioSettings(settings);
    };

    loadData();
    return () => unsub();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const gemini = useMemo(() => new GeminiAssistant(), []);

  const filteredProducts = useMemo(() => {
    if (shopFilter === 'All') return adminProducts;
    return adminProducts.filter(p => p.program === shopFilter);
  }, [adminProducts, shopFilter]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const profile = await userService.loginWithEmail(loginEmail, loginPass);
        if (profile) {
           setUserProfile(profile);
           setIsLoggedIn(true);
           setShowLoginModal(false);
           if (profile.email === '3dma369@proton.me') setActiveTab('admin');
        }
      } else {
        const profile = await userService.signupWithEmail(loginEmail, loginPass, signupName);
        if (profile) {
           setUserProfile(profile);
           setIsLoggedIn(true);
           setShowLoginModal(false);
        }
      }
    } catch (err: any) {
      showToast(`Authentication Error: ${err.message}`, 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const profile = await userService.loginWithGoogle();
      if (profile) {
        setUserProfile(profile);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        if (profile.email === '3dma369@proton.me') setActiveTab('admin');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('access-blocked') || err?.message?.includes('Access blocked') || err?.message?.includes('invalid_request')) {
        showToast('Google sign-in is restricted for this domain. Use Email + Sign Up tab to create an account.', 'error');
      } else {
        showToast(`Google Login Error: ${err.message}`, 'error');
      }
    }
  };

  const handleLogout = async () => {
    await userService.logout();
    setIsLoggedIn(false);
    setUserProfile(null);
    setActiveTab('home');
    setCartItems([]);
    setIsCartOpen(false);
  };

  const changeTab = (tab: string) => {
    setActiveTab(tab);
    setSelectedProgram(null);
    setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
    setCheckoutStep('review');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckoutNext = async () => {
    if (!isLoggedIn) {
      setIsCartOpen(false);
      setAuthMode('login');
      setShowLoginModal(true);
      return;
    }
    if (checkoutStep === 'review') setCheckoutStep('shipping');
    else if (checkoutStep === 'shipping') setCheckoutStep('payment');
    else if (checkoutStep === 'payment') {
      if (paymentMethod === 'card') {
        const success = await stripeService.checkout(cartItems);
        if (success) {
          setCheckoutStep('success');
          setCartItems([]);
          const updatedProfile = await userService.getUserProfile(auth.currentUser?.uid || "");
          setUserProfile(updatedProfile);
        }
      } else {
        // Crypto logic is handled by specific buttons in the UI for better UX
      }
    }
  };

  const handleCryptoPayment = async () => {
    try {
      setCryptoStatus('connecting');
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      
      setCryptoStatus('paying');
      const totalEth = (cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) / 3000).toFixed(4); // Mock conversion rate
      const destination = studioSettings.adminWallets.find(w => w.isDefault)?.address || studioSettings.adminWallets[0]?.address;
      
      if (!destination) throw new Error("No destination wallet configured by admin.");
      
      const txHash = await web3Service.sendPayment(destination, totalEth);
      if (txHash) {
        setCryptoStatus('success');
        setCheckoutStep('success');
        setCartItems([]);
        // Add transaction to studio ledger
        const newTx: Transaction = {
          id: txHash,
          date: new Date().toISOString().split('T')[0],
          type: 'Income',
          description: `Crypto Purchase: ${cartItems.map(i => i.name).join(', ')}`,
          amount: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
          category: 'Merch'
        };
        setStudioTransactions(prev => [newTx, ...prev]);
      }
    } catch (err: any) {
      setCryptoStatus('error');
      showToast(`Asset Transfer Failed: ${err.message}`, 'error');
    }
  };

  const askAI = async () => {
    if (!aiInput) return;
    setAiResponse("Connecting to the multimedia core...");
    try {
      const res = await gemini.getRecommendations(aiInput);
      setAiResponse(res || "");
    } catch (err: any) {
      console.error('[AI] getRecommendations failed:', err);
      setAiResponse(`⚠️ AI assistant is offline. ${err?.message || 'Please try again later.'}`);
    }
  };

  const sendChatMessage = (text?: string) => {
    const finalMsg = text || chatInput;
    if (!finalMsg.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: userProfile?.name || 'Guest',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      text: finalMsg,
      likes: 0,
      dislikes: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
  };

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark selection:bg-primary selection:text-white transition-all duration-500 font-display">
      {toast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-[9999] max-w-md px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-fadeIn cursor-pointer ${
            toast.kind === 'success'
              ? 'bg-secondary text-black'
              : toast.kind === 'warn'
              ? 'bg-yellow-400 text-black'
              : 'bg-red-500 text-white'
          }`}
          onClick={() => setToast(null)}
        >
          <span className="material-symbols-outlined text-xl">
            {toast.kind === 'success' ? 'check_circle' : toast.kind === 'warn' ? 'warning' : 'error'}
          </span>
          <span className="flex-1">{toast.msg}</span>
          <span className="material-symbols-outlined text-base opacity-70">close</span>
        </div>
      )}
      <Navbar
        activeTab={activeTab}
        setActiveTab={changeTab}
        isLoggedIn={isLoggedIn}
        userRole={userProfile?.role}
        currentUserEmail={userProfile?.email}
        currentUserPhoto={userProfile?.photoURL}
        currentUserEmoji={userProfile?.avatarEmoji}
        currentUserName={userProfile?.name}
        onLogout={handleLogout}
        onOpenLogin={() => { setAuthMode('login'); setShowLoginModal(true); }}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => { setIsCartOpen(true); setCheckoutStep('review'); }}
      />

      {/* SHOPPING CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 shadow-2xl animate-slideLeft flex flex-col">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Studio Kit</h2>
              <button onClick={() => setIsCartOpen(false)} className="material-symbols-outlined hover:text-primary transition-colors">close</button>
            </div>
            <div className="flex-grow overflow-y-auto p-8 no-scrollbar">
              {checkoutStep === 'review' && (
                <div className="space-y-8">
                  {cartItems.length > 0 ? cartItems.map((item) => (
                    <div key={item.id} className="flex gap-6 items-center">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden shadow-md">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-black uppercase tracking-tight">{item.name}</h3>
                        <p className="text-primary font-black">${item.price}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-800 flex items-center justify-center text-xs font-bold">-</button>
                          <span className="text-xs font-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-800 flex items-center justify-center text-xs font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  )) : <div className="text-center py-20 opacity-40"><span className="material-symbols-outlined text-6xl mb-4">shopping_basket</span><p className="font-bold uppercase tracking-widest text-xs">Empty Inventory</p></div>}
                </div>
              )}
              {checkoutStep === 'shipping' && (
                <div className="space-y-6 animate-fadeIn">
                  <h3 className="text-xl font-black uppercase">Shipping Details</h3>
                  <div className="space-y-4">
                    <input className="w-full bg-gray-50 dark:bg-black p-5 rounded-2xl border-none font-bold shadow-inner" placeholder="Full Identity / Recipient" />
                    <input className="w-full bg-gray-50 dark:bg-black p-5 rounded-2xl border-none font-bold shadow-inner" placeholder="Street Address" />
                    <div className="grid grid-cols-2 gap-4">
                       <input className="w-full bg-gray-50 dark:bg-black p-5 rounded-2xl border-none font-bold shadow-inner" placeholder="City" />
                       <input className="w-full bg-gray-50 dark:bg-black p-5 rounded-2xl border-none font-bold shadow-inner" placeholder="Zip" />
                    </div>
                  </div>
                </div>
              )}
                     {checkoutStep === 'payment' && (
                <div className="space-y-8 animate-fadeIn">
                  <h3 className="text-xl font-black uppercase">Payment Union</h3>
                  
                  <div className="flex bg-gray-100 dark:bg-black p-1.5 rounded-[2rem] shadow-inner mb-6">
                    <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'card' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>Studio Card</button>
                    <button onClick={() => setPaymentMethod('crypto')} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'crypto' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>Web3 Wallet</button>
                  </div>

                  {paymentMethod === 'card' ? (
                    <div className="p-6 bg-primary/5 border-2 border-primary rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary">credit_card</span>
                        <div><p className="font-black uppercase text-xs">Linked Studio Card</p><p className="text-[10px] text-gray-500 font-bold">Ends in 4242</p></div>
                      </div>
                      <span className="material-symbols-outlined text-secondary">verified</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          {studioSettings.acceptedCryptos.filter(c => c.enabled).map(crypto => (
                            <button key={crypto.id} className="p-6 bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center gap-2 hover:border-primary transition-all">
                               <span className="material-symbols-outlined text-primary">{crypto.symbol === 'ETH' ? 'currency_exchange' : 'payments'}</span>
                               <span className="text-[10px] font-black uppercase">{crypto.symbol}</span>
                            </button>
                          ))}
                       </div>
                       
                       <button 
                        onClick={handleCryptoPayment}
                        disabled={cryptoStatus === 'connecting' || cryptoStatus === 'paying'}
                        className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] flex items-center justify-center gap-4 group transition-all"
                       >
                          <span className={`material-symbols-outlined ${cryptoStatus === 'paying' ? 'animate-spin' : ''}`}>
                            {cryptoStatus === 'idle' ? 'account_balance_wallet' : cryptoStatus === 'connecting' ? 'sync' : cryptoStatus === 'paying' ? 'hourglass_top' : 'account_balance_wallet'}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {cryptoStatus === 'idle' ? 'Establish Wallet Union' : cryptoStatus === 'connecting' ? 'Connecting...' : cryptoStatus === 'paying' ? 'Transmitting Asset...' : 'Confirm Payment'}
                          </span>
                       </button>
                       
                       {walletAddress && (
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Linked: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>
                        </div>
                       )}
                    </div>
                  )}
                </div>
              )}
              {checkoutStep === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-scaleIn">
                  <div className="w-24 h-24 bg-secondary text-white rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl shadow-secondary/30"><span className="material-symbols-outlined text-5xl">verified</span></div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Asset Secured</h2>
                  <p className="text-gray-500 font-medium italic">Your multimedia resources are being processed.</p>
                  <button onClick={() => setIsCartOpen(false)} className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-black uppercase text-xs tracking-widest">Return to Studio</button>
                </div>
              )}
            </div>
            {checkoutStep !== 'success' && (
              <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/50">
                <div className="flex justify-between items-end mb-8">
                  <p className="text-[10px] font-black uppercase text-gray-400">Total Contribution</p>
                  <p className="text-4xl font-black text-primary tracking-tighter">${cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}</p>
                </div>
                             <button onClick={handleCheckoutNext} className={`w-full py-6 rounded-[2.5rem] bg-primary text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all ${checkoutStep === 'payment' && paymentMethod === 'crypto' ? 'hidden' : ''}`}>
                  {checkoutStep === 'review' ? 'Proceed to Checkout' : checkoutStep === 'shipping' ? 'Secure Payment' : 'Finalize Union'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL OVERLAYS */}
      {selectedProgram && (
        <div className="fixed inset-0 z-[1100] bg-white dark:bg-black overflow-y-auto animate-fadeIn no-scrollbar">
           <div className="relative min-h-screen">
            <div className="relative h-[70vh]">
              <img src={selectedProgram.image} className="w-full h-full object-cover" alt={selectedProgram.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black via-black/30 to-black/60" />
              <button onClick={() => setSelectedProgram(null)} className="absolute top-8 left-8 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 hover:bg-primary transition-all shadow-xl"><span className="material-symbols-outlined">arrow_back</span></button>
              <div className="absolute bottom-16 left-8 right-8 max-w-7xl mx-auto">
                <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">{selectedProgram.category}</span>
                <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-[0.85]">{selectedProgram.title}</h1>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-8 py-24 grid lg:grid-cols-3 gap-20">
               <div className="lg:col-span-2 space-y-20">
                 <section>
                    <h2 className="text-[10px] font-black uppercase text-gray-400 mb-8 tracking-[0.3em]">Production Narrative</h2>
                    <p className="text-2xl md:text-3xl font-medium leading-tight italic text-gray-700 dark:text-gray-300">{selectedProgram.summary || selectedProgram.description}</p>
                 </section>
                 <section>
                    <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-10">Episodic Records</h3>
                    <div className="space-y-8">
                       {selectedProgram.episodes?.map(ep => (
                         <div key={ep.id} className="flex flex-col md:flex-row gap-8 p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] border border-gray-100 dark:border-gray-800 group hover:shadow-2xl transition-all">
                            <div className="md:w-72 h-44 shrink-0 overflow-hidden rounded-[2rem] shadow-xl relative">
                               <img src={ep.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={ep.title} />
                               <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded text-[10px] font-black text-white">{ep.duration}</div>
                            </div>
                            <div className="flex-grow py-2">
                               <h4 className="text-2xl font-black mb-3 uppercase tracking-tight leading-none">{ep.title}</h4>
                               <p className="text-sm text-gray-500 font-medium leading-relaxed">{ep.summary}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </section>
               </div>
               <aside className="space-y-12">
                  <div className="p-10 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800">
                     <h3 className="text-[10px] font-black uppercase text-gray-400 mb-8 tracking-[0.3em]">Executive Credits</h3>
                     <div className="space-y-6">
                        {selectedProgram.credits?.map((c, i) => (
                          <div key={i} className="flex flex-col">
                             <span className="text-[9px] font-black uppercase text-primary tracking-widest">{c.role}</span>
                             <span className="text-lg font-black uppercase tracking-tight">{c.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </aside>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white dark:bg-gray-950 rounded-[4rem] max-w-5xl w-full grid md:grid-cols-2 overflow-hidden shadow-2xl animate-scaleIn border border-white/5 max-h-[90vh]">
            <div className="h-full">
              <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
            </div>
            <div className="p-10 md:p-14 overflow-y-auto space-y-10 no-scrollbar">
              <div className="flex justify-between items-start">
                <h2 className="text-5xl font-black uppercase tracking-[0.02em] leading-[0.9]">{selectedProduct.name}</h2>
                <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="flex items-center gap-6">
                <p className="text-6xl font-black text-primary tracking-tighter leading-none">${selectedProduct.price}</p>
                <div className="px-4 py-1.5 rounded-full bg-gray-50 dark:bg-gray-900 text-[9px] font-black uppercase text-gray-500 tracking-widest border border-gray-100 dark:border-gray-800">{selectedProduct.program} Line</div>
              </div>
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Item Specification</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium italic text-xl leading-relaxed">{selectedProduct.fullDescription || selectedProduct.description}</p>
              </div>
              <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-sm tracking-[0.1em] rounded-[2.5rem] shadow-2xl active:scale-95 hover:bg-primary transition-all">Secure From Studio Inventory</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN NAVIGATION ROUTING */}
      <main>
        {activeTab === 'home' && (
          <div className="animate-fadeIn">
            <Hero onAction={() => changeTab('programs')} onCorporateAction={() => changeTab('services')} />
            
            {/* STUDIO APPS SHOWCASE */}
            <section id="studio-apps" className="max-w-7xl mx-auto px-4 py-32 border-y border-gray-100 dark:border-gray-800">
               <div className="text-center mb-16">
                  <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Our Ecosystem</span>
                  <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4">The Studio Apps</h2>
                  <p className="text-lg text-gray-400 italic font-medium">Content meets technology — our apps power the Molina Universe</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* TOY VERSE HQ */}
                  <a href="https://toyverse-app.web.app/" target="_blank" rel="noopener noreferrer" className="group bg-white dark:bg-gray-900 rounded-[3.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl hover:shadow-3xl hover:-translate-y-3 transition-all block">
                    <div className="aspect-square bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" />
                      <div className="relative z-10 w-40 h-40 bg-no-repeat bg-contain bg-center" style={{ backgroundImage: 'url(/logos/toy-verse.png)' }} role="img" aria-label="Toyverse" />
                    </div>
                    <div className="p-10">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-3">Toy Verse HQ</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">Toys, collectibles, 3D prints, STL files, dioramas, history, videos, social media, games, and more.</p>
                      <div className="flex flex-wrap gap-2">
                        {['3D Prints', 'STL Files', 'Dioramas', 'Collectibles', 'Games'].map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase rounded-full text-gray-400">{tag}</span>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center gap-2 text-primary">
                        <span className="text-[10px] font-black uppercase tracking-widest">Explore Toy Verse</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </a>

                  {/* VIBE X */}
                  <a href="https://vibe-x-app.web.app/" target="_blank" rel="noopener noreferrer" className="group bg-white dark:bg-gray-900 rounded-[3.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl hover:shadow-3xl hover:-translate-y-3 transition-all block">
                    <div className="aspect-square bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" />
                      <div className="relative z-10 w-40 h-40 bg-no-repeat bg-contain bg-center" style={{ backgroundImage: 'url(/logos/vibe-x.png)' }} role="img" aria-label="Vibe X" />
                    </div>
                    <div className="p-10">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-3">Vibe X</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">Music, DJs, events, live streaming, shopping, artist exposure, and merch.</p>
                      <div className="flex flex-wrap gap-2">
                        {['Music', 'DJs', 'Events', 'Live Stream', 'Merch'].map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase rounded-full text-gray-400">{tag}</span>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center gap-2 text-secondary">
                        <span className="text-[10px] font-black uppercase tracking-widest">Explore Vibe X</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </a>

                  {/* SAVVY PRICE */}
                  <a href="https://price-n-inventory.vercel.app/" target="_blank" rel="noopener noreferrer" className="group bg-white dark:bg-gray-900 rounded-[3.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl hover:shadow-3xl hover:-translate-y-3 transition-all block">
                    <div className="aspect-square bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1610368620902-e5e3c3a9e5f4?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" />
                      <div className="relative z-10 text-center">
                        <img src="/logos/savvy-price.png" alt="Savvy Price" className="h-40 w-40 object-contain drop-shadow-2xl mx-auto" style={{ mixBlendMode: 'normal' }} />
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                          <span className="material-symbols-outlined text-white text-sm">open_in_new</span>
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Live</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-10">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-3">Savvy Price</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">Find the treasure anywhere — price discovery, inventory management, and collector insights.</p>
                      <div className="flex flex-wrap gap-2">
                        {['Pricing', 'Inventory', 'Collectors', 'Insights'].map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase rounded-full text-gray-400">{tag}</span>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center gap-2 text-amber-600">
                        <span className="text-[10px] font-black uppercase tracking-widest">Explore Savvy Price</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </a>
               </div>

               {/* CHANNELS ROW */}
               <div className="mt-20 pt-16 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-center text-xl font-black uppercase tracking-tight mb-12">Our Content Channels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    <a href="https://www.youtube.com/@3volution_tv" target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 hover:border-red-500 hover:shadow-xl transition-all group">
                      <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">YouTube</p>
                        <p className="text-xl font-black uppercase tracking-tight">@3volution_tv</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 ml-auto group-hover:text-red-500 transition-colors">arrow_forward</span>
                    </a>
                    <a href="https://odysee.com/@3volution-TV:a" target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 hover:border-amber-500 hover:shadow-xl transition-all group">
                      <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-3xl">live_tv</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Odysee</p>
                        <p className="text-xl font-black uppercase tracking-tight">@3volution-TV</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 ml-auto group-hover:text-amber-500 transition-colors">arrow_forward</span>
                    </a>
                  </div>
               </div>
            </section>

            {/* CORE VALUES / NAVIGATION SECTION */}
            <section className="max-w-7xl mx-auto px-4 py-20 text-center">
              <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase tracking-tighter">Our Purpose</h2>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto italic font-medium leading-relaxed mb-12">"The understanding and union of reality, communication art, and humankind."</p>
              <div className="grid md:grid-cols-3 gap-8 mt-16">
                 {CORE_VALUES.map((val, idx) => (
                   <div key={idx} onClick={() => {
                      if (val.title === 'Collaboration') setShowSubmissionModal(true);
                      else if (val.title === 'Creativity') scrollToId('studio-output');
                      else if (val.title === 'Member Excellence') scrollToId('member-excellence');
                    }} className="p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 group transition-all hover:shadow-2xl cursor-pointer">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl">{val.icon}</span></div>
                      <h3 className="text-xl font-black mb-2 uppercase tracking-tight">{val.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4">{val.description}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-4">Discover More</p>
                   </div>
                 ))}
              </div>
            </section>

            {/* MEMBER EXCELLENCE SECTION */}
            <section id="member-excellence" className="max-w-7xl mx-auto px-4 py-32 border-y border-gray-100 dark:border-gray-800">
               <div className="text-center mb-20">
                  <h2 className="text-6xl font-black uppercase mb-4 tracking-tighter">Member Excellence</h2>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Honoring our monthly visionaries</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10">
                  {adminMembers.map((fm) => (
                    <div key={fm.id} className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-2xl text-center group transition-all hover:-translate-y-2">
                       <img src={fm.avatar} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-primary/20 p-1" alt={fm.name} />
                       <h3 className="text-xl font-black mb-2 tracking-tight uppercase">{fm.name}</h3>
                       <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 mb-6 inline-block">{fm.tier}</span>
                       <p className="text-xs text-gray-500 italic font-medium leading-relaxed">"{fm.contribution}"</p>
                    </div>
                  ))}
               </div>
            </section>

            {/* STUDIO OUTPUT SECTION */}
            <section id="studio-output" className="max-w-7xl mx-auto px-4 py-32">
               <div className="flex items-center justify-between mb-16">
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Latest Studio Output</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mt-2">New additions to the Molina multiverse</p>
                  </div>
                  <button onClick={() => changeTab('programs')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline">View All Programs</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {adminPrograms.slice(0, 3).map((prog) => (
                    <div key={prog.id} onClick={() => setSelectedProgram(prog)} className="group cursor-pointer">
                       <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-6 relative shadow-xl">
                          <img src={prog.image} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt={prog.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                             <span className="text-white font-black uppercase text-[10px] tracking-widest">Explore Reality</span>
                          </div>
                       </div>
                       <h3 className="text-2xl font-black mb-1 uppercase tracking-tight">{prog.title}</h3>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{prog.category}</p>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'programs' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <h2 className="text-7xl font-black tracking-tighter uppercase mb-20 leading-none">Studio Originals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {adminPrograms.map(prog => (
                <div key={prog.id} onClick={() => setSelectedProgram(prog)} className="group cursor-pointer bg-white dark:bg-gray-900 rounded-[4rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2">
                  <div className="aspect-video relative overflow-hidden"><img src={prog.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" alt={prog.title} /></div>
                  <div className="p-10">
                    <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter leading-none">{prog.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 italic font-medium">{prog.description}</p>
                    <div className="mt-8 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{prog.category}</span><span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">arrow_forward</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'services' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="text-center mb-24"><h2 className="text-7xl font-black tracking-tighter uppercase mb-6 leading-none">Professional <br />Unions</h2><p className="text-xl text-gray-400 font-medium italic">Elite multimedia solutions for entities and individuals.</p></div>
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {SERVICES.map(service => (
                <div key={service.id} className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl group hover:-translate-y-2 transition-all">
                   <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-10 group-hover:scale-110 transition-transform shadow-lg shadow-primary/10"><span className="material-symbols-outlined text-5xl">{service.icon}</span></div>
                   <h3 className="text-4xl font-black uppercase tracking-tighter mb-6 leading-none">{service.title}</h3>
                   <ul className="space-y-4 mb-12">
                     {service.features.map((f, i) => (<li key={i} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-3 tracking-widest"><span className="material-symbols-outlined text-secondary text-sm">verified</span>{f}</li>))}
                   </ul>
                   <button onClick={() => changeTab('contact')} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-primary transition-all shadow-xl">Initiate Inquiry</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="text-center mb-20">
              <h2 className="text-7xl font-black uppercase mb-6 leading-none tracking-tighter">Our Products</h2>
              <p className="text-xl text-gray-400 font-medium italic">Apps, Programs & Merchandise</p>
            </div>

            {/* APPS */}
            <div className="mb-24">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><span className="material-symbols-outlined text-2xl">apps</span></div>
                <h3 className="text-4xl font-black uppercase tracking-tighter">Apps</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {STUDIO_APPS.map(app => (
                  <a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer" className="group bg-white dark:bg-gray-900 rounded-[3.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl hover:shadow-3xl hover:-translate-y-3 transition-all block">
                    <div className={`aspect-square bg-gradient-to-br ${app.gradient} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundImage: `url('${app.image}')` }} />
                      <div className="relative z-10 text-center">
                        <span className="text-6xl">{app.icon}</span>
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                          <span className="material-symbols-outlined text-white text-sm">open_in_new</span>
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Live</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-10">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-3">{app.title}</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">{app.description}</p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {app.tags.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase rounded-full text-gray-400">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="text-[10px] font-black uppercase tracking-widest">Open App</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* PROGRAMS */}
            <div className="mb-24">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white"><span className="material-symbols-outlined text-2xl">play_circle</span></div>
                <h3 className="text-4xl font-black uppercase tracking-tighter">Programs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {PROGRAMS.filter(p => p.platform === 'YouTube' || p.platform === 'Odysee').map(program => (
                  <div key={program.id} className="bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl hover:-translate-y-2 transition-all group">
                    <div className="aspect-video bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
                      <img src={program.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt={program.title} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-white text-3xl">play_arrow</span>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{program.platform}</span>
                      </div>
                    </div>
                    <div className="p-8">
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">{program.category}</span>
                      <h3 className="text-xl font-black uppercase mt-2 mb-3 tracking-tight">{program.title}</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{program.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <p className="text-gray-400 font-medium italic mb-6">More programs coming soon...</p>
                <a href="https://www.youtube.com/@3volution_tv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-full font-black uppercase text-sm tracking-widest hover:bg-red-700 transition-colors shadow-xl">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  Watch on YouTube
                </a>
              </div>
            </div>

            {/* MERCH */}
            <div>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white"><span className="material-symbols-outlined text-2xl">shopping_bag</span></div>
                <h3 className="text-4xl font-black uppercase tracking-tighter">Merchandising</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {['Hoodies', 'T-Shirts', 'Sunglasses', 'Caps'].map((item, i) => (
                  <div key={item} className="bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl hover:-translate-y-2 transition-all group">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <span className="text-6xl opacity-50 group-hover:opacity-80 transition-opacity">
                        {item === 'Hoodies' ? '🧥' : item === 'T-Shirts' ? '👕' : item === 'Sunglasses' ? '🕶️' : '🧢'}
                      </span>
                    </div>
                    <div className="p-6 text-center">
                      <h4 className="text-lg font-black uppercase mb-1">{item}</h4>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Coming Soon</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <p className="text-gray-400 font-medium italic">Merchandise drop incoming — join the crew to get early access.</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'membership' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="text-center mb-20"><h2 className="text-7xl font-black tracking-tighter uppercase mb-6 leading-none">Membership</h2><p className="text-xl text-gray-400 font-medium italic">Join the Molina Multimedia inner circle.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
              {SUBSCRIPTIONS.map((s, i) => (
                <div key={i} className={`p-10 rounded-[3rem] border flex flex-col transition-all hover:shadow-2xl ${s.tier === SubscriptionTier.PRO || s.tier === SubscriptionTier.PLATINUM ? 'bg-primary text-white scale-105 shadow-2xl z-10 border-transparent' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">{s.tier}</h3>
                  
                  <div className="mb-10 h-28 flex flex-col justify-center">
                    {s.tier === SubscriptionTier.FAN ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">$</span>
                          <input 
                            type="number" 
                            value={fanAmount} 
                            onChange={(e) => setFanAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                            className="w-full bg-transparent border-b-2 border-primary focus:outline-none text-3xl font-black"
                          />
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="25" 
                          step="0.5" 
                          value={fanAmount} 
                          onChange={(e) => setFanAmount(parseFloat(e.target.value))}
                          className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Custom Supporter Choice</p>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                         <p className="text-4xl font-black tracking-tighter">${s.price}</p>
                         <span className="text-[10px] font-bold opacity-60">/MO</span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-4 mb-10 flex-grow">
                    {s.features.map((f, j) => (
                      <li key={j} className="text-[10px] font-black uppercase flex gap-2 leading-tight">
                        <span className="material-symbols-outlined text-secondary text-sm">verified</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => addToCart({ 
                      id: `sub-${s.tier}`, 
                      name: `${s.tier} Subscription`, 
                      price: s.tier === SubscriptionTier.FAN ? fanAmount : parseFloat(s.price), 
                      image: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?auto=format&fit=crop&q=80&w=400', 
                      description: `Establishing ${s.tier} access.`, 
                      program: 'General' 
                    })} 
                    className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-xl ${s.tier === SubscriptionTier.PRO || s.tier === SubscriptionTier.PLATINUM ? 'bg-white text-primary' : 'bg-primary text-white shadow-primary/20'}`}
                  >
                    Establish Union
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'mission' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Our Foundation</span>
              <h2 className="text-7xl font-black uppercase mb-6 leading-none tracking-tighter">Mission & Vision</h2>
              <p className="text-xl text-gray-400 font-medium italic max-w-3xl mx-auto">"The understanding and union of reality, communication art, and humankind."</p>
            </div>

            <div className="grid md:grid-cols-2 gap-16 mb-24">
              {/* Mission */}
              <div className="bg-white dark:bg-gray-900 p-14 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-10"><span className="material-symbols-outlined text-5xl">rocket_launch</span></div>
                <h3 className="text-4xl font-black uppercase mb-6 tracking-tighter">Mission</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">"To produce bold content for YouTube, Odysee, and social platforms that bridges the gap between reality and the human spirit through innovative multimedia storytelling."</p>
              </div>
              {/* Vision */}
              <div className="bg-white dark:bg-gray-900 p-14 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center text-secondary mb-10"><span className="material-symbols-outlined text-5xl">visibility</span></div>
                <h3 className="text-4xl font-black uppercase mb-6 tracking-tighter">Vision</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">"To be the world's first and only multimedia studio — a creative force that redefines how reality and art intersect, connecting humankind through powerful visual narratives."</p>
              </div>
            </div>

            {/* Founder Section */}
            <div className="bg-white dark:bg-gray-900 rounded-[4rem] p-14 border border-gray-100 dark:border-gray-800 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="shrink-0">
                  <div className="w-60 h-60 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-primary/20">
                    <img src="/eric-portrait.jpg" alt="Eric A. Molina Denegri" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex-grow text-center md:text-left">
                  <span className="inline-block px-4 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Founder & CEO</span>
                  <h3 className="text-5xl font-black uppercase mb-4 tracking-tighter leading-none">Eric A. Molina Denegri</h3>
                  <p className="text-xl text-secondary font-black uppercase tracking-widest mb-6">Creative Visionary & Architect</p>
                  <p className="text-gray-600 dark:text-gray-400 font-medium italic text-lg leading-relaxed max-w-xl">"Reality and art are not separate — they are one. The studio exists to make that connection visible, powerful, and meaningful to every person who experiences our work."</p>
                  <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
                    {['YouTube', 'Odysee', 'Instagram', 'LinkedIn'].map(s => (
                      <span key={s} className="px-5 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase rounded-full text-gray-400">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="mt-24">
              <h3 className="text-4xl font-black uppercase mb-12 tracking-tighter text-center">Executive Leadership</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                {TEAM.map((member, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl text-center group hover:-translate-y-2 transition-all">
                    <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-4 border-primary/20 p-1">
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight mb-1">{member.name}</h4>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-24">
              <h3 className="text-4xl font-black uppercase mb-12 tracking-tighter text-center">Studio History</h3>
              <div className="space-y-8">
                {TIMELINE.map((event, i) => (
                  <div key={i} className="flex gap-8 items-start bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl">
                    <div className="shrink-0 w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">{event.year}</div>
                    <div>
                      <h4 className="text-2xl font-black uppercase mb-2 tracking-tight">{event.title}</h4>
                      <p className="text-gray-500 font-medium italic">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'community' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="grid lg:grid-cols-3 gap-12">
               <div className="lg:col-span-2 space-y-8">
                  <h2 className="text-6xl font-black mb-8 uppercase tracking-tighter leading-none">Reality Hub</h2>
                  <div className="aspect-video bg-black rounded-[4rem] overflow-hidden shadow-2xl relative border border-gray-100 dark:border-gray-800">
                     <iframe 
                       className="w-full h-full" 
                       src="https://www.youtube.com/embed/LO363deNNsA?autoplay=0&mute=0&controls=1&rel=0" 
                       title="3volution_tv - Toy Verse HQ" 
                       frameBorder="0" 
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                       allowFullScreen
                     />
                  </div>
                  <div className="flex items-center gap-4 px-2">
                     <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                       <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Now Playing</p>
                       <p className="text-sm font-black uppercase">MARVEL: THE BILLION DOLLAR EMPIRE | Ep. 1 | Toy Verse HQ</p>
                     </div>
                     <a href="https://www.youtube.com/@3volution_tv/videos" target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors">
                       <span>All Videos</span>
                       <span className="material-symbols-outlined text-sm">open_in_new</span>
                     </a>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-[4rem] shadow-2xl h-[550px] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
                    <div className="flex-grow p-10 overflow-y-auto space-y-6 no-scrollbar">
                       {chatMessages.map(msg => (
                         <div key={msg.id} className="flex gap-4 group">
                            <img src={msg.avatar} className="w-10 h-10 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform" alt={msg.user} />
                            <div>
                               <div className="flex items-center gap-2 mb-1"><p className="text-[10px] font-black text-primary uppercase tracking-widest">{msg.user}</p><span className="text-[8px] text-gray-400 font-bold">{msg.time}</span></div>
                               <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl rounded-tl-none shadow-sm"><p className="text-sm font-medium leading-relaxed">{msg.text}</p></div>
                            </div>
                         </div>
                       ))}
                       <div ref={chatEndRef} />
                    </div>
                    <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/50 flex flex-col gap-4">
                       {/* Emoji Toolbar */}
                       <div className="flex gap-4 items-center px-2">
                          {['🔥', '🚀', '✨', '👏', '🎨', '💯', '❤️'].map(emoji => (
                             <button key={emoji} onClick={() => sendChatMessage(emoji)} className="text-xl hover:scale-125 transition-transform">{emoji}</button>
                          ))}
                       </div>
                       {(!isLoggedIn || !userProfile?.activeSubscription) ? (
                         <div className="flex items-center justify-center py-4 bg-primary/10 rounded-3xl border border-primary/20">
                           <p className="text-[10px] font-black uppercase tracking-widest text-primary">Upgrade to Fan ($5+) to unlock chat</p>
                         </div>
                       ) : (
                       <div className="flex gap-4">
                          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} className="flex-grow px-8 py-5 bg-white dark:bg-gray-800 rounded-3xl border-none text-sm font-bold shadow-inner" placeholder="Transmit thoughts to the hub..." />
                          <button onClick={() => sendChatMessage()} className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/30 active:scale-90 transition-all"><span className="material-symbols-outlined">send</span></button>
                       </div>
                       )}
                    </div>
                  </div>
               </div>
               <div className="space-y-8">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">AI Curator</h2>
                  <div className="bg-accent/10 rounded-[4rem] p-10 border border-accent/20 shadow-xl backdrop-blur-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl">smart_toy</span></div>
                     <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} className="w-full h-44 p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border-none text-sm font-bold shadow-inner resize-none mb-8 focus:ring-2 focus:ring-accent" placeholder="Ask about programs, shop gear, or studio philosophy..." />
                     <button onClick={askAI} className="w-full py-6 bg-accent text-yellow-900 font-black uppercase text-[11px] tracking-widest rounded-3xl hover:bg-yellow-400 transition-all shadow-xl">Process Inquiry</button>
                     {aiResponse && <div className="mt-10 p-8 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-[2.5rem] text-sm leading-relaxed border border-white/20 italic font-medium animate-fadeIn shadow-sm">{aiResponse}</div>}
                  </div>
               </div>
            </div>
          </section>
        )}

        {/* ROBUST CONTACT PAGE */}
        {activeTab === 'contact' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="grid lg:grid-cols-2 gap-24 items-start">
              <div>
                <h2 className="text-7xl font-black uppercase mb-10 leading-none tracking-tighter">Establish <br /><span className="text-primary">Union</span></h2>
                <p className="text-2xl text-gray-400 italic font-medium leading-relaxed max-w-lg">"Direct communication is the architectural bridge between reality and the human spirit."</p>
                <div className="mt-16 space-y-10">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-primary shadow-lg border border-gray-100 dark:border-gray-800"><span className="material-symbols-outlined text-3xl">location_on</span></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Main Studio</p><p className="font-black text-xl uppercase tracking-tighter">San Francisco, CA</p></div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-primary shadow-lg border border-gray-100 dark:border-gray-800"><span className="material-symbols-outlined text-3xl">alternate_email</span></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Email</p><a href="mailto:contact@tu-studio.com" className="font-black text-xl uppercase tracking-tighter hover:text-primary transition-colors">Contact Us</a></div>
                   </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-950 p-14 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                 <div className="flex bg-gray-100 dark:bg-black p-1.5 rounded-[2.5rem] mb-12 shadow-inner">
                    <button onClick={() => setContactMode('general')} className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${contactMode === 'general' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>General Question</button>
                    <button onClick={() => setContactMode('project')} className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${contactMode === 'project' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>Project Proposal</button>
                 </div>

                 <form className="space-y-8" onSubmit={async (e) => {
                   e.preventDefault();
                   const form = e.currentTarget as HTMLFormElement;
                   const inputs = form.querySelectorAll('input, select, textarea');
                   const data = {
                     name: (inputs[0] as HTMLInputElement).value,
                     email: (inputs[1] as HTMLInputElement).value,
                     mode: contactMode,
                     message: (inputs[inputs.length - 1] as HTMLTextAreaElement).value,
                     uid: auth.currentUser?.uid || 'guest',
                     createdAt: new Date().toISOString(),
                     status: 'New'
                   };
                   try {
                     await addDoc(collection(db, "contactMessages"), data);
                     showToast("Vision Transmitted Successfully to Molina Studio Executives.", 'success');
                     form.reset();
                   } catch (err: any) {
                     showToast(`Submission failed: ${err?.message || 'unknown error'}`, 'error');
                   }
                 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Identity Name" required />
                       <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Communication Email" type="email" required />
                    </div>

                    {contactMode === 'project' && (
                      <div className="space-y-6 animate-fadeIn">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <select className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner focus:ring-primary">
                               <option>Branding/ID Media</option>
                               <option>Corporate Production</option>
                               <option>AI/Digital Hybrid</option>
                               <option>Other Collaboration</option>
                            </select>
                            <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Project Budget ($)" type="number" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Location / Remote" type="text" />
                            <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" type="datetime-local" />
                         </div>
                      </div>
                    )}

                    <textarea className="w-full bg-gray-50 dark:bg-black border-none rounded-[2.5rem] p-8 h-48 text-sm font-bold shadow-inner resize-none" placeholder={contactMode === 'project' ? "Project Scope / Goals / Vision..." : "Your Message..."} required />
                    <button type="submit" className="w-full py-8 bg-primary text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Transmit Vision</button>
                 </form>
              </div>
            </div>
          </section>
        )}

        {/* PROFILE PAGE — any logged-in user */}
        {activeTab === 'profile' && isLoggedIn && userProfile && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="grid lg:grid-cols-4 gap-12">
               <div className="lg:col-span-1 space-y-8">
                  <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-2xl text-center">
                     <div className="relative inline-block mb-8">
                        <AvatarPicker db={db} userId={userProfile.id || auth.currentUser?.uid} currentPhoto={userProfile.photoURL} currentEmoji={userProfile.avatarEmoji} userName={userProfile.name} />
                        <div className="absolute -bottom-2 -right-2 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg"><span className="material-symbols-outlined text-sm">verified</span></div>
                     </div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">{userProfile.name}</h2>
                     <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mb-10">{userProfile.role}</p>
                     <div className="space-y-3">
                        {(userProfile.email === '3dma369@proton.me'
                          ? ['identity', 'financials', 'agreements', 'benefits', 'orders', 'inbox']
                          : ['profile', 'payments', 'benefits', 'orders']
                        ).map(tab => (
                          <button key={tab} onClick={() => setProfileSubTab(tab as any)} className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left px-8 transition-all flex items-center gap-3 ${profileSubTab === tab ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                             <span className="material-symbols-outlined text-sm">{tab === 'identity' || tab === 'profile' ? 'person' : tab === 'financials' || tab === 'payments' ? 'account_balance_wallet' : tab === 'agreements' ? 'history_edu' : tab === 'benefits' ? 'stars' : tab === 'inbox' ? 'inbox' : 'receipt_long'}</span>
                             {tab}
                          </button>
                        ))}
                     </div>
                  </div>
                  <button onClick={() => { setIsLoggedIn(false); setUserProfile(null); setActiveTab('home'); }} className="w-full py-5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-red-100 dark:border-red-900/20 hover:bg-red-500 hover:text-white transition-all">Terminate Session</button>
               </div>
               <div className="lg:col-span-3 space-y-8">
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                    {profileSubTab === 'profile' && <div className="animate-fadeIn">
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">My Profile</h3>
                      <div className="grid md:grid-cols-2 gap-10">
                         <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Legal Name</p><input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" defaultValue={userProfile.name} /></div>
                         <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Direct Email</p><input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" defaultValue={userProfile.email} /></div>
                         <div className="md:col-span-2 space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Artist Biography</p><textarea className="w-full bg-gray-50 dark:bg-black p-8 rounded-[2rem] border-none font-bold shadow-inner h-40 resize-none" defaultValue={userProfile.bio} /></div>
                      </div>
                      <div className="mt-16 pt-16 border-t border-gray-100 dark:border-gray-800">
                         <h4 className="text-xl font-black uppercase mb-8">Shipping Nexus</h4>
                         <div className="grid md:grid-cols-2 gap-4">
                            <input className="md:col-span-2 w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="Street Address" defaultValue={userProfile.shippingAddress?.street} />
                            <input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="City" defaultValue={userProfile.shippingAddress?.city} />
                            <input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="Zip Code" defaultValue={userProfile.shippingAddress?.zip} />
                         </div>
                      </div>
                      <div className="mt-16 pt-16 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                         <button className="px-10 py-5 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Changes</button>
                      </div>
                    </div>}
                    {profileSubTab === 'identity' && <div className="animate-fadeIn">
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">Studio Identity</h3>
                      <div className="grid md:grid-cols-2 gap-10">
                         <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Legal Name</p><input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" defaultValue={userProfile.name} /></div>
                         <div className="space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Direct Email</p><input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" defaultValue={userProfile.email} /></div>
                         <div className="md:col-span-2 space-y-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Artist Biography</p><textarea className="w-full bg-gray-50 dark:bg-black p-8 rounded-[2rem] border-none font-bold shadow-inner h-40 resize-none" defaultValue={userProfile.bio} /></div>
                      </div>
                      <div className="mt-16 pt-16 border-t border-gray-100 dark:border-gray-800">
                         <h4 className="text-xl font-black uppercase mb-8">Shipping Nexus</h4>
                         <div className="grid md:grid-cols-2 gap-4">
                            <input className="md:col-span-2 w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="Street Address" defaultValue={userProfile.shippingAddress?.street} />
                            <input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="City" defaultValue={userProfile.shippingAddress?.city} />
                            <input className="w-full bg-gray-50 dark:bg-black p-6 rounded-[1.5rem] border-none font-bold shadow-inner" placeholder="Zip Code" defaultValue={userProfile.shippingAddress?.zip} />
                         </div>
                      </div>
                    </div>}
                    {profileSubTab === 'payments' && <UserPaymentsPanel db={db} userId={userProfile.id} userEmail={userProfile.email} />}
                    {profileSubTab === 'orders' && <UserPaymentsPanel db={db} userId={userProfile.id} userEmail={userProfile.email} />}
                    {profileSubTab === 'financials' && <div className="animate-fadeIn space-y-12">
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">Financial Hub</h3>
                      {userProfile.role === 'Associate' && (
                        <div className="bg-primary p-12 rounded-[3.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
                           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                           <div className="relative z-10 flex justify-between items-start">
                              <div><p className="text-xs font-black uppercase tracking-[0.3em] opacity-70 mb-2">Associate Earnings Available</p><h3 className="text-7xl font-black tracking-tighter leading-none">$1,070.50</h3></div>
                              <button className="bg-white/20 backdrop-blur-md px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/30 transition-all">Withdraw</button>
                           </div>
                           <div className="mt-12 flex gap-4">
                              <div className="flex-1 bg-white/10 p-4 rounded-2xl"><p className="text-[8px] font-black opacity-50 mb-1 uppercase">Sells Rev</p><p className="font-black">$840.50</p></div>
                              <div className="flex-1 bg-white/10 p-4 rounded-2xl"><p className="text-[8px] font-black opacity-50 mb-1 uppercase">Ad Share</p><p className="font-black">$230.00</p></div>
                           </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xl font-black uppercase mb-6 tracking-tight">Funding Sources</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                           {userProfile.funds?.map(fund => (
                             <div key={fund.id} className="p-8 bg-gray-50 dark:bg-black rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex justify-between items-center group shadow-sm">
                                <div className="flex items-center gap-4">
                                   <span className="material-symbols-outlined text-primary text-3xl">{fund.type === 'Card' ? 'credit_card' : 'account_balance_wallet'}</span>
                                   <div><p className="text-[10px] font-black uppercase tracking-[0.2em]">{fund.type}</p><p className="font-black text-lg">Ends in {fund.lastFour}</p></div>
                                </div>
                                <span className="material-symbols-outlined text-gray-300 group-hover:text-red-500 transition-colors cursor-pointer">delete</span>
                             </div>
                           ))}
                           <button className="p-10 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-300 hover:text-primary hover:border-primary transition-all group">
                              <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">add_card</span>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Link New Fund</span>
                           </button>
                        </div>
                      </div>
                    </div>}
                    {profileSubTab === 'agreements' && <div className="animate-fadeIn">
                       <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">Legal Unions</h3>
                                             {userProfile.agreements?.map(a => (
                              <div key={a.id} className="p-10 border border-gray-100 dark:border-gray-800 rounded-[3rem] bg-gray-50/50 dark:bg-black/50 space-y-6">
                                 <div className="flex justify-between items-center">
                                    <div><h4 className="text-2xl font-black uppercase tracking-tight">{a.title}</h4><p className="text-[10px] font-bold text-gray-400">Version {a.version}</p></div>
                                    <div className="px-6 py-2 bg-secondary text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-secondary/20"><span className="material-symbols-outlined text-xs">verified</span> Signed</div>
                                 </div>
                                 <div className="bg-white dark:bg-black p-8 rounded-[2rem] text-sm text-gray-500 font-medium italic leading-relaxed max-h-48 overflow-y-auto no-scrollbar shadow-inner">{a.content}</div>
                              </div>
                           ))}
                        </div>}
                        {profileSubTab === 'benefits' && <div className="animate-fadeIn space-y-12">
                           <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">Exclusive Member Hub</h3>
                           <div className="grid md:grid-cols-2 gap-8">
                              <div className="bg-primary/5 p-10 rounded-[3rem] border-2 border-primary/20">
                                 <span className="material-symbols-outlined text-primary text-4xl mb-6">link</span>
                                 <h4 className="text-xl font-black uppercase mb-4 tracking-tight">Early Access Vault</h4>
                                 <p className="text-xs text-gray-400 italic font-medium leading-relaxed mb-8">Access the newest programs 48 hours before public release.</p>
                                 <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Navigate to Vault</button>
                              </div>
                              <div className="bg-secondary/5 p-10 rounded-[3rem] border-2 border-secondary/20">
                                 <span className="material-symbols-outlined text-secondary text-4xl mb-6">workspace_premium</span>
                                 <h4 className="text-xl font-black uppercase mb-4 tracking-tight">Identity Badges</h4>
                                 <p className="text-xs text-gray-400 italic font-medium leading-relaxed mb-8">Your unique digital signature for the live-stream chat.</p>
                                 <div className="flex gap-4"><div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white"><span className="material-symbols-outlined">stars</span></div></div>
                              </div>
                           </div>
                           <div className="p-12 bg-black rounded-[3rem] text-white">
                              <h4 className="text-4xl font-black uppercase mb-6 tracking-tighter">Direct Executive Line</h4>
                              <p className="text-gray-400 text-sm font-medium italic leading-relaxed mb-10">As a {userProfile.activeSubscription} member, you have direct priority in the Studio multiverse.</p>
                              <button onClick={() => changeTab('contact')} className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all">Submit Executive Inquiry</button>
                              </div>
                              </div>}
                              {profileSubTab === 'inbox' && <InboxPanel db={db} userId={userProfile.id} />}
                              </div>
               </div>
            </div>
          </section>
        )}

        {activeTab === 'admin' && isLoggedIn && userProfile?.email === '3dma369@proton.me' && (
          <section className="max-w-7xl mx-auto px-4 py-24 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8">
               <div><h2 className="text-8xl font-black tracking-tighter uppercase mb-4 leading-none">Executive Suite</h2><p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">T.U Studio Governance</p></div>
               <div className="flex bg-gray-100 dark:bg-black p-1.5 rounded-[2rem] shadow-inner flex-wrap gap-1">
                  {['dashboard', 'inbox', 'empire', 'ops', 'treasury', 'legal', 'programs', 'web3'].map(v => (
                    <button key={v} onClick={() => setAdminView(v as any)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${adminView === v ? 'bg-primary text-white shadow-xl' : 'text-gray-400 hover:text-gray-900'}`}>{v}</button>
                  ))}
               </div>
            </div>

            {adminView === 'inbox' && (
              <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                <InboxPanel db={db} userId={userProfile.id || auth.currentUser?.uid} />
              </div>
            )}

            {adminView === 'empire' && (
              <Suspense fallback={<div className="p-12 text-center">Loading Empire Admin…</div>}>
                <EmpireAdmin config={tuStudioConfig} currentUser={userProfile ? { fullName: userProfile.fullName, email: userProfile.email, id: userProfile.id } : null} onLogout={() => { localStorage.removeItem('authToken'); window.location.href = '/'; }} />
              </Suspense>
            )}

            {adminView === 'ops' && (
              <Suspense fallback={<div className="p-12 text-center">Loading Empire Ops…</div>}>
                <EmpireOps config={tuStudioOpsConfig} db={db} currentUser={userProfile ? { fullName: userProfile.fullName, email: userProfile.email, id: userProfile.id } : null} />
              </Suspense>
            )}

            {adminView === 'programs' && (
              <div className="space-y-12 animate-fadeIn">
                 <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Program Management</h3>
                 <div className="grid md:grid-cols-3 gap-8">
                    {adminPrograms.length === 0 ? (
                      <div className="md:col-span-3 p-12 text-center bg-gray-50 dark:bg-black rounded-3xl">
                        <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">subscriptions</span>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No programs yet. Create production programs, brand collaborations, or service offerings.</p>
                      </div>
                    ) : adminPrograms.map(p => (
                      <div key={p.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">{p.tier || 'Program'}</p>
                        <h4 className="text-2xl font-black uppercase tracking-tight mb-4">{p.name}</h4>
                        <p className="text-xs text-gray-500 italic mb-6 line-clamp-3">{p.description}</p>
                        <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
                          <span className="text-lg font-black">${p.price?.toLocaleString() || '0'}</span>
                          <span className="text-[10px] font-black uppercase text-gray-400">{p.subscribers || 0} subscribers</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {adminView === 'shop' && (
              <div className="space-y-12 animate-fadeIn">
                 <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Shop Management</h3>
                 <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Product catalog management coming soon. Use Empire Admin → Products section for the full catalog UI.</p>
              </div>
            )}

            {adminView === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[{ label: 'Productions', val: adminPrograms.length, icon: 'movie' }, { label: 'Treasury Balance', val: '$142.5K', icon: 'account_balance' }, { label: 'Active Unionists', val: '4.2K', icon: 'groups' }, { label: 'Executive Tasks', val: '12', icon: 'rule' }].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl">{stat.icon}</span></div>
                    <div className="text-5xl font-black mb-1 tracking-tighter">{stat.val}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {adminView === 'treasury' && (
               <div className="space-y-12 animate-fadeIn">
                  <div className="grid lg:grid-cols-3 gap-12">
                     <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Global Ledger</h3>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead className="bg-gray-50 dark:bg-black/50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                 <tr><th className="p-8">Timestamp</th><th className="p-8">Description</th><th className="p-8 text-right">Amount</th></tr>
                              </thead>
                              <tbody>
                                 {studioTransactions.map(t => (
                                   <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 transition-all">
                                      <td className="p-8 text-[11px] font-bold text-gray-500">{t.date}</td>
                                      <td className="p-8 text-sm font-black uppercase tracking-tight">{t.description}</td>
                                      <td className={`p-8 text-right font-black text-lg ${t.type === 'Income' ? 'text-secondary' : 'text-red-500'}`}>${t.amount.toLocaleString()}</td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                     <div className="bg-black text-white p-12 rounded-[4rem] shadow-2xl flex flex-col justify-between">
                        <div>
                           <h3 className="text-4xl font-black uppercase tracking-tighter mb-6 leading-none">Capital <br />Adjustment</h3>
                           <p className="text-gray-400 font-medium italic mb-12 text-sm">Direct executive control over creator payouts and platform expenses.</p>
                           <div className="space-y-6">
                              <select className="w-full bg-white/10 p-6 rounded-[1.5rem] border-none font-bold text-sm text-white focus:ring-2 focus:ring-primary"><option>Liam Vance</option><option>Elena Rossi</option><option>AWS Core Billing</option></select>
                              <input className="w-full bg-white/10 p-6 rounded-[1.5rem] border-none font-bold text-sm text-white focus:ring-2 focus:ring-primary" placeholder="Adjustment (+/-)" />
                              <textarea className="w-full bg-white/10 p-6 rounded-[1.5rem] border-none font-bold text-sm text-white h-32 resize-none" placeholder="Executive Justification..." />
                           </div>
                        </div>
                        <button className="w-full py-8 bg-primary text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-[2rem] mt-12 shadow-2xl shadow-primary/30 active:scale-95 transition-all">Authorize Capital Move</button>
                     </div>
                  </div>
               </div>
            )}

            {adminView === 'legal' && (
               <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl animate-fadeIn">
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">Universal Agreement Modification</h3>
                  <div className="grid md:grid-cols-2 gap-12">
                     {globalAgreements.map(a => (
                       <div key={a.id} className="p-10 border border-gray-100 dark:border-gray-800 rounded-[3.5rem] space-y-8 bg-gray-50 dark:bg-black/50">
                          <div className="flex justify-between items-center">
                             <h4 className="text-2xl font-black uppercase leading-none">{a.title}</h4>
                             <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-lg">v{a.version}</span>
                          </div>
                          <textarea className="w-full bg-white dark:bg-black p-8 rounded-[2rem] border-none font-medium text-xs leading-relaxed h-64 resize-none shadow-inner" defaultValue={a.content} />
                          <button className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Apply Universal Update</button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

             {adminView === 'web3' && (
                <div className="space-y-12 animate-fadeIn">
                   <div className="grid lg:grid-cols-2 gap-12">
                      {/* CRYPTO SELECTION */}
                      <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                         <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Accepted Assets</h3>
                         <div className="space-y-6">
                            {studioSettings.acceptedCryptos.map(crypto => (
                               <div key={crypto.id} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-primary">{crypto.symbol === 'ETH' ? 'currency_exchange' : 'payments'}</span>
                                     </div>
                                     <div>
                                        <p className="font-black uppercase text-sm">{crypto.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{crypto.network}</p>
                                     </div>
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      const updated = {
                                        ...studioSettings,
                                        acceptedCryptos: studioSettings.acceptedCryptos.map(c => c.id === crypto.id ? { ...c, enabled: !c.enabled } : c)
                                      };
                                      setStudioSettings(updated);
                                      await userService.updateStudioSettings(updated);
                                    }}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${crypto.enabled ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50'}`}
                                  >
                                    {crypto.enabled ? 'Enabled' : 'Disabled'}
                                  </button>
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* WALLET MANAGEMENT */}
                      <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                         <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Studio Wallets</h3>
                         <div className="space-y-6 mb-10">
                            {studioSettings.adminWallets.map(wallet => (
                               <div key={wallet.id} className="p-8 bg-gray-50 dark:bg-black rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-4 relative group">
                                  <div className="flex justify-between items-start">
                                     <div>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">{wallet.network}</p>
                                        <h4 className="text-xl font-black uppercase mt-1">{wallet.label}</h4>
                                     </div>
                                     {wallet.isDefault && <span className="material-symbols-outlined text-secondary text-base">verified</span>}
                                  </div>
                                  <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                     <span className="text-[10px] font-mono text-gray-500 break-all">{wallet.address}</span>
                                     <button className="material-symbols-outlined text-primary text-sm shrink-0" onClick={() => navigator.clipboard.writeText(wallet.address)}>content_copy</button>
                                  </div>
                                  <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        className="material-symbols-outlined text-blue-500 text-sm"
                                        onClick={() => {
                                          const newLabel = prompt("Edit Label:", wallet.label);
                                          const newAddress = prompt("Edit Address:", wallet.address);
                                          if (newLabel && newAddress) {
                                            const updated = {
                                              ...studioSettings,
                                              adminWallets: studioSettings.adminWallets.map(w => w.id === wallet.id ? { ...w, label: newLabel, address: newAddress } : w)
                                            };
                                            setStudioSettings(updated);
                                            userService.updateStudioSettings(updated);
                                          }
                                        }}
                                      >
                                        edit
                                      </button>
                                      <button 
                                        className="material-symbols-outlined text-red-500 text-sm"
                                        onClick={async () => {
                                          const updated = {
                                            ...studioSettings,
                                            adminWallets: studioSettings.adminWallets.filter(w => w.id !== wallet.id)
                                          };
                                          setStudioSettings(updated);
                                          await userService.updateStudioSettings(updated);
                                        }}
                                      >
                                        delete
                                      </button>
                                  </div>
                               </div>
                            ))}
                         </div>
                         <button 
                            onClick={() => {
                              const address = prompt("Enter Wallet Address:");
                              if (!address) return;
                              const label = prompt("Enter Label (e.g., Main Savings):", "New Wallet");
                              const network = prompt("Enter Network:", "Ethereum Mainnet");
                              if (address && label && network) {
                                const newWallet: DigitalWallet = {
                                  id: Date.now().toString(),
                                  network,
                                  address,
                                  label,
                                  isDefault: studioSettings.adminWallets.length === 0
                                };
                                const updated = { ...studioSettings, adminWallets: [...studioSettings.adminWallets, newWallet] };
                                setStudioSettings(updated);
                                userService.updateStudioSettings(updated);
                              }
                            }}
                            className="w-full py-6 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] flex items-center justify-center gap-4 text-gray-300 hover:text-primary hover:border-primary transition-all group"
                          >
                            <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">add_task</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New Studio Wallet</span>
                         </button>
                      </div>
                   </div>
                </div>
             )}
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-24 bg-gray-50/50 dark:bg-black/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-16 text-center md:text-left">
           <div>
              <span className="text-4xl font-black tracking-tighter cursor-pointer" onClick={() => changeTab('home')}>T.U<span className="text-primary uppercase text-[10px] ml-1">Studio</span></span>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-3">Executive Multimedia Production • San Francisco</p>
           </div>
           <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <a href="#" className="hover:text-primary transition-colors">Privacy Union</a>
              <a href="#" className="hover:text-primary transition-colors">Usage Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Studio News</a>
           </div>
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">© 2024 T.U Multimedia Studio • Eric A. Molina Denegri</p>
        </div>
      </footer>

      {/* STUDIO PORTAL MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowLoginModal(false)} />
          <div className="relative bg-white dark:bg-gray-950 w-full max-w-md p-5 md:p-6 rounded-[2rem] shadow-2xl animate-scaleIn border border-white/5 overflow-y-auto max-h-[95vh] no-scrollbar">
             <div className="text-center mb-4">
                <div className="w-14 h-14 bg-primary rounded-[1.5rem] mx-auto flex items-center justify-center text-white mb-4 shadow-xl shadow-primary/40 rotate-3"><span className="material-symbols-outlined text-3xl font-black">play_circle</span></div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tighter mb-1 uppercase leading-none">{authMode === 'login' ? 'Studio Portal' : 'Create Identity'}</h3>
                <p className="text-[8px] font-black uppercase text-gray-500 tracking-[0.2em]">{authMode === 'login' ? 'Access the Union of Reality & Art' : 'Join the Molina Multimedia Network'}</p>
             </div>
             
             <form onSubmit={handleLogin} className="space-y-6">
                <div className="flex bg-gray-100 dark:bg-black p-1.5 rounded-[2rem] mb-10 shadow-inner">
                   <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>Log In</button>
                   <button type="button" onClick={() => setAuthMode('signup')} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-white dark:bg-gray-800 text-primary shadow-xl' : 'text-gray-400'}`}>Sign Up</button>
                </div>

                <div className="space-y-4">
                   {authMode === 'signup' && (
                     <input className="w-full px-8 py-6 bg-gray-50 dark:bg-black rounded-3xl border-none text-sm font-bold shadow-inner" placeholder="Public Identity / Full Name" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                   )}
                   <input className="w-full px-8 py-6 bg-gray-50 dark:bg-black rounded-3xl border-none text-sm font-bold shadow-inner" placeholder="Direct Email Address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                   <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-8 py-6 bg-gray-50 dark:bg-black rounded-3xl border-none text-sm font-bold shadow-inner" placeholder="Security Passcode" required />
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-6">
                   {['Subscriber', 'Associate', 'Admin'].map(r => (
                     <button key={r} type="button" onClick={() => setLoginRole(r as UserRole)} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${loginRole === r ? 'border-primary bg-primary/5 text-primary scale-105 shadow-xl shadow-primary/10' : 'border-gray-100 dark:border-gray-800 text-gray-400 opacity-60 hover:opacity-100'}`}>
                        <span className="material-symbols-outlined text-2xl">{r === 'Subscriber' ? 'person' : r === 'Associate' ? 'groups' : 'security'}</span>
                        <p className="text-[9px] font-black uppercase tracking-tighter">{r}</p>
                     </button>
                   ))}
                </div>

                <button type="submit" className="w-full py-8 bg-primary text-white font-black uppercase text-xs tracking-[0.3em] rounded-[2.5rem] shadow-2xl shadow-primary/30 active:scale-95 transition-all mt-6">
                  {authMode === 'login' ? 'Verify Studio Access' : 'Establish Studio Identity'}
                </button>

                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase"><span className="bg-white dark:bg-gray-950 px-6 text-gray-400 tracking-[0.3em]">Unionize Via</span></div>
                </div>

                {/* SOCIAL LOGINS */}
                <div className="grid grid-cols-3 gap-6">
                   <button type="button" onClick={handleGoogleLogin} className="py-5 rounded-3xl border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary transition-all flex items-center justify-center group"><img src="https://www.google.com/favicon.ico" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" alt="Google" /></button>
                   <button type="button" className="py-5 rounded-3xl border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary transition-all flex items-center justify-center group"><img src="https://www.facebook.com/favicon.ico" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" alt="Meta" /></button>
                   <button type="button" className="py-5 rounded-3xl border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary transition-all flex items-center justify-center group"><span className="material-symbols-outlined text-gray-900 dark:text-white text-3xl opacity-30 group-hover:opacity-100">cloud</span></button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* TALENT SUBMISSION MODAL */}
      {showSubmissionModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowSubmissionModal(false)} />
          <div className="relative bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-y-auto max-h-[90vh] animate-scaleIn p-14 border border-white/5">
              <h2 className="text-6xl font-black uppercase tracking-tighter mb-4 leading-none">The Collective</h2>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] mb-12">Submit your vision to Tangible Union</p>

              <div className="space-y-8 text-left text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-10 max-h-[40vh] overflow-y-auto pr-4">
                <div>
                  <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-3">Tangible Union — Build. Create. Collaborate. Earn.</h3>
                  <p className="italic text-gray-500 dark:text-gray-400 mb-4">A new creative community for San Francisco's next generation of creators, artists, makers, and digital entrepreneurs.</p>
                  <p>You have the ideas. You have the skills. Now let's build the team around them.</p>
                  <p className="mt-2">Many talented creators have everything they need to make something great — except the space, equipment, crew, production resources, or network to make it happen. Tangible Union is building that infrastructure.</p>
                  <p className="mt-2">We are creating a co-op-style creative ecosystem where people can meet collaborators, form production teams, share resources, develop projects, teach their skills, and create content with the potential to generate real economic opportunities.</p>
                </div>

                <div>
                  <h4 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-3">Who Are We Looking For?</h4>
                  <ul className="space-y-2 text-xs">
                    <li>🎬 <strong>Video & Audio Production</strong> — Directors • Cinematographers • Camera Operators • Editors • Sound Engineers • Producers • Production Crew</li>
                    <li>📡 <strong>Digital Creators & Streamers</strong> — YouTubers • Streamers • Podcasters • Livestreamers • Broadcasters • Content Creators</li>
                    <li>🎨 <strong>Visual & Fine Arts</strong> — Graphic Designers • Illustrators • Motion Artists • Animators • Photographers • Visual Storytellers</li>
                    <li>✍️ <strong>Writers & Journalists</strong> — Scriptwriters • Journalists • Researchers • Storytellers • Narrative Strategists • Content Writers</li>
                    <li>🛠 <strong>Makers & Tech Innovators</strong> — Makers • Hackers • Technologists • Prop Designers • Fabricators • Digital Asset Creators</li>
                    <li>🧑‍🏫 <strong>Educators & Community Builders</strong> — Teachers • Workshop Leaders • Mentors • Community Organizers • Creative Directors • Industry Professionals</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-3">Don't Create Alone.</h4>
                  <p className="italic">A filmmaker finds a writer. A streamer finds a crew. A journalist finds a designer. A producer finds an editor. A maker finds a media team. A creator finds a community.</p>
                  <p className="mt-2">Together, we can turn individual skills into creative projects, productions, audiences, and businesses.</p>
                </div>

                <div>
                  <h4 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-3">What We're Building</h4>
                  <ul className="space-y-1 text-xs">
                    <li><strong>SPACE</strong> — A place to meet, plan, create, and produce.</li>
                    <li><strong>EQUIPMENT</strong> — Shared production resources to help turn ideas into reality.</li>
                    <li><strong>CREWS</strong> — Connect with people who have complementary skills.</li>
                    <li><strong>COLLABORATION</strong> — Build projects across disciplines instead of working alone.</li>
                    <li><strong>KNOWLEDGE</strong> — Teach what you know. Learn from others.</li>
                    <li><strong>PRODUCTION</strong> — Develop and produce content on a regular basis.</li>
                    <li><strong>ECONOMIC OPPORTUNITY</strong> — Explore ways to turn creative skills and digital content into sustainable income.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-3">This Is Not Just An Internship.</h4>
                  <p>It's an invitation to build something together. We are looking for people who want to create, not just people looking for a short-term position.</p>
                  <p className="mt-2">Whether you're an experienced creator, a student with an idea, a recent graduate, an artist looking for collaborators, or someone who wants to learn by doing — <strong>there's a place for you in The Collective.</strong></p>
                </div>

                <div className="text-center pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Create • Collaborate • Learn • Produce • Grow</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mt-3">Tangible Union — San Francisco, CA</p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                // sync double-submit guard (state update can race with rapid clicks)
                if (submittingRef.current || isSubmitting) return;
                submittingRef.current = true;
                setIsSubmitting(true);
                const form = e.currentTarget as HTMLFormElement;

                // --- HARD VALIDATION GATE (also runs from the button click below) ---
                const nameVal = (form[0] as HTMLInputElement).value.trim();
                const emailVal = (form[1] as HTMLInputElement).value.trim();
                const disciplineVal = (form[2] as HTMLSelectElement).value;
                const bioVal = (form[3] as HTMLTextAreaElement).value.trim();
                if (!nameVal) { showToast('Please enter your legal name so admin can address you.', 'error'); setIsSubmitting(false); submittingRef.current = false; return; }
                if (!emailValid(emailVal)) { showToast('That email is not valid. We need a real address (you@domain.com) to reply to your submission.', 'error'); setIsSubmitting(false); submittingRef.current = false; (form[1] as HTMLInputElement).focus(); return; }
                if (!disciplineVal) { showToast('Pick a discipline so we can route your vision to the right room.', 'error'); setIsSubmitting(false); submittingRef.current = false; return; }
                if (bioVal.length < 20) { showToast('Tell us a little more about your specialty (at least 20 characters).', 'error'); setIsSubmitting(false); submittingRef.current = false; return; }
                // File-size gate BEFORE upload so user is never surprised by a silent failure.
                if (submissionFile && submissionFile.size > MAX_ATTACH_BYTES) {
                  showToast(`File too large (${byteFormat(submissionFile.size)}). Maximum attachment is ${MAX_ATTACH_LABEL}. Please resize or pick a smaller file before submitting.`, 'error');
                  setIsSubmitting(false);
                  submittingRef.current = false;
                  return;
                }

                const file = submissionFile;
                let fileUrl = '';
                let fileData = ''; // inline base64 fallback so admin can ALWAYS see the attachment
                let uploadFailed = false;
                let uploadSkipped = false;
                if (file) {
                  // Try Firebase Storage first (6s budget, generous for warm bucket)
                  try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const path = `submissions/${Date.now()}_${safeName}`;
                    const r = storageRef(getStorage(), path);
                    const uploadPromise = uploadBytes(r, file).then(async () => {
                      fileUrl = await getDownloadURL(r);
                    });
                    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Upload timed out (6s)')), 6000));
                    await Promise.race([uploadPromise, timeout]);
                  } catch (err: any) {
                    console.warn('[collect] storage upload failed, falling back to inline:', err?.message || err);
                    uploadFailed = true;
                  }
                  // Inline base64 fallback — works regardless of Storage bucket state.
                  // Cap at ~1.8MB to stay under Firestore doc limit (~1MB after overhead).
                  if (uploadFailed && file.size <= 1800000) {
                    try {
                      const b64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || ''));
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(file);
                      });
                      fileData = b64; // data:image/png;base64,...
                      uploadFailed = false; // rescued — admin CAN see it
                      uploadSkipped = false;
                      console.log('[collect] inline fallback OK, size=', b64.length);
                    } catch (err: any) {
                      console.error('[collect] inline fallback failed:', err?.message || err);
                      uploadFailed = true;
                    }
                  } else if (uploadFailed && file.size > 1800000) {
                    uploadFailed = true; // too big for inline, flag only
                    uploadSkipped = true;
                  }
                }
                const submission = {
                  name: (form[0] as HTMLInputElement).value,
                  email: (form[1] as HTMLInputElement).value,
                  contact: (form[1] as HTMLInputElement).value,
                  discipline: (form[2] as HTMLSelectElement).value,
                  bio: (form[3] as HTMLTextAreaElement).value,
                  fileType: file?.type?.startsWith('image/') ? 'Image' : file?.type?.startsWith('video/') ? 'Reel' : 'Document',
                  fileName: file?.name || "No File",
                  fileUrl,
                  fileData,
                  fileSize: file?.size || 0,
                  uploadFailed,
                  uploadSkipped,
                  status: 'Pending' as const,
                  uid: auth.currentUser?.uid || 'guest',
                  createdAt: new Date().toISOString()
                };
                try {
                  await addDoc(collection(db, "submissions"), submission);
                  let msg = "Welcome to The Collective. Your vision has been transmitted to Tangible Union.";
                  if (uploadFailed && uploadSkipped) {
                    msg = "Submission received, but the file was too large to attach (>1.8MB). Storage upload is also unavailable — admin will see your message without the file.";
                  } else if (uploadFailed) {
                    msg = "Submission received — but the file could not be uploaded. Try a smaller file or different format.";
                  } else if (fileData && !fileUrl) {
                    msg = "Submission received. Storage was offline, so your file was attached inline — admin can view it from this listing.";
                  }
                  showToast(msg, uploadFailed ? 'warn' : 'success');
                  setShowSubmissionModal(false);
                  setSubmissionFile(null);
                  setIsSubmitting(false);
                  submittingRef.current = false;
                } catch (err: any) {
                  showToast(`Submission failed: ${err?.message || 'unknown error'}`, 'error');
                  setIsSubmitting(false);
                  submittingRef.current = false;
                }
              }}>
                <div className="grid grid-cols-2 gap-6">
                  <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Legal Name" required />
                  <input className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner" placeholder="Direct Email" type="email" required />
                </div>
                <select required className="w-full bg-gray-50 dark:bg-black border-none rounded-2xl p-6 text-sm font-bold shadow-inner">
                  <option value="">Select your discipline</option>
                  <option>🎬 Video & Audio Production</option>
                  <option>📡 Digital Creators & Streamers</option>
                  <option>🎨 Visual & Fine Arts</option>
                  <option>✍️ Writers & Journalists</option>
                  <option>🛠 Makers & Tech Innovators</option>
                  <option>🧑‍🏫 Educators & Community Builders</option>
                </select>
                <textarea className="w-full bg-gray-50 dark:bg-black border-none rounded-[2.5rem] p-8 h-32 text-sm font-bold shadow-inner resize-none" placeholder="Describe your creative specialty, philosophy, and what you want to build in The Collective..." required />
                <div className="p-10 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] text-center group cursor-pointer hover:border-primary transition-all">
                   <input type="file" onChange={e => {
                       const f = e.target.files?.[0] || null;
                       if (f && f.size > MAX_ATTACH_BYTES) {
                         showToast(`File too large (${byteFormat(f.size)}). Max attachment is ${MAX_ATTACH_LABEL}.`, 'error');
                         // clear the field so the user must pick again
                         e.target.value = '';
                         setSubmissionFile(null);
                         return;
                       }
                       setSubmissionFile(f);
                     }} className="hidden" id="file-upload" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt" />
                   <label htmlFor="file-upload" className="cursor-pointer block">
                      <span className="material-symbols-outlined text-5xl text-gray-200 group-hover:text-primary transition-colors mb-3 block">cloud_upload</span>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">
                        {submissionFile ? `${submissionFile.name} · ${byteFormat(submissionFile.size)}` : "Attach Reel / Portfolio Assets"}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest block mt-2">
                        Max {MAX_ATTACH_LABEL} · Images · Video · PDF · Docs
                      </span>
                      {submissionFile && submissionFile.size > MAX_ATTACH_BYTES * 0.8 && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mt-2">
                          ⚠ Near {MAX_ATTACH_LABEL} cap — admin will receive the full file
                        </span>
                      )}
                   </label>
                </div>
                <div className="flex gap-6 pt-4">
                   <button type="button" onClick={() => setShowSubmissionModal(false)} className="flex-1 py-6 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-3xl font-black uppercase text-[10px] tracking-widest">Close</button>
                   <button type="button" disabled={isSubmitting} onClick={(ev) => {
                  ev.preventDefault();
                  const form = ev.currentTarget.closest('form');
                  if (!form) return;
                  // Run the browser's own constraint validation (catches type=email etc.)
                  if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
                    form.reportValidity();
                    return;
                  }
                  // Hard validation gate from the form's submit handler too.
                  // We duplicate key checks here so the button can never bypass via requestSubmit.
                  const emailEl = form.querySelector('input[type="email"]') as HTMLInputElement | null;
                  const bioEl = form.querySelector('textarea') as HTMLTextAreaElement | null;
                  if (emailEl && !emailValid(emailEl.value)) {
                    showToast('That email is not valid. We need a real address (you@domain.com) to reply to your submission.', 'error');
                    emailEl.focus();
                    return;
                  }
                  if (bioEl && bioEl.value.trim().length < 20) {
                    showToast('Tell us a little more about your specialty (at least 20 characters).', 'error');
                    bioEl.focus();
                    return;
                  }
                  if (submissionFile && submissionFile.size > MAX_ATTACH_BYTES) {
                    showToast(`File too large (${byteFormat(submissionFile.size)}). Maximum attachment is ${MAX_ATTACH_LABEL}.`, 'error');
                    return;
                  }
                  // Now safe to submit
                  const propsKey = Object.keys(form).find(k => k.startsWith('__reactProps'));
                  if (propsKey && form[propsKey].onSubmit) {
                    form[propsKey].onSubmit({ preventDefault: () => {}, currentTarget: form });
                  } else {
                    form.requestSubmit();
                  }
                }} className="flex-[2] py-6 bg-primary text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                   {isSubmitting ? 'Transmitting...' : 'Join The Collective'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
