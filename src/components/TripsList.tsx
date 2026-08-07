/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trip } from '../types';
import { formatDateRange } from '../data';

interface TripsListProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onCreateNewTrip: () => void;
  isAdmin?: boolean;
  isPendingApproval?: boolean;
  onCheckApprovalStatus?: () => Promise<boolean>;
}

export default function TripsList({ trips, onSelectTrip, onCreateNewTrip, isAdmin = false, isPendingApproval = false, onCheckApprovalStatus }: TripsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('all');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [checkResult, setCheckResult] = useState<'pending' | 'ok' | 'error' | null>(null);

  const handleCheckStatus = async () => {
    if (!onCheckApprovalStatus) return;
    setCheckingStatus(true);
    setCheckResult(null);
    try {
      const approved = await onCheckApprovalStatus();
      setCheckResult(approved ? 'ok' : 'pending');
    } catch {
      setCheckResult('error');
    }
    setCheckingStatus(false);
  };

  const allTrips = trips.filter(t => {
    const matchSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeTrips = allTrips.filter(t => t.status === 'active' || t.status === 'upcoming');
  const pastTrips = allTrips.filter(t => t.status === 'past');

  return (
    <div className="space-y-10 animate-fade-in font-sans">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2 leading-tight">ยินดีต้อนรับกลับมา!</h1>
          <p className="text-base text-slate-500 font-medium">เตรียมพร้อมสำหรับการเดินทางครั้งต่อไปของคุณ</p>
        </div>
        {isAdmin && (
          <button 
            onClick={onCreateNewTrip}
            className="bg-secondary-orange hover:bg-secondary-orange-hover text-white px-6 py-3 rounded-full text-base font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 animate-pulse-subtle cursor-pointer shrink-0 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>สร้างทริปใหม่</span>
          </button>
        )}
      </header>

      {/* Pending Admin Approval Banner */}
      {isPendingApproval && (
        <div className="bg-secondary-orange-light/60 border-2 border-secondary-orange/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-secondary-orange/15 text-secondary-orange flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[30px]">hourglass_top</span>
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-secondary-orange flex items-center gap-2">
              บัญชีของคุณกำลังรอการอนุมัติจากแอดมิน
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              คุณจะเห็นทริปและบันทึกค่าใช้จ่ายได้ทันทีเมื่อแอดมินอนุมัติบัญชีของคุณแล้ว ระบบจะตรวจสอบสถานะให้อัตโนมัติทุก ๆ 10 วินาที
            </p>
            {checkResult === 'ok' && (
              <p className="text-xs font-bold text-tertiary-green flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                อนุมัติแล้ว! กำลังโหลดทริปของคุณ...
              </p>
            )}
            {checkResult === 'pending' && (
              <p className="text-xs font-bold text-secondary-orange flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                ยังไม่ได้รับการอนุมัติ กรุณารอสักครู่ แล้วลองตรวจสอบอีกครั้ง
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checkingStatus}
            className="shrink-0 bg-secondary-orange hover:bg-secondary-orange-hover disabled:opacity-60 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>{checkingStatus ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}</span>
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 text-[20px]">search</span>
          <input
            type="text"
            placeholder="ค้นหาทริป..."
            className="w-full bg-white border-2 border-slate-200 focus:border-primary focus:bg-white rounded-full pl-11 pr-4 py-2.5 text-sm outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: 'ทั้งหมด' },
            { key: 'active' as const, label: 'กำลังเดินทาง' },
            { key: 'upcoming' as const, label: 'เร็วๆ นี้' },
            { key: 'past' as const, label: 'ผ่านมาแล้ว' },
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

      {/* Empty State */}
      {activeTrips.length === 0 && pastTrips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-slate-300 text-[64px] mb-4">{isPendingApproval ? 'hourglass_top' : 'search_off'}</span>
          <p className="text-lg font-bold text-slate-500">
            {isPendingApproval ? 'ยังไม่มีทริปในบัญชีของคุณ' : 'ไม่พบทริปที่ตรงกับเงื่อนไขการค้นหา'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {isPendingApproval ? 'ทริปจะแสดงที่นี่เมื่อแอดมินอนุมัติบัญชีของคุณแล้ว' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ'}
          </p>
        </div>
      )}

      {/* Current Trips Section */}
      {activeTrips.length > 0 && (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">flight_takeoff</span>
            <span>ทริปปัจจุบัน / กำลังจะมาถึง</span>
          </h2>
          <div className="h-[2px] flex-grow bg-slate-100 mx-4 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTrips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group flex flex-col h-full"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={trip.title} 
                  src={trip.coverImgUrl}
                  style={{ objectPosition: trip.coverPosition || '50% 50%' }}
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${trip.status === 'active' ? 'bg-tertiary-green animate-pulse' : 'bg-secondary-orange'}`}></span>
                  <span>{trip.status === 'active' ? 'กำลังเดินทาง' : 'เร็วๆ นี้'}</span>
                </div>
              </div>
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-primary transition-colors">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-slate-400 mb-4">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span className="text-sm font-medium">{formatDateRange(trip.dates)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-400">งบ: ฿{trip.budget.toLocaleString()}</span>
                  <button className="text-primary font-bold text-sm flex items-center gap-1.5 hover:underline group-hover:translate-x-1 transition-transform">
                    <span>ดูรายละเอียด</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Trip Placeholder Card (Visible only to Admin) */}
          {isAdmin && (
            <div 
              onClick={onCreateNewTrip}
              className="border-3 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 group cursor-pointer hover:border-primary hover:bg-slate-50/50 transition-all duration-300 min-h-[300px]"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 text-primary flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                <span className="material-symbols-outlined text-[32px] font-bold">add</span>
              </div>
              <p className="text-sm font-bold text-slate-500 group-hover:text-primary">เพิ่มการเดินทางใหม่</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Past Trips Section */}
      {pastTrips.length > 0 && (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[24px]">history</span>
            <span>ทริปที่ผ่านมา</span>
          </h2>
          <div className="h-[2px] flex-grow bg-slate-100 mx-4"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pastTrips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className="bg-slate-50 hover:bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group flex flex-col"
            >
              <div className="relative h-32 w-full overflow-hidden grayscale-[30%] group-hover:grayscale-0 transition-all duration-500">
                <img 
                  className="w-full h-full object-cover" 
                  alt={trip.title} 
                  src={trip.coverImgUrl}
                  style={{ objectPosition: trip.coverPosition || '50% 50%' }}
                />
              </div>
              <div className="p-4 flex flex-col justify-between flex-grow">
                <div>
                  <h4 className="font-bold text-slate-700 text-base truncate">{trip.title}</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    {formatDateRange(trip.dates)} {trip.days ? `• ${trip.days} วัน` : ''}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrip(trip.id);
                  }}
                  className="mt-4 w-full py-2 rounded-full border border-primary/20 text-primary text-xs font-bold hover:bg-primary/5 hover:border-primary transition-all cursor-pointer"
                >
                  ดูย้อนหลัง
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
