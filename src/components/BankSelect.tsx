/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { bankLogos, BankLogoKey, GenericBankLogo } from './BankLogos';

interface BankSelectProps {
  value: string;
  onChange: (bankId: string) => void;
}

const bankList = [
  { id: 'พร้อมเพย์', name: 'พร้อมเพย์ (PromptPay)' },
  { id: 'กสิกรไทย', name: 'ธนาคารกสิกรไทย (KBANK)' },
  { id: 'ไทยพาณิชย์', name: 'ธนาคารไทยพาณิชย์ (SCB)' },
  { id: 'กรุงเทพ', name: 'ธนาคารกรุงเทพ (BBL)' },
  { id: 'กรุงไทย', name: 'ธนาคารกรุงไทย (KTB)' },
  { id: 'กรุงศรี', name: 'ธนาคารกรุงศรีอยุธยา (BAY)' },
  { id: 'ทีทีบี', name: 'ธนาคารทหารไทยธนชาต (TTB)' },
  { id: 'ออมสิน', name: 'ธนาคารออมสิน (GSB)' }
];

export default function BankSelect({ value, onChange }: BankSelectProps) {
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = bankList.find(b => b.id === value) ?? bankList[0];
  const SelectedLogo = value in bankLogos ? bankLogos[value as BankLogoKey] : GenericBankLogo;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-full px-4 py-3 transition-all cursor-pointer"
      >
        <SelectedLogo className="w-7 h-7 rounded-lg shrink-0 mr-2.5" />
        <span className="flex-1 text-left text-sm font-semibold text-slate-800 truncate">{selected.name}</span>
        <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown with logos */}
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-100 rounded-3xl shadow-xl p-2 pb-3 max-h-[60vh] overflow-y-auto animate-fade-in">
          {bankList.map(bank => {
            const Logo = bank.id in bankLogos ? bankLogos[bank.id as BankLogoKey] : GenericBankLogo;
            const active = bank.id === value;
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => {
                  onChange(bank.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                  active ? 'bg-primary-light' : 'hover:bg-slate-50'
                }`}
              >
                <Logo className="w-8 h-8 rounded-xl shrink-0" />
                <span className={`text-sm font-semibold flex-1 truncate ${active ? 'text-primary' : 'text-slate-700'}`}>
                  {bank.name}
                </span>
                {active && (
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
