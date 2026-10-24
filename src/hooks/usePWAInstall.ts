import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __WORKLY_INSTALL_PROMPT__?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  // Pre-seed state from global prompt if it already fired before component mounted
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__WORKLY_INSTALL_PROMPT__) {
      return window.__WORKLY_INSTALL_PROMPT__;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed & running as standalone PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return isStandaloneMedia || isIOSStandalone;
    };

    setIsInstalled(checkStandalone());

    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleMediaChange);
    } else {
      mediaQueryList.addListener(handleMediaChange);
    }

    // 2. Detect mobile platforms
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Check if window already holds a deferred prompt
    if (window.__WORKLY_INSTALL_PROMPT__) {
      setDeferredPrompt(window.__WORKLY_INSTALL_PROMPT__);
    }

    // 4. Listen for beforeinstallprompt event (Chromium, Edge, Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__WORKLY_INSTALL_PROMPT__ = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // Custom event triggered by early capture in index.html
    const handleCustomPromptReady = () => {
      if (window.__WORKLY_INSTALL_PROMPT__) {
        setDeferredPrompt(window.__WORKLY_INSTALL_PROMPT__);
      }
    };

    // 5. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__WORKLY_INSTALL_PROMPT__ = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('workly:prompt-available', handleCustomPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleMediaChange);
      } else {
        mediaQueryList.removeListener(handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('workly:prompt-available', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || window.__WORKLY_INSTALL_PROMPT__;
    if (!promptToUse) return false;

    try {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__WORKLY_INSTALL_PROMPT__ = null;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA install prompt invocation failed:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
