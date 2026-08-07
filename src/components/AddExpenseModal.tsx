/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Expense } from '../types';
import { getFallbackAvatar } from '../data';
import { BillItem, calcBillSplit, calcFees, FeeConfig, FeeMode, FeeOrder } from '../lib/splitBill';
import { bangkokToday } from '../lib/date';

type CategoryKey = 'Food' | 'Travel' | 'Accommodation' | 'Shopping' | 'Activities' | 'Other';

const CATEGORY_OPTIONS: { id: CategoryKey; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'Food', label: 'อาหาร', icon: 'restaurant', color: 'text-primary', bg: 'bg-primary-light' },
  { id: 'Travel', label: 'การเดินทาง', icon: 'commute', color: 'text-tertiary-green', bg: 'bg-tertiary-green-light' },
  { id: 'Accommodation', label: 'ที่พัก', icon: 'hotel', color: 'text-secondary-orange', bg: 'bg-secondary-orange-light' },
  { id: 'Shopping', label: 'ช้อปปิ้ง', icon: 'shopping_bag', color: 'text-pink-600', bg: 'bg-pink-50' },
  { id: 'Activities', label: 'กิจกรรม', icon: 'attractions', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'Other', label: 'อื่นๆ', icon: 'category', color: 'text-slate-500', bg: 'bg-slate-100' }
];

interface MemberInfo {
  id?: string;
  name: string;
  avatarUrl: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense?: (expenseId: string, updates: Partial<Expense>) => void;
  editingExpense?: Expense | null;
  memberProfiles?: MemberInfo[];
  currentUserName?: string;
}

export default function AddExpenseModal({ isOpen, onClose, onAddExpense, onUpdateExpense, editingExpense, memberProfiles, currentUserName }: AddExpenseModalProps) {
  const [mode, setMode] = useState<'simple' | 'split'>('simple');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<CategoryKey>('Food');
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [paidBy, setPaidBy] = useState<string>('');
  const [paidByOpen, setPaidByOpen] = useState<boolean>(false);
  const paidByRef = useRef<HTMLDivElement>(null);
  const [paidByAvatar, setPaidByAvatar] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [splitItems, setSplitItems] = useState<BillItem[]>([]);
  const [feeMode, setFeeMode] = useState<FeeMode>('none');
  const [feeOrder, setFeeOrder] = useState<FeeOrder>('sc_then_vat');
  const feeConfig: FeeConfig = { feeMode, feeOrder };

  const [partners, setPartners] = useState<{ id?: string; name: string; avatarUrl: string; checked: boolean }[]>([]);

  // Convert stored shares (keyed by profile_id) to name-keyed for form/preview
  const toNameKeyedShares = (shares: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(shares)) {
      const partner = partners.find(p => p.id === key);
      result[partner ? partner.name : key] = val;
    }
    return result;
  };

  // Convert name-keyed shares to profile_id-keyed for storage
  const toIdKeyedShares = (shares: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [name, val] of Object.entries(shares)) {
      const partner = partners.find(p => p.name === name);
      result[partner?.id || name] = val;
    }
    return result;
  };

  // Sync memberProfiles prop to partners state
  const profileKey = memberProfiles ? memberProfiles.map(p => p.name).join(',') : '';
  useEffect(() => {
    if (memberProfiles && memberProfiles.length > 0) {
      const mapped = memberProfiles.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl || getFallbackAvatar(p.name), checked: true }));
      setPartners(mapped);
      const initialPaidBy = currentUserName && memberProfiles.some(p => p.name === currentUserName) ? currentUserName : memberProfiles[0].name;
      setPaidBy(initialPaidBy);
      const found = mapped.find(p => p.name === initialPaidBy);
      setPaidByAvatar(found?.avatarUrl || getFallbackAvatar(initialPaidBy));
    } else {
      setPartners([]);
      setPaidBy('');
      setPaidByAvatar('');
    }
  }, [profileKey, isOpen, currentUserName]);

  // Pre-fill form when editing an existing expense
  useEffect(() => {
    if (editingExpense && isOpen) {
      setTitle(editingExpense.title);
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category as CategoryKey);
      setPaidBy(editingExpense.paidBy);
      const found = partners.find(p => p.name === editingExpense.paidBy);
      setPaidByAvatar(found?.avatarUrl || '');

      const hasShares = !!editingExpense.customShares && Object.keys(editingExpense.customShares).length > 0;
      const shares: Record<string, string> = {};
      if (hasShares) {
        for (const [name, val] of Object.entries(toNameKeyedShares(editingExpense.customShares!))) {
          shares[name] = String(val);
        }
      }

      // Determine original save type: stored mode, or legacy heuristic
      let storedMode = editingExpense.mode;
      if (!storedMode) {
        if (hasShares) {
          // Legacy: shares summing exactly to amount ⇒ simple-unequal, otherwise split-bill
          const sum = Object.values(editingExpense.customShares!).reduce((s, v) => s + v, 0);
          storedMode = Math.abs(sum - editingExpense.amount) <= 0.009 ? 'simple' : 'split';
        } else {
          storedMode = 'simple';
        }
      }

      if (storedMode === 'split') {
        setMode('split');
        setSplitItems(editingExpense.splitItems && editingExpense.splitItems.length > 0
          ? editingExpense.splitItems
          : [{ name: editingExpense.title, price: editingExpense.amount, quantity: 1, type: 'shared' }]);
        setFeeMode(editingExpense.feeMode || 'none');
        setFeeOrder(editingExpense.feeOrder || 'sc_then_vat');
        setSplitMode(hasShares ? 'unequal' : 'equal');
        setCustomShares(shares);
      } else {
        setMode('simple');
        setSplitItems([]);
        setFeeMode(editingExpense.feeMode || 'none');
        setFeeOrder(editingExpense.feeOrder || 'sc_then_vat');
        setSplitMode(hasShares ? 'unequal' : 'equal');
        setCustomShares(shares);
      }
    }
  }, [editingExpense, isOpen]);

  useEffect(() => {
    if (!categoryOpen && !paidByOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
      if (paidByRef.current && !paidByRef.current.contains(e.target as Node)) {
        setPaidByOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [categoryOpen, paidByOpen]);

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

    const today = bangkokToday();
    const splitWith = activePartners.map(p => p.name);
    const splitWithIds = activePartners.map(p => p.id || p.name);
    if (splitWith.length === 0) {
      alert('กรุณาเลือกผู้ร่วมหารอย่างน้อย 1 คน');
      return;
    }
    if (!paidBy) {
      alert('กรุณาเลือกผู้จ่ายเงิน');
      return;
    }
    const selectedPayer = activePartners.find(p => p.name === paidBy);
    const paidById = selectedPayer?.id || paidBy;

    if (mode === 'split') {
      if (splitItems.length === 0) {
        alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
        return;
      }
      const sub = splitItems.reduce((s, i) => s + i.price * i.quantity, 0);
      if (sub === 0) {
        alert('กรุณากรอกราคารายการให้ถูกต้อง');
        return;
      }
      // Preserve original custom shares when editing without changing items/fees
      const storedItems = editingExpense?.splitItems;
      const legacySingle = !storedItems && splitItems.length === 1 && splitItems[0].price === editingExpense?.amount;
      const itemsUnchanged = editingExpense?.mode === 'split'
        ? !!(storedItems && JSON.stringify(splitItems) === JSON.stringify(storedItems))
        : legacySingle;
      const feeUnchanged = (editingExpense?.feeMode || 'none') === feeConfig.feeMode
        && (editingExpense?.feeOrder || 'sc_then_vat') === feeConfig.feeOrder;
      const shares = (editingExpense?.customShares && itemsUnchanged && feeUnchanged)
        ? editingExpense.customShares
        : toIdKeyedShares(calcBillSplit(splitItems, splitWith, feeConfig));
      const { total } = calcFees(sub, feeConfig);
      const expenseData = {
        title: title || 'แยกบิล',
        amount: Math.round(total * 100) / 100,
        category,
        date: today,
        paidBy,
        paidById,
        splitWith,
        splitWithIds,
        customShares: shares,
        mode: 'split' as const,
        splitItems,
        feeMode: feeConfig.feeMode,
        feeOrder: feeConfig.feeOrder,
      };
      if (editingExpense && onUpdateExpense) {
        onUpdateExpense(editingExpense.id, expenseData);
      } else {
        onAddExpense(expenseData);
      }
    } else {
      if (!amount) {
        alert('กรุณากรอกจำนวนเงิน');
        return;
      }
      if (!title) {
        alert('กรุณากรอกรายละเอียด');
        return;
      }
      let parsedCustomShares: Record<string, number> | undefined = undefined;

      if (splitMode === 'unequal') {
        if (Math.abs(sumCustomShares - totalAmountNum) > 0.009) {
          alert(`ยอดเงินรวมของผู้หาร (฿${sumCustomShares.toLocaleString(undefined, {maximumFractionDigits: 2})}) ต้องเท่ากับจำนวนเงินทั้งหมด (฿${totalAmountNum.toLocaleString(undefined, {maximumFractionDigits: 2})})`);
          return;
        }
        const sharesByName: Record<string, number> = {};
        splitWith.forEach(name => {
          sharesByName[name] = parseFloat(customShares[name]) || 0;
        });
        parsedCustomShares = toIdKeyedShares(sharesByName);
      }

      if (editingExpense && onUpdateExpense) {
        onUpdateExpense(editingExpense.id, {
          title,
          amount: totalAmountNum,
          category,
          date: today,
          paidBy,
          paidById,
          splitWith,
          splitWithIds,
          customShares: parsedCustomShares,
          mode: 'simple' as const,
        });
      } else {
        onAddExpense({
          title,
          amount: totalAmountNum,
          category,
          date: today,
          paidBy,
          paidById,
          splitWith,
          splitWithIds,
          customShares: parsedCustomShares,
          mode: 'simple' as const,
        });
      }
    }

    // Reset fields
    setAmount('');
    setTitle('');
    setMode('simple');
    setCategory('Food');
    setCategoryOpen(false);
    setSplitMode('equal');
    setCustomShares({});
    setSplitItems([]);
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
        <div className="p-5 sm:p-6 bg-primary text-white shrink-0 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-2xl">payments</span>
              <h2 className="text-lg sm:text-xl font-bold">{editingExpense ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}</h2>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">แชร์ค่าใช้จ่าย</span>
          </div>
          {/* Mode tabs */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode('simple')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === 'simple' ? 'bg-white/25 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              แบบง่าย
            </button>
            <button
              type="button"
              onClick={() => setMode('split')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === 'split' ? 'bg-white/25 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              แยกบิล
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">

          {/* SIMPLE MODE: Description + Amount + Category */}
          {mode === 'simple' && <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">รายละเอียด</label>
            <input 
              type="text" 
              required
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="เช่น ค่าที่พัก"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>}

          {/* SIMPLE MODE: Amount + Category */}
          {mode === 'simple' && <div className="grid grid-cols-2 gap-4">
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
                  if (splitMode === 'unequal') {
                    const parsedVal = parseFloat(val) || 0;
                    const count = activePartners.length;
                    if (count > 0) {
                      const share = Math.round(parsedVal / count).toString();
                      const newShares: Record<string, string> = {};
                      activePartners.forEach(p => { newShares[p.name] = share; });
                      setCustomShares(newShares);
                    }
                  }
                }}
              />
            </div>
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
                          key={opt.id} type="button"
                          onClick={() => { setCategory(opt.id); setCategoryOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${active ? 'bg-primary-light' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${opt.bg}`}>
                            <span className={`material-symbols-outlined text-[18px] ${opt.color}`}>{opt.icon}</span>
                          </span>
                          <span className={`text-sm font-semibold flex-1 truncate ${active ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</span>
                          {active && <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>}

          {/* SPLIT MODE: Itemized bill editor */}
          {mode === 'split' && <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">รายละเอียด</label>
              <input 
                type="text"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
                placeholder="ชื่อร้านหรือรายการ"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">รายการ ({splitItems.length})</label>
              {splitItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        const next = [...splitItems];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setSplitItems(next);
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ชื่อรายการ"
                    />
                    <button
                      type="button"
                      onClick={() => setSplitItems(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full transition-colors shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={e => {
                        const next = [...splitItems];
                        next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                        setSplitItems(next);
                      }}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ราคา"
                    />
                    <span className="text-[10px] text-slate-400">×</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => {
                        const next = [...splitItems];
                        next[idx] = { ...next[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                        setSplitItems(next);
                      }}
                      className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-slate-700 ml-auto">฿{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...splitItems];
                          next[idx] = { ...next[idx], type: 'shared', assignedTo: undefined, sharedWith: undefined };
                          setSplitItems(next);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${item.type === 'shared' ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >หารทุกคน</button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...splitItems];
                          next[idx] = { ...next[idx], type: 'shared_selected', sharedWith: next[idx].sharedWith || activePartners.map(p => p.name), assignedTo: undefined };
                          setSplitItems(next);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${item.type === 'shared_selected' ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >หารบางคน</button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...splitItems];
                          next[idx] = { ...next[idx], type: 'personal', assignedTo: item.assignedTo || activePartners[0]?.name || '', sharedWith: undefined };
                          setSplitItems(next);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${item.type === 'personal' ? 'bg-secondary-orange text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >ส่วนบุคคล</button>
                    </div>
                    {item.type === 'personal' && (
                      <select
                        value={item.assignedTo || ''}
                        onChange={e => {
                          const next = [...splitItems];
                          next[idx] = { ...next[idx], assignedTo: e.target.value };
                          setSplitItems(next);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-700 focus:border-primary focus:outline-none"
                      >
                        {activePartners.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    )}
                    {item.type === 'shared_selected' && (
                      <div className="flex flex-wrap gap-1.5">
                        {activePartners.map(p => {
                          const selected = item.sharedWith?.includes(p.name);
                          return (
                            <label
                              key={p.name}
                              onClick={() => {
                                const next = [...splitItems];
                                const sw = next[idx].sharedWith || [];
                                next[idx] = {
                                  ...next[idx],
                                  sharedWith: sw.includes(p.name)
                                    ? sw.filter(n => n !== p.name)
                                    : [...sw, p.name],
                                };
                                setSplitItems(next);
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer transition-colors ${
                                selected ? 'bg-primary-light border-primary text-primary' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200 shrink-0">
                                <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <span>{p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSplitItems(prev => [...prev, { name: '', price: 0, quantity: 1, type: 'shared' }])}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-primary hover:text-primary transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                เพิ่มรายการ
              </button>
            </div>

            {/* Fee config */}
            <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
              <div className="flex items-center gap-1.5">
                {(['none', 'sc', 'vat', 'both'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFeeMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      feeMode === m ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {m === 'none' ? 'ไม่มีค่าธรรมเนียม' : m === 'both' ? 'SC+VAT' : m === 'sc' ? 'SC เท่านั้น' : 'VAT เท่านั้น'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFeeOrder(feeOrder === 'sc_then_vat' ? 'vat_then_sc' : 'sc_then_vat')}
                  className={`ml-auto text-[9px] font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    feeMode === 'both'
                      ? 'bg-white border border-slate-200 text-slate-600'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  disabled={feeMode !== 'both'}
                  title={feeMode === 'both' ? 'เปลี่ยนลำดับการคำนวณ' : 'เลือก SC+VAT เพื่อกำหนดลำดับ'}
                >
                  ลำดับ: {feeOrder === 'sc_then_vat' ? 'SC→VAT' : 'VAT→SC'}
                </button>
              </div>

              {/* Split bill summary */}
              {(() => {
                const sub = splitItems.reduce((s, i) => s + i.price * i.quantity, 0);
                const { serviceCharge, vat, total } = calcFees(sub, feeConfig);
                const showSc = feeMode === 'sc' || feeMode === 'both';
                const showVat = feeMode === 'vat' || feeMode === 'both';
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>ยอดรวมรายการ</span>
                      <span>฿{sub.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    {showSc && (
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Service Charge (10%)</span>
                        <span>฿{serviceCharge.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {showVat && (
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>VAT (7%)</span>
                        <span>฿{vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-slate-800 border-t border-slate-200 pt-1.5 mt-1.5">
                      <span>รวมทั้งสิ้น</span>
                      <span>฿{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Per-person preview */}
            {splitItems.length > 0 && activePartners.length > 0 && (() => {
              const calcShares = calcBillSplit(splitItems, activePartners.map(p => p.name), feeConfig);
              const rawShares = (editingExpense?.customShares && Object.keys(editingExpense.customShares).length > 0)
                ? editingExpense.customShares
                : calcShares;
              const shares = toNameKeyedShares(rawShares);
              return (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">สรุปการหารต่อคน</label>
                  <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
                    {Object.entries(shares).filter(([, amt]) => (amt as number) > 0).map(([name, amt]) => {
                      const profile = partners.find(p => p.name === name);
                      return (
                        <div key={name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                              <img src={profile?.avatarUrl || getFallbackAvatar(name)} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{name}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800">฿{(amt as number).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>}

          {/* Paid By Field (จ่ายโดย) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 block">จ่ายโดย</label>
            <div className="relative" ref={paidByRef}>
              <button
                type="button"
                onClick={() => setPaidByOpen(o => !o)}
                className="w-full flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-slate-50">
                  <img src={paidByAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="flex-1 text-left font-semibold truncate">{paidBy || 'เลือกผู้จ่าย'}</span>
                <span className={`material-symbols-outlined text-slate-400 text-base transition-transform ${paidByOpen ? 'rotate-180' : ''}`}>
                  keyboard_arrow_down
                </span>
              </button>

              {paidByOpen && (
                <div className="absolute z-30 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl p-2 animate-fade-in">
                  {partners.map(p => {
                    const active = p.name === paidBy;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setPaidBy(p.name);
                          setPaidByAvatar(p.avatarUrl);
                          setPaidByOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          active ? 'bg-primary-light' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 bg-slate-50">
                          <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className={`text-sm font-semibold flex-1 truncate ${active ? 'text-primary' : 'text-slate-700'}`}>
                          {p.name}
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

          {/* Split Mode (วิธีหาร) — simple mode only */}
          {mode === 'simple' && <div className="space-y-1.5">
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
          </div>}

          {/* Select Participants (เลือกผู้ร่วมหาร) */}
          {mode === 'simple' && <div className="space-y-2">
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
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-slate-50">
                    <img 
                      src={partner.avatarUrl} 
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
          </div>}

          {/* Custom Unequal shares input (simple mode only) */}
          {mode === 'simple' && splitMode === 'unequal' && (
            <div className="space-y-2 border-t border-slate-100 pt-3 animate-fade-in">
              <div className="space-y-2">
                {activePartners.map(p => (
                  <div key={p.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-slate-50">
                        <img 
                          src={p.avatarUrl} 
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
              <div className="flex justify-end text-xs font-bold pt-1">
                {(() => {
                  const matches = Math.abs(sumCustomShares - totalAmountNum) <= 0.009 && totalAmountNum > 0;
                  return (
                    <span className={matches ? 'text-emerald-600' : sumCustomShares > 0 ? 'text-red-500' : 'text-slate-400'}>
                      รวม: {sumCustomShares.toLocaleString(undefined, {maximumFractionDigits: 2})} / {totalAmountNum.toLocaleString(undefined, {maximumFractionDigits: 2})} บาท
                      {sumCustomShares > 0 && (matches ? ' — ครบแล้ว' : ' — ไม่ครบ')}
                    </span>
                  );
                })()}
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
              {editingExpense ? 'บันทึกการแก้ไข' : mode === 'split' ? 'บันทึกแยกบิล' : 'เพิ่ม'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
