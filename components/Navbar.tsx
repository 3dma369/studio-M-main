import React, { useState } from 'react';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoggedIn: boolean;
  userRole?: UserRole;
  currentUserEmail?: string;
  currentUserPhoto?: string;
  currentUserEmoji?: string;
  currentUserName?: string;
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
  currentUserEmail,
  currentUserPhoto,
  currentUserEmoji,
  currentUserName,
  onLogout,
  onOpenLogin,
  cartCount,
  onOpenCart
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'programs', label: 'Programs' },
    { id: 'services', label: 'Services' },
    { id: 'products', label: 'Products' },
    { id: 'membership', label: 'Membership' },
    { id: 'mission', label: 'Mission' },
    { id: 'community', label: 'Community' },
    { id: 'contact', label: 'Contact' },
  ];

  if (isLoggedIn && userRole === 'Admin') {
    tabs.push({ id: 'admin', label: 'Admin Panel' });
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xl font-black uppercase tracking-tighter">Menu</span>
          <button 
            onClick={() => setMobileOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'text-primary bg-primary/5' 
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isLoggedIn && (
            <button 
              onClick={() => handleTabClick('profile')}
              className="w-full text-left px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Profile
            </button>
          )}
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined font-bold">play_circle</span>
              </div>
              <span className="text-2xl font-black tracking-tighter dark:text-white">T.U<span className="text-primary text-xs uppercase ml-1">Studio</span></span>
            </div>

            {/* Desktop nav */}
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

            {/* Right side actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Cart */}
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

              {/* User buttons */}
              {isLoggedIn ? (
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                  {currentUserEmail === '3dma369@proton.me' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'admin' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary'}`}
                    >
                      <span className="material-symbols-outlined text-sm mr-1 align-middle">admin_panel_settings</span>
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab(currentUserEmail === '3dma369@proton.me' ? 'admin' : 'profile')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:ring-2 hover:ring-primary transition-all overflow-hidden border-2 ${activeTab === 'profile' || activeTab === 'admin' ? 'ring-2 ring-primary' : 'border-transparent'}`}
                    title={currentUserEmail === '3dma369@proton.me' ? 'Admin Dashboard' : 'My Profile'}
                  >
                    {currentUserPhoto ? (
                      <img src={currentUserPhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : currentUserEmoji ? (
                      <span className="text-2xl bg-gradient-to-br from-primary/20 to-secondary/20 w-full h-full flex items-center justify-center">{currentUserEmoji}</span>
                    ) : (
                      <span className="text-lg font-black bg-gradient-to-br from-primary/30 to-secondary/30 w-full h-full flex items-center justify-center text-primary">
                        {(currentUserName || currentUserEmail || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-2xl transition-colors whitespace-nowrap shadow-md"
                    title="Log Out"
                  >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">logout</span>
                    Log Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onOpenLogin}
                  className="hidden md:block px-5 py-2.5 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-transform"
                >
                  Join Crew
                </button>
              )}

              {/* Mobile hamburger */}
              <button 
                onClick={() => setMobileOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};