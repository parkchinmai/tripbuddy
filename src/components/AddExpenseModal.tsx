/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Expense } from '../types';
import { HOTLINKS } from '../data';

type CategoryKey = 'Food' | 'Travel' | 'Accommodation' | 'Other';

const CATEGORY_OPTIONS: { id: CategoryKey; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'Food', label: 'อาหาร', icon: 'restaurant', color: 'text-primary', bg: 'bg-primary-light' },
  { id: 'Travel', label: 'การเดินทาง', icon: 'commute', color: 'text-tertiary-green', bg: 'bg-tertiary-green-light' },
  { id: 'Accommodation', label: 'ที่พัก', icon: 'hotel', color: 'text-secondary-orange', bg: 'bg-secondary-orange-light' },
  { id: 'Other', label: 'อื่นๆ', icon: 'category', color: 'text-slate-500', bg: 'bg-slate-100' }
];

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  memberNames?: string[];
}

// Helper to resolve real user profile pictures
const getAvatarUrlForName = (name: string): string => {
  if (name.includes('มี่')) return HOTLINKS.member1;
  if (name.includes('หนุน')) return HOTLINKS.member2;
  if (name.includes('ใหม่')) return HOTLINKS.member3;
  if (name.includes('บิว')) return HOTLINKS.member4;
  if (name.includes('ต้น')) return HOTLINKS.member2;
  if (name.includes('พลอย')) return HOTLINKS.member1;
  if (name.includes('สมชาย')) return HOTLINKS.arttoyBear;
  if (name.includes('ก้อย')) return HOTLINKS.avatarPink;
  if (name.includes('แพรว')) return HOTLINKS.avatarExplorer;
  if (name.includes('บาส')) return HOTLINKS.avatarRobot;

  const fallbacks = [
    HOTLINKS.avatarPink,
    HOTLINKS.avatarExplorer,
    HOTLINKS.avatarRobot,
    HOTLINKS.avatarFox,
    HOTLINKS.arttoyCat,
    HOTLINKS.arttoyDino
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return fallbacks[hash % fallbacks.length];
};

// Helper to assign a cute animal emoji to each participant based on their name (to match mockup)
const getEmojiForName = (name: string): string => {
  if (name.includes('มี่')) return '🐱';
  if (name.includes('หนุน')) return '🦁';
  if (name.includes('ใหม่')) return '🐷';
  if (name.includes('บิว')) return '🐼';
  if (name.includes('ต้น')) return '🐨';
  if (name.includes('พลอย')) return '🐰';
  if (name.includes('สมชาย')) return '🐻';
  if (name.includes('ก้อย')) return '🦊';
  if (name.includes('แพรว')) return '🐯';
  if (name.includes('บาส')) return '🦁';
  
  // Dynamic fallback
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const emojis = ['🐱', '🦁', '🐷', '🐼', '🦊', '🐰', '🐻', '🐯', '🐨', '🐨', '🐰', '🦊'];
  return emojis[hash % emojis.length];
};

// Helper to assign matching cute backgrounds
const getBgForEmoji = (name: string): string => {
  if (name.includes('มี่')) return 'bg-amber-100'; // Orange/yellow tint
  if (name.includes('หนุน')) return 'bg-amber-200'; // Lion warm tint
  if (name.includes('ใหม่')) return 'bg-pink-100'; // Pig pink tint
  if (name.includes('บิว')) return 'bg-blue-100'; // Blue tint
  
  // Dynamic fallback
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgColors = ['bg-pink-100', 'bg-purple-100', 'bg-blue-100', 'bg-amber-100', 'bg-emerald-100', 'bg-rose-100', 'bg-violet-100'];
  return bgColors[hash % bgColors.length];
};

export default function AddExpenseModal({ isOpen, onClose, onAddExpense, memberNames }: AddExpenseModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<CategoryKey>('Food');
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [paidBy, setPaidBy] = useState<string>('มี่');
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  const [partners, setPartners] = useState<{ name: string; checked: boolean }[]>([
    { name: 'มี่', checked: true },
    { name: 'หนุน', checked: true },
    { name: 'ใหม่', checked: true },
    { name: 'บิว', checked: true }
  ]);

  // Sync memberNames prop to partners state
  const memberNamesKey = memberNames ? memberNames.join(',') : '';
  useEffect(() => {
    if (memberNames && memberNames.length > 0) {
      setPartners(memberNames.map(name => ({ name, checked: true })));
      setPaidBy(memberNames[0]);
    } else {
      setPartners([
        { name: 'มี่', checked: true },
        { name: 'หนุน', checked: true },
        { name: 'ใหม่', checked: true },
        { name: 'บิว', checked: true }
      ]);
      setPaidBy('มี่');
    }
  }, [memberNamesKey, isOpen]);

  useEffect(() => {
    if (!categoryOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [categoryOpen]);

  if (!isOpen) return null;

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.id === category) ?? CATEGORY_OPTIONS[0];

  const activePartners = partners.filter(p => p.checked);
  const totalAmountNum = parseFloat(amount) || 0;

  // Calculate sum of custom shares
  const sumCustomShares = activePartners.reduce((sum, p) => {
    const val = parseFloat(customShares[p.name]) || 0;
    return sum + val;
  }, 0);

  const handleSplitModeChange = (mode: 'equal' | 'unequal') => {
    setSplitMode(mode);
    if (mode === 'unequal') {
      const count = activePartners.length;
      if (count > 0) {
        const equalShare = Math.round(totalAmountNum / count).toString();
        const newShares: Record<string, string> = {};
        activePartners.forEach(p => {
          newShares[p.name] = equalShare;
        });
        setCustomShares(newShares);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert('กรุณากรอกจำนวนเงิน');
      return;
    }
    if (!title) {
      alert('กรุณากรอกรายละเอียด');
      return;
    }

    const splitWith = activePartners.map(p => p.name);
    if (splitWith.length === 0) {
      alert('กรุณาเลือกผู้ร่วมหารอย่างน้อย 1 คน');
      return;
    }

    let parsedCustomShares: Record<string, number> | undefined = undefined;

    if (splitMode === 'unequal') {
      if (Math.abs(sumCustomShares - totalAmountNum) > 1) {
        alert(`ยอดเงินรวมของผู้หาร (฿${sumCustomShares.toLocaleString()}) ต้องเท่ากับจำนวนเงินทั้งหมด (฿${totalAmountNum.toLocaleString()})`);
        return;
      }

      parsedCustomShares = {};
      splitWith.forEach(name => {
        parsedCustomShares![name] = parseFloat(customShares[name]) || 0;
      });
    }

    onAddExpense({
      title,
      amount: totalAmountNum,
      category,
      date: 'วันนี้',
      paidBy,
      splitWith,
      customShares: parsedCustomShares,
    });

    // Reset fields
    setAmount('');
    setTitle('');
    setCategory('Food');
    setCategoryOpen(false);
    setSplitMode('equal');
    setCustomShares({});
    onClose();
  };

  const togglePartner = (index: number) => {
    const updated = [...partners];
    updated[index].checked = !updated[index].checked;
    setPartners(updated);

    // Update customShares in unequal mode
    if (splitMode === 'unequal') {
      const activeP = updated.filter(p => p.checked);
      const count = activeP.length;
      if (count > 0) {
        const equalShare = Math.round(totalAmountNum / count).toString();
        const newShares: Record<string, string> = {};
        activeP.forEach(p => {
          newShares[p.name] = equalShare;
        });
        setCustomShares(newShares);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-[#0b1c30]/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 scale-100 transition-transform duration-300 max-h-[92vh] flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-primary text-white flex justify-between items-center shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl">payments</span>
            <h2 className="text-lg sm:text-xl font-bold">เพิ่มค่าใช้จ่าย</h2>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">แชร์ค่าใช้จ่าย</span>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">

          {/* Description Field (รายละเอียด) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">รายละเอียด</label>
            <input 
              type="text" 
              required
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="เช่น ค่าที่พัก"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Side by side: Amount (จำนวนเงิน) and Category (หมวดหมู่) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Amount Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">จำนวนเงิน (บาท)</label>
              <input 
                type="number" 
                required
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 font-medium focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
                placeholder="0"
                value={amount}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const val = e.target.value;
                  setAmount(val);
                  
                  // Sync shares if already in unequal mode
                  if (splitMode === 'unequal') {
                    const parsedVal = parseFloat(val) || 0;
                    const count = activePartners.length;
                    if (count > 0) {
                      const share = Math.round(parsedVal / count).toString();
                      const newShares: Record<string, string> = {};
                      activePartners.forEach(p => {
                        newShares[p.name] = share;
                      });
                      setCustomShares(newShares);
                    }
                  }
                }}
              />
            </div>

            {/* Category Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">หมวดหมู่</label>
              <div className="relative" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => setCategoryOpen(o => !o)}
                  className="w-full flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedCategory.bg}`}>
                    <span className={`material-symbols-outlined text-[18px] ${selectedCategory.color}`}>{selectedCategory.icon}</span>
                  </span>
                  <span className="flex-1 text-left font-semibold truncate">{selectedCategory.label}</span>
                  <span className={`material-symbols-outlined text-slate-400 text-base transition-transform ${categoryOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>

                {categoryOpen && (
                  <div className="absolute z-30 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl p-2 animate-fade-in">
                    {CATEGORY_OPTIONS.map(opt => {
                      const active = opt.id === category;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setCategory(opt.id);
                            setCategoryOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            active ? 'bg-primary-light' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.bg}`}>
                            <span className={`material-symbols-outlined text-[18px] ${opt.color}`}>{opt.icon}</span>
                          </span>
                          <span className={`text-sm font-semibold flex-1 truncate ${active ? 'text-primary' : 'text-slate-700'}`}>
                            {opt.label}
                          </span>
                          {active && (
                            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Paid By Field (จ่ายโดย) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">จ่ายโดย</label>
            <div className="relative">
              <select 
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 appearance-none focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer"
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
              >
                {partners.map(p => (
                  <option key={p.name} value={p.name}>
                    {getEmojiForName(p.name)} {p.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base">
                keyboard_arrow_down
              </span>
            </div>
          </div>

          {/* Split Mode (วิธีหาร) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">วิธีหาร</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSplitModeChange('equal')}
                className={`py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                  splitMode === 'equal'
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                หารเท่ากัน
              </button>
              <button
                type="button"
                onClick={() => handleSplitModeChange('unequal')}
                className={`py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                  splitMode === 'unequal'
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                หารไม่เท่า
              </button>
            </div>
          </div>

          {/* Select Participants (เลือกผู้ร่วมหาร) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block">เลือกผู้ร่วมหาร</label>
            
            <div className="grid grid-cols-2 gap-3">
              {partners.map((partner, index) => (
                <label 
                  key={partner.name} 
                  className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-semibold text-slate-700"
                >
                  <input 
                    type="checkbox"
                    className="accent-primary w-4 h-4 rounded-md cursor-pointer"
                    checked={partner.checked}
                    onChange={() => togglePartner(index)}
                  />
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-slate-50 flex items-center justify-center">
                    <img 
                      src={getAvatarUrlForName(partner.name)} 
                      alt={partner.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span>{partner.name}</span>
                </label>
              ))}
            </div>

            <p className="text-[11px] font-semibold text-slate-400 pt-1">
              เลือกทั้งหมด {activePartners.length} คน
            </p>
          </div>

          {/* Custom Unequal shares input (if selected) */}
          {splitMode === 'unequal' && (
            <div className="space-y-2 border-t border-slate-100 pt-3 animate-fade-in">
              <div className="space-y-2">
                {activePartners.map(p => (
                  <div key={p.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-slate-50 flex items-center justify-center">
                        <img 
                          src={getAvatarUrlForName(p.name)} 
                          alt={p.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                    </div>
                    <input 
                      type="number"
                      required
                      className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-center text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={customShares[p.name] || ''}
                      onChange={e => {
                        setCustomShares({
                          ...customShares,
                          [p.name]: e.target.value
                        });
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Sum counter bottom right */}
              <div className="flex justify-end text-xs font-bold text-slate-400 pt-1">
                <span>รวม: {sumCustomShares.toLocaleString()} / {totalAmountNum.toLocaleString()} บาท</span>
              </div>
            </div>
          )}

          {/* Bottom actions (ยกเลิก / เพิ่ม) */}
          <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-full hover:bg-slate-50 transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-full transition-all cursor-pointer shadow-sm active:scale-95 hover:scale-[1.02]"
            >
              เพิ่ม
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
