/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  name: string;
  phone: string;
  bankAccount: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Food' | 'Travel' | 'Accommodation' | 'Other';
  date: string;
  paidBy: string;
  splitWith: string[]; // List of names
  customShares?: Record<string, number>; // Mapping of name -> amount
  slipUrl?: string;
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
  description?: string;
  status: 'active' | 'upcoming' | 'past';
  days?: number;
  memberCount?: number;
  memberIds?: string[];
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
