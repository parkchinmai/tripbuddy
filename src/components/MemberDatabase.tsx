/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { bankLogos, BankLogoKey, GenericBankLogo } from './BankLogos';

interface MemberDatabaseProps {
  isAdmin: boolean;
}

const statusConfig: Record<Member['status'], { label: string; badge: string }> = {
  approved: { label: 'อนุมัติแล้ว', badge: 'bg-tertiary-green-light text-tertiary-green' },
  pending: { label: 'รอตรวจสอบ', badge: 'bg-secondary-orange-light text-secondary-orange' },
  suspended: { label: 'ระงับการใช้งาน', badge: 'bg-red-50 text-red-500' }
};

const nextStatus: Record<Member['status'], Member['status']> = {
  approved: 'pending',
  pending: 'suspended',
  suspended: 'approved'
};

const getBankName = (bankAccount: string): string => {
  const match = bankAccount.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : '';
};

const getBankLogo = (bankAccount: string) => {
  const name = getBankName(bankAccount);
  if (name in bankLogos) {
    return bankLogos[name as BankLogoKey];
  }
  return GenericBankLogo;
};

const getAccountNumber = (bankAccount: string): string => {
  const match = bankAccount.match(/^(.*?)\s*\(/);
  return match ? match[1].trim() : bankAccount;
};

function mapMember(m: any): Member {
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    avatarUrl: m.avatar_url || '',
    bankAccount: m.bank_account || '',
    status: m.status || 'pending',
    joinDate: m.join_date || '',
    accessLevel: m.access_level || 'user',
  };
}

export default function MemberDatabase({ isAdmin }: MemberDatabaseProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/members')
      .then(r => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(data => {
        const list = Array.isArray(data) ? data : ((data as any).results || []);
        setMembers(list.map(mapMember));
      })
      .catch(() => setMembers([]));
  }, []);

  if (!isAdmin) {
    return (
      <div className="space-y-8 animate-fade-in font-sans">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="material-symbols-outlined text-[56px] text-slate-300 mb-2">lock</span>
          <h2 className="text-xl font-extrabold text-slate-700 mb-1">เข้าถึงเฉพาะผู้ดูแลระบบ</h2>
          <p className="text-sm text-slate-400 font-medium">หน้าฐานข้อมูลสมาชิกเปิดให้แอดมินเท่านั้น กรุณาเปิดสิทธิ์แอดมินเพื่อดูข้อมูล</p>
        </section>
      </div>
    );
  }

  const filtered = members.filter(m => {
    const matchQuery = m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.phone.includes(query);
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const total = members.length;
  const approvedCount = members.filter(m => m.status === 'approved').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;
  const suspendedCount = members.filter(m => m.status === 'suspended').length;

  const updateMember = (id: string, updates: Record<string, unknown>) => {
    fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  const handleToggleAccess = (id: string) => {
    const m = members.find(x => x.id === id);
    if (!m) return;
    const next = m.accessLevel === 'admin' ? 'user' : 'admin';
    setMembers(members.map(x => x.id === id ? { ...x, accessLevel: next } : x));
    updateMember(id, { accessLevel: next });
  };

  const handleToggleStatus = (id: string) => {
    const m = members.find(x => x.id === id);
    if (!m) return;
    const next = nextStatus[m.status];
    setMembers(members.map(x => x.id === id ? { ...x, status: next } : x));
    updateMember(id, { status: next });
  };

  const pendingMembers = members.filter(m => m.status === 'pending');

  const handleApprove = (id: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: 'approved' as const } : m));
    updateMember(id, { status: 'approved', accessLevel: 'user' });
  };

  const handleReject = (id: string) => {
    const m = members.find(x => x.id === id);
    if (!m) return;
    if (!window.confirm(`ปฏิเสธสมาชิก "${m.name}"? ข้อมูลทั้งหมดของสมาชิกนี้จะถูกลบออกจากระบบถาวร (ทริปที่ร่วม สมาชิก และรูปโปรไฟล์)`)) return;
    setMembers(members.filter(x => x.id !== id));
    fetch(`/api/members/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <section className="pb-2 border-b border-slate-100">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2 leading-tight">ฐานข้อมูลสมาชิก</h2>
        <p className="text-base text-slate-500 font-medium">คลังข้อมูลสมาชิกทั้งหมดในระบบ พร้อมค้นหา แก้ไขสิทธิ์ และสถานะ</p>
      </section>

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
                    title="ลบสมาชิกและข้อมูลทั้งหมดออกจากระบบ"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>ปฏิเสธ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">สมาชิกทั้งหมด</span>
          <span className="text-2xl font-extrabold text-slate-800">{total} คน</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">อนุมัติแล้ว</span>
          <span className="text-2xl font-extrabold text-tertiary-green">{approvedCount} คน</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">รอตรวจสอบ</span>
          <span className="text-2xl font-extrabold text-secondary-orange">{pendingCount} คน</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">ระงับการใช้งาน</span>
          <span className="text-2xl font-extrabold text-red-500">{suspendedCount} คน</span>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 text-[20px]">search</span>
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ หรือเบอร์โทร..."
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full pl-11 pr-4 py-2.5 text-sm outline-none"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'approved', label: 'อนุมัติแล้ว' },
              { key: 'pending', label: 'รอตรวจสอบ' },
              { key: 'suspended', label: 'ระงับ' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-all ${
                  statusFilter === f.key ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card layout for mobile */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm font-semibold">
              ไม่พบข้อมูลสมาชิกที่ตรงกับเงื่อนไขการค้นหา
            </p>
          ) : (
            filtered.map(member => {
              const badge = statusConfig[member.status];
              const BankLogo = getBankLogo(member.bankAccount);
              return (
                <div key={member.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100 shrink-0">
                      <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{member.name}</p>
                      <p className="text-xs text-slate-400 truncate">เข้าร่วม: {member.joinDate}</p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(member.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${badge.badge} hover:opacity-80 shrink-0`}
                      title="คลิกเพื่อเปลี่ยนสถานะ"
                    >
                      {badge.label}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">เบอร์โทร</p>
                      <p className="text-slate-600">{member.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">เลขบัญชี</p>
                      <div className="flex items-center gap-2">
                        <BankLogo className="w-6 h-6 rounded-lg shrink-0" />
                        <span className="font-mono text-slate-700">{getAccountNumber(member.bankAccount)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAccess(member.id)}
                    className={`w-full px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                      member.accessLevel === 'admin'
                        ? 'bg-secondary-orange/15 border-secondary-orange text-secondary-orange hover:bg-secondary-orange/25'
                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                    }`}
                    title="คลิกเพื่อสลับสิทธิ์"
                  >
                    สิทธิ์: {member.accessLevel === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Table layout for desktop */}
        <div className="hidden md:block overflow-x-auto -mx-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 border-b border-slate-100">
                <th className="px-3 py-3">สมาชิก</th>
                <th className="px-3 py-3">เบอร์โทร</th>
                <th className="px-3 py-3">เลขบัญชี</th>
                <th className="px-3 py-3">สิทธิ์</th>
                <th className="px-3 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-10 text-sm font-semibold">
                    ไม่พบข้อมูลสมาชิกที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filtered.map(member => {
                  const badge = statusConfig[member.status];
                  const BankLogo = getBankLogo(member.bankAccount);
                  return (
                    <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100 shrink-0">
                            <img className="w-full h-full object-cover" alt={member.name} src={member.avatarUrl} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{member.name}</p>
                            <p className="text-xs text-slate-400 truncate">เข้าร่วม: {member.joinDate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{member.phone}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <BankLogo className="w-9 h-9 rounded-xl shadow-sm shrink-0" />
                          <span className="font-mono text-slate-700 tracking-tight">{getAccountNumber(member.bankAccount)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleAccess(member.id)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                            member.accessLevel === 'admin'
                              ? 'bg-secondary-orange/15 border-secondary-orange text-secondary-orange hover:bg-secondary-orange/25'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="คลิกเพื่อสลับสิทธิ์"
                        >
                          {member.accessLevel === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleStatus(member.id)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${badge.badge} hover:opacity-80`}
                          title="คลิกเพื่อเปลี่ยนสถานะ"
                        >
                          {badge.label}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 font-semibold text-center">
          แสดง {filtered.length} จาก {total} รายการ
        </p>
      </section>
    </div>
  );
}
