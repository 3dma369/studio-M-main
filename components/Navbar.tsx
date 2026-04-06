
import React from 'react';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoggedIn: boolean;
  userRole?: UserRole;
  onLogout: () => void;
  onOpenLogin: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isLoggedIn, 
  userRole, 
  onLogout, 
  onOpenLogin,
  cartCount,
  onOpenCart
}) => {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'programs', label: 'Programs' },
    { id: 'services', label: 'Services' },
    { id: 'shop', label: 'Shop' },
    { id: 'membership', label: 'Membership' },
    { id: 'community', label: 'Community' },
    { id: 'contact', label: 'Contact' },
  ];

  if (isLoggedIn && userRole === 'Admin') {
    tabs.push({ id: 'admin', label: 'Admin Panel' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined font-bold">play_circle</span>
            </div>
            <span className="text-2xl font-black tracking-tighter dark:text-white">Molina<span className="text-primary text-xs uppercase ml-1">Studio</span></span>
          </div>

          <div className="hidden md:flex items-center space-x-3 lg:space-x-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all px-2 py-1 rounded-lg ${
                  activeTab === tab.id 
                    ? 'text-primary bg-primary/5' 
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={onOpenCart}
              className="relative w-10 h-10 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <button 
                   onClick={() => setActiveTab('profile')}
                   className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:ring-2 hover:ring-primary transition-all overflow-hidden border-2 ${activeTab === 'profile' ? 'ring-2 ring-primary' : 'border-transparent'}`}
                >
                  <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                </button>
                <button 
                  onClick={onLogout}
                  className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button 
                onClick={onOpenLogin}
                className="px-5 py-2.5 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-transform"
              >
                Join Crew
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
