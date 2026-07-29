/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bank logos embedded as inline SVG (simplified brand marks).
 * No external network dependency at runtime.
 */

import type { ReactElement } from 'react';

interface BankLogoProps {
  className?: string;
}

export function KbankLogo({ className }: BankLogoProps) {
  // KBank: green rounded square with white "K" mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Kasikornbank">
      <rect width="48" height="48" rx="12" fill="#00A300" />
      <path
        d="M30 13 L18 24 L30 35"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="24" r="4" fill="#FFFFFF" />
    </svg>
  );
}

export function ScbLogo({ className }: BankLogoProps) {
  // SCB: purple rounded square with white "SCB" wordmark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Siam Commercial Bank">
      <rect width="48" height="48" rx="12" fill="#59268A" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontWeight="bold"
        fill="#FFFFFF"
      >
        SCB
      </text>
    </svg>
  );
}

export function BblLogo({ className }: BankLogoProps) {
  // Bangkok Bank: blue rounded square with white lotus (Bua Luang) mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Bangkok Bank">
      <rect width="48" height="48" rx="12" fill="#0B1F6B" />
      <path
        d="M24 12 C20 18 20 22 24 26 C28 22 28 18 24 12 Z M14 20 C16 26 21 28 24 30 C27 28 32 26 34 20 C30 24 27 24 24 22 C21 24 18 24 14 20 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BayLogo({ className }: BankLogoProps) {
  // Krungsri (BAY): red rounded square with white "K" mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Krungsri">
      <rect width="48" height="48" rx="12" fill="#E2231A" />
      <path
        d="M16 13 L28 35 L22 35 L19 28 L15 28 L15 24 L18.5 24 L17 19 L24 19 L21 13 Z M30 14 L33 14 L33 35 L30 35 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function TtbLogo({ className }: BankLogoProps) {
  // ttb (TMBThanachart): teal/cyan rounded square with white "ttb" wordmark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ttb">
      <rect width="48" height="48" rx="12" fill="#00AEEF" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="bold"
        fill="#FFFFFF"
      >
        ttb
      </text>
    </svg>
  );
}

export function KtbLogo({ className }: BankLogoProps) {
  // Krungthai Bank: blue rounded square with white mythical bird (Vayupaksa) mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Krungthai Bank">
      <rect width="48" height="48" rx="12" fill="#1B3F8B" />
      <path
        d="M24 12 C19 16 17 21 19 26 C15 24 13 27 14 31 C18 29 21 30 23 33 C23 28 25 24 28 21 C27 25 29 28 32 29 C30 24 30 19 27 16 C29 18 31 18 33 17 C30 14 27 13 24 12 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function GsbLogo({ className }: BankLogoProps) {
  // Government Savings Bank (ออมสิน): pink/magenta rounded square with white coin mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Government Savings Bank">
      <rect width="48" height="48" rx="12" fill="#E2007A" />
      <circle cx="24" cy="24" r="11" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="9"
        fontWeight="bold"
        fill="#FFFFFF"
      >
        ออมสิน
      </text>
    </svg>
  );
}

export function PromptPayLogo({ className }: BankLogoProps) {
  // PromptPay: orange rounded square with white mark
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="PromptPay">
      <rect width="48" height="48" rx="12" fill="#FF6B35" />
      <path
        d="M16 16 L24 32 L32 16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GenericBankLogo({ className }: BankLogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Bank">
      <rect width="48" height="48" rx="12" fill="#94A3B8" />
      <path
        d="M24 14 L34 22 L14 22 Z M18 24 L18 34 L30 34 L30 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type BankLogoKey =
  | 'กสิกรไทย'
  | 'ไทยพาณิชย์'
  | 'กรุงเทพ'
  | 'กรุงศรี'
  | 'ทีทีบี'
  | 'กรุงไทย'
  | 'ออมสิน'
  | 'พร้อมเพย์';

export const bankLogos: Record<BankLogoKey, (props: BankLogoProps) => ReactElement> = {
  'กสิกรไทย': KbankLogo,
  'ไทยพาณิชย์': ScbLogo,
  'กรุงเทพ': BblLogo,
  'กรุงศรี': BayLogo,
  'ทีทีบี': TtbLogo,
  'กรุงไทย': KtbLogo,
  'ออมสิน': GsbLogo,
  'พร้อมเพย์': PromptPayLogo
};
