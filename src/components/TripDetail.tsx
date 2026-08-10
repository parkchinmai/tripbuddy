/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip } from '../types';
import { formatDateRange, calculateSettlements, extractAccountNumber, getFallbackAvatar } from '../data';
import { uploadImage } from '../lib/r2';
import CopyBtn from './CopyBtn';
import ImagePositionPicker, { parsePosition, positionToCss } from './ImagePositionPicker';
import NotesTab from './NotesTab';

export interface SettlementState {
  isSettled: boolean;
  slipUrl?: string;
  confirmedBy?: string;
  settledAmount?: number; // total amount transferred for this pair (confirmed or awaiting confirmation)
}

interface TripDetailProps {
  trip: Trip;
  onBack: () => void;
  onAddExpenseClick: () => void;
  onEditExpense?: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateTrip: (updates: Partial<Trip>) => void;
  onUpdateTripMembers: (memberIds: string[]) => void;
  onDeleteTrip: () => void;
  currentUserName?: string;
  currentUserPhone?: string;
}

type TabType = 'overview' | 'expenses' | 'settlement' | 'companions' | 'notes';

const getTripMembers = (trip: Trip, memberProfiles: any[] = []) => {
  const namesSet = new Set<string>();
  const profileByName: Record<string, any> = {};
  const profileById: Record<string, any> = {};
  for (const p of memberProfiles) {
    profileByName[p.name] = p;
    if (p.id) profileById[p.id] = p;
  }

  trip.expenses.forEach(e => {
    // Resolve payer name if paidBy is ID
    let pName = e.paidBy;
    if (e.paidById && profileById[e.paidById]) {
      pName = profileById[e.paidById].name;
    } else if (profileById[e.paidBy]) {
      pName = profileById[e.paidBy].name;
    }
    if (pName) namesSet.add(pName);

    if (e.splitWith) {
      e.splitWith.forEach((name, idx) => {
        let sName = name;
        const sId = e.splitWithIds?.[idx];
        if (sId && profileById[sId]) {
          sName = profileById[sId].name;
        } else if (profileById[name]) {
          sName = profileById[name].name;
        }
        if (sName) namesSet.add(sName);
      });
    }
  });

  const pNames = memberProfiles.map(p => p.name);
  pNames.forEach(n => namesSet.add(n));

  return Array.from(namesSet).map((name) => {
    const profile = profileByName[name];
    const memberId = profile?.id;
    const avatarUrl = profile?.avatar_url || getFallbackAvatar(name);
    const bankAccount = profile?.bank_account || 'ยังไม่ได้ระบุ';
    const phone = profile?.phone || '08X-XXX-XXXX';

    const totalPaid = trip.expenses
      .filter(e => e.paidBy === name || e.paidBy === memberId || e.paidById === memberId)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalShare = trip.expenses
      .filter(e => {
        if (e.splitWith.includes(name)) return true;
        if (memberId && e.splitWithIds?.includes(memberId)) return true;
        return false;
      })
      .reduce((sum, e) => {
        if (e.customShares) {
          if (memberId && e.customShares[memberId] !== undefined) return sum + e.customShares[memberId];
          if (e.customShares[name] !== undefined) return sum + e.customShares[name];
        }
        const shareCount = e.splitWith.length || 1;
        return sum + (e.amount / shareCount);
      }, 0);

    return {
      name,
      id: memberId,
      avatarUrl,
      bankAccount,
      phone,
      totalPaid,
      totalShare,
      netBalance: totalPaid - totalShare
    };
  });
};

export default function TripDetail({
  trip,
  onBack,
  onAddExpenseClick,
  onEditExpense,
  onDeleteExpense,
  onUpdateTrip,
  onUpdateTripMembers,
  onDeleteTrip,
  currentUserName,
  currentUserPhone
}: TripDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);

  const profileNameById = (id: string): string => {
    const p = memberProfiles.find(m => m.id === id);
    return p ? p.name : id;
  };

  useEffect(() => {
    if (trip.memberIds && trip.memberIds.length > 0) {
      fetch('/api/members')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const list = Array.isArray(data) ? data : (data.results || []);
          setMemberProfiles(list.filter((m: any) => trip.memberIds?.includes(m.id)));
        })
        .catch(() => setMemberProfiles([]));
    } else {
      setMemberProfiles([]);
    }
  }, [trip.id, trip.memberIds]);

  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const foodSpent = trip.expenses.filter(e => e.category === 'Food').reduce((sum, e) => sum + e.amount, 0);
  const travelSpent = trip.expenses.filter(e => e.category === 'Travel').reduce((sum, e) => sum + e.amount, 0);
  const lodgingSpent = trip.expenses.filter(e => e.category === 'Accommodation').reduce((sum, e) => sum + e.amount, 0);
  const shoppingSpent = trip.expenses.filter(e => e.category === 'Shopping').reduce((sum, e) => sum + e.amount, 0);
  const activitiesSpent = trip.expenses.filter(e => e.category === 'Activities').reduce((sum, e) => sum + e.amount, 0);
  const otherSpent = trip.expenses.filter(e => !['Food','Travel','Accommodation','Shopping','Activities'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

  const categoryData = [
    { name: 'ที่พัก (Accommodation)', amount: lodgingSpent, color: '#fd761a', percent: 0 },
    { name: 'อาหารและเครื่องดื่ม (Food)', amount: foodSpent, color: '#006591', percent: 0 },
    { name: 'การเดินทาง (Transport)', amount: travelSpent, color: '#00b351', percent: 0 },
    { name: 'ช้อปปิ้ง (Shopping)', amount: shoppingSpent, color: '#e11d48', percent: 0 },
    { name: 'กิจกรรม (Activities)', amount: activitiesSpent, color: '#9333ea', percent: 0 },
    { name: 'อื่นๆ (Other)', amount: otherSpent, color: '#94a3b8', percent: 0 }
  ].filter(c => c.amount > 0);
  const categoryTotal = categoryData.reduce((sum, c) => sum + c.amount, 0);
  categoryData.forEach(c => { c.percent = categoryTotal ? Math.round((c.amount / categoryTotal) * 100) : 0; });
  const ringRadii = [65, 50, 36, 22];
  const ringStroke = [12, 10, 8, 6];

  const budgetUsedPercent = Math.min(Math.round((totalSpent / trip.budget) * 100), 100);

  const [settlementStates, setSettlementStates] = useState<Record<string, SettlementState>>({});
  const [settlementsLoaded, setSettlementsLoaded] = useState(false);
  const [showSettled, setShowSettled] = useState<boolean>(false);

  // Load settlement states from API
  useEffect(() => {
    if (!trip.id || settlementsLoaded) return;
    fetch(`/api/trips/${trip.id}/settlements`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        if (typeof data === 'object' && !Array.isArray(data)) {
          setSettlementStates(data as Record<string, SettlementState>);
        }
        setSettlementsLoaded(true);
      })
      .catch(() => setSettlementsLoaded(true));
  }, [trip.id]);
  const baseTripMembers = getTripMembers(trip, memberProfiles);

  // Step 1: compute raw settlements from full expense list
  const rawSettlements = calculateSettlements(baseTripMembers);

  // Step 2: adjust net balances by subtracting amounts already transferred (settled)
  const tripMembers = baseTripMembers.map(m => {
    let netBalance = m.netBalance;
    // Check all recorded settlement states for this member
    (Object.entries(settlementStates) as [string, SettlementState][]).forEach(([key, state]) => {
      // key format can be "from-to" or "from-to-amount"
      const parts = key.split('-');
      if (parts.length >= 2) {
        const fromName = parts[0];
        const toName = parts[1];

        // Money has already moved whenever a slip exists, whether the creditor has
        // confirmed it or not. Pending only means the slip still needs confirmation,
        // not that the transfer didn't happen, so both states reduce the balances.
        // Otherwise a later expense would re-allocate an already-paid amount to others.
        if (state.slipUrl || state.isSettled) {
          let paidVal = state.settledAmount || 0;
          if (paidVal === 0) {
            // Fallback: old record was settled but settledAmount wasn't set.
            // Prefer the amount embedded in the settlement key (exact amount paid at that
            // time) over the current recomputed raw settlement, which may have grown if
            // new expenses were added after the payment was confirmed.
            const keyAmount = parseFloat(parts[2]);
            const rawMatch = rawSettlements.find(r => r.from === fromName && r.to === toName);
            paidVal = Number.isFinite(keyAmount) && keyAmount > 0 ? keyAmount : (rawMatch ? rawMatch.amount : 0);
          }
          if (paidVal > 0) {
            if (fromName === m.name) netBalance += paidVal;
            if (toName === m.name) netBalance -= paidVal;
          }
        }
      }
    });
    return { ...m, netBalance };
  });

  // Step 3: recompute settlements after removing already-settled amounts from balances
  const computedSettlements = calculateSettlements(tripMembers);

  // Step 4: merge state into each settlement record
  const settlements = computedSettlements.map(s => {
    const key = `${s.from}-${s.to}`;
    let stateFound = settlementStates[key];
    let matchedOldKey: string | undefined;
    if (!stateFound) {
      const oldKeys = Object.keys(settlementStates).filter(k => k.startsWith(`${s.from}-${s.to}-`));
      if (oldKeys.length > 0) {
        // Old-format keys embed the settled amount as the last segment. That amount has
        // already been subtracted in Step 2, so it only settles this recomputed pair when
        // the amounts match exactly; otherwise the pair is a new (still pending) balance.
        const oldAmount = parseFloat(oldKeys[0].split('-').pop() || '');
        if (Number.isFinite(oldAmount) && oldAmount === s.amount) {
          stateFound = settlementStates[oldKeys[0]];
          matchedOldKey = oldKeys[0];
        }
      }
    }

    let alreadySettled = stateFound?.settledAmount || 0;
    if (alreadySettled === 0 && stateFound?.isSettled) {
      const keyAmount = matchedOldKey ? parseFloat(matchedOldKey.split('-').pop() || '') : NaN;
      const rawMatch = rawSettlements.find(r => r.from === s.from && r.to === s.to);
      alreadySettled = Number.isFinite(keyAmount) && keyAmount > 0 ? keyAmount : (rawMatch ? rawMatch.amount : 0);
    }

    const isFullySettled = s.amount === 0;
    return {
      ...s,
      isSettled: isFullySettled,
      confirmed: stateFound?.isSettled === true,
      isPendingOnly: false,
      slipUrl: stateFound?.slipUrl,
      confirmedBy: stateFound?.confirmedBy,
      settledAmount: alreadySettled,
    };
  });

  // Pairs with an unconfirmed slip whose remaining balance has dropped to zero are not
  // produced by the recompute, but the slip must stay visible so the creditor can still
  // review and confirm it. Re-add those pairs to the list.
  (Object.entries(settlementStates) as [string, SettlementState][]).forEach(([key, state]) => {
    if (state.isSettled || !state.slipUrl) return;
    const parts = key.split('-');
    if (parts.length < 2) return;
    const from = parts[0];
    const to = parts[1];
    const transferred = state.settledAmount || 0;
    if (transferred <= 0) return;
    if (settlements.some(x => x.from === from && x.to === to)) return;
    const fromMember = baseTripMembers.find(m => m.name === from);
    const toMember = baseTripMembers.find(m => m.name === to);
    settlements.push({
      from,
      to,
      amount: transferred,
      fromBankAccount: fromMember?.bankAccount || '',
      toBankAccount: toMember?.bankAccount || '',
      isSettled: false,
      confirmed: false,
      isPendingOnly: true,
      slipUrl: state.slipUrl,
      confirmedBy: state.confirmedBy,
      settledAmount: transferred,
    });
  });

  // Members who fully cleared their debt (confirmed payment and net balance is now 0)
  const settledPeople = (() => {
    const list: { from: string; to: string; amount: number }[] = [];
    (Object.entries(settlementStates) as [string, SettlementState][]).forEach(([key, state]) => {
      if (!state.isSettled) return;
      const parts = key.split('-');
      if (parts.length < 2) return;
      const from = parts[0];
      const to = parts[1];
      const member = tripMembers.find(m => m.name === from);
      if (!member || member.netBalance !== 0) return;
      const keyAmount = parseFloat(parts[2]);
      const amount = state.settledAmount > 0
        ? state.settledAmount
        : (Number.isFinite(keyAmount) && keyAmount > 0 ? keyAmount : 0);
      if (amount > 0) list.push({ from, to, amount });
    });
    return list;
  })();

  const [activeSettleIndex, setActiveSettleIndex] = useState<number | null>(null);
  const [settleSlipAttached, setSettleSlipAttached] = useState<boolean>(false);
  const [settleSlipName, setSettleSlipName] = useState<string>('');
  const [settleSlipPreview, setSettleSlipPreview] = useState<string>('');
  const [settleSlipUploading, setSettleSlipUploading] = useState<boolean>(false);
  const [settleSlipFile, setSettleSlipFile] = useState<File | null>(null);

  const cancelSettlementSlip = async (from: string, to: string, slipUrl: string) => {
    if (!slipUrl) return;
    if (!window.confirm('ยกเลิกสลิปนี้? สลิปจะถูกลบออกจากระบบ และสามารถแนบสลิปใหม่ได้')) return;

    const imagePath = slipUrl.startsWith('/api/images/') ? slipUrl.slice('/api/images/'.length) : '';
    if (imagePath) {
      try {
        const res = await fetch(`/api/images/${imagePath}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('delete failed');
      } catch {
        alert('ลบสลิปจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
        return;
      }
    }

    const targetKey = Object.keys(settlementStates).find(k => settlementStates[k]?.slipUrl === slipUrl);
    const key = targetKey || `${from}-${to}`;
    setSettlementStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isSettled: false, slipUrl: undefined, settledAmount: prev[key]?.settledAmount ?? 0 },
    }));
    await fetch(`/api/trips/${trip.id}/settlements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlement_key: key, status: 'pending', slip_url: null, settled_amount: 0 }),
    }).catch(() => {});
  };
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const toggleMemberExpand = (name: string) => {
    setExpandedMembers(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editDestination, setEditDestination] = useState(trip.destination);
  const [editCoverUrl, setEditCoverUrl] = useState(trip.coverImgUrl);
  const [editCoverPosition, setEditCoverPosition] = useState(parsePosition(trip.coverPosition));
  const [editDescription, setEditDescription] = useState(trip.description || '');
  const [editCountry, setEditCountry] = useState(trip.country);
  const [editBudget, setEditBudget] = useState(String(trip.budget));
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const editStatus = trip.status;
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Breadcrumb / Context Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-primary hover:underline font-bold text-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>ย้อนกลับไปหน้ารวมทริป</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400 text-sm font-semibold">
            <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
            <span>{trip.destination}{trip.country ? `, ${trip.country}` : ''}</span>
          </div>
          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-2">
            <button 
              onClick={() => {
                setEditTitle(trip.title);
                setEditDestination(trip.destination);
                setEditCoverUrl(trip.coverImgUrl);
                setEditCoverPosition(parsePosition(trip.coverPosition));
                setEditDescription(trip.description || '');
                setEditCountry(trip.country);
                setEditBudget(String(trip.budget));
                const dateParts = trip.dates.split(' - ');
                setEditStartDate(dateParts[0] || '');
                setEditEndDate(dateParts[1] || dateParts[0] || '');
                setEditMemberIds(trip.memberIds || []);
                fetch('/api/members')
                  .then(r => r.ok ? r.json() : [])
                  .then(data => setAllProfiles(Array.isArray(data) ? data : []))
                  .catch(() => {});
                setShowEditModal(true);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-primary hover:bg-primary-light/30 transition-all cursor-pointer"
              title="แก้ไขทริป"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button 
              onClick={() => {
                if (window.confirm('คุณต้องการลบทริปนี้จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                  onDeleteTrip();
                }
              }}
              className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              title="ลบทริป"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2">
        <div className="space-y-1 flex-1">
          <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{trip.title}</h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold pt-1">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>{formatDateRange(trip.dates)}</span>
          </div>
        </div>

        {/* Budget Glass Card */}
        <div className="glass-card p-5 rounded-3xl shadow-sm border border-slate-100 w-full sm:min-w-[300px] lg:w-auto">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-sm font-bold text-slate-500">งบประมาณทั้งหมด</span>
            <span className="text-xl font-extrabold text-primary">฿{trip.budget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className="bg-tertiary-green h-full rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${budgetUsedPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>ใช้ไปแล้ว {budgetUsedPercent}%</span>
            <span>฿{totalSpent.toLocaleString()} / ฿{trip.budget.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 overflow-x-auto gap-0">
        {[
          { tab: 'overview' as const, label: 'ภาพรวม' },
          { tab: 'expenses' as const, label: 'ค่าใช้จ่าย' },
          { tab: 'settlement' as const, label: 'สรุปยอด' },
          { tab: 'companions' as const, label: 'เพื่อนร่วมทริป' },
          { tab: 'notes' as const, label: 'โน้ต' },
        ].map(item => (
          <button 
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            className={`flex-1 min-w-0 px-2 sm:px-4 py-3 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === item.tab 
                ? 'text-primary border-b-3 border-primary' 
                : 'text-slate-400 hover:text-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 mb-1">ค่าใช้จ่ายแยกตามหมวดหมู่</h3>
                <p className="text-xs text-slate-400 font-semibold">สรุปค่าใช้จ่ายสัดส่วนที่ใช้ไปมากที่สุด</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-4">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    {categoryData.map((cat, i) => {
                      const r = ringRadii[i];
                      const sw = ringStroke[i];
                      const circ = 2 * Math.PI * r;
                      return (
                        <g key={cat.name}>
                          <circle cx="80" cy="80" r={r} stroke="#e2e8f0" strokeWidth={sw} fill="transparent" />
                          <circle
                            cx="80" cy="80" r={r}
                            stroke={cat.color} strokeWidth={sw} fill="transparent"
                            strokeDasharray={circ}
                            strokeDashoffset={circ * (1 - cat.percent / 100)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400">ค่าใช้จ่ายรวม</span>
                    <span className="text-base font-black text-slate-800">฿{categoryTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3.5 w-full">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800">฿{cat.amount.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1.5">({cat.percent}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="sm:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-base font-extrabold text-slate-800">บันทึกค่าใช้จ่ายล่าสุด</h3>
                <button 
                  onClick={() => setActiveTab('expenses')}
                  className="text-primary font-bold text-sm hover:underline cursor-pointer"
                >
                  ดูทั้งหมด
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {trip.expenses.slice(0, 3).map(expense => (
                  <div key={expense.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                        ({
                          Food: 'bg-primary-light text-primary',
                          Travel: 'bg-tertiary-green-light text-tertiary-green',
                          Accommodation: 'bg-secondary-orange-light text-secondary-orange',
                          Shopping: 'bg-pink-50 text-pink-600',
                          Activities: 'bg-purple-50 text-purple-600',
                        } as Record<string,string>)[expense.category] || 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {({
                            Food: 'restaurant',
                            Travel: 'local_taxi',
                            Accommodation: 'hotel',
                            Shopping: 'shopping_bag',
                            Activities: 'attractions',
                          } as Record<string,string>)[expense.category] || 'category'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{expense.title}</p>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-2 text-slate-400">
                          <span className="text-[11px] sm:text-xs font-semibold">
                            {expense.date} • จ่ายโดย: <span className="font-bold text-slate-600">{expense.paidBy}</span>
                          </span>
                          <span className="hidden sm:inline text-slate-300">|</span>
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                            {expense.customShares 
                              ? `หารไม่เท่า: ${Object.entries(expense.customShares).map(([key, val]) => `${profileNameById(key)} (฿${val.toLocaleString()})`).join(', ')}`
                              : `หารเท่ากัน: ${expense.splitWith.join(', ')}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <p className="text-base sm:text-lg font-extrabold text-slate-800">฿{expense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 relative rounded-[2.5rem] overflow-hidden shadow-md group min-h-[360px]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
            <img 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt={trip.destination} 
              src={trip.coverImgUrl}
              style={{ objectPosition: trip.coverPosition || '50% 50%' }}
            />
            <div className="absolute bottom-0 left-0 p-6 z-20 text-white space-y-2">
              <span className="text-[10px] font-extrabold bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full inline-block">จุดหมายปัจจุบัน</span>
              <h3 className="text-xl font-extrabold leading-tight">{trip.destination}{trip.country ? `, ${trip.country}` : ''}</h3>
              {trip.description && (
                <p className="text-xs text-white/70 font-medium whitespace-pre-line">{trip.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Expenses Log */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">รายการค่าใช้จ่ายทั้งหมด</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">รวม {trip.expenses.length}รายการ เป็นเงิน ฿{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {trip.expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-[64px] text-slate-300 mb-2">payments</span>
              <p className="text-base font-bold text-slate-500">ยังไม่มีการบันทึกค่าใช้จ่ายในทริปนี้</p>
              <p className="text-xs text-slate-400 mt-1">แตะปุ่ม + สีส้มมุมขวาล่างเพื่อเพิ่มสลิปใบแรกของคุณ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {trip.expenses.map(expense => (
                <div key={expense.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                      ({
                        Food: 'bg-primary-light text-primary',
                        Travel: 'bg-tertiary-green-light text-tertiary-green',
                        Accommodation: 'bg-secondary-orange-light text-secondary-orange',
                        Shopping: 'bg-pink-50 text-pink-600',
                        Activities: 'bg-purple-50 text-purple-600',
                      } as Record<string,string>)[expense.category] || 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {({
                          Food: 'restaurant',
                          Travel: 'local_taxi',
                          Accommodation: 'hotel',
                          Shopping: 'shopping_bag',
                          Activities: 'attractions',
                        } as Record<string,string>)[expense.category] || 'category'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{expense.title}</p>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-2 text-slate-400">
                        <span className="text-[11px] sm:text-xs font-semibold">
                          {expense.date} • จ่ายโดย: <span className="font-bold text-slate-600">{expense.paidBy}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-300">|</span>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                          {expense.customShares 
                            ? `หารไม่เท่า: ${Object.entries(expense.customShares).map(([key, val]) => `${profileNameById(key)} (฿${val.toLocaleString()})`).join(', ')}`
                            : `หารเท่ากัน: ${expense.splitWith.join(', ')}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="flex items-center gap-3">
                      <p className="text-base sm:text-lg font-extrabold text-slate-800">฿{expense.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {onEditExpense && (
                        <button 
                          onClick={() => onEditExpense(expense.id)}
                          className="p-2 hover:bg-primary-light text-primary rounded-full transition-colors cursor-pointer shrink-0"
                          title="แก้ไขรายการ"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      )}
                      <button 
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer shrink-0"
                        title="ลบรายการ"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Settlement Summary */}
      {activeTab === 'settlement' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">สรุปยอดที่ต้องเคลียร์กัน</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">การจับคู่อย่างอัจฉริยะเพื่อให้เกิดจำนวนรายการธุรกรรมน้อยที่สุด</p>
            </div>
            <span className="material-symbols-outlined text-secondary-orange text-[28px]">handshake</span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowSettled(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer ${
                showSettled
                  ? 'bg-tertiary-green-light/30 border-tertiary-green text-tertiary-green'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-tertiary-green/40 hover:text-tertiary-green'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] font-bold">{showSettled ? 'visibility_off' : 'visibility'}</span>
              {showSettled ? 'ซ่อนคนที่จ่ายแล้ว' : 'แสดงคนที่จ่ายแล้ว'}
            </button>
          </div>

          <div className="space-y-4">
            {settlements.map((settlement, index) => (
              <div 
                key={index}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  settlement.isSettled 
                    ? 'border-tertiary-green-light bg-tertiary-green-light/5 text-slate-500' 
                    : 'border-slate-50 hover:border-primary/20 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center font-extrabold ${
                        settlement.isSettled ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-primary text-white border-slate-100'
                      }`}>
                        {settlement.from[0]}
                      </div>
                      <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 border border-slate-100 shadow-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary-orange text-[14px] font-bold">arrow_forward</span>
                      </div>
                    </div>
                    <div>
                      <p className={`text-base font-bold ${settlement.isSettled ? 'text-slate-400 line-through font-medium' : 'text-slate-800'}`}>
                        {settlement.from} <span className="text-slate-400 font-normal">จ่ายคืนให้</span> {settlement.to}
                      </p>
                      {/* Show "partially settled" info when there's a prior payment but new expenses created a new balance */}
                      {!settlement.isSettled && !settlement.isPendingOnly && settlement.settledAmount > 0 && (
                        <p className="text-[11px] text-amber-600 font-bold mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">history</span>
                          ชำระไปแล้ว ฿{settlement.settledAmount.toLocaleString()} · ยอดที่ยังค้าง ฿{settlement.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    <p className={`text-xl font-extrabold ${settlement.isSettled ? 'text-slate-400 line-through font-bold' : 'text-secondary-orange'}`}>
                      ฿{settlement.amount.toLocaleString()}
                    </p>
                    {settlement.isSettled ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] bg-tertiary-green-light text-tertiary-green px-2 py-0.5 rounded-full font-black flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                          <span>โอนแล้ว</span>
                        </span>
                        {settlement.slipUrl && (
                          <button
                            onClick={() => setSelectedSlip(settlement.slipUrl!)}
                            className="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">image</span>
                            <span>ดูสลิป</span>
                          </button>
                        )}
                      </div>
                    ) : settlement.slipUrl ? (
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 ${
                          settlement.confirmed ? 'bg-tertiary-green-light text-tertiary-green' : 'bg-secondary-orange-light text-secondary-orange'
                        }`}>
                          <span className="material-symbols-outlined text-[12px] font-bold">
                            {settlement.confirmed ? 'check_circle' : 'hourglass'}
                          </span>
                          <span>{settlement.confirmed ? 'โอนแล้ว' : 'รอยืนยัน'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedSlip(settlement.slipUrl!)}
                            className="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">image</span>
                            <span>ดูสลิป</span>
                          </button>
                          {currentUserName === settlement.from && !settlement.confirmed && (
                            <button
                              onClick={() => cancelSettlementSlip(settlement.from, settlement.to, settlement.slipUrl!)}
                              className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">delete</span>
                              <span>ยกเลิกสลิป</span>
                            </button>
                          )}
                          {currentUserName === settlement.to && !settlement.confirmed && (
                            <button
                              onClick={async () => {
                                const s = settlements.find(x => x.from === settlement.from && x.to === settlement.to);
                                if (!s) return;
                                const confirmAmount = s.settledAmount || s.amount;
                                if (!window.confirm(`ยืนยันว่าได้รับเงิน ฿${confirmAmount.toLocaleString()} จาก ${s.from} เรียบร้อยแล้ว?`)) return;
                                const key = `${s.from}-${s.to}`;
                                const prevSettled = settlementStates[key]?.settledAmount || 0;
                                setSettlementStates(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], isSettled: true, confirmedBy: currentUserName, settledAmount: prevSettled }
                                }));
                                await fetch(`/api/trips/${trip.id}/settlements`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ settlement_key: key, status: 'confirmed', confirmed_by: currentUserName, settled_amount: prevSettled }),
                                }).catch(() => {});
                              }}
                              className="text-[10px] bg-tertiary-green-light text-tertiary-green px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 hover:bg-tertiary-green hover:text-white transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              <span>ยืนยัน</span>
                            </button>
                          )}
                          {settlement.confirmed && settlement.amount > 0 && (
                            <button
                              onClick={() => setActiveSettleIndex(index)}
                              className="text-[10px] bg-secondary-orange hover:bg-secondary-orange-hover text-white px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">visibility</span>
                              <span>แนบสลิป</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : settlement.slipUrl ? null : (
                      <button 
                        onClick={() => setActiveSettleIndex(index)}
                        className="bg-secondary-orange hover:bg-secondary-orange-hover text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-sm cursor-pointer flex items-center gap-0.5 transition-all hover:scale-[1.02] active:scale-95 mt-1"
                      >
                        <span className="material-symbols-outlined text-[13px] font-bold">visibility</span>
                        <span>แนบสลิป</span>
                      </button>
                    )}
                  </div>
                </div>

                {!settlement.isSettled && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold mb-1.5">เลขบัญชีผู้รับ ({settlement.to})</p>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">credit_card</span>
                      <span className="font-mono text-sm font-bold text-slate-700 flex-1">{settlement.toBankAccount}</span>
                      <CopyBtn
                        text={extractAccountNumber(settlement.toBankAccount)}
                        className="text-primary hover:text-primary/80 text-[10px] font-bold shrink-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showSettled && settledPeople.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                คนที่จ่ายแล้ว ({settledPeople.length})
              </p>
              {settledPeople.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border-2 border-tertiary-green-light bg-tertiary-green-light/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 bg-tertiary-green-light text-tertiary-green border-tertiary-green-light flex items-center justify-center font-extrabold">
                        {p.from[0]}
                      </div>
                      <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 border border-slate-100 shadow-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-tertiary-green text-[14px] font-bold">arrow_forward</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-600">
                        {p.from} <span className="text-slate-400 font-normal">จ่ายคืนให้</span> {p.to}
                      </p>
                      <p className="text-[11px] text-tertiary-green font-bold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        จ่ายแล้ว
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    <p className="text-xl font-extrabold text-tertiary-green">฿{p.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-800">รายละเอียดค่าใช้จ่ายรายบุคคล</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">คลิกแต่ละคนเพื่อดูรายละเอียดค่าใช้จ่ายที่ออกก่อนและต้องจ่าย</p>
              </div>
              <span className="material-symbols-outlined text-primary text-xl">expand</span>
            </div>

            <div className="space-y-3">
              {tripMembers.map((member, idx) => {
                const isExpanded = !!expandedMembers[member.name];
                
                const paidExpenses = trip.expenses.filter(e => e.paidBy === member.name);
                
                const sharedExpenses = trip.expenses.filter(e => e.splitWith.includes(member.name)).map(e => {
                  let shareAmount = 0;
                  if (e.customShares) {
                    const id = member.id;
                    if (id && e.customShares[id] !== undefined) {
                      shareAmount = e.customShares[id];
                    } else if (e.customShares[member.name] !== undefined) {
                      shareAmount = e.customShares[member.name];
                    } else {
                      const shareCount = e.splitWith.length || 1;
                      shareAmount = e.amount / shareCount;
                    }
                  } else {
                    const shareCount = e.splitWith.length || 1;
                    shareAmount = e.amount / shareCount;
                  }
                  return {
                    ...e,
                    shareAmount
                  };
                });

                const balance = member.netBalance;

                return (
                  <div key={idx} className="border border-slate-150 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-300 bg-slate-50/20">
                    <button 
                      type="button"
                      onClick={() => toggleMemberExpand(member.name)}
                      className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-slate-800">{member.name}</p>
                            {balance < 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-secondary-orange-light text-secondary-orange px-2 py-0.5 rounded-full font-black">
                                <span className="material-symbols-outlined text-[10px] font-bold">schedule</span>
                                ค้างจ่าย ฿{Math.round(Math.abs(balance)).toLocaleString()}
                              </span>
                            ) : balance > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-black">
                                <span className="material-symbols-outlined text-[10px] font-bold">payments</span>
                                รับคืน ฿{Math.round(balance).toLocaleString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-tertiary-green-light text-tertiary-green px-2 py-0.5 rounded-full font-black">
                                <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span>
                                จ่ายแล้ว
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:flex items-center gap-4 sm:gap-6 text-xs w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ออกก่อน</p>
                          <p className="text-sm font-extrabold text-slate-700">฿{member.totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ต้องจ่าย</p>
                          <p className="text-sm font-extrabold text-slate-700">฿{member.totalShare.toLocaleString()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ส่วนต่าง</p>
                          <p className={`text-sm font-black ${
                            balance > 0 ? 'text-tertiary-green' : balance < 0 ? 'text-secondary-orange' : 'text-slate-500'
                          }`}>
                            {balance > 0 ? `+฿${balance.toLocaleString()}` : balance < 0 ? `-฿${Math.abs(balance).toLocaleString()}` : '฿0'}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:block">
                        <span className="material-symbols-outlined text-slate-400 font-bold transition-transform duration-200 select-none">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-150 bg-white p-4 sm:p-5 space-y-4 animate-fade-in text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2.5">
                            <h5 className="font-extrabold text-slate-700 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                              <span className="material-symbols-outlined text-tertiary-green text-sm font-bold">check_circle</span>
                              <span>รายการที่ออกก่อน (฿{member.totalPaid.toLocaleString()})</span>
                            </h5>
                            {paidExpenses.length === 0 ? (
                              <p className="text-slate-400 font-semibold italic text-center py-2">ไม่มีรายการที่ออกก่อน</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {paidExpenses.map((e, index) => (
                                  <div key={index} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                    <div className="space-y-0.5">
                                      <p className="font-extrabold text-slate-700">{e.title}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{e.date} • {({
    Food: 'อาหาร',
    Travel: 'เดินทาง',
    Accommodation: 'ที่พัก',
    Shopping: 'ช้อปปิ้ง',
    Activities: 'กิจกรรม',
  } as Record<string,string>)[e.category] || 'อื่นๆ'}</p>
                                    </div>
                                    <p className="font-extrabold text-slate-800">฿{e.amount.toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            <h5 className="font-extrabold text-slate-700 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                              <span className="material-symbols-outlined text-primary text-sm font-bold">groups</span>
                              <span>รายการที่ร่วมจ่าย (฿{member.totalShare.toLocaleString()})</span>
                            </h5>
                            {sharedExpenses.length === 0 ? (
                              <p className="text-slate-400 font-semibold italic text-center py-2">ไม่มีรายการที่ร่วมจ่าย</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {sharedExpenses.map((e, index) => (
                                  <div key={index} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                    <div className="space-y-0.5">
                                      <p className="font-extrabold text-slate-700">{e.title}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">
                                        {e.date} • {e.customShares ? 'หารไม่เท่า' : `หารเท่ากัน ${e.splitWith.length} คน`}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-extrabold text-slate-800">฿{e.shareAmount.toLocaleString()}</p>
                                      <p className="text-[9px] text-slate-400 font-bold">จากยอดเต็ม ฿{e.amount.toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Companions */}
      {activeTab === 'companions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">สมาชิกเพื่อนร่วมทริป ({tripMembers.length} คน)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                รายชื่อสมาชิกทั้งหมดที่ร่วมแชร์และเคลียร์ยอดค่าใช้จ่ายในทริปนี้
              </p>
            </div>
            <span className="material-symbols-outlined text-primary text-[28px]">groups</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tripMembers.map((member, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100">
                        <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-base truncate">คุณ{member.name}</h4>
                      <p className="text-xs text-slate-400 font-semibold">{member.phone}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                    member.netBalance > 0 
                      ? 'bg-tertiary-green-light text-tertiary-green' 
                      : member.netBalance < 0 
                      ? 'bg-secondary-orange-light text-secondary-orange' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {member.netBalance > 0 
                      ? `รอรับเงิน: +฿${Math.round(member.netBalance).toLocaleString()}` 
                      : member.netBalance < 0 
                      ? `ต้องจ่าย: ฿${Math.round(Math.abs(member.netBalance)).toLocaleString()}` 
                      : 'เคลียร์ยอดแล้ว'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center text-xs font-semibold">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">บัญชีรับเงินโอน</span>
                    <span className="text-slate-700 font-bold">{member.bankAccount}</span>
                  </div>
                  <CopyBtn
                    text={extractAccountNumber(member.bankAccount)}
                    className="p-2 hover:bg-slate-200/60 rounded-full text-primary"
                  />
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Notes */}
      {activeTab === 'notes' && (
        <div className="animate-fade-in">
          <NotesTab
            tripId={trip.id}
            currentUserName={currentUserName || ''}
            currentUserPhone={currentUserPhone || ''}
            memberProfiles={memberProfiles}
          />
        </div>
      )}

      {/* Slip Preview Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">image</span>
                <span>หลักฐานการจ่ายเงิน</span>
              </h3>
              <button 
                onClick={() => setSelectedSlip(null)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                close
              </button>
            </div>
            {(() => {
              const foundSettle = settlements.find(s => s.slipUrl === selectedSlip);
              const isImage = selectedSlip.startsWith('data:') || selectedSlip.startsWith('http') || selectedSlip.startsWith('/');
              return (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                  {isImage && (
                    <img src={selectedSlip} alt="สลิป" className="w-full rounded-xl object-contain max-h-[60vh]" />
                  )}
                  {foundSettle && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ผู้โอน:</span>
                        <span className="font-bold text-slate-700">{foundSettle.from}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ผู้รับ:</span>
                        <span className="font-bold text-slate-700">{foundSettle.to}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5">
                        <span className="text-slate-600 font-bold">จำนวนเงิน:</span>
                        <span className="font-extrabold text-secondary-orange">฿{foundSettle.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {!isImage && !foundSettle && (
                    <p className="text-xs text-slate-400 text-center py-4">ไม่พบข้อมูลสลิป</p>
                  )}
                </div>
              );
            })()}
            <button 
              onClick={() => setSelectedSlip(null)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-full cursor-pointer transition-all active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Settlement Confirmation and Slip Upload Modal */}
      {activeSettleIndex !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                <span>แนบหลักฐานเพื่อโอนเงินคืน</span>
              </h3>
              <button 
                onClick={() => {
                  setActiveSettleIndex(null);
                  setSettleSlipAttached(false);
                  setSettleSlipName('');
                }}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้โอนเงิน:</span>
                <span className="font-bold text-slate-800">{settlements[activeSettleIndex].from}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้รับเงิน:</span>
                <span className="font-bold text-slate-800">{settlements[activeSettleIndex].to}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-800">ยอดเงินที่ต้องโอน:</span>
                <span className="text-secondary-orange">฿{settlements[activeSettleIndex].amount.toLocaleString()}</span>
              </div>
              
              <div className="mt-2 p-2.5 bg-primary-light/40 border border-primary/10 rounded-xl flex justify-between items-center text-[11px] font-semibold">
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">บัญชีรับเงินโอน</span>
                  <span className="text-primary font-bold">{settlements[activeSettleIndex].toBankAccount}</span>
                </div>
                <CopyBtn
                  text={extractAccountNumber(settlements[activeSettleIndex].toBankAccount)}
                  className="p-1 hover:bg-primary/10 rounded-full text-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">แนบสลิปโอนเงิน (สลิป)</label>
              <label className="border-2 border-dashed border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:bg-primary-light/10 transition-all cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setSettleSlipName(file.name);
                      setSettleSlipAttached(true);
                      setSettleSlipFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setSettleSlipPreview(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {settleSlipPreview ? (
                  <div className="relative w-full">
                    <img src={settleSlipPreview} alt="สลิป" className="max-h-40 rounded-xl object-contain mx-auto" />
                    <p className="text-[10px] text-tertiary-green font-bold text-center mt-1">✓ แนบสลิปเรียบร้อยแล้ว</p>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-3xl text-slate-400">cloud_upload</span>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-600">คลิกเพื่ออัปโหลดสลิป</p>
                      <p className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG หรือภาพถ่าย</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => {
                  setActiveSettleIndex(null);
                  setSettleSlipAttached(false);
                  setSettleSlipName('');
                  setSettleSlipPreview('');
                  setSettleSlipFile(null);
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-full hover:bg-slate-200 transition-all cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button 
                onClick={async () => {
                  if (!settleSlipAttached) {
                    alert('กรุณาแนบสลิปหลักฐานการโอนเพื่อยืนยัน');
                    return;
                  }
                  const s = settlements[activeSettleIndex!];
                  let slipUrl = '';
                  if (settleSlipFile) {
                    setSettleSlipUploading(true);
                    try {
                      const result = await uploadImage(settleSlipFile, 'slips');
                      slipUrl = result.url;
                    } catch (err) {
                      alert('อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง');
                      setSettleSlipUploading(false);
                      return;
                    }
                  }
                  const key = `${s.from}-${s.to}`;
                  const prevSettled = settlementStates[key]?.settledAmount || 0;
                  const newTotal = prevSettled + (s.amount || 0);
                  setSettlementStates(prev => ({
                    ...prev,
                    [key]: { ...prev[key], isSettled: false, slipUrl, settledAmount: newTotal }
                  }));
                  await fetch(`/api/trips/${trip.id}/settlements`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settlement_key: key, status: 'pending', slip_url: slipUrl || null, settled_amount: newTotal }),
                  }).catch(() => {});
                  alert(`แนบสลิปจาก ${s.from} ไปยัง ${s.to} เรียบร้อย! รอให้ ${s.to} ยืนยันการรับเงิน`);
                  setActiveSettleIndex(null);
                  setSettleSlipAttached(false);
                  setSettleSlipName('');
                  setSettleSlipPreview('');
                  setSettleSlipFile(null);
                  setSettleSlipUploading(false);
                }}
                className="flex-1 py-2 bg-secondary-orange hover:bg-secondary-orange-hover text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={settleSlipUploading}
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{settleSlipUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการโอน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">edit</span>
                <span>แก้ไขรายละเอียดทริป</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="material-symbols-outlined text-slate-400 hover:text-slate-600 cursor-pointer text-[20px]">close</button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-2.5 flex-1">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400">ชื่อทริป</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">จุดหมาย</label>
                  <input type="text" value={editDestination} onChange={e => setEditDestination(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">ประเทศ</label>
                  <select value={editCountry} onChange={e => setEditCountry(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none">
                    <option value="Thailand">Thailand</option>
                    <option value="Japan">Japan</option>
                    <option value="Singapore">Singapore</option>
                    <option value="France">France</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">วันเริ่มเดินทาง</label>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">วันสิ้นสุด</label>
                  <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">งบประมาณ (฿)</label>
                  <input type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">รูปภาพทริป</label>
                  <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 focus-within:border-primary rounded-full px-3 py-2 text-xs outline-none flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">photo_camera</span>
                    <span className="text-slate-400 truncate flex-1">{editCoverUrl ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const result = await uploadImage(file, 'trips');
                        setEditCoverUrl(result.url);
                      } catch (err: any) {
                        alert(err.message || 'อัพโหลดไม่สำเร็จ');
                      }
                    }} />
                  </label>
                </div>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400">สถานะทริป (อัตโนมัติตามวันที่)</label>
                <div className={`w-full px-3 py-2 text-xs font-bold rounded-full ${
                  editStatus === 'active' ? 'bg-tertiary-green-light text-tertiary-green' :
                  editStatus === 'upcoming' ? 'bg-secondary-orange-light text-secondary-orange' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {editStatus === 'active' ? '🟢 กำลังเดินทาง' :
                   editStatus === 'upcoming' ? '🟠 เร็วๆ นี้' :
                   '⚫ ผ่านมาแล้ว'}
                </div>
              </div>
              {editCoverUrl && (
                <div className="space-y-1">
                  <ImagePositionPicker
                    src={editCoverUrl}
                    position={editCoverPosition}
                    onPositionChange={setEditCoverPosition}
                    aspect={16 / 9}
                  />
                  <p className="text-[9px] text-slate-400 font-semibold px-1">ลากรูปเพื่อจัดตำแหน่งรูปหน้าปก (หรือแตะปุ่มกากบาทเพื่อจัดกึ่งกลาง)</p>
                </div>
              )}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400">คำอธิบาย</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-xl px-3 py-2 text-xs outline-none resize-none" placeholder="รายละเอียดเกี่ยวกับทริป..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">เพื่อนร่วมทริป ({editMemberIds.length} คน)</label>
                {allProfiles.length === 0 ? (
                  <p className="text-[10px] text-slate-400">กำลังโหลด...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {allProfiles.filter((p: any) => p.status === 'approved').map((p: any) => {
                      const selected = editMemberIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          onClick={() => setEditMemberIds(prev =>
                            prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                          )}
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                            selected ? 'bg-primary-light border-primary' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-slate-200">
                            <img className="w-full h-full object-cover" alt={p.name} src={p.avatar_url || ''} />
                          </div>
                          <span className={`text-[10px] font-bold truncate ${selected ? 'text-primary' : 'text-slate-600'}`}>
                            {p.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-full hover:bg-slate-200 transition-all cursor-pointer">ยกเลิก</button>
              <button onClick={() => {
                  onUpdateTrip({ title: editTitle, destination: editDestination, coverImgUrl: editCoverUrl, coverPosition: positionToCss(editCoverPosition), description: editDescription, country: editCountry, budget: parseFloat(editBudget) || trip.budget, dates: `${editStartDate} - ${editEndDate}` });
                  const oldIds = trip.memberIds || [];
                  const newIds = editMemberIds;
                  if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
                    onUpdateTripMembers(newIds);
                  }
                  setShowEditModal(false);
                }}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
