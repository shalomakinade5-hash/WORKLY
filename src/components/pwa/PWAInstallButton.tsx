import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, Laptop } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'landing' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running as an installed PWA, do not show installation prompts
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F2F5F8] border border-[#DCE1E5] rounded-lg text-xs font-semibold text-green-700">
          <Check className="w-4 h-4 text-green-600" />
          <span>Workly PWA is installed & running in standalone mode.</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else {
      // Browser doesn't support programmatic beforeinstallprompt (e.g. iOS Safari, Firefox, or already deferred)
      setShowInstructionsModal(true);
    }
  };

  // Render variant styles
  const renderTrigger = () => {
    if (variant === 'navbar') {
      return (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#DCE1E5] text-[#202C39] hover:bg-[#F2F5F8] hover:border-[#8293A5] shadow-2xs transition-all cursor-pointer ${className}`}
          title="Install Workly App on your device"
        >
          <Download className="w-3.5 h-3.5 text-[#D5A34B]" />
          <span className="hidden lg:inline">Install Workly</span>
          <span className="lg:hidden text-[11px]">Install</span>
        </button>
      );
    }

    if (variant === 'sidebar') {
      return (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#F7F7F4] hover:bg-[#F2F5F8] text-[#202C39] border border-[#DCE1E5] transition-all cursor-pointer shadow-2xs ${className}`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-[#D5A34B]" />
            <span>Install Workly App</span>
          </div>
          <span className="text-[10px] bg-[#202C39] text-[#F7F7F4] font-bold px-1.5 py-0.5 rounded">
            PWA
          </span>
        </button>
      );
    }

    if (variant === 'landing') {
      return (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FFFFFF] border border-[#DCE1E5] text-[#202C39] hover:bg-[#F2F5F8] shadow-xs transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-[#D5A34B]" />
          <span>Install App</span>
        </button>
      );
    }

    // Settings variant
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#202C39] text-[#F7F7F4] hover:bg-[#151E28] transition-colors cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 text-[#D5A34B]" />
        <span>Install Workly to Desktop / Home Screen</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Manual Installation Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#202C39]">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#DCE1E5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#202C39] flex items-center justify-center text-[#D5A34B] font-bold text-lg shadow-xs">
                  W
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202C39]">Install Workly</h3>
                  <p className="text-xs text-[#8293A5]">Standalone productivity workspace</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="text-[#8293A5] hover:text-[#202C39] p-1.5 rounded-lg hover:bg-[#F2F5F8]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content based on device */}
            <div className="mt-5 space-y-4 text-xs leading-relaxed">
              {isIOS ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#202C39]">
                    <Smartphone className="w-4 h-4 text-[#D5A34B]" />
                    <span>How to install on iPhone & iPad (Safari)</span>
                  </div>
                  <ol className="space-y-2.5 text-[#8293A5] pl-1">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        1
                      </span>
                      <span>
                        Tap the <strong className="text-[#202C39] inline-flex items-center gap-1 font-semibold"><Share className="w-3.5 h-3.5 text-[#202C39] inline" /> Share</strong> icon in the Safari navigation bar at the bottom of your screen.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        2
                      </span>
                      <span>
                        Scroll down the menu options and select <strong className="text-[#202C39] inline-flex items-center gap-1 font-semibold"><PlusSquare className="w-3.5 h-3.5 text-[#202C39] inline" /> Add to Home Screen</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        3
                      </span>
                      <span>
                        Confirm with <strong className="text-[#202C39]">Add</strong> in the top-right corner. Workly will launch like a native application with its own icon!
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#202C39]">
                    <Laptop className="w-4 h-4 text-[#D5A34B]" />
                    <span>Install on Chrome, Edge, or Android</span>
                  </div>
                  <ol className="space-y-2.5 text-[#8293A5] pl-1">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        1
                      </span>
                      <span>
                        Look for the <strong className="text-[#202C39] font-semibold">Install icon</strong> (a computer with a down arrow) on the right side of your browser address bar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        2
                      </span>
                      <span>
                        Alternatively, open the browser menu <strong className="text-[#202C39]">(&#8942;)</strong> and choose <strong className="text-[#202C39]">Install Workly</strong> or <strong className="text-[#202C39]">Save and share &rarr; Install app</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#F2F5F8] text-[#202C39] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCE1E5]">
                        3
                      </span>
                      <span>
                        Workly opens in a clean, dedicated window without browser address bars for uninterrupted productivity.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Benefits highlight */}
              <div className="p-3 bg-[#F7F7F4] border border-[#DCE1E5] rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#D5A34B]" />
                <p className="text-[11px] text-[#8293A5]">
                  Fast launch, offline static shell caching, and no clutter.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[#DCE1E5] flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 bg-[#202C39] text-[#F7F7F4] rounded-lg text-xs font-semibold hover:bg-[#151E28] transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
