/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Member } from '../types';
interface MemberListProps {
  isAdmin: boolean;
}

export default function MemberList({ isAdmin }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New Member Form States
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');

  const filteredMembers = members.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert('กรุณากรอกชื่อและเบอร์โทรให้ครบถ้วน');
      return;
    }

    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: newName,
      phone: newPhone || 'ยังไม่ได้ระบุ',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPPdSca0s-sc1vkZtJXqjChzufyvfLa7SneD8N1jl1DGST-GwEs42rXcdQNXoX8BuD6DgY2u7z2pYBRPy1J69grCWeZEFSsJs7bayrF_JhnVfntLuh7vuJBoFPRMhMLnZNmLODhB3poWmO8TdJYsjbKIZ3H6B4cRPOwsJa2n3weiS0is33yXbbTLdnYtIg6-AJT3UyegH6bdeyxAELxunnYLkTgdg91bJdkZdoO0ooO-xGtxJ7gHOR_OawnDBn2vhCkFL8IJ6vF3Q',
      bankAccount: newBank || 'ยังไม่ได้ระบุ',
      status: 'pending',
      joinDate: 'วันนี้',
      accessLevel: 'user'
    };

    setMembers([...members, newMember]);
    setNewName('');
    setNewPhone('');
    setNewBank('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณต้องการนำสมาชิกคนนี้ออกจากระบบใช่หรือไม่?')) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setMembers(members.map(m => {
      if (m.id === id) {
        const nextStatus: Member['status'] = 
          m.status === 'approved' ? 'pending' : 
          m.status === 'pending' ? 'suspended' : 'approved';
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  const handleApprove = (id: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: 'approved' as const } : m));
  };

  const handleReject = (id: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: 'suspended' as const } : m));
  };

  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header and filters */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2 leading-tight">จัดการรายชื่อสมาชิก</h2>
          <p className="text-base text-slate-500 font-medium">จัดการสถานะการอนุมัติและระดับสิทธิ์การเข้าถึงข้อมูลร่วมกันในทริป</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-secondary-orange hover:bg-secondary-orange-hover text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer self-start md:self-auto transition-all"
        >
          <span className="material-symbols-outlined">{showAddForm ? 'close' : 'person_add'}</span>
          <span>{showAddForm ? 'ปิดแบบฟอร์ม' : 'เชิญสมาชิกใหม่'}</span>
        </button>
      </section>

      {/* Add Member Form */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-4 max-w-xl animate-fade-in">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_box</span>
            <span>กรอกรายละเอียดข้อมูลสมาชิกใหม่</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              type="text" 
              required
              placeholder="ชื่อ-นามสกุล"
              className="bg-white border-2 border-slate-200 focus:border-primary rounded-full px-4 py-2.5 text-sm outline-none"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input 
              type="text" 
              required
              placeholder="เบอร์โทรศัพท์ (081-234-5678)"
              className="bg-white border-2 border-slate-200 focus:border-primary rounded-full px-4 py-2.5 text-sm outline-none"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
            />
          </div>
            <input 
              type="text" 
              placeholder="เบอร์โทรศัพท์ (เช่น 081-234-5678)"
              className="w-full bg-white border-2 border-slate-200 focus:border-primary rounded-full px-4 py-2.5 text-sm outline-none"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="เลขที่บัญชี (เช่น กสิกร 045-X-XXXXX-9)"
              className="w-full bg-white border-2 border-slate-200 focus:border-primary rounded-full px-4 py-2.5 text-sm outline-none"
              value={newBank}
              onChange={e => setNewBank(e.target.value)}
            />
          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            ส่งคำเชิญสมาชิก (รออนุมัติเริ่มต้น)
          </button>
        </form>
      )}

      {/* Pending Approval Section */}
      {pendingMembers.length > 0 && (
        <section className="bg-secondary-orange-light/30 border-2 border-secondary-orange/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-orange text-[22px]">notification_important</span>
            <h3 className="font-extrabold text-slate-800 text-base">สมาชิกรออนุมัติ ({pendingMembers.length} คน)</h3>
          </div>
          <div className="space-y-3">
            {pendingMembers.map(member => (
              <div key={member.id} className="bg-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-secondary-orange/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-secondary-orange/30 shrink-0">
                    <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{member.name}</p>
                    <p className="text-xs text-slate-400 truncate">{member.phone}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleApprove(member.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-tertiary-green hover:bg-tertiary-green/90 text-white rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      <span>อนุมัติ</span>
                    </button>
                    <button 
                      onClick={() => handleReject(member.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                      <span>ปฏิเสธ</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-2.5">
        <button 
          onClick={() => setFilter('all')}
          className={`px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
          }`}
        >
          ทั้งหมด ({members.length})
        </button>
        <button 
          onClick={() => setFilter('approved')}
          className={`px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
            filter === 'approved' ? 'bg-tertiary-green text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
          }`}
        >
          อนุมัติแล้ว ({members.filter(m => m.status === 'approved').length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
            filter === 'pending' ? 'bg-secondary-orange text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
          }`}
        >
          รอตรวจสอบ ({members.filter(m => m.status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('suspended')}
          className={`px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
            filter === 'suspended' ? 'bg-red-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
          }`}
        >
          ระงับการใช้งาน ({members.filter(m => m.status === 'suspended').length})
        </button>
      </div>

      {/* Member Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMembers.map(member => (
          <div 
            key={member.id}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
                  <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-base truncate">{member.name}</h4>
                  <p className="text-xs text-slate-400 font-semibold truncate">โทร: {member.phone}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">เข้าร่วมเมื่อ: {member.joinDate}</p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                member.status === 'approved' ? 'bg-tertiary-green-light text-tertiary-green' :
                member.status === 'pending' ? 'bg-secondary-orange-light text-secondary-orange' :
                'bg-red-50 text-red-500'
              }`}>
                {member.status === 'approved' ? 'อนุมัติแล้ว' :
                 member.status === 'pending' ? 'รอตรวจสอบ' :
                 'ระงับการใช้งาน'}
              </span>
            </div>

            {/* Member Details */}
            <div className="bg-slate-50 rounded-2xl p-4 text-xs font-semibold text-slate-500 space-y-2">
              <div className="flex justify-between">
                <span>บัญชีการโอน:</span>
                <span className="text-slate-700">{member.bankAccount}</span>
              </div>
              <div className="flex justify-between">
                <span>สิทธิ์การใช้งาน:</span>
                <span className="text-slate-700 capitalize">
                  {member.accessLevel === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 border-t border-slate-50 pt-4 justify-end">
              <button 
                onClick={() => handleToggleStatus(member.id)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all"
                title="เปลี่ยนสถานะ"
              >
                สลับสถานะ
              </button>
              <button 
                onClick={() => handleDelete(member.id)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer"
                title="ลบสมาชิก"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
