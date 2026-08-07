import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function usePwa() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let reg: ServiceWorkerRegistration | null = null;
    let timer: number | undefined;

    const mql = window.matchMedia('(display-mode: standalone)');
    const updateStandalone = () => {
      const nav = window.navigator as unknown as { standalone?: boolean };
      setIsStandalone(mql.matches || nav.standalone === true);
    };
    updateStandalone();
    mql.addEventListener('change', updateStandalone);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const checkForUpdates = () => {
      if (reg) reg.update().catch(() => {});
    };

    const handleStateChange = () => {
      if (reg && reg.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (cancelled) return;
          reg = registration;
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) newWorker.addEventListener('statechange', handleStateChange);
          });
          handleStateChange();
          timer = window.setInterval(checkForUpdates, 30 * 60 * 1000);
          window.addEventListener('focus', checkForUpdates);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      mql.removeEventListener('change', updateStandalone);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('focus', checkForUpdates);
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      setIsStandalone(true);
      return true;
    }
    return false;
  }, [installPrompt]);

  const refreshForUpdate = useCallback(() => {
    let done = false;
    const reload = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reload);
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    setTimeout(reload, 3000);
  }, []);

  return {
    canInstall: !!installPrompt && !isStandalone,
    isStandalone,
    isIOS,
    updateAvailable,
    promptInstall,
    refreshForUpdate,
  };
}
