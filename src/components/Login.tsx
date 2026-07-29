/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import SuitcaseLogo from './SuitcaseLogo';

interface LoginProps {
  onLoginSuccess: (phoneNumber: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [phone, setPhone] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers, limit length to 10
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setPhone(val);
    }
  };

  const formatPhoneNumber = (val: string) => {
    if (val.length <= 3) return val;
    if (val.length <= 6) return `${val.slice(0, 3)}-${val.slice(3)}`;
    return `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
      return;
    }
    onLoginSuccess(formatPhoneNumber(phone));
  };

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans">
      {/* Decorative Blur Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-orange/5 rounded-full blur-[80px]"></div>
      </div>

      {/* Login Container Card */}
      <main className="relative z-10 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,101,145,0.15)] overflow-hidden border border-slate-100">
        {/* Left Column: Visual Illustration & Branding */}
        <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#eff4ff] to-[#e5eeff] relative overflow-hidden">
          {/* Logo Branding */}
          <div className="flex justify-center items-center">
            <span className="font-sans text-2xl font-extrabold text-primary tracking-tight text-center">เที่ยวด้วยกัน</span>
          </div>

          {/* Centered Floating Suitcase */}
          <div className="flex justify-center items-center my-8 animate-float">
            <SuitcaseLogo className="w-52 h-52 text-primary" />
          </div>

          {/* Left Side Copywriting */}
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-on-surface-dark mb-3">เพื่อนคู่ใจ... ทริปไหนก็สบาย</h2>
            <p className="text-base text-slate-500 leading-relaxed">
              จัดการทุกค่าใช้จ่ายร่วมกับกลุ่มเพื่อนได้ในที่เดียว ไม่ต้องกังวลเรื่องการหารเงินอีกต่อไป
            </p>
          </div>
        </section>

        {/* Right Column: Interactive Login Form */}
        <section className="flex flex-col justify-center p-6 sm:p-12 md:p-16">
          {/* Mobile Only Branding */}
          <div className="flex lg:hidden justify-center items-center mb-4">
            <span className="font-sans text-xl font-extrabold text-primary tracking-tight text-center">เที่ยวด้วยกัน</span>
          </div>

          {/* Mobile Suitcase Illustration */}
          <div className="flex lg:hidden justify-center items-center mb-6 animate-float">
            <SuitcaseLogo className="w-16 h-16 text-primary" />
          </div>

          <div className="space-y-2 mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              ออกทริปสนุก จัดการงบง่าย!
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">
              เริ่มต้นใช้งานด้วยเบอร์โทรศัพท์ของคุณ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Phone Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-500 ml-2">เบอร์โทรศัพท์</label>
              <div className="flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-5 py-3 sm:py-3.5 transition-all">
                <input 
                  className="bg-transparent border-none focus:outline-none w-full text-sm sm:text-base font-medium text-slate-800 placeholder:text-slate-300 outline-none" 
                  maxLength={12}
                  placeholder="08X-XXX-XXXX" 
                  type="tel"
                  value={formatPhoneNumber(phone)}
                  onChange={handlePhoneChange}
                />
              </div>
            </div>

            {/* CTA Orange Button */}
            <button 
              type="submit"
              className="w-full bg-secondary-orange hover:bg-secondary-orange-hover text-white py-3 sm:py-4 rounded-full shadow-[0_8px_20px_-4px_rgba(253,118,26,0.3)] hover:shadow-[0_12px_24px_-4px_rgba(253,118,26,0.4)] text-base sm:text-lg font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>เข้าสู่ระบบ</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-lg sm:text-xl">arrow_forward</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
