/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trip, Member, UserProfile } from './types';

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function deriveTripStatus(dates: string): Trip['status'] {
  const parts = dates.split(' - ');
  if (parts.length !== 2) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (today < start) return 'upcoming';
  if (today > end) return 'past';
  return 'active';
}

export function extractAccountNumber(bankAccount: string): string {
  const match = bankAccount.match(/[\d-]{6,}/);
  return match ? match[0].replace(/-/g, '') : bankAccount;
}

export function formatDateRange(dates: string): string {
  const parts = dates.split(' - ');
  if (parts.length === 2) {
    const start = new Date(parts[0]);
    const end = new Date(parts[1]);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.getDate()} - ${end.getDate()} ${MONTHS_TH[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_TH[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${MONTHS_TH[end.getMonth()]} ${end.getFullYear()}`;
  }
  const d = new Date(dates);
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`;
}

export interface ComputedSettlement {
  from: string;
  to: string;
  amount: number;
  fromBankAccount: string;
  toBankAccount: string;
}

export interface MemberBalance {
  name: string;
  avatarUrl: string;
  bankAccount: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

export function calculateSettlements(members: MemberBalance[]): ComputedSettlement[] {
  const balances = members
    .map(m => ({ name: m.name, bankAccount: m.bankAccount, balance: Math.round(m.netBalance) }))
    .filter(m => m.balance !== 0);

  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b, balance: -b.balance }));
  const creditors = balances.filter(b => b.balance > 0);

  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const settlements: ComputedSettlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > 0) {
      const fromMember = members.find(m => m.name === debtors[i].name)!;
      const toMember = members.find(m => m.name === creditors[j].name)!;
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount,
        fromBankAccount: fromMember.bankAccount,
        toBankAccount: toMember.bankAccount,
      });
    }
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance === 0) i++;
    if (creditors[j].balance === 0) j++;
  }

  return settlements;
}

export const FALLBACK_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDwFnrGPgHwbogglhG-6uyF8c026kNxqJREZfC_4nDM2ZlsW_amzRvcoJVs1umDeV58kEzC3ODeTfmQB-b7Z64QvD3hMddrysBYFVBlP36a-jn1gJ1qXgae5RQH6LZ0KXgc76UEah1XvcQuqEcl2OPtF-CACf9jV-Hm8laarkpZteQ5cHsakO09y96kspk4gXjlwkYHWn7faGhS3PpR4OUCkW535c71IOWnt5EG5ItUMJMMHyNTyIDtFrHL0MkAnvfjGq0wTrLYjVo',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCnF7NwvU4RM7mHmiVfGJcq91qKZqRhCNOqammEShWp0Ih347kdPo0OwvuHiZ1HkID59FoxxB-bKQO0KZn-gb_IpBpOZhuWagTHhcCSpbntqxGIxRXNZBoWKQjv7ArAVapiCVUGCUXo3iwqjDMFpAI4pYw86dRBEjTuIxKCm-vX9j_c47KNGRWP8k8g_LDiMehFWGQRld-w8JZj_K-O7npiWTlh80Vww9560pqiCSNkXWIZa51ZH_jI5Va9hEAK_bMQ6P6NsHgb14Y',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBLKVdM5m8I1lbv-MH8uww6zMvJb9VXinZbHKZb5jnWKQhbxysBp-55HzqgDQxhzQFrAwFVzC18EeO6hrHAdnTCVDGugGO8hJw2uljJHan_AaDyxlEnGiGjAvgouzCwb0lnJMp3srwYq70BeNzYxxUUKfUNqHvW50T8A_CRgsJtho8xfdBP9zL70sopMXMmnJJUrQE8mqV50fIoapX5MaUuDke6IEBjvxm5TBuivjcKBn7kd35G9uDbFuTwNqouiF5HvnJTDILicI0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDIvP778tmP-coGGpNUxaEKIhTCw-0XRsJgOhxhe-rWAbHo6UMjs7kY7f2T3MtC1XsNQGJ1Y96e-Ylk6KFtzLxviORgpPYVxYlxnI5H9rBbqw3C6j3VHKx3lmqYMMibTMt33SwsUNke56b_V8tOPS4slTjw_9vZiu40Kot7C2JSjZfE3T4R8bRCkjjOCttEyXBOw_UVwI0AjZFkNLp1DHVFlIYEZsBi3ozMtwcbVVLEOLpUBA4GM2lI45UTFI5TUO6KZhxfLe8xRo4',
];

export function getFallbackAvatar(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_AVATARS[hash % FALLBACK_AVATARS.length];
}

export const defaultProfile: UserProfile = {
  name: '',
  phone: '',
  bankAccount: '',
  avatarUrl: '',
  isAdmin: false
};

export const defaultMembers: Member[] = [];

export const initialTrips: Trip[] = [];
