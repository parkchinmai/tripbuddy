import React from 'react';
import { UserProfile } from '../types';
import SuitcaseLogo from './SuitcaseLogo';
import { getFallbackAvatar } from '../data';

interface WelcomeBackProps {
  profile: UserProfile;
  onConfirm: () => void;
  onEdit: () => void;
  onSwitchAccount: () => void;
}

export default function WelcomeBack({ profile, onConfirm, onEdit, onSwitchAccount }: WelcomeBackProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Container Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden transition-all transform hover:shadow-2xl duration-300">
        
        {/* Header Visual with Custom Logo */}
        <div className="bg-primary-light/50 p-8 flex flex-col items-center relative overflow-hidden border-b border-slate-50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary-orange/5 rounded-full -ml-10 -mb-10 blur-xl"></div>
          
          {/* Logo */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-primary border border-primary/5">
              <SuitcaseLogo className="w-10 h-10" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 bg-secondary-orange text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
              PRO
            </span>
          </div>

          <span className="text-[11px] font-extrabold text-primary tracking-wider uppercase bg-primary-light px-3 py-1 rounded-full mb-2">
            เที่ยวด้วยกัน
          </span>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight text-center">
            ยินดีต้อนรับกลับมา!
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1 text-center">
            เราพบข้อมูลบัญชีเดิมของคุณที่ลงทะเบียนไว้แล้ว
          </p>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center">
            {/* Avatar Container with pulse effect */}
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm group-hover:scale-105 transition-transform duration-300 animate-pulse"></div>
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden relative z-10">
                <img 
                  className="w-full h-full object-cover" 
                  alt={profile.name} 
                  src={profile.avatarUrl || getFallbackAvatar(profile.name)} 
                />
              </div>
            </div>

            {/* User Name */}
            <h2 className="text-xl font-bold text-slate-800 mt-4 text-center">
              คุณ {profile.name}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {profile.phone}
            </p>
          </div>

          {/* Account Details Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-400">สถานะผู้ใช้</span>
              <span className="font-bold text-primary flex items-center gap-1 bg-primary-light/50 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                <span>{profile.isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้ทั่วไป'}</span>
              </span>
            </div>
            <div className="border-t border-slate-200/50 my-2"></div>
            <div className="flex justify-between items-start text-xs">
              <span className="font-semibold text-slate-400 shrink-0">บัญชีรับเงินโอน</span>
              <span className="font-bold text-slate-700 text-right truncate pl-4">
                {profile.bankAccount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Confirm & Log in button */}
            <button
              onClick={onConfirm}
              className="w-full bg-secondary-orange hover:bg-secondary-orange-hover text-white py-3.5 rounded-full shadow-[0_8px_20px_-4px_rgba(253,118,26,0.3)] hover:shadow-[0_12px_24px_-4px_rgba(253,118,26,0.4)] text-base font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>เข้าสู่ระบบและเริ่มเดินทาง</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-lg">arrow_forward</span>
            </button>

            {/* Quick edit profiles link */}
            <button
              onClick={onEdit}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 py-3 rounded-full text-sm font-bold border border-slate-200/60 transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              <span>แก้ไขข้อมูลโปรไฟล์นี้</span>
            </button>
          </div>

          {/* Switch account button */}
          <div className="text-center pt-2">
            <button
              onClick={onSwitchAccount}
              className="text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
              <span>ใช้เบอร์โทรศัพท์อื่นเข้าสู่ระบบ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
