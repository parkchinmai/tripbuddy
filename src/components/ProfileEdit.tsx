/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { uploadImage, cropSquare } from '../lib/r2';
import BankSelect from './BankSelect';
import ImagePositionPicker, { positionToCss } from './ImagePositionPicker';

interface ProfileEditProps {
  profile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
}

const bankOptions = [
  { id: 'พร้อมเพย์', name: 'พร้อมเพย์ (PromptPay)' },
  { id: 'กสิกรไทย', name: 'ธนาคารกสิกรไทย (KBANK)' },
  { id: 'ไทยพาณิชย์', name: 'ธนาคารไทยพาณิชย์ (SCB)' },
  { id: 'กรุงเทพ', name: 'ธนาคารกรุงเทพ (BBL)' },
  { id: 'กรุงไทย', name: 'ธนาคารกรุงไทย (KTB)' },
  { id: 'กรุงศรี', name: 'ธนาคารกรุงศรีอยุธยา (BAY)' },
  { id: 'ทีทีบี', name: 'ธนาคารทหารไทยธนชาต (TTB)' },
  { id: 'ออมสิน', name: 'ธนาคารออมสิน (GSB)' },
];

export default function ProfileEdit({ profile, onSave, onCancel }: ProfileEditProps) {
  const [name, setName] = useState<string>(profile.name);
  
  // Clean initial phone number of potential "+66" prefix
  const cleanInitialPhone = profile.phone.replace(/^\+66\s*/, '');
  const [phone, setPhone] = useState<string>(cleanInitialPhone);
  
  // Parse stored bank account "123-4-56789-0 (กสิกรไทย)"
  const parseBankAccount = (val: string) => {
    let matchedBank = 'พร้อมเพย์';
    let matchedNo = val;

    const match = val.match(/(.*?)\s*\((.*?)\)/);
    if (match) {
      matchedNo = match[1].trim();
      const bankName = match[2].trim();
      const found = bankOptions.find(b => b.id === bankName || b.name.includes(bankName));
      if (found) {
        matchedBank = found.id;
      }
    } else {
      if (val.includes('พร้อมเพย์') || val.includes('PromptPay')) {
        matchedBank = 'พร้อมเพย์';
        matchedNo = val.replace(/พร้อมเพย์|PromptPay/gi, '').trim();
      } else {
        const found = bankOptions.find(b => val.includes(b.id) || val.includes(b.name));
        if (found) {
          matchedBank = found.id;
          matchedNo = val.replace(new RegExp(found.id + '|' + found.name, 'gi'), '').trim();
        }
      }
    }

    return { bank: matchedBank, no: matchedNo };
  };

  const initialBankInfo = parseBankAccount(profile.bankAccount);
  const [selectedBank, setSelectedBank] = useState<string>(initialBankInfo.bank);
  const [accountNo, setAccountNo] = useState<string>(initialBankInfo.no);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatarUrl);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string>('');
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาอัปโหลดไฟล์รูปภาพที่ถูกต้อง (.png, .jpg, .jpeg, .webp)');
      return;
    }
    if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
    setPendingAvatarUrl(URL.createObjectURL(file));
    setPendingAvatarFile(file);
    setAvatarPos({ x: 50, y: 50 });
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

  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setPhone(val);
    }
  };

  const handleAccountNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow numbers and dashes
    val = val.replace(/[^0-9-]/g, '');
    
    // Automatically format bank accounts or PromptPay phone numbers
    const cleanVal = val.replace(/-/g, '');
    if (selectedBank === 'พร้อมเพย์') {
      if (cleanVal.length <= 10) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล / ชื่อเล่น');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
      return;
    }
    if (!accountNo.trim()) {
      alert('กรุณากรอกข้อมูลบัญชีรับเงินโอน');
      return;
    }

    let avatarUrl = selectedAvatar;
    if (pendingAvatarFile) {
      try {
        const cropped = await cropSquare(pendingAvatarFile, avatarPos);
        const result = await uploadImage(cropped, 'avatars');
        avatarUrl = result.url;
      } catch (err: any) {
        alert(err.message || 'อัพโหลดไม่สำเร็จ');
        return;
      }
    }

    onSave({
      ...profile,
      name,
      phone,
      bankAccount: `${accountNo} (${selectedBank})`,
      avatarUrl
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-visible animate-fade-in font-sans">
      {/* Header */}
      <div className="p-5 sm:p-6 md:p-8 border-b border-slate-100 bg-primary text-white flex justify-between items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[22px] sm:text-[26px] shrink-0">manage_accounts</span>
          <h2 className="text-lg sm:text-xl font-bold truncate">จัดการแก้ไขโปรไฟล์</h2>
        </div>
        <span className="text-[11px] sm:text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full shrink-0">ตั้งค่าทั่วไป</span>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {/* Profile Pic selection */}
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
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center overflow-hidden border-4 cursor-pointer transition-all relative ${
                selectedAvatar 
                  ? 'border-white shadow-xl ring-4 ring-slate-100 hover:ring-primary/30' 
                  : isDragging 
                    ? 'border-primary bg-primary/5 scale-105 ring-4 ring-primary-light border-solid' 
                    : 'border-slate-300 border-dashed bg-slate-50 hover:bg-slate-100/80 hover:border-primary/50'
              }`}
            >
              {selectedAvatar || pendingAvatarUrl ? (
                <>
                  <img 
                    className="w-full h-full object-cover" 
                    alt="Uploaded Avatar" 
                    src={pendingAvatarUrl || selectedAvatar}
                    style={{ objectPosition: positionToCss(avatarPos) }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-bold">
                    เปลี่ยนรูปภาพ
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-3 select-none">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-1.5 animate-pulse">cloud_upload</span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 leading-tight">อัปโหลดรูปโปรไฟล์</span>
                  <span className="text-[8px] text-slate-400 mt-1">ลากและวาง หรือคลิกเพื่อเลือก</span>
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
          {pendingAvatarUrl && (
            <div className="w-full max-w-[240px]">
              <ImagePositionPicker
                src={pendingAvatarUrl}
                position={avatarPos}
                onPositionChange={setAvatarPos}
                aspect={1}
              />
              <p className="text-[10px] text-slate-400 font-semibold text-center mt-1">ลากรูปเพื่อจัดกึ่งกลางใบหน้า</p>
            </div>
          )}
        </div>

        {/* Input Fields */}
        <div className="space-y-4 pt-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-500 ml-2">ชื่อ-นามสกุล / ชื่อเล่น</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-4 py-3 transition-all">
              <span className="material-symbols-outlined text-slate-400 mr-2">person</span>
              <input 
                type="text" 
                required
                className="bg-transparent border-none focus:outline-none w-full text-sm font-semibold text-slate-800 outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-500 ml-2">เบอร์โทรศัพท์ (ติดต่อ)</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-4 py-3 transition-all">
              <span className="material-symbols-outlined text-slate-400 mr-2">smartphone</span>
              <input 
                type="text" 
                required
                className="bg-transparent border-none focus:outline-none w-full text-sm font-semibold text-slate-800 outline-none"
                value={formatPhoneNumber(phone)}
                onChange={handlePhoneChange}
              />
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

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold rounded-full hover:bg-slate-200 transition-all cursor-pointer text-center"
          >
            ยกเลิก
          </button>
          <button 
            type="submit"
            className="flex-1 py-3 bg-secondary-orange hover:bg-secondary-orange-hover text-white text-sm font-bold rounded-full transition-all hover:scale-[1.01] active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>บันทึกการแก้ไข</span>
          </button>
        </div>
      </form>
    </div>
  );
}
