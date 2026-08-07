/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, Trip, Expense } from './types';
import { initialTrips, defaultProfile, deriveTripStatus, getFallbackAvatar } from './data';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import TripsList from './components/TripsList';
import TripDetail from './components/TripDetail';
import ProfileEdit from './components/ProfileEdit';
import MemberDatabase from './components/MemberDatabase';
import AdminDashboard from './components/AdminDashboard';
import AddExpenseModal from './components/AddExpenseModal';
import SuitcaseLogo from './components/SuitcaseLogo';
import WelcomeBack from './components/WelcomeBack';
import InstallButton from './components/InstallButton';
import PwaBanner from './components/PwaBanner';

type UserSessionState = 'not-logged-in' | 'onboarding' | 'welcome-back' | 'logged-in';
type ActiveTabType = 'dashboard' | 'database' | 'profile' | 'admin';

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export default function App() {
  const [sessionState, setSessionState] = useState<UserSessionState>(() => loadSession('tb_sessionState', 'not-logged-in'));
  const [phoneNumber, setPhoneNumber] = useState<string>(() => loadSession('tb_phone', ''));
  const [profile, setProfile] = useState<UserProfile>(() => loadSession('tb_profile', defaultProfile));
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [memberProfilesLookup, setMemberProfilesLookup] = useState<Record<string, { name: string; avatarUrl: string }[]>>({});

  // Persist session to localStorage on change
  useEffect(() => {
    localStorage.setItem('tb_sessionState', JSON.stringify(sessionState));
    localStorage.setItem('tb_phone', JSON.stringify(phoneNumber));
    localStorage.setItem('tb_profile', JSON.stringify(profile));
  }, [sessionState, phoneNumber, profile]);

  // Refresh profile from API on mount to pick up latest avatar/name from DB (avoids stale localStorage cache)
  useEffect(() => {
    if (!phoneNumber) return;
    if (sessionState !== 'logged-in' && sessionState !== 'welcome-back') return;
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(phoneNumber)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(api => {
        if (!api || cancelled) return;
        setProfile(prev => ({
          ...prev,
          name: api.name ?? prev.name,
          avatarUrl: api.avatar_url || prev.avatarUrl,
          bankAccount: api.bank_account || prev.bankAccount,
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [phoneNumber, sessionState]);

  // Fetch trips from API on mount and after login
  useEffect(() => {
    if (sessionState === 'logged-in' || sessionState === 'welcome-back') {
      fetch(`/api/trips?user=${encodeURIComponent(phoneNumber)}`)
        .then(r => { if (r.ok) return r.json(); throw new Error(); })
        .then(data => {
          const list = Array.isArray(data) ? data : (data.results || []);
          setTrips(list.map((t: any) => ({
            id: t.id,
            title: t.title,
            destination: t.destination,
            country: t.country || '',
            dates: t.dates,
            budget: t.budget,
            expenses: [],
            coverImgUrl: t.cover_img_url || '',
            coverPosition: t.cover_position || undefined,
            description: t.description || undefined,
            status: deriveTripStatus(t.dates),
            memberCount: t.member_count || 0,
            memberIds: t.member_ids ? (typeof t.member_ids === 'string' ? JSON.parse(t.member_ids) : t.member_ids) : undefined,
            memberNames: t.member_names || [],
            budgetPerPerson: t.budget_per_person || undefined,
          })));
        })
        .catch(() => {});
    }
  }, [sessionState, phoneNumber, profile.status]);

  // Handle Login Step 1
  const handleLoginSuccess = async (phone: string) => {
    setPhoneNumber(phone);
    
    const savedProfile = localStorage.getItem(`user_profile_${phone}`);

    // Check API for profile + admin status
    let apiProfile: any = null;
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(phone)}`);
      if (res.ok) {
        apiProfile = await res.json();
      }
    } catch {}

    const apiIsAdmin = apiProfile ? (apiProfile.is_admin === 1 || apiProfile.isAdmin === true) : false;

    // User exists but not yet approved by admin -> enter app with pending-approval status
    if (apiProfile && !apiIsAdmin && apiProfile.status && apiProfile.status !== 'approved') {
      setProfile({
        name: apiProfile.name || '',
        phone: apiProfile.phone || phone,
        bankAccount: apiProfile.bank_account || '',
        avatarUrl: apiProfile.avatar_url || '',
        isAdmin: false,
        status: apiProfile.status || 'pending',
      });
      setSessionState('logged-in');
      setActiveTab('dashboard');
      setSelectedTripId(null);
      return;
    }

    // Build profile from localStorage or API
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as UserProfile;
        // Merge with API data to get latest avatar from database
        const merged = {
          ...parsed,
          avatarUrl: apiProfile?.avatar_url || parsed.avatarUrl,
          isAdmin: apiIsAdmin || parsed.isAdmin,
        };
        setProfile(merged);
        localStorage.setItem(`user_profile_${phone}`, JSON.stringify(merged));
        setSessionState('welcome-back');
        return;
      } catch {}
    }

    if (apiProfile && apiProfile.name) {
      setProfile({
        name: apiProfile.name,
        phone: apiProfile.phone,
        bankAccount: apiProfile.bank_account || '',
        avatarUrl: apiProfile.avatar_url || '',
        isAdmin: apiIsAdmin
      });
      setSessionState('welcome-back');
      return;
    }

    setSessionState('onboarding');
  };

  // Handle Onboarding Step 2
  const handleOnboardingComplete = async (data: { name: string; avatarUrl: string; bankAccount: string }) => {
    let isAdmin = false;
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(phoneNumber)}`);
      if (res.ok) {
        const apiProfile = await res.json();
        isAdmin = apiProfile.is_admin === 1 || apiProfile.isAdmin === true;
      }
    } catch {}

    const newProfile: UserProfile = {
      name: data.name,
      phone: phoneNumber,
      bankAccount: data.bankAccount,
      avatarUrl: data.avatarUrl,
      isAdmin,
      status: isAdmin ? 'approved' : 'pending',
    };
    setProfile(newProfile);
    localStorage.setItem(`user_profile_${phoneNumber}`, JSON.stringify(newProfile));
    // Save profile to API
    try {
      await fetch(`/api/profile/${encodeURIComponent(phoneNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, bankAccount: data.bankAccount, avatarUrl: data.avatarUrl }),
      });
    } catch {}

    // Create member record
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: phoneNumber,
          avatarUrl: data.avatarUrl,
          bankAccount: data.bankAccount,
          status: isAdmin ? 'approved' : 'pending',
          accessLevel: isAdmin ? 'admin' : 'user',
        }),
      });
    } catch {}

    setSessionState('logged-in');
    setActiveTab('dashboard');
    setSelectedTripId(null);
  };

  // Check if the current user's profile has been approved by admin yet
  const handleCheckApprovalStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) return false;
      const p = await res.json();
      const approved = p.is_admin === 1 || p.status === 'approved';
      if (approved) {
        const updated = {
          ...profile,
          name: p.name || profile.name,
          avatarUrl: p.avatar_url || profile.avatarUrl,
          isAdmin: p.is_admin === 1,
          status: 'approved' as const,
        };
        setProfile(updated);
        localStorage.setItem(`user_profile_${phoneNumber}`, JSON.stringify(updated));
        setActiveTab('dashboard');
      }
      return approved;
    } catch {
      return false;
    }
  };

  // Auto-poll approval status while the user is waiting for admin approval
  useEffect(() => {
    if (sessionState !== 'logged-in' || !phoneNumber) return;
    if (profile.status !== 'pending') return;
    const id = setInterval(() => {
      handleCheckApprovalStatus();
    }, 10000);
    return () => clearInterval(id);
  }, [sessionState, phoneNumber, profile.status]);

  // Switch between trips or go back
  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    // Fetch full trip details with expenses & members
    fetch(`/api/trips/${tripId}?user=${encodeURIComponent(phoneNumber)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setTrips(prev => prev.map(t => {
          if (t.id !== tripId) return t;
          return {
            ...t,
            expenses: Array.isArray(data.expenses) ? data.expenses.map((e: any) => ({
              id: e.id,
              title: e.title,
              amount: e.amount,
              category: e.category || 'Other',
              date: e.date,
              paidBy: e.paid_by,
              paidById: e.paid_by_id || undefined,
              splitWith: e.split_with_names || (e.split_with ? JSON.parse(e.split_with) : []),
              splitWithIds: e.split_with_ids ? JSON.parse(e.split_with_ids) : undefined,
              customShares: e.custom_shares ? JSON.parse(e.custom_shares) : undefined,
              slipUrl: e.slip_url || undefined,
              mode: e.mode || undefined,
              splitItems: e.split_items ? JSON.parse(e.split_items) : undefined,
              feeMode: e.fee_mode || undefined,
              feeOrder: e.fee_order || undefined,
            })) : [],
            memberCount: data.member_count || 0,
            memberIds: Array.isArray(data.memberDetails)
              ? data.memberDetails.map((m: any) => m.id)
              : [],
          };
        }));
        // Store member profiles for the AddExpenseModal
        if (Array.isArray(data.memberDetails)) {
          setMemberProfilesLookup(prev => ({ ...prev, [tripId]: data.memberDetails.map((m: any) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url || '' })) }));
        }
      })
      .catch(() => {});
  };

  const handleBackToTrips = () => {
    setSelectedTripId(null);
  };

  // Dynamic Add Expense
  const handleAddExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    if (!selectedTripId) return;

    const newExpense: Expense = {
      ...newExpenseData,
      id: `e-${Date.now()}`
    };

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newExpenseData, id: newExpense.id, tripId: selectedTripId }),
    })
      .then(async r => {
        if (!r.ok) {
          let msg = `API ${r.status}`;
          try { const j = await r.json(); msg = j.message || msg; } catch {}
          throw new Error(msg);
        }
      })
      .then(() => {
        setTrips(prevTrips => prevTrips.map(trip => {
          if (trip.id !== selectedTripId) return trip;
          return { ...trip, expenses: [newExpense, ...trip.expenses] };
        }));
      })
      .catch(err => {
        console.error('Add expense failed:', err);
        alert(`ไม่สามารถบันทึกค่าใช้จ่ายได้ (${err.message})`);
      });
  };

  // Dynamic Edit Expense
  const handleEditExpense = (expenseId: string) => {
    if (!selectedTripId) return;
    const trip = trips.find(t => t.id === selectedTripId);
    if (!trip) return;
    const expense = trip.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  // Dynamic Update Expense
  const handleUpdateExpense = (expenseId: string, updates: Partial<Expense>) => {
    if (!selectedTripId) return;
    setTrips(prevTrips =>
      prevTrips.map(trip => {
        if (trip.id === selectedTripId) {
          return {
            ...trip,
            expenses: trip.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e)
          };
        }
        return trip;
      })
    );
    fetch(`/api/expenses/${expenseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, tripId: selectedTripId }),
    }).catch(() => {});
  };

  // Dynamic Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    if (!selectedTripId) return;
    if (!confirm('คุณต้องการลบค่าใช้จ่ายนี้ใช่หรือไม่?')) return;

    fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' }).catch(() => {});
    setTrips(prevTrips =>
      prevTrips.map(trip => {
        if (trip.id === selectedTripId) {
          return {
            ...trip,
            expenses: trip.expenses.filter(e => e.id !== expenseId)
          };
        }
        return trip;
      })
    );
  };

  // Admin creating a new trip
  const handleAddTrip = (newTripData: Omit<Trip, 'id' | 'expenses'>) => {
    const newId = `t-${Date.now()}`;
    const newTrip: Trip = {
      ...newTripData,
      id: newId,
      expenses: []
    };
    setTrips([newTrip, ...trips]);
    fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTripData, id: newId }),
    }).catch(() => {});
    setSelectedTripId(null);
    setActiveTab('dashboard');
  };

  const handleUpdateTrip = (tripId: string, updates: Partial<Trip>) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
    fetch(`/api/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  const handleUpdateTripMembers = async (tripId: string, memberIds: string[]) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds }),
      });
      if (res.ok) {
        setTrips(prev => prev.map(t => t.id === tripId ? { ...t, memberIds } : t));
      }
    } catch {}
  };

  const handleDeleteTrip = (tripId: string) => {
    if (confirm('คุณต้องการลบทริปนี้ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      setTrips(prev => prev.filter(t => t.id !== tripId));
      setSelectedTripId(null);
      fetch(`/api/trips/${tripId}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  // Derive status from dates for all trips
  const tripsWithDerivedStatus = trips.map(t => ({
    ...t,
    status: deriveTripStatus(t.dates)
  }));

  const visibleTrips = tripsWithDerivedStatus;

  // Render proper sub-components for logged-in view
  const renderTabContent = () => {
    if (selectedTripId) {
      const currentTrip = tripsWithDerivedStatus.find(t => t.id === selectedTripId);
      if (!currentTrip) return null;

      return (
        <TripDetail 
          trip={currentTrip} 
          onBack={handleBackToTrips}
          onAddExpenseClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onUpdateTrip={(updates) => handleUpdateTrip(currentTrip.id, updates)}
          onUpdateTripMembers={(memberIds) => handleUpdateTripMembers(currentTrip.id, memberIds)}
          onDeleteTrip={() => handleDeleteTrip(currentTrip.id)}
          currentUserName={profile.name}
          currentUserPhone={profile.phone}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <TripsList 
            trips={visibleTrips} 
            onSelectTrip={handleSelectTrip} 
            isAdmin={profile.isAdmin}
            isPendingApproval={profile.status === 'pending'}
            onCheckApprovalStatus={handleCheckApprovalStatus}
            onCreateNewTrip={() => {
              if (profile.isAdmin) {
                setActiveTab('admin');
              } else {
                alert('โปรดเปิดสิทธิ์ผู้ดูแลระบบ (Admin) เพื่อเข้าถึงแบบฟอร์มสร้างทริปใหม่');
              }
            }}
          />
        );
      case 'database':
        return <MemberDatabase isAdmin={profile.isAdmin} />;
      case 'profile':
        return (
          <ProfileEdit 
            profile={profile} 
            onSave={async (updated) => {
              setProfile(updated);
              localStorage.setItem(`user_profile_${updated.phone}`, JSON.stringify(updated));
              try {
                await fetch(`/api/profile/${encodeURIComponent(updated.phone)}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: updated.name,
                    bankAccount: updated.bankAccount,
                    avatarUrl: updated.avatarUrl,
                    isAdmin: updated.isAdmin,
                  }),
                });
              } catch {}
              alert('บันทึกข้อมูลโปรไฟล์สำเร็จเรียบร้อยแล้ว');
              setActiveTab('dashboard');
            }}
            onCancel={() => setActiveTab('dashboard')}
          />
        );
      case 'admin':
        return <AdminDashboard trips={trips} onAddTrip={handleAddTrip} />;
      default:
        return null;
    }
  };

  // NOT LOGGED IN VIEWS
  if (sessionState === 'not-logged-in') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (sessionState === 'onboarding') {
    return <Onboarding phoneNumber={phoneNumber} onOnboardingComplete={handleOnboardingComplete} />;
  }

  if (sessionState === 'welcome-back') {
    return (
      <WelcomeBack 
        profile={profile}
        onConfirm={() => {
          setSessionState('logged-in');
          setActiveTab('dashboard');
          setSelectedTripId(null);
        }}
        onEdit={() => {
          setSessionState('onboarding');
        }}
        onSwitchAccount={() => {
          localStorage.removeItem('tb_sessionState');
          localStorage.removeItem('tb_phone');
          localStorage.removeItem('tb_profile');
          setSessionState('not-logged-in');
          setPhoneNumber('');
        }}
      />
    );
  }

  // LOGGED IN VIEW WITH GLOBAL LAYOUT
  return (
    <div className="min-h-screen bg-surface-bg flex flex-col font-sans">
      {/* Dynamic Header */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm px-4 sm:px-6 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div 
            onClick={() => {
              setSelectedTripId(null);
              setActiveTab('dashboard');
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none min-w-0"
          >
            <SuitcaseLogo className="w-8 h-8 sm:w-9 sm:h-9 text-primary shrink-0 transition-transform hover:scale-105 duration-200" />
            <span className="font-sans text-lg sm:text-xl font-extrabold text-primary tracking-tight whitespace-nowrap truncate">เที่ยวด้วยกัน</span>
          </div>

          {/* Navigation Links (Visible on desktop/tablet) */}
          <div className="hidden md:flex items-center gap-1.5">
            <button 
              onClick={() => {
                setSelectedTripId(null);
                setActiveTab('dashboard');
              }}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' && !selectedTripId 
                  ? 'bg-primary-light text-primary' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }`}
            >
                ทริปทั้งหมด
            </button>

            {profile.isAdmin && (
              <button 
                onClick={() => {
                  setSelectedTripId(null);
                  setActiveTab('database');
                }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'database' 
                    ? 'bg-primary-light text-primary' 
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50'
                }`}
              >
                ฐานข้อมูลสมาชิก
              </button>
            )}
            
            {/* Conditional Admin Tab */}
            {profile.isAdmin && (
              <button 
                onClick={() => {
                  setSelectedTripId(null);
                  setActiveTab('admin');
                }}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'bg-secondary-orange-light text-secondary-orange' 
                    : 'text-slate-500 hover:text-secondary-orange hover:bg-slate-50'
                }`}
              >
                ระบบแอดมิน
              </button>
            )}
          </div>

          {/* Right section: Profile Avatar dropup */}
          <div className="flex items-center gap-3">
            {/* Admin mode toggle — visible only to admins */}
            {profile.isAdmin && (
            <button
              onClick={() => {
                const nextAdmin = !profile.isAdmin;
                setProfile({ ...profile, isAdmin: nextAdmin });
                if (nextAdmin) {
                  alert('เข้าสู่โหมดแอดมินหลังบ้านสำเร็จ! แผงควบคุมระบบเปิดใช้งานแล้ว');
                } else {
                  alert('กลับสู่โหมดผู้ใช้ทั่วไปเรียบร้อยแล้ว');
                  if (activeTab === 'admin') {
                    setActiveTab('dashboard');
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                profile.isAdmin 
                  ? 'bg-secondary-orange/15 border-secondary-orange text-secondary-orange' 
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
              title="คลิกเพื่อสลับระหว่างโหมดแอดมิน / ผู้ใช้ทั่วไป"
            >
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              <span className="hidden sm:inline">{profile.isAdmin ? 'แอดมิน (Admin)' : 'ผู้ใช้ทั่วไป'}</span>
            </button>
            )}

            {/* Install App Button (PWA) — visible when the browser supports it */}
            <InstallButton />

            {/* User Profile Avatar - circular button, click to edit */}
            <div 
              onClick={() => {
                setSelectedTripId(null);
                setActiveTab('profile');
              }}
              className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 shadow-sm relative cursor-pointer transition-all hover:scale-105 active:scale-95 duration-200 ${
                activeTab === 'profile' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
              }`}
              title="คลิกรูปโปรไฟล์เพื่อแก้ไขโปรไฟล์ของคุณ"
            >
              <img className="w-full h-full object-cover" alt="User Avatar" src={profile.avatarUrl || getFallbackAvatar(profile.name)} />
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                  localStorage.removeItem('tb_sessionState');
                  localStorage.removeItem('tb_phone');
                  localStorage.removeItem('tb_profile');
                  setSessionState('not-logged-in');
                }
              }}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors cursor-pointer"
              title="ออกจากระบบ"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar (Bottom of navbar, visible only on smaller screens when there is admin section) */}
          {profile.isAdmin && (
          <div className="md:hidden flex items-center justify-around gap-1 pt-3.5 mt-3 border-t border-slate-50">
            <button 
              onClick={() => {
                setSelectedTripId(null);
                setActiveTab('dashboard');
              }}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer ${
                activeTab === 'dashboard' && !selectedTripId ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
              <span>ทริป</span>
            </button>
            <button 
              onClick={() => {
                setSelectedTripId(null);
                setActiveTab('database');
              }}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer ${
                activeTab === 'database' ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">storage</span>
              <span>สมาชิก</span>
            </button>
            <button 
              onClick={() => {
                setSelectedTripId(null);
                setActiveTab('admin');
              }}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold cursor-pointer ${
                activeTab === 'admin' ? 'text-secondary-orange' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">shield_person</span>
              <span>แอดมิน</span>
            </button>
          </div>
        )}
      </nav>

      {/* Main Responsive Body Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-3 sm:p-6 md:p-8">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-semibold">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} เที่ยวด้วยกัน. เพื่อนคู่ใจผู้ร่วมเดินทางเพื่อการหารค่าใช้จ่ายที่โปร่งใส</p>
          <div className="flex gap-4">
            <a href="#terms" onClick={e => e.preventDefault()} className="hover:text-primary">เงื่อนไขการใช้งาน</a>
            <span>•</span>
            <a href="#privacy" onClick={e => e.preventDefault()} className="hover:text-primary">นโยบายความเป็นส่วนตัว</a>
          </div>
        </div>
      </footer>

      {/* FAB Floating action button for quick Add Expense inside Trips details */}
      {selectedTripId && (
        <button 
          onClick={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-secondary-orange hover:bg-secondary-orange-hover text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer z-50 group"
          title="เพิ่มค่าใช้จ่ายด่วน"
        >
          <span className="material-symbols-outlined text-[30px] font-bold group-hover:rotate-90 transition-transform duration-300">add</span>
        </button>
      )}

      {/* Add Expense Modal */}
      {(() => {
        const activeTrip = trips.find(t => t.id === selectedTripId);
        const getTripParticipantProfiles = (trip: Trip): { id?: string; name: string; avatarUrl: string }[] => {
          const namesMap = new Map<string, { id?: string; name: string; avatarUrl: string }>();

          trip.expenses.forEach(e => {
            if (e.paidBy) namesMap.set(e.paidBy, { id: e.paidById, name: e.paidBy, avatarUrl: '' });
            if (e.splitWith) e.splitWith.forEach((n, i) => {
              const id = e.splitWithIds?.[i];
              if (!namesMap.has(n)) namesMap.set(n, { id, name: n, avatarUrl: '' });
            });
          });

          // Add member profiles from trip member list (overwrite with DB avatars)
          if (trip.memberIds && trip.memberIds.length > 0) {
            const profiles = memberProfilesLookup[trip.id] || [];
            profiles.forEach(p => {
              namesMap.set(p.name, p);
            });
          }

          return Array.from(namesMap.values());
        };
        const activeTripProfiles = activeTrip ? getTripParticipantProfiles(activeTrip) : undefined;
        return (
          <AddExpenseModal 
            isOpen={isExpenseModalOpen}
            onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            editingExpense={editingExpense}
            memberProfiles={activeTripProfiles}
            currentUserName={profile.name}
          />
        );
      })()}

      {/* PWA install + update banners */}
      <PwaBanner />
    </div>
  );
}
