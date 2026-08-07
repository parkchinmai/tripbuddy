/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trip, Member } from '../types';
import { uploadImage } from '../lib/r2';
import ImagePositionPicker, { positionToCss } from './ImagePositionPicker';

interface AdminDashboardProps {
  trips: Trip[];
  onAddTrip: (newTrip: Omit<Trip, 'id' | 'expenses'>) => void;
}

export default function AdminDashboard({ trips, onAddTrip }: AdminDashboardProps) {
  const totalTrips = trips.length;
  const totalSpent = trips.reduce((sum, t) => sum + t.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const uniqueMembers = new Set<string>();
  trips.forEach(t => {
    t.expenses.forEach(e => {
      uniqueMembers.add(e.paidBy);
      e.splitWith.forEach(name => uniqueMembers.add(name));
    });
  });
  const totalMembers = uniqueMembers.size;

  // Form states for creating a new trip
  const [tripTitle, setTripTitle] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [country, setCountry] = useState<string>('Thailand');
  const [coverImgUrl, setCoverImgUrl] = useState<string>('');
  const [coverPosition, setCoverPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setPendingMembers(list.filter((m: any) => m.status === 'pending'));
        setAllMembers(list.filter((m: any) => m.status === 'approved'));
      })
      .catch(() => {});
  }, []);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', accessLevel: 'user' }),
      });
      setPendingMembers(prev => prev.filter(m => m.id !== id));
    } catch {}
    setApproving(null);
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      });
      setPendingMembers(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripTitle || !destination || !startDate || !endDate || !budget) {
      alert('กรุณากรอกข้อมูลเพื่อสร้างทริปให้ครบถ้วน');
      return;
    }

    const count = selectedMemberIds.length;
    const totalBudget = parseFloat(budget);
    const perPerson = count > 0 ? totalBudget / count : undefined;

    onAddTrip({
      title: tripTitle,
      destination,
      country,
      dates: `${startDate} - ${endDate}`,
      budget: totalBudget,
      coverImgUrl: coverImgUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5LpSYEcXv8EpLbDAxiurCPURoAaTlc1FTAnY5ahJBO5laMIrcmqww-_72vJhnHBzgaacJHA2XrMxYLPE2cdN_UESk7K4QeBoj45M4U6Omucv_TlkK0zS_Mw0eSlESIYqNRpVusQAraT51gjI0awCHAH-Ft1G6Z8Q9f_EYepQODjl-Ha2ks7A9OocNK9DRdPa4ilQmylBS4Ou_ngPS6iE0Iiyfw18S1hvX9FDDgxOaqR5wnJhZ3aYHWj2krtJuaPOGOceXIhNtUm8',
      coverPosition: positionToCss(coverPosition),
      status: 'upcoming',
      memberCount: count,
      memberIds: selectedMemberIds,
      budgetPerPerson: perPerson
    });

    setTripTitle('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setCoverImgUrl('');
    setCoverPosition({ x: 50, y: 50 });
    setSelectedMemberIds([]);
    alert('สร้างทริปใหม่สำเร็จ! คุณสามารถดูรายละเอียดทริปใหม่ได้ในหน้ารายการทริปหลัก');
  };

  const handleCancelCreate = () => {
    setTripTitle('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setCoverImgUrl('');
    setCoverPosition({ x: 50, y: 50 });
    setSelectedMemberIds([]);
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <section className="pb-2 border-b border-slate-100">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2 leading-tight">แดชบอร์ดผู้ดูแลระบบ (Admin)</h2>
        <p className="text-base text-slate-500 font-medium">ภาพรวมการตรวจสอบ สถิติแพลตฟอร์ม และการตั้งค่าจากส่วนกลาง</p>
      </section>

      {/* Grid of Stats Cards */}
      <section className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] sm:text-[28px]">explore</span>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs font-bold text-slate-400 block mb-0.5 leading-tight">ทริปที่ลงทะเบียน</span>
            <span className="text-sm sm:text-2xl font-extrabold text-slate-800">{totalTrips.toLocaleString()} ทริป</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-tertiary-green-light text-tertiary-green flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] sm:text-[28px]">group</span>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs font-bold text-slate-400 block mb-0.5 leading-tight">สมาชิกทั้งหมด</span>
            <span className="text-sm sm:text-2xl font-extrabold text-slate-800">{totalMembers.toLocaleString()} คน</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-secondary-orange-light text-secondary-orange flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] sm:text-[28px]">account_balance_wallet</span>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs font-bold text-slate-400 block mb-0.5 leading-tight">ยอดใช้จ่ายผ่านระบบรวม</span>
            <span className="text-sm sm:text-2xl font-extrabold text-slate-800">฿{totalSpent.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Main: creation form */}
      <div className="grid grid-cols-1 gap-6">
        {/* Pending Approval Requests */}
        {pendingMembers.length > 0 && (
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">คำขอสมัครสมาชิกที่รออนุมัติ</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">มี {pendingMembers.length} คำขอที่รอการตรวจสอบ</p>
            </div>
            <div className="space-y-2">
              {pendingMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {m.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(m.id)}
                      disabled={approving === m.id}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-full cursor-pointer transition-colors"
                    >
                      {approving === m.id ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
                    </button>
                    <button
                      onClick={() => handleReject(m.id)}
                      className="px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white text-xs font-bold rounded-full cursor-pointer transition-colors"
                    >
                      ไม่อนุมัติ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create trip form */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">สร้างและมอบหมายทริปใหม่</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">สร้างทริปพร้อมระบุงบประมาณตั้งต้นให้แก่สมาชิก</p>
          </div>

          <form onSubmit={handleCreateTrip} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">ชื่อทริปเดินทาง</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                placeholder="เช่น เที่ยวกระบี่ดื่มด่ำธรรมชาติ"
                value={tripTitle}
                onChange={e => setTripTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">จุดหมาย</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                  placeholder="กระบี่, น่าน..."
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ประเทศ</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                >
                  <option value="Thailand">Thailand</option>
                  <option value="Japan">Japan</option>
                  <option value="Singapore">Singapore</option>
                  <option value="France">France</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">วันเริ่มเดินทาง</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">วันสิ้นสุด</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">งบประมาณเริ่มต้น (฿)</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none"
                  placeholder="30000"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">รูปภาพทริป</label>
              <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 focus-within:border-primary rounded-full px-4 py-2.5 text-sm outline-none flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">photo_camera</span>
                <span className="text-slate-400 truncate flex-1">{coverImgUrl ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ (ไม่บังคับ)'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const result = await uploadImage(file, 'trips');
                    setCoverImgUrl(result.url);
                    setCoverPosition({ x: 50, y: 50 });
                  } catch (err: any) {
                    alert(err.message || 'อัพโหลดไม่สำเร็จ');
                  }
                }} />
              </label>
            </div>

            {coverImgUrl && (
              <div className="space-y-1">
                <ImagePositionPicker
                  src={coverImgUrl}
                  position={coverPosition}
                  onPositionChange={setCoverPosition}
                  aspect={16 / 9}
                />
                <p className="text-[10px] text-slate-400 font-semibold px-1">ลากรูปเพื่อจัดตำแหน่งรูปหน้าปก</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">สมาชิกร่วมทริป ({selectedMemberIds.length} คน)</label>
              {allMembers.length === 0 ? (
                <p className="text-xs text-slate-400">ยังไม่มีสมาชิกที่อนุมัติแล้ว กรุณาอนุมัติสมาชิกก่อน</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {allMembers.map(m => {
                    const selected = selectedMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          selected ? 'bg-primary-light border-primary' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-slate-200">
                          <img className="w-full h-full object-cover" alt={m.name} src={m.avatar_url || ''} />
                        </div>
                        <span className={`text-xs font-bold truncate ${selected ? 'text-primary' : 'text-slate-600'}`}>
                          {m.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {(parseFloat(budget) > 0 && selectedMemberIds.length > 0) && (
              <div className="bg-primary-light/50 rounded-2xl p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">งบประมาณต่อคน ({selectedMemberIds.length} คน)</span>
                <span className="text-base font-extrabold text-primary">
                  ฿{(parseFloat(budget) / selectedMemberIds.length).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelCreate}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-sm font-bold transition-all active:scale-95 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-secondary-orange hover:bg-secondary-orange-hover text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined">add_task</span>
                <span>สร้างทริปสู่ระบบ</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
