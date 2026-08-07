import { useState } from 'react';
import usePwa from '../lib/usePwa';
import InstallModal from './InstallModal';

export default function InstallButton() {
  const { canInstall, isIOS, promptInstall } = usePwa();
  const [modalOpen, setModalOpen] = useState(false);

  if (!canInstall) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 transition-colors cursor-pointer text-xs font-bold shrink-0"
        title="ติดตั้งแอปบนอุปกรณ์ของคุณ"
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        <span className="hidden sm:inline">ติดตั้งแอป</span>
      </button>

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
