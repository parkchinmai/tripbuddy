/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip } from '../types';
import { HOTLINKS, formatDateRange, calculateSettlements, extractAccountNumber } from '../data';
import CopyBtn from './CopyBtn';

interface TripDetailJapanProps {
  trip: Trip;
  onBack: () => void;
  onAddExpenseClick: () => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateTrip: (updates: Partial<Trip>) => void;
}

type TabType = 'overview' | 'expenses' | 'settlement' | 'companions';

const getTripMembers = (trip: Trip) => {
  const namesSet = new Set<string>();
  
  if (trip.id === 't-chiangmai') {
    namesSet.add('คุณต้น');
    namesSet.add('คุณพลอย');
    namesSet.add('สมชาย');
  } else if (trip.id === 't-japan') {
    namesSet.add('ต้น');
    namesSet.add('ก้อย');
    namesSet.add('แพรว');
    namesSet.add('บาส');
  }

  trip.expenses.forEach(e => {
    if (e.paidBy) namesSet.add(e.paidBy);
    if (e.splitWith) {
      e.splitWith.forEach(name => namesSet.add(name));
    }
  });

  return Array.from(namesSet).map((name, index) => {
    let avatarUrl = '';
    let bankAccount = 'ยังไม่ได้ระบุ';
    let phone = '08X-XXX-XXXX';
    let role = 'ผู้ร่วมเดินทาง';

    if (name.includes('ต้น')) {
      avatarUrl = HOTLINKS.member2;
      bankAccount = 'กสิกรไทย 045-3-22841-9';
      phone = '089-765-4321';
      role = 'ผู้จัดทริป';
    } else if (name.includes('พลอย')) {
      avatarUrl = HOTLINKS.member1;
      bankAccount = 'ไทยพาณิชย์ 112-9-88271-0';
      phone = '086-123-4567';
      role = 'ผู้บันทึกสลิป';
    } else if (name.includes('สมชาย')) {
      avatarUrl = HOTLINKS.arttoyBear;
      bankAccount = 'กรุงเทพ 045-3-22841-9';
      phone = '081-234-5678';
      role = 'ผู้ร่วมเดินทาง';
    } else if (name.includes('ก้อย')) {
      avatarUrl = HOTLINKS.avatarPink;
      bankAccount = 'ทหารไทยธนชาต 442-2-19283-4';
      phone = '084-221-8899';
      role = 'ผู้จองโรงแรม';
    } else if (name.includes('แพรว')) {
      avatarUrl = HOTLINKS.avatarExplorer;
      bankAccount = 'กรุงศรีอยุธยา 777-1-02938-5';
      phone = '083-998-1122';
      role = 'ผู้ร่วมเดินทาง';
    } else if (name.includes('บาส')) {
      avatarUrl = HOTLINKS.avatarRobot;
      bankAccount = 'ไทยพาณิชย์ 091-2-22918-0';
      phone = '082-111-0000';
      role = 'ผู้ร่วมเดินทาง';
    } else {
      const fallbacks = [
        HOTLINKS.avatarPink,
        HOTLINKS.avatarExplorer,
        HOTLINKS.avatarRobot,
        HOTLINKS.avatarFox,
        HOTLINKS.arttoyCat,
        HOTLINKS.arttoyDino
      ];
      avatarUrl = fallbacks[index % fallbacks.length];
      bankAccount = `ธนาคารทั่วไป (รอระบุ)`;
      phone = `08${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    const totalPaid = trip.expenses
      .filter(e => e.paidBy === name)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalShare = trip.expenses
      .filter(e => e.splitWith.includes(name))
      .reduce((sum, e) => {
        if (e.customShares && e.customShares[name] !== undefined) {
          return sum + e.customShares[name];
        }
        const shareCount = e.splitWith.length || 1;
        return sum + (e.amount / shareCount);
      }, 0);

    return {
      name,
      avatarUrl,
      bankAccount,
      phone,
      role,
      totalPaid,
      totalShare,
      netBalance: totalPaid - totalShare
    };
  });
};

export default function TripDetailJapan({ 
  trip, 
  onBack, 
  onAddExpenseClick, 
  onDeleteExpense,
  onUpdateTrip
}: TripDetailJapanProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const foodSpent = trip.expenses.filter(e => e.category === 'Food').reduce((sum, e) => sum + e.amount, 0);
  const travelSpent = trip.expenses.filter(e => e.category === 'Travel').reduce((sum, e) => sum + e.amount, 0);
  const lodgingSpent = trip.expenses.filter(e => e.category === 'Accommodation').reduce((sum, e) => sum + e.amount, 0);
  const otherSpent = trip.expenses.filter(e => e.category === 'Other').reduce((sum, e) => sum + e.amount, 0);

  const categoryData = [
    { name: 'ที่พัก (Accommodation)', amount: lodgingSpent, color: '#fd761a', percent: 0 },
    { name: 'อาหารและเครื่องดื่ม (Food)', amount: foodSpent, color: '#006591', percent: 0 },
    { name: 'การเดินทาง (Transport)', amount: travelSpent, color: '#00b351', percent: 0 },
    { name: 'อื่นๆ (Other)', amount: otherSpent, color: '#94a3b8', percent: 0 }
  ].filter(c => c.amount > 0);
  const categoryTotal = categoryData.reduce((sum, c) => sum + c.amount, 0);
  categoryData.forEach(c => { c.percent = categoryTotal ? Math.round((c.amount / categoryTotal) * 100) : 0; });
  const ringRadii = [65, 50, 36, 22];
  const ringStroke = [12, 10, 8, 6];

  const budgetUsedPercent = Math.min(Math.round((totalSpent / trip.budget) * 100), 100);

  const tripMembers = getTripMembers(trip);
  const computedSettlements = calculateSettlements(tripMembers);

  const [settlementStates, setSettlementStates] = useState<Record<string, boolean>>({});

  const settlements = computedSettlements.map(s => ({
    ...s,
    isSettled: settlementStates[`${s.from}-${s.to}-${s.amount}`] || false
  }));

  const [activeSettleIndex, setActiveSettleIndex] = useState<number | null>(null);
  const [settleSlipAttached, setSettleSlipAttached] = useState<boolean>(false);
  const [settleSlipName, setSettleSlipName] = useState<string>('');
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const toggleMemberExpand = (name: string) => {
    setExpandedMembers(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editDestination, setEditDestination] = useState(trip.destination);
  const [editCoverUrl, setEditCoverUrl] = useState(trip.coverImgUrl);
  const [editDescription, setEditDescription] = useState(trip.description || '');
  const [editCountry, setEditCountry] = useState(trip.country);
  const [editBudget, setEditBudget] = useState(String(trip.budget));

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-primary hover:underline font-bold text-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>ย้อนกลับไปหน้ารวมทริป</span>
        </button>
        <div className="flex items-center gap-1.5 text-slate-400 text-sm font-semibold">
          <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
          <span>{trip.destination}</span>
        </div>
      </div>

      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2">
        <div className="space-y-1 flex-1">
          <span className="text-primary font-bold text-xs uppercase tracking-widest">{trip.country}</span>
          <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{trip.title}</h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold pt-1">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>{formatDateRange(trip.dates)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => {
              setEditTitle(trip.title);
              setEditDestination(trip.destination);
              setEditCoverUrl(trip.coverImgUrl);
              setEditDescription(trip.description || '');
              setEditCountry(trip.country);
              setEditBudget(String(trip.budget));
              setShowEditModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-primary rounded-full text-xs font-bold text-slate-600 hover:text-primary transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>แก้ไข</span>
          </button>
        </div>

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

      <div className="flex border-b border-slate-100 overflow-x-auto gap-0">
        {[
          { tab: 'overview' as const, label: 'ภาพรวม' },
          { tab: 'expenses' as const, label: 'ค่าใช้จ่าย' },
          { tab: 'settlement' as const, label: 'สรุปยอด' },
          { tab: 'companions' as const, label: 'เพื่อนร่วมทริป' },
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

              <div className="bg-secondary-orange-light/40 border border-secondary-orange-light p-4 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary-orange text-[22px] shrink-0 font-bold mt-0.5">tips_and_updates</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">เคล็ดลับการออมสำหรับทริปถัดไป</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                    วางแผนค่าใช้จ่ายแยกตามหมวดหมู่ล่วงหน้า เพื่อคุมงบได้ง่ายขึ้นและหารค่าใช้จ่ายโปร่งใสในกลุ่มเพื่อน
                  </p>
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
                        expense.category === 'Food' ? 'bg-primary-light text-primary' :
                        expense.category === 'Travel' ? 'bg-tertiary-green-light text-tertiary-green' :
                        'bg-secondary-orange-light text-secondary-orange'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {expense.category === 'Food' ? 'restaurant' :
                           expense.category === 'Travel' ? 'local_taxi' :
                           'hotel'}
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
                              ? `หารไม่เท่า: ${Object.entries(expense.customShares).map(([name, val]) => `${name} (฿${val.toLocaleString()})`).join(', ')}`
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
            />
            <div className="absolute bottom-0 left-0 p-6 z-20 text-white space-y-2">
              <span className="text-[10px] font-extrabold bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full inline-block">จุดหมายปัจจุบัน</span>
              <h3 className="text-xl font-extrabold leading-tight">{trip.destination}</h3>
              {trip.description && (
                <p className="text-xs text-white/70 font-medium whitespace-pre-line">{trip.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">รายการค่าใช้จ่ายทั้งหมด</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">รวม {trip.expenses.length} รายการ เป็นเงิน ฿{totalSpent.toLocaleString()}</p>
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
                      expense.category === 'Food' ? 'bg-primary-light text-primary' :
                      expense.category === 'Travel' ? 'bg-tertiary-green-light text-tertiary-green' :
                      'bg-secondary-orange-light text-secondary-orange'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {expense.category === 'Food' ? 'restaurant' :
                         expense.category === 'Travel' ? 'local_taxi' :
                         'hotel'}
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
                            ? `หารไม่เท่า: ${Object.entries(expense.customShares).map(([name, val]) => `${name} (฿${val.toLocaleString()})`).join(', ')}`
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
                    <button 
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer shrink-0"
                      title="ลบรายการ"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settlement' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">สรุปยอดที่ต้องเคลียร์กัน</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">การจับคู่อย่างอัจฉริยะเพื่อให้เกิดจำนวนรายการธุรกรรมน้อยที่สุด</p>
            </div>
            <span className="material-symbols-outlined text-secondary-orange text-[28px]">handshake</span>
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
                    </div>
                  </div>
                  <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    <p className={`text-xl font-extrabold ${settlement.isSettled ? 'text-slate-400 line-through font-bold' : 'text-secondary-orange'}`}>
                      ฿{settlement.amount.toLocaleString()}
                    </p>
                    {settlement.isSettled ? (
                      <span className="text-[10px] bg-tertiary-green-light text-tertiary-green px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 mt-1">
                        <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                        <span>โอนแล้ว</span>
                      </span>
                    ) : (
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

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-800">รายละเอียดค่าใช้จ่ายรายบุคคล</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">คลิกแต่ละคนเพื่อดูรายละเอียดค่าใช้จ่ายที่ออกก่อนและต้องจ่าย</p>
              </div>
              <span className="material-symbols-outlined text-primary text-xl">expand</span>
            </div>

            <div className="space-y-3">
              {getTripMembers(trip).map((member, idx) => {
                const isExpanded = !!expandedMembers[member.name];
                const paidExpenses = trip.expenses.filter(e => e.paidBy === member.name);
                const sharedExpenses = trip.expenses.filter(e => e.splitWith.includes(member.name)).map(e => {
                  let shareAmount = 0;
                  if (e.customShares && e.customShares[member.name] !== undefined) {
                    shareAmount = e.customShares[member.name];
                  } else {
                    const shareCount = e.splitWith.length || 1;
                    shareAmount = e.amount / shareCount;
                  }
                  return { ...e, shareAmount };
                });

                const balance = member.totalPaid - member.totalShare;

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
                          <p className="text-sm font-extrabold text-slate-800">{member.name}</p>
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
                                      <p className="text-[10px] text-slate-400 font-bold">{e.date} • {e.category === 'Food' ? 'อาหาร' : e.category === 'Travel' ? 'เดินทาง' : e.category === 'Accommodation' ? 'ที่พัก' : 'อื่นๆ'}</p>
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

      {activeTab === 'companions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">สมาชิกเพื่อนร่วมทริป ({getTripMembers(trip).length} คน)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                รายชื่อสมาชิกทั้งหมดที่ร่วมแชร์และเคลียร์ยอดค่าใช้จ่ายในทริปนี้
              </p>
            </div>
            <span className="material-symbols-outlined text-primary text-[28px]">groups</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getTripMembers(trip).map((member, idx) => (
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

      {selectedSlip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800">หลักฐานการจ่ายเงิน</h3>
              <button 
                onClick={() => setSelectedSlip(null)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                close
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4 text-left">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">verified</span>
                <span className="text-xs font-bold uppercase tracking-wider">E-Slip Verified</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">รายการ: {selectedSlip}</p>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>ผู้โอน:</span>
                  <span className="font-bold text-slate-700">
                    {(() => {
                      const foundSettle = settlements.find(s => `${s.from} จ่ายคืนให้ ${s.to}` === selectedSlip || `${s.from}-${s.to}-${s.amount}` === selectedSlip);
                      return foundSettle ? foundSettle.from : '';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>เวลาโอน:</span>
                  <span className="font-semibold text-slate-700">12:34 น. (วันนี้)</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>สถานะ:</span>
                  <span className="font-bold text-tertiary-green">สำเร็จ</span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">จำนวนเงิน:</span>
                <span className="text-lg font-extrabold text-primary">
                  ฿{(() => {
                    const foundExp = trip.expenses.find(e => e.title === selectedSlip);
                    if (foundExp) return foundExp.amount.toLocaleString();
                    const foundSettle = settlements.find(s => `${s.from} จ่ายคืนให้ ${s.to}` === selectedSlip || `${s.from}-${s.to}-${s.amount}` === selectedSlip);
                    if (foundSettle) return foundSettle.amount.toLocaleString();
                    return '1,200';
                  })()}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedSlip(null)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-full cursor-pointer transition-all active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

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
              <label className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:bg-primary-light/10 transition-all cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSettleSlipName(e.target.files[0].name);
                      setSettleSlipAttached(true);
                    }
                  }}
                />
                <span className="material-symbols-outlined text-3xl text-slate-400">cloud_upload</span>
                {settleSlipAttached ? (
                  <div className="text-center">
                    <p className="text-xs font-bold text-tertiary-green">✓ แนบสลิปเรียบร้อยแล้ว</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{settleSlipName}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-600">คลิกเพื่ออัปโหลดสลิป</p>
                    <p className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG หรือภาพถ่าย</p>
                  </div>
                )}
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => {
                  setActiveSettleIndex(null);
                  setSettleSlipAttached(false);
                  setSettleSlipName('');
                }}
                className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-full hover:bg-slate-200 transition-all cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  if (!settleSlipAttached) {
                    alert('กรุณาแนบสลิปหลักฐานการโอนเพื่อยืนยัน');
                    return;
                  }
                  const s = settlements[activeSettleIndex!];
                  setSettlementStates(prev => ({
                    ...prev,
                    [`${s.from}-${s.to}-${s.amount}`]: true
                  }));
                  alert(`โอนเงินคืนจาก ${s.from} ไปยัง ${s.to} สำเร็จ!`);
                  setActiveSettleIndex(null);
                  setSettleSlipAttached(false);
                  setSettleSlipName('');
                }}
                className="flex-1 py-2 bg-secondary-orange hover:bg-secondary-orange-hover text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center gap-0.5"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>ยืนยันการโอน</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <label className="text-[10px] font-bold text-slate-400">งบประมาณ (฿)</label>
                  <input type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">URL รูปภาพ</label>
                  <input type="text" value={editCoverUrl} onChange={e => setEditCoverUrl(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-3 py-2 text-xs outline-none" placeholder="https://..." />
                </div>
              </div>
              {editCoverUrl && (
                <img src={editCoverUrl} alt="Preview" className="w-full h-20 object-cover rounded-xl border border-slate-100" />
              )}
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400">คำอธิบาย</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-xl px-3 py-2 text-xs outline-none resize-none" placeholder="รายละเอียดเกี่ยวกับทริป..." />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-full hover:bg-slate-200 transition-all cursor-pointer">ยกเลิก</button>
              <button onClick={() => {
                  onUpdateTrip({ title: editTitle, destination: editDestination, coverImgUrl: editCoverUrl, description: editDescription, country: editCountry, budget: parseFloat(editBudget) || trip.budget });
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
