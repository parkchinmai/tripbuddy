/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, Trip, Expense } from './types';
import { initialTrips, defaultProfile, HOTLINKS, deriveTripStatus } from './data';
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

type UserSessionState = 'not-logged-in' | 'onboarding' | 'welcome-back' | 'logged-in';
type ActiveTabType = 'dashboard' | 'database' | 'profile' | 'admin';

export default function App() {
  const [sessionState, setSessionState] = useState<UserSessionState>('not-logged-in');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);

  // Handle Login Step 1
  const handleLoginSuccess = (phone: string) => {
    setPhoneNumber(phone);
    
    // Check if there is an existing profile saved for this phone number
    const savedProfile = localStorage.getItem(`user_profile_${phone}`);
    if (phone === '081-234-5678') {
      // For the default demo profile
      setProfile(defaultProfile);
      setSessionState('welcome-back');
    } else if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as UserProfile;
        setProfile(parsed);
        setSessionState('welcome-back');
      } catch (e) {
        setSessionState('onboarding');
      }
    } else {
      setSessionState('onboarding');
    }
  };

  // Handle Onboarding Step 2
  const handleOnboardingComplete = (data: { name: string; avatarUrl: string; bankAccount: string }) => {
    const newProfile: UserProfile = {
      name: data.name,
      phone: phoneNumber,
      bankAccount: data.bankAccount,
      avatarUrl: data.avatarUrl,
      isAdmin: false // user can toggle admin manually in the UI
    };
    setProfile(newProfile);
    localStorage.setItem(`user_profile_${phoneNumber}`, JSON.stringify(newProfile));
    setSessionState('logged-in');
    setActiveTab('dashboard');
  };

  // Switch between trips or go back
  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const handleBackToTrips = () => {
    setSelectedTripId(null);
  };

  // Dynamic Add Expense
  const handleAddExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    if (!selectedTripId) return;

    setTrips(prevTrips => 
      prevTrips.map(trip => {
        if (trip.id === selectedTripId) {
          const newExpense: Expense = {
            ...newExpenseData,
            id: `e-${Date.now()}`
          };
          return {
            ...trip,
            expenses: [newExpense, ...trip.expenses]
          };
        }
        return trip;
      })
    );
  };

  // Dynamic Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    if (!selectedTripId) return;

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
    const newTrip: Trip = {
      ...newTripData,
      id: `t-${Date.now()}`,
      expenses: []
    };
    setTrips([newTrip, ...trips]);
  };

  const handleUpdateTrip = (tripId: string, updates: Partial<Trip>) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
  };

  const handleDeleteTrip = (tripId: string) => {
    if (confirm('คุณต้องการลบทริปนี้ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      setTrips(prev => prev.filter(t => t.id !== tripId));
      setSelectedTripId(null);
    }
  };

  // Derive status from dates for all trips
  const tripsWithDerivedStatus = trips.map(t => ({
    ...t,
    status: deriveTripStatus(t.dates)
  }));

  // Filter trips based on user membership
  const isUserInTrip = (trip: Trip, userName: string): boolean => {
    // Check hardcoded members by trip ID
    const hardcodedMembers: Record<string, string[]> = {
      't-chiangmai': ['คุณต้น', 'คุณพลอย', 'สมชาย'],
      't-japan': ['ต้น', 'ก้อย', 'แพรว', 'บาส'],
    };
    const members = hardcodedMembers[trip.id] || [];
    if (members.some(m => userName.includes(m) || m.includes(userName))) return true;

    // Check expenses
    return trip.expenses.some(e =>
      e.paidBy === userName ||
      e.splitWith.includes(userName)
    );
  };

  const visibleTrips = profile.isAdmin
    ? tripsWithDerivedStatus
    : tripsWithDerivedStatus.filter(t => isUserInTrip(t, profile.name));

  // Render proper sub-components for logged-in view
  const renderTabContent = () => {
    if (selectedTripId) {
      const currentTrip = tripsWithDerivedStatus.find(t => t.id === selectedTripId);
      if (!currentTrip) return null;

      return (
        <TripDetail 
          trip={currentTrip} 
          onBack={handleBackToTrips}
          onAddExpenseClick={() => setIsExpenseModalOpen(true)}
          onDeleteExpense={handleDeleteExpense}
          onUpdateTrip={(updates) => handleUpdateTrip(currentTrip.id, updates)}
          onDeleteTrip={() => handleDeleteTrip(currentTrip.id)}
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
            onSave={(updated) => {
              setProfile(updated);
              localStorage.setItem(`user_profile_${updated.phone}`, JSON.stringify(updated));
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
        }}
        onEdit={() => {
          setSessionState('onboarding');
        }}
        onSwitchAccount={() => {
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
              <img className="w-full h-full object-cover" alt="User Avatar" src={profile.avatarUrl} />
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
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
          onClick={() => setIsExpenseModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-secondary-orange hover:bg-secondary-orange-hover text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer z-50 group"
          title="เพิ่มค่าใช้จ่ายด่วน"
        >
          <span className="material-symbols-outlined text-[30px] font-bold group-hover:rotate-90 transition-transform duration-300">add</span>
        </button>
      )}

      {/* Add Expense Modal */}
      {(() => {
        const activeTrip = trips.find(t => t.id === selectedTripId);
        const getTripParticipantNames = (trip: Trip): string[] => {
          const namesSet = new Set<string>();
          
          if (trip.id === 't-chiangmai') {
            namesSet.add('คุณต้น');
            namesSet.add('คุณพลอย');
            namesSet.add('สมชาย');
          } else if (trip.id === 't-japan') {
            namesSet.add('ต้น');
            namesSet.add('ก้อย');
            namesSet.add('แพรว');
            namesSet.add('บาส');
          }

          trip.expenses.forEach(e => {
            if (e.paidBy) namesSet.add(e.paidBy);
            if (e.splitWith) e.splitWith.forEach(n => namesSet.add(n));
          });

          if (trip.memberIds) {
            // memberIds are member database IDs, we'd need to look up names
            // For now, names from expenses are sufficient
          }

          return Array.from(namesSet);
        };
        const activeTripMembers = activeTrip ? getTripParticipantNames(activeTrip) : undefined;
        return (
          <AddExpenseModal 
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            onAddExpense={handleAddExpense}
            memberNames={activeTripMembers}
          />
        );
      })()}
    </div>
  );
}
