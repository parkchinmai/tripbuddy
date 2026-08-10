/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BillItem, FeeMode, FeeOrder } from './lib/splitBill';

export interface UserProfile {
  name: string;
  phone: string;
  bankAccount: string;
  avatarUrl: string;
  isAdmin: boolean;
  status?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Food' | 'Travel' | 'Accommodation' | 'Shopping' | 'Activities' | 'Other';
  date: string;
  paidBy: string;
  paidById?: string;
  splitWith: string[];
  splitWithIds?: string[];
  customShares?: Record<string, number>;
  slipUrl?: string;
  collected?: boolean;
  mode?: 'simple' | 'split';
  splitItems?: BillItem[];
  feeMode?: FeeMode;
  feeOrder?: FeeOrder;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  dates: string;
  budget: number;
  expenses: Expense[];
  coverImgUrl: string;
  coverPosition?: string;
  description?: string;
  status: 'active' | 'upcoming' | 'past';
  days?: number;
  memberCount?: number;
  memberIds?: string[];
  memberNames?: string[];
  budgetPerPerson?: number;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  avatarUrl: string;
  bankAccount: string;
  status: 'approved' | 'pending' | 'suspended';
  joinDate: string;
  accessLevel: 'admin' | 'user';
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
  isSettled: boolean;
  purpose: string;
  slipUrl?: string;
}
