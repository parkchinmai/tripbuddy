import SuitcaseLogo from './SuitcaseLogo';

interface InstallModalProps {
  open: boolean;
  isIOS: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function InstallModal({ open, isIOS, onClose, onConfirm }: InstallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-[#0b1c30]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col font-sans">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-primary text-white shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <SuitcaseLogo className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold">ติดตั้งแอปเที่ยวด้วยกัน</h2>
              <p className="text-xs text-white/70">เพื่อนคู่ใจผู้ร่วมเดินทาง แบ่งค่าใช้จ่ายโปร่งใส</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {isIOS ? (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                แอปนี้ติดตั้งจากเว็บไซต์ของเราโดยตรงผ่านเบราว์เซอร์ Safari ปลอดภัย ไม่มีไวรัส และไม่ต้องดาวน์โหลดไฟล์ใดๆ
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">share</span>
                  <p className="text-sm font-semibold text-slate-700">
                    ขั้นที่ 1: แตะปุ่มแชร์ <span className="text-on-surface-dark font-bold">⎋</span> ที่แถบด้านล่างของ Safari
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">home</span>
                  <p className="text-sm font-semibold text-slate-700">
                    ขั้นที่ 2: เลือก <span className="text-on-surface-dark font-bold">“เพิ่มในหน้าจอหลัก”</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">check_circle</span>
                  <p className="text-sm font-semibold text-slate-700">
                    ขั้นที่ 3: กด “เพิ่ม” แอปจะปรากฏบนหน้าจอเหมือนแอปทั่วไป
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-5 w-full bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl py-3 cursor-pointer transition-colors"
              >
                เข้าใจแล้ว
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                แอปนี้คือเว็บแอป (PWA) ที่ติดตั้งจากเว็บไซต์ของเราโดยตรง ไม่ใช่การดาวน์โหลดไฟล์ จึงปลอดภัยและไม่มีไวรัส
              </p>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-tertiary-green text-[22px] shrink-0">verified_user</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">ปลอดภัย ไม่มีไวรัส</p>
                    <p className="text-xs text-slate-500">ติดตั้งจาก https://tripbuddy-8za.pages.dev ผ่าน HTTPS ไม่มีไฟล์ให้ดาวน์โหลด</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">lock</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">เชื่อมต่อแบบเข้ารหัส</p>
                    <p className="text-xs text-slate-500">ข้อมูลของคุณถูกส่งแบบปลอดภัยผ่าน Cloudflare</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">phone_iphone</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">ไม่แตะข้อมูลในเครื่อง</p>
                    <p className="text-xs text-slate-500">ทำงานในกรอบของเบราว์เซอร์ ไม่เข้าถึงไฟล์ ข้อความ หรือผู้ติดต่อของคุณ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                  <span className="material-symbols-outlined text-secondary-orange text-[22px] shrink-0">storage</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">ขนาดเล็กมาก</p>
                    <p className="text-xs text-slate-500">กินพื้นที่เพียงหลักกิโลไบต์ ไม่เหมือนแอปทั่วไปที่หลายร้อย MB</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl py-3 cursor-pointer transition-colors"
                >
                  ทีหลัง
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl py-3 cursor-pointer transition-colors"
                >
                  ติดตั้งแอป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
