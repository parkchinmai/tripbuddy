/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { getFallbackAvatar } from '../data';
import { uploadImage } from '../lib/r2';

export const NOTE_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'ไลค์' },
  { type: 'heart', emoji: '❤️', label: 'หัวใจ' },
  { type: 'wow', emoji: '😮', label: 'ว้าว' },
  { type: 'sad', emoji: '😢', label: 'เศร้า' },
  { type: 'angry', emoji: '😠', label: 'โกรธ' },
  { type: 'question', emoji: '🤔', label: 'สงสัย' },
];

const MAX_IMAGES = 4;

interface Note {
  id: string;
  author_name: string;
  text: string;
  images: string[];
  created_at: string;
  reactions: Record<string, string[]>;
}

interface BurstParticle {
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  size: number;
}

interface Burst {
  id: number;
  emoji: string;
  x: number;
  y: number;
  particles: BurstParticle[];
}

interface NotesTabProps {
  tripId: string;
  currentUserName: string;
  currentUserPhone: string;
  memberProfiles: any[];
}

function formatTime(s: string): string {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + '+07:00');
  if (isNaN(d.getTime())) return s;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function NotesTab({ tripId, currentUserName, currentUserPhone, memberProfiles }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [diag, setDiag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/notes?user=${encodeURIComponent(currentUserPhone)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setNotes(data);
      else setDiag(`GET ${res.status} ${JSON.stringify(data)}`);
    } catch (e) {
      setDiag(`GET threw ${String(e)}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const avatarFor = (name: string) => {
    const p = memberProfiles.find((m: any) => m.name === name);
    return p?.avatar_url || getFallbackAvatar(name);
  };

  const triggerBurst = (emoji: string, x: number, y: number) => {
    const id = Date.now() + Math.random();
    const particles: BurstParticle[] = Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 45 + Math.random() * 55;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 25,
        rot: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.08,
        size: 15 + Math.random() * 11,
      };
    });
    setBursts(prev => [...prev, { id, emoji, x, y, particles }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1100);
  };

  const react = async (note: Note, reaction: string, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const emoji = NOTE_REACTIONS.find(r => r.type === reaction)?.emoji || '';
    const wasMine = (note.reactions[reaction] || []).includes(currentUserName);
    try {
      const res = await fetch(`/api/notes/${note.id}/reactions?user=${encodeURIComponent(currentUserPhone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) throw new Error('reaction failed');
      const data = await res.json();
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, reactions: data.reactions || {} } : n));
      if (!wasMine) triggerBurst(emoji, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } catch {
      alert('เกิดข้อผิดพลาดในการแสดงความรู้สึก');
    }
  };

  const attachImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { alert(`แนบรูปได้สูงสุด ${MAX_IMAGES} รูป`); return; }
    const selected = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const f of selected) {
        const result = await uploadImage(f, 'notes');
        urls.push(result.url);
      }
      setImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      alert(err?.message || 'อัปโหลดรูปไม่สำเร็จ');
    }
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const postNote = async () => {
    if ((!text.trim() && images.length === 0) || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/notes?user=${encodeURIComponent(currentUserPhone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), images }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setText('');
      setImages([]);
      await loadNotes();
    } catch (e) {
      const err = String((e as any)?.message || e);
      alert(`โพสต์โน้ตไม่สำเร็จ (${err})`);
    }
    setPosting(false);
  };

  const deleteNote = async (note: Note) => {
    if (!window.confirm('ลบโน้ตนี้? รูปภาพที่แนบจะถูกลบออกด้วย')) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/notes/${note.id}?user=${encodeURIComponent(currentUserPhone)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setNotes(prev => prev.filter(n => n.id !== note.id));
    } catch {
      alert('ลบโน้ตไม่สำเร็จ');
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.text || '');
    setEditImages(note.images || []);
  };

  const attachEditImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - editImages.length;
    if (remaining <= 0) { alert(`แนบรูปได้สูงสุด ${MAX_IMAGES} รูป`); return; }
    const selected = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const f of selected) {
        const result = await uploadImage(f, 'notes');
        urls.push(result.url);
      }
      setEditImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      alert(err?.message || 'อัปโหลดรูปไม่สำเร็จ');
    }
    setUploadingImages(false);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const saveEdit = async (note: Note) => {
    if ((!editText.trim() && editImages.length === 0) || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/notes/${note.id}?user=${encodeURIComponent(currentUserPhone)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim(), images: editImages }),
      });
      if (!res.ok) throw new Error('edit failed');
      setEditingId(null);
      await loadNotes();
    } catch {
      alert('แก้ไขโน้ตไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    setSaving(false);
  };

  const canManage = (note: Note) => currentUserName === note.author_name;

  return (
    <div className="space-y-5">
      {/* Compose box */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-primary">edit_note</span>
          แจ้งเพื่อนในทริป
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เขียนโน้ตให้คนในทริป ข้อความทั่วไป หรืออัปเดตเรื่องที่จะต้องรู้กัน..."
          rows={3}
          className="w-full resize-none bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-[#0b1c30]/60 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-[#0b1c30]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-light px-3 py-2 rounded-full cursor-pointer hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">image</span>
              {uploadingImages ? 'กำลังอัปโหลด...' : 'แนบรูป'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => attachImages(e.target.files)}
            />
            {images.length > 0 && (
              <span className="text-[11px] text-slate-400 font-bold">{images.length}/{MAX_IMAGES} รูป</span>
            )}
          </div>
          <button
            onClick={postNote}
            disabled={(!text.trim() && images.length === 0) || posting}
            className="bg-secondary-orange hover:bg-secondary-orange-hover text-white font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">send</span>
            โพสต์
          </button>
        </div>
      </div>

      {diag && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-3 py-2 text-[11px] text-red-600 font-semibold break-all">
          DIAG: {diag}
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <p className="text-center text-sm text-slate-400 py-8">กำลังโหลดโน้ต...</p>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm font-bold text-slate-500">ยังไม่มีโน้ตในทริปนี้</p>
          <p className="text-xs text-slate-400 mt-1">เขียนโน้ตแรกเพื่อแจ้งเรื่องราวในทริปได้เลย</p>
        </div>
      ) : (
        notes.map((note) => {
          const myReaction = NOTE_REACTIONS.find(r => (note.reactions[r.type] || []).includes(currentUserName))?.type || '';
          return (
            <div key={note.id} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-start gap-3">
                <img src={avatarFor(note.author_name)} alt={note.author_name} className="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 truncate">{note.author_name}</p>
                      <p className="text-[11px] text-slate-400 font-semibold">{formatTime(note.created_at)}</p>
                    </div>
                    {canManage(note) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(note)}
                          className="text-slate-300 hover:text-primary cursor-pointer"
                          title="แก้ไขโน้ต"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => deleteNote(note)}
                          className="text-slate-300 hover:text-rose-500 cursor-pointer"
                          title="ลบโน้ต"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {editingId === note.id ? (
                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="เขียนโน้ต..."
                    rows={3}
                    className="w-full resize-none bg-white border border-slate-100 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {editImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {editImages.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-[#0b1c30]/60 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-[#0b1c30]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <button
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploadingImages}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-light px-3 py-2 rounded-full cursor-pointer hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">image</span>
                      {uploadingImages ? 'กำลังอัปโหลด...' : 'แนบรูป'}
                    </button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => attachEditImages(e.target.files)}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => saveEdit(note)}
                        disabled={(!editText.trim() && editImages.length === 0) || saving}
                        className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {note.text && (
                    <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>
                  )}

                  {note.images.length > 0 && (
                    <div className={`mt-3 grid gap-2 ${note.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {note.images.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={() => setLightbox(url)}
                          className={`rounded-xl object-cover border border-slate-100 cursor-pointer hover:opacity-90 transition-opacity ${note.images.length === 1 ? 'max-h-72 w-full' : 'aspect-square w-full'}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reactions */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                {NOTE_REACTIONS.map(r => {
                  const count = (note.reactions[r.type] || []).length;
                  const mine = (note.reactions[r.type] || []).includes(currentUserName);
                  return (
                    <button
                      key={r.type}
                      onClick={(e) => react(note, r.type, e)}
                      title={r.label}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold border transition-all cursor-pointer active:scale-90 ${
                        mine
                          ? 'bg-primary-light border-primary text-primary'
                          : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="leading-none">{r.emoji}</span>
                      {count > 0 && <span className="text-[11px]">{count}</span>}
                    </button>
                  );
                })}
                {myReaction && (
                  <span className="text-[10px] text-slate-400 font-semibold ml-auto">คุณตอบสนองด้วย {NOTE_REACTIONS.find(r => r.type === myReaction)?.emoji}</span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Confetti emoji burst overlay */}
      <div className="pointer-events-none fixed inset-0 z-[80]">
        {bursts.map(b => (
          <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
            {b.particles.map((p, i) => (
              <span
                key={i}
                className="confetti-emoji"
                style={{
                  fontSize: `${p.size}px`,
                  animationDelay: `${p.delay}s`,
                  ['--dx' as any]: `${p.dx}px`,
                  ['--dy' as any]: `${p.dy}px`,
                  ['--rot' as any]: `${p.rot}deg`,
                }}
              >
                {b.emoji}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Image lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#0b1c30]/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white bg-[#0b1c30]/60 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
