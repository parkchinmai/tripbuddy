/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HOTLINKS } from '../data';
import BankSelect from './BankSelect';

interface OnboardingProps {
  phoneNumber: string;
  onOnboardingComplete: (data: { name: string; avatarUrl: string; bankAccount: string }) => void;
}

export default function Onboarding({ phoneNumber, onOnboardingComplete }: OnboardingProps) {
  const [name, setName] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('พร้อมเพย์');
  const [accountNo, setAccountNo] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedAvatar(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('กรุณาอัปโหลดไฟล์รูปภาพที่ถูกต้อง (.png, .jpg, .jpeg, .webp)');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อของคุณ');
      return;
    }
    if (!selectedAvatar) {
      alert('กรุณาอัปโหลดรูปโปรไฟล์ของคุณ');
      return;
    }
    if (!accountNo.trim()) {
      alert('กรุณากรอกเลขที่บัญชีหรือบัญชีพร้อมเพย์');
      return;
    }
    onOnboardingComplete({
      name,
      avatarUrl: selectedAvatar,
      bankAccount: `${accountNo} (${selectedBank})`
    });
  };

  const handleAccountNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow numbers and dashes
    val = val.replace(/[^0-9-]/g, '');
    
    // Automatically format bank accounts or PromptPay phone numbers
    const cleanVal = val.replace(/-/g, '');
    if (selectedBank === 'พร้อมเพย์') {
      // PromptPay phone number (10 digits) or ID (13 digits)
      if (cleanVal.length <= 10) {
        // Format as phone number: 081-234-5678
        if (cleanVal.length > 6) {
          val = `${cleanVal.slice(0, 3)}-${cleanVal.slice(3, 6)}-${cleanVal.slice(6)}`;
        } else if (cleanVal.length > 3) {
          val = `${cleanVal.slice(0, 3)}-${cleanVal.slice(3)}`;
        } else {
          val = cleanVal;
        }
      } else if (cleanVal.length <= 13) {
        val = cleanVal;
      }
    } else {
      // Bank account (10 digits): 123-4-56789-0
      if (cleanVal.length <= 10) {
        if (cleanVal.length > 9) {
          val = `${cleanVal.slice(0, 3)}-${cleanVal.slice(3, 4)}-${cleanVal.slice(4, 9)}-${cleanVal.slice(9)}`;
        } else if (cleanVal.length > 3) {
          val = `${cleanVal.slice(0, 3)}-${cleanVal.slice(3)}`;
        } else {
          val = cleanVal;
        }
      }
    }
    setAccountNo(val);
  };

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-3 sm:p-6 relative font-sans">
      {/* Decorative Atmosphere Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary-green/5 rounded-full blur-[80px]"></div>
      </div>

      <main className="w-full max-w-2xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,101,145,0.15)] overflow-visible border border-slate-100 z-10">
        {/* Step Indicator Section */}
        <div className="p-5 sm:p-8 md:p-10 flex flex-col items-center text-center space-y-3 sm:space-y-4">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">1</div>
            <div className="h-1 w-5 sm:w-12 bg-primary rounded-full"></div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary-light shadow-md">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">person_add</span>
            </div>
            <div className="h-1 w-5 sm:w-12 bg-slate-100 rounded-full"></div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">3</div>
          </div>
          <p className="text-primary font-bold text-xs tracking-wider uppercase">Onboarding Step 2</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">ยินดีต้อนรับนักเดินทางคนใหม่!</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm md:text-base">เตรียมตัวให้พร้อมสำหรับการจัดการค่าใช้จ่ายที่ง่ายที่สุด</p>
        </div>

        {/* Input Form Section */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-8 md:px-12 pb-8 sm:pb-10 space-y-6 sm:space-y-8">
          {/* Avatar Selection Section */}
          <div className="flex flex-col items-center space-y-4">
            <label className="text-sm font-semibold text-slate-500">รูปโปรไฟล์ของคุณ</label>
            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInputChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-32 h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center overflow-hidden border-4 cursor-pointer transition-all relative ${
                  selectedAvatar 
                    ? 'border-white shadow-xl ring-4 ring-slate-100 hover:ring-primary/30' 
                    : isDragging 
                      ? 'border-primary bg-primary/5 scale-105 ring-4 ring-primary-light border-solid' 
                      : 'border-slate-300 border-dashed bg-slate-50 hover:bg-slate-100/80 hover:border-primary/50'
                }`}
              >
                {selectedAvatar ? (
                  <>
                    <img 
                      id="main-avatar"
                      className="w-full h-full object-cover" 
                      alt="Uploaded Avatar" 
                      src={selectedAvatar}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-bold">
                      เปลี่ยนรูปภาพ
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-3 select-none">
                    <span className="material-symbols-outlined text-slate-400 text-3xl sm:text-4xl mb-1.5 animate-pulse">cloud_upload</span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 leading-tight">อัปโหลดรูปโปรไฟล์</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 mt-1">ลากและวาง หรือคลิกเพื่อเลือก</span>
                  </div>
                )}
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 bg-secondary-orange p-2.5 rounded-full text-white shadow-lg hover:bg-secondary-orange-hover transition-transform duration-200 cursor-pointer hover:scale-110 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-500 ml-2">ระบุชื่อ</label>
              <div className="flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-4 py-3.5 transition-all">
                <span className="material-symbols-outlined text-slate-400 mr-2">person</span>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น ก้องภพ สมดุล"
                  className="bg-transparent border-none focus:outline-none w-full text-base font-semibold text-slate-800 placeholder:text-slate-300 outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Phone Number Field (Locked) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-400 ml-2">เบอร์โทรศัพท์ (ตรวจสอบแล้ว)</label>
              <div className="flex items-center bg-slate-100 border-2 border-slate-200 rounded-full px-4 py-3.5 opacity-80 cursor-not-allowed">
                <span className="material-symbols-outlined text-slate-400 mr-2">call</span>
                <input 
                  type="text" 
                  disabled
                  className="bg-transparent border-none focus:outline-none w-full text-base font-semibold text-slate-500 outline-none cursor-not-allowed"
                  value={phoneNumber}
                />
                <span className="material-symbols-outlined text-tertiary-green text-[18px] font-bold">verified</span>
              </div>
            </div>

            {/* Bank Account Grid Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-500 ml-2">บัญชีรับเงินโอนคืน</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bank Select with logos */}
                <div className="sm:col-span-1">
                  <BankSelect
                    value={selectedBank}
                    onChange={(bankId) => {
                      setSelectedBank(bankId);
                      setAccountNo('');
                    }}
                  />
                </div>

                {/* Account Number Input */}
                <div className="sm:col-span-1 flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-4 py-3 transition-all">
                  <span className="material-symbols-outlined text-slate-400 mr-2 text-xl">credit_card</span>
                  <input 
                    type="text" 
                    required
                    placeholder={selectedBank === 'พร้อมเพย์' ? 'เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน' : 'ระบุเลขที่บัญชี'}
                    className="bg-transparent border-none focus:outline-none w-full text-sm font-semibold text-slate-800 placeholder:text-slate-300 outline-none"
                    value={accountNo}
                    onChange={handleAccountNoChange}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Action Orange Button */}
          <button 
            type="submit"
            className="w-full bg-secondary-orange hover:bg-secondary-orange-hover text-white font-sans text-lg font-bold py-4 rounded-full shadow-[0_10px_20px_-5px_rgba(253,118,26,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(253,118,26,0.4)] transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>เริ่มการเดินทาง</span>
            <span className="material-symbols-outlined animate-pulse">flight_takeoff</span>
          </button>
        </form>
      </main>
    </div>
  );
}
