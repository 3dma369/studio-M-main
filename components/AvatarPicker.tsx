import React, { useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

const EMOJI_OPTIONS = [
  '😀','😎','🤩','🥳','🤠','🦄','🐉','🐲','🌟','⚡','🔥','💎',
  '🎬','🎨','🎤','🎸','🎧','🎮','🚀','🌙','👑','💫','🛸','🌀',
  '👨‍🎨','👩‍🎨','🧑‍💻','🧑‍🚀','🕵️','🦸','🧙','🧝','🦊','🐺','🦅','🐅',
  '🌈','🍀','🌺','🌊','🏔️','⚓','🗽','🗿','🎯','💰','🏆','🪐'
];

export function AvatarPicker({ db, userId, currentPhoto, currentEmoji, userName, size = 'lg' }: { db: any; userId: string; currentPhoto?: string; currentEmoji?: string; userName: string; size?: 'lg' | 'sm' }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEmoji = currentEmoji && !currentPhoto;
  const isPhoto = !!currentPhoto;
  const initial = !isPhoto && !isEmoji ? userName.charAt(0).toUpperCase() : null;

  const dim = size === 'lg' ? 'w-24 h-24' : 'w-12 h-12';
  const text = size === 'lg' ? 'text-5xl' : 'text-2xl';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please pick an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return; }

    setSaving(true);
    try {
      // Resize to 256x256 via canvas
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          // Cover crop
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale, h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          await updateDoc(doc(db, 'users', userId), {
            photoURL: dataUrl,
            avatarEmoji: null,
            updatedAt: new Date().toISOString()
          });
          setOpen(false);
          setSaving(false);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
      setSaving(false);
    }
  };

  const pickEmoji = async (emoji: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        avatarEmoji: emoji,
        photoURL: null,
        updatedAt: new Date().toISOString()
      });
      setOpen(false);
      setSaving(false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div className="relative group">
        {isPhoto ? (
          <img src={currentPhoto} className={`${dim} rounded-full border-4 border-primary p-1 mx-auto object-cover`} alt={userName} />
        ) : isEmoji ? (
          <div className={`${dim} rounded-full border-4 border-primary p-1 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center`}>
            <span className={text}>{currentEmoji}</span>
          </div>
        ) : (
          <div className={`${dim} rounded-full border-4 border-primary p-1 mx-auto bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center`}>
            <span className={`${text} font-black text-primary`}>{initial}</span>
          </div>
        )}
        <button
          onClick={() => setOpen(true)}
          className="absolute -bottom-2 -right-2 bg-primary text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          title="Change avatar"
        >
          <span className="material-symbols-outlined text-base">edit</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white dark:bg-gray-950 rounded-[3rem] shadow-2xl w-full max-w-lg p-10 animate-scaleIn">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Choose Avatar</h3>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-8">Upload a photo or pick an emoji</p>

            <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={saving}
              className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex items-center justify-center gap-3 hover:border-primary transition-all mb-6"
            >
              <span className="material-symbols-outlined text-3xl text-gray-400">cloud_upload</span>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-tight">Upload Photo</p>
                <p className="text-[10px] font-bold text-gray-400">JPG/PNG · max 5MB · auto-cropped to 256×256</p>
              </div>
            </button>

            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Or pick an emoji</p>
            <div className="grid grid-cols-12 gap-2 max-h-64 overflow-y-auto">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => pickEmoji(emoji)}
                  disabled={saving}
                  className={`aspect-square text-3xl rounded-2xl flex items-center justify-center transition-all hover:bg-primary/10 ${currentEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              disabled={saving}
              className="w-full mt-6 py-3 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-900"
            >
              {saving ? 'Saving…' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
