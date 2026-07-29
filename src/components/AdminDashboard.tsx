/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip } from '../types';
import { defaultMembers } from '../data';
import { uploadImage } from '../lib/r2';

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
  const approvedMembers = defaultMembers.filter(m => m.status === 'approved');

  // Form states for creating a new trip
  const [tripTitle, setTripTitle] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [country, setCountry] = useState<string>('Thailand');
  const [coverImgUrl, setCoverImgUrl] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

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
    setSelectedMemberIds([]);
    alert('สร้างทริปใหม่สำเร็จ! คุณสามารถดูรายละเอียดทริปใหม่ได้ในหน้ารายการทริปหลัก');
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
                    const result = await uploadImage(file);
                    setCoverImgUrl(result.url);
                  } catch (err: any) {
                    alert(err.message || 'อัพโหลดไม่สำเร็จ');
                  }
                }} />
              </label>
            </div>

            {coverImgUrl && (
              <img src={coverImgUrl} alt="Preview" className="w-full h-20 object-cover rounded-xl border border-slate-100" />
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">เลือกสมาชิกจากฐานข้อมูล ({selectedMemberIds.length} คน)</label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {approvedMembers.length === 0 ? (
                  <p className="text-xs text-slate-400">ไม่มีสมาชิกที่อนุมัติแล้วในขณะนี้</p>
                ) : (
                  approvedMembers.map(member => {
                    const checked = selectedMemberIds.includes(member.id);
                    return (
                      <label 
                        key={member.id}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          checked ? 'border-primary bg-primary-light/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          className="w-4 h-4 accent-primary shrink-0"
                          checked={checked}
                          onChange={() => toggleMember(member.id)}
                        />
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                          <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{member.name}</p>
                          <p className="text-xs text-slate-400 truncate">โทร: {member.phone}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {(parseFloat(budget) > 0 && selectedMemberIds.length > 0) && (
              <div className="bg-primary-light/50 rounded-2xl p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">งบประมาณต่อคน ({selectedMemberIds.length} คน)</span>
                <span className="text-base font-extrabold text-primary">
                  ฿{(parseFloat(budget) / selectedMemberIds.length).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-secondary-orange hover:bg-secondary-orange-hover text-white rounded-full text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined">add_task</span>
              <span>สร้างทริปสู่ระบบ</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
