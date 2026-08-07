import { useState } from 'react';
import usePwa from '../lib/usePwa';
import SuitcaseLogo from './SuitcaseLogo';
import InstallModal from './InstallModal';

export default function PwaBanner() {
  const { canInstall, isStandalone, isIOS, updateAvailable, promptInstall } = usePwa();
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (isStandalone || dismissed) return null;

  // New version available -> prompt to reload
  if (updateAvailable) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
        <div className="flex items-center gap-3 bg-on-surface-dark text-white rounded-2xl shadow-2xl px-4 py-3">
          <span className="material-symbols-outlined text-[22px] text-secondary-orange shrink-0">system_update</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">มีอัปเดตใหม่</p>
            <p className="text-xs text-slate-300">เวอร์ชันใหม่พร้อมใช้งานแล้ว รีโหลดเพื่ออัปเดต</p>
          </div>
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                let done = false;
                const reload = () => {
                  if (done) return;
                  done = true;
                  window.location.reload();
                };
                navigator.serviceWorker.addEventListener('controllerchange', reload);
                if (navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                }
                setTimeout(reload, 3000);
              } else {
                window.location.reload();
              }
            }}
            className="shrink-0 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full px-3.5 py-1.5 cursor-pointer"
          >
            รีโหลด
          </button>
        </div>
      </div>
    );
  }

  // Android / Desktop Chrome -> native install prompt
  if (canInstall) {
    return (
      <>
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-2xl px-4 py-3">
            <SuitcaseLogo className="w-9 h-9 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-on-surface-dark">ติดตั้งแอปเที่ยวด้วยกัน</p>
              <p className="text-xs text-slate-500">เปิดใช้เร็วขึ้น เหมือนแอปจริงบนเครื่อง</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="shrink-0 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full px-3.5 py-1.5 cursor-pointer"
            >
              ติดตั้ง
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              title="ปิด"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <InstallModal
          open={modalOpen}
          isIOS={isIOS}
          onClose={() => setModalOpen(false)}
          onConfirm={async () => {
            setModalOpen(false);
            await promptInstall();
          }}
        />
      </>
    );
  }

  // iOS Safari -> guidance to Add to Home Screen (no native prompt available)
  if (isIOS) {
    return (
      <>
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-2xl px-4 py-3">
            <span className="material-symbols-outlined text-[22px] text-primary shrink-0">install_mobile</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-on-surface-dark">ติดตั้งแอปบน iPhone</p>
              <p className="text-xs text-slate-500">
                แตะปุ่มแชร์ <span className="font-bold text-on-surface-dark">⎋</span> แล้วเลือก “เพิ่มในหน้าจอหลัก”
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="shrink-0 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 text-xs font-bold rounded-full px-3 py-1.5 cursor-pointer"
            >
              วิธีติดตั้ง
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              title="ปิด"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <InstallModal
          open={modalOpen}
          isIOS={isIOS}
          onClose={() => setModalOpen(false)}
          onConfirm={() => setModalOpen(false)}
        />
      </>
    );
  }

  return null;
}
