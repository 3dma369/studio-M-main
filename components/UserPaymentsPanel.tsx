import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

type Order = {
  id: string;
  userId?: string;
  amount?: number;
  description?: string;
  type?: 'Income' | 'Expense' | 'Donation' | 'Purchase' | 'Subscription';
  status?: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  date?: any;
  createdAt?: any;
  productId?: string;
  programId?: string;
  method?: string;
};

export function UserPaymentsPanel({ db, userId, userEmail }: { db: any; userId: string; userEmail: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const unsub = onSnapshot(q, snap => {
        const docs: Order[] = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() } as Order));
        docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setOrders(docs);
        setLoading(false);
      }, err => { console.error('Orders load failed:', err); setLoading(false); });
      return () => unsub();
    } catch (e) { console.error(e); setLoading(false); }
  }, [db, userId]);

  const totalSpent = orders.filter(o => o.type !== 'Income' && o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const totalDonated = orders.filter(o => o.type === 'Donation' && o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
  const totalPurchases = orders.filter(o => o.type === 'Purchase' && o.status === 'Completed').length;
  const totalSubscriptions = orders.filter(o => o.type === 'Subscription' && o.status === 'Completed').length;

  return (
    <div className="animate-fadeIn">
      <h3 className="text-3xl font-black uppercase tracking-tighter mb-12">My Payments</h3>

      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="bg-primary/5 p-8 rounded-3xl border-2 border-primary/20">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Total Spent</p>
          <p className="text-3xl font-black tracking-tighter">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-secondary/5 p-8 rounded-3xl border-2 border-secondary/20">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Donated</p>
          <p className="text-3xl font-black tracking-tighter">${totalDonated.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-3xl">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Purchases</p>
          <p className="text-3xl font-black tracking-tighter">{totalPurchases}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-3xl">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Subscriptions</p>
          <p className="text-3xl font-black tracking-tighter">{totalSubscriptions}</p>
        </div>
      </div>

      <h4 className="text-xl font-black uppercase tracking-tight mb-6">Payment Methods</h4>
      <div className="space-y-4 mb-12">
        <div className="p-6 bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined">credit_card</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Default</p>
              <p className="text-lg font-black tracking-tight">•••• •••• •••• 4242</p>
              <p className="text-xs opacity-60 mt-1">Expires 12/27 · {userEmail}</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20">Manage</button>
        </div>
        <button className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex items-center justify-center gap-3 text-gray-400 hover:border-primary hover:text-primary transition-all">
          <span className="material-symbols-outlined">add</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Add Payment Method</span>
        </button>
      </div>

      <h4 className="text-xl font-black uppercase tracking-tight mb-6">Transaction History</h4>
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 dark:bg-black rounded-3xl">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">receipt_long</span>
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No transactions yet. Your purchases, donations, and subscriptions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-tight">{o.description || o.type || 'Transaction'}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {o.createdAt?.toDate?.()?.toLocaleDateString() || o.date || 'recent'} · {o.method || 'card'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black ${o.type === 'Income' ? 'text-secondary' : 'text-gray-900 dark:text-white'}`}>
                  {o.type === 'Income' ? '+' : '-'}${(o.amount || 0).toLocaleString()}
                </p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${
                  o.status === 'Completed' ? 'text-secondary' :
                  o.status === 'Pending' ? 'text-primary' :
                  o.status === 'Failed' ? 'text-red-500' : 'text-gray-400'
                }`}>{o.status || 'pending'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
