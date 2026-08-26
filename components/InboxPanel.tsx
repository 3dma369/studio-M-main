import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

type Submission = {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  message?: string;
  bio?: string;
  role?: string;
  vision?: string;
  discipline?: string;
  mode?: string;
  budget?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
  createdAt?: any;
  timestamp?: any;
  source?: string;
  type?: string;
  fileName?: string;
  fileUrl?: string;
  fileData?: string; // inline base64 fallback when Storage is unavailable
  fileType?: string;
  fileSize?: number;
  uploadFailed?: boolean;
  uploadSkipped?: boolean;
};

export function InboxPanel({ db, userId }: { db: any; userId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const subs: Submission[] = [];
      const unsub1 = onSnapshot(
        query(collection(db, 'submissions'), orderBy('createdAt', 'desc')),
        snap => {
          const docs: Submission[] = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data(), source: 'Creative Union' } as Submission));
          setSubmissions(prev => mergeById([...prev.filter(s => s.source !== 'Creative Union'), ...docs]));
          setLoading(false);
        },
        err => { console.error('Inbox submissions load failed:', err); setLoading(false); }
      );
      const unsub2 = onSnapshot(
        query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')),
        snap => {
          const docs: Submission[] = [];
          snap.forEach(d => docs.push({ id: 'cm_' + d.id, ...d.data(), source: 'Contact' } as Submission));
          setSubmissions(prev => mergeById([...prev.filter(s => s.source !== 'Contact'), ...docs]));
        },
        err => { console.error('Inbox contactMessages load failed:', err); }
      );
      return () => { unsub1(); unsub2(); };
    } catch (e) {
      console.error('Inbox query failed:', e);
      setLoading(false);
    }
  }, [db]);

  function mergeById(arr: Submission[]): Submission[] {
    const m = new Map<string, Submission>();
    arr.forEach(s => m.set(s.id, s));
    return Array.from(m.values()).sort((a, b) => {
      const at = (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)) || 0;
      const bt = (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)) || 0;
      return bt - at;
    });
  }

  const setStatus = async (id: string, status: 'pending' | 'approved' | 'rejected' | 'archived') => {
    try {
      const realId = id.startsWith('cm_') ? id.slice(3) : id;
      const coll = id.startsWith('cm_') ? 'contactMessages' : 'submissions';
      await updateDoc(doc(db, coll, realId), { status, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error('Status update failed:', e);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this submission permanently?')) return;
    try {
      const realId = id.startsWith('cm_') ? id.slice(3) : id;
      const coll = id.startsWith('cm_') ? 'contactMessages' : 'submissions';
      await deleteDoc(doc(db, coll, realId));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const bulkRemoveDuplicates = async () => {
    // Group by email+message signature, keep newest, delete older
    const groups = new Map<string, typeof submissions>();
    submissions.forEach(s => {
      const sig = `${(s.email||'').toLowerCase().trim()}::${(s.message||s.bio||s.vision||'').trim()}`;
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push(s);
    });
    let dupCount = 0;
    for (const [, arr] of groups) {
      if (arr.length <= 1) continue;
      arr.sort((a, b) => {
        const at = (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)) || 0;
        const bt = (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)) || 0;
        return bt - at;
      });
      // delete all but the first (newest)
      for (let i = 1; i < arr.length; i++) {
        try {
          const realId = arr[i].id.startsWith('cm_') ? arr[i].id.slice(3) : arr[i].id;
          const coll = arr[i].id.startsWith('cm_') ? 'contactMessages' : 'submissions';
          await deleteDoc(doc(db, coll, realId));
          dupCount++;
        } catch (e) {
          console.error('bulk delete failed:', e);
        }
      }
    }
    if (dupCount > 0) alert(`Removed ${dupCount} duplicate submissions.`);
    else alert('No duplicates found.');
  };

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => !s.status || s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    archived: submissions.filter(s => s.status === 'archived').length,
  };

  const filtered = submissions.filter(s => {
    if (filter !== 'all' && (s.status || 'pending') !== filter) return false;
    if (search) {
      const hay = `${s.name || s.fullName || ''} ${s.email || ''} ${s.message || s.bio || ''}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-3xl font-black uppercase tracking-tighter">Executive Inbox</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={bulkRemoveDuplicates}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
            title="Delete duplicate submissions (keeps newest)"
          >
            <span className="material-symbols-outlined text-sm align-middle mr-1">content_copy</span>
            Dedupe
          </button>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
            <span className="material-symbols-outlined text-base">inbox</span>
            {counts.all} total
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected', 'archived'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          >
            {f} <span className="opacity-50 ml-1">{counts[f]}</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Search by name, email, message…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-50 dark:bg-black p-5 rounded-2xl border-none font-bold shadow-inner mb-6 text-sm"
      />

      {loading ? (
        <div className="p-12 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest">Loading inbox…</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 dark:bg-black rounded-3xl">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">mail</span>
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
            {filter === 'all' ? 'No submissions yet. They will appear here when visitors submit the Creative Union or Transmit Vision forms.' : `No ${filter} submissions.`}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                  selected?.id === s.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-100 dark:border-gray-800 hover:border-primary/40 bg-white dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight truncate">{s.name || s.fullName || 'Anonymous'}</p>
                    <p className="text-[10px] font-bold text-gray-400 truncate">{s.email || 'no email'}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      s.status === 'approved'
                        ? 'bg-secondary/20 text-secondary'
                        : s.status === 'rejected'
                        ? 'bg-red-500/20 text-red-500'
                        : s.status === 'archived'
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {s.status || 'pending'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 italic">{(s.message || s.bio || s.vision || '').slice(0, 140)}</p>
                {s.source && (
                  <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest mt-2">{s.source}</p>
                )}
              </button>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-black p-8 rounded-3xl max-h-[600px] overflow-y-auto">
            {selected ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">From</p>
                  <p className="text-xl font-black uppercase tracking-tight">{selected.name || selected.fullName || 'Anonymous'}</p>
                  <a href={`mailto:${selected.email}`} className="text-sm text-primary font-bold hover:underline">{selected.email}</a>
                </div>
                {(selected.message || selected.bio || selected.vision) && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Message</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed whitespace-pre-wrap">
                      {selected.message || selected.bio || selected.vision}
                    </p>
                  </div>
                )}
                {selected.budget && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Budget</p>
                    <p className="text-sm font-bold">{selected.budget}</p>
                  </div>
                )}
                {selected.mode && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Type</p>
                    <p className="text-sm font-bold uppercase">{selected.mode}</p>
                  </div>
                )}
                {selected.discipline && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Discipline</p>
                    <p className="text-sm font-bold">{selected.discipline}</p>
                  </div>
                )}
                {selected.source && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Source</p>
                    <p className="text-sm font-bold uppercase">{selected.source}</p>
                  </div>
                )}
                {selected.fileUrl ? (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Attachment</p>
                    <div className="space-y-3">
                      {selected.fileType === 'Image' ? (
                        <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer">
                          <img src={selected.fileUrl} alt={selected.fileName} className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-800" />
                        </a>
                      ) : (
                        <a
                          href={selected.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary group"
                        >
                          <span className="material-symbols-outlined text-4xl text-primary">{selected.fileType === 'Reel' ? 'movie' : 'description'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{selected.fileName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {selected.fileType} · {Math.round((selected.fileSize || 0) / 1024)} KB
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">download</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : selected.fileData ? (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Attachment (inline — Storage offline)</p>
                    <div className="space-y-3">
                      {selected.fileData.startsWith('data:image/') ? (
                        <img src={selected.fileData} alt={selected.fileName} className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-800" />
                      ) : (
                        <a
                          href={selected.fileData}
                          download={selected.fileName}
                          className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary group"
                        >
                          <span className="material-symbols-outlined text-4xl text-primary">{selected.fileType === 'Reel' ? 'movie' : 'description'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{selected.fileName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {selected.fileType} · {Math.round((selected.fileSize || 0) / 1024)} KB · embedded
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">download</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : selected.fileName && selected.fileName !== 'No File' ? (
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Attachment</p>
                    {selected.uploadFailed && (
                      <p className="text-[10px] text-amber-500 font-bold mb-2">⚠ File upload failed (Storage bucket not enabled) — re-enable Storage in Firebase Console to receive files.</p>
                    )}
                    {selected.uploadSkipped && (
                      <p className="text-[10px] text-amber-500 font-bold mb-2">⚠ File too large for inline attach (&gt;1.8MB) and Storage offline.</p>
                    )}
                    <p className="text-sm font-bold">📎 {selected.fileName}</p>
                  </div>
                ) : null}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <a
                    href={`mailto:${selected.email}?subject=Re: Your submission to T.U Studio`}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-base">mail</span>
                    Reply via Email
                  </a>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setStatus(selected.id, 'approved')} className="py-3 bg-secondary/10 text-secondary rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-secondary hover:text-white">Approve</button>
                    <button onClick={() => setStatus(selected.id, 'rejected')} className="py-3 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-500 hover:text-white">Reject</button>
                    <button onClick={() => setStatus(selected.id, 'archived')} className="py-3 bg-gray-200 text-gray-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-gray-500 hover:text-white">Archive</button>
                  </div>
                  <button onClick={() => remove(selected.id)} className="w-full py-3 text-red-500 font-black uppercase text-[9px] tracking-widest hover:underline">Delete Permanently</button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">visibility</span>
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Select a submission to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
