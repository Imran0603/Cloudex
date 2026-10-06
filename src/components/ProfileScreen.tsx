import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  RefreshCw,
  Trash2,
  Key,
  Smartphone,
  ChevronRight,
  Fingerprint,
  HardDrive,
  ShieldCheck,
  Bell,
  SunMoon,
  Download,
  Info,
  X,
  Check,
  BatteryCharging,
} from 'lucide-react';
import { useCloud } from '../context/CloudContext';

// iOS Style Toggle Switch
const IOSToggle: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ checked, onChange }) => {
  const { triggerHaptic } = useCloud();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        triggerHaptic('light');
        onChange(!checked);
      }}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-[#39393D]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-0.5 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export interface ProfileScreenProps {
  onClose?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose }) => {
  const {
    storage,
    huggingFace,
    connectHuggingFace,
    syncHuggingFace,
    disconnectHuggingFace,
    freeUpStorage,
    updateVaultConfig,
    setIsStorageManagerOpen,
    setIsTrashOpen,
    autoBackupConfig,
    updateAutoBackupConfig,
    triggerHaptic,
    showToast,
    prefersReducedMotion,
  } = useCloud();

  // Hugging Face Connection Modal State
  const [isHfModalOpen, setIsHfModalOpen] = useState<boolean>(false);
  const [repoInput, setRepoInput] = useState<string>(huggingFace?.repo_id || 'imran-z/private-personal-cloud');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(huggingFace?.is_private ?? true);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  // Vault Security settings state
  const [autoLockDuration, setAutoLockDuration] = useState<number>(180);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(true);
  const [isChangePinOpen, setIsChangePinOpen] = useState<boolean>(false);
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  // Notifications & Appearance toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [reduceMotionSetting, setReduceMotionSetting] = useState<boolean>(false);

  const handleHfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) {
      showToast('Please enter a valid Dataset repository ID', 'warning');
      return;
    }
    setIsTestingConnection(true);
    triggerHaptic('light');

    const success = await connectHuggingFace(repoInput.trim(), tokenInput.trim(), isPrivateRepo);
    setIsTestingConnection(false);
    if (success) {
      setIsHfModalOpen(false);
      setTokenInput('');
    }
  };

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      showToast('PIN must be exactly 6 digits', 'warning');
      return;
    }
    const success = await updateVaultConfig({ current_pin: currentPin, new_pin: newPin });
    if (success) {
      setIsChangePinOpen(false);
      setCurrentPin('');
      setNewPin('');
    }
  };

  return (
    <div className="space-y-6 pb-36">
      {/* 1. Large Title */}
      <section className="pt-2 flex items-center justify-between">
        <h1 className="text-[34px] font-semibold tracking-tight text-white leading-tight">
          Profile
        </h1>
        {onClose && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="text-[15px] font-semibold text-[#3B82F6] hover:text-blue-400 px-2 py-1 rounded-lg cursor-pointer"
          >
            Done
          </button>
        )}
      </section>

      {/* 2. Account Inset Header Card */}
      <section>
        <div className="rounded-[22px] bg-[#141414] p-4 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-900 shrink-0 border-[0.5px] border-white/20">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80"
              alt="Imran Zainal"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white tracking-tight truncate">
              Imran Zainal
            </h2>
            <p className="text-xs text-neutral-400 truncate">
              imranzainal111@gmail.com
            </p>
            <span className="text-[11px] text-emerald-400 font-medium mt-0.5 block">
              Active Cloud Account
            </span>
          </div>
        </div>
      </section>

      {/* 3. Grouped Inset List: Cloud Storage Backend */}
      <section className="space-y-1.5">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-3 block">
          Cloud Storage
        </span>
        <div className="rounded-[22px] bg-[#141414] divide-y divide-neutral-800/60 overflow-hidden text-xs">
          {/* HF Dataset */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setIsHfModalOpen(true);
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Hugging Face Dataset</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span className="truncate max-w-[150px]">{huggingFace?.repo_id || 'Connected'}</span>
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </div>
          </div>

          {/* Sync */}
          <div
            onClick={() => {
              triggerHaptic('light');
              syncHuggingFace();
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Sync with Dataset</span>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Sync</span>
          </div>

          {/* Storage Manager */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setIsStorageManagerOpen(true);
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Storage Breakdown</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </div>
        </div>
      </section>

      {/* 4. Grouped Inset List: Backup & Sync */}
      <section className="space-y-1.5">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-3 block">
          Backup &amp; Sync
        </span>
        <div className="rounded-[22px] bg-[#141414] divide-y divide-neutral-800/60 overflow-hidden text-xs">
          {/* Auto Backup Toggle */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Automatic Backup</span>
            </div>
            <IOSToggle
              checked={autoBackupConfig.enabled}
              onChange={(val) => updateAutoBackupConfig({ enabled: val })}
            />
          </div>

          {/* Wi-Fi Only Toggle */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Wi-Fi Only</span>
            </div>
            <IOSToggle
              checked={autoBackupConfig.wifi_only}
              onChange={(val) => updateAutoBackupConfig({ wifi_only: val })}
            />
          </div>

          {/* Charging Only Toggle */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Charging Only</span>
            </div>
            <IOSToggle
              checked={autoBackupConfig.charging_only}
              onChange={(val) => updateAutoBackupConfig({ charging_only: val })}
            />
          </div>

          {/* Free Up Device Storage */}
          <div
            onClick={() => {
              triggerHaptic('light');
              freeUpStorage();
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Free Up Device Space</span>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Clean</span>
          </div>
        </div>
      </section>

      {/* 5. Grouped Inset List: Privacy & Vault */}
      <section className="space-y-1.5">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-3 block">
          Privacy &amp; Vault
        </span>
        <div className="rounded-[22px] bg-[#141414] divide-y divide-neutral-800/60 overflow-hidden text-xs">
          {/* Biometric Toggle */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Biometric Unlock</span>
            </div>
            <IOSToggle
              checked={biometricEnabled}
              onChange={(val) => {
                setBiometricEnabled(val);
                updateVaultConfig({ biometric_enabled: val });
              }}
            />
          </div>

          {/* Change PIN */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setIsChangePinOpen(true);
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Change Master PIN</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </div>

          {/* Auto-Lock Duration Selection */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Auto-Lock</span>
            </div>
            <select
              value={autoLockDuration}
              onChange={(e) => {
                const val = Number(e.target.value);
                triggerHaptic('light');
                setAutoLockDuration(val);
                updateVaultConfig({ auto_lock_seconds: val });
              }}
              className="bg-transparent text-neutral-400 text-xs focus:outline-none cursor-pointer"
            >
              <option value={30} className="bg-neutral-900">30 seconds</option>
              <option value={60} className="bg-neutral-900">1 minute</option>
              <option value={180} className="bg-neutral-900">3 minutes</option>
              <option value={300} className="bg-neutral-900">5 minutes</option>
            </select>
          </div>
        </div>
      </section>

      {/* 6. Grouped Inset List: Trash & Downloads */}
      <section className="space-y-1.5">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-3 block">
          Storage Utilities
        </span>
        <div className="rounded-[22px] bg-[#141414] divide-y divide-neutral-800/60 overflow-hidden text-xs">
          {/* Trash */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setIsTrashOpen(true);
            }}
            className="p-3.5 px-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Recently Deleted</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-500">
              <span>Trash</span>
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </div>
          </div>

          {/* Notifications */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Notifications</span>
            </div>
            <IOSToggle
              checked={notificationsEnabled}
              onChange={(val) => setNotificationsEnabled(val)}
            />
          </div>

          {/* Reduce Motion */}
          <div className="p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                <SunMoon className="w-4 h-4" />
              </div>
              <span className="font-medium text-white">Reduce Motion</span>
            </div>
            <IOSToggle
              checked={reduceMotionSetting}
              onChange={(val) => setReduceMotionSetting(val)}
            />
          </div>
        </div>
      </section>

      {/* 7. About App */}
      <section className="text-center pt-2">
        <p className="text-xs text-neutral-500 font-medium">Aether Cloud for iOS</p>
        <p className="text-[11px] text-neutral-600">Zero Subscriptions · Private Dataset Security</p>
      </section>

      {/* Hugging Face Connect Modal */}
      <AnimatePresence>
        {isHfModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] liquid-glass-sheet p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Hugging Face Dataset</h3>
                <button
                  onClick={() => setIsHfModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Connect your private dataset repository. User Access Tokens are stored securely on the backend and are never sent to client-side code.
              </p>

              <form onSubmit={handleHfSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Dataset ID</label>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="username/dataset-name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border-[0.5px] border-white/10 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Access Token</label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={huggingFace?.masked_token || 'hf_••••••••••••••••'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border-[0.5px] border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900">
                  <div className="text-xs">
                    <span className="font-medium text-white block">Private Dataset</span>
                    <span className="text-[10px] text-neutral-500">Only authorized owner can access</span>
                  </div>
                  <IOSToggle
                    checked={isPrivateRepo}
                    onChange={(val) => setIsPrivateRepo(val)}
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isTestingConnection}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isTestingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isTestingConnection ? 'Verifying...' : 'Save & Verify'}</span>
                  </button>
                  {huggingFace?.connected && (
                    <button
                      type="button"
                      onClick={() => {
                        disconnectHuggingFace();
                        setIsHfModalOpen(false);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-neutral-900 text-xs text-neutral-400 hover:text-white"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change PIN Modal */}
      <AnimatePresence>
        {isChangePinOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[24px] liquid-glass-modal p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Change Master PIN</h3>
                <button
                  onClick={() => setIsChangePinOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePinUpdate} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Current PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="112233"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border-[0.5px] border-white/10 text-xs text-center tracking-widest text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">New 6-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border-[0.5px] border-white/10 text-xs text-center tracking-widest text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition-colors mt-1"
                >
                  Update PIN
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
