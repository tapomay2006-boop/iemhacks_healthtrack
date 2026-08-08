import React, { useState, useEffect } from 'react';
import { AuthSession } from '../types/auth';
import { syncPendingRecords } from '../engine/syncManager';
import { db } from '../engine/dexieDb';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  LogOut,
  Stethoscope,
  Shield,
  Layers
} from 'lucide-react';

export type ActivePageTab = 'FIELD_TRIAGE' | 'SMS_GATEWAY' | 'CLUSTER_ANALYSIS' | 'OFFICER_COMMAND';

interface NavbarProps {
  session: AuthSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  activeTab: ActivePageTab;
  onTabChange: (tab: ActivePageTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  onOpenAuth,
  onLogout,
  activeTab,
  onTabChange,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll Dexie for pending unsynced records
  useEffect(() => {
    const checkPending = async () => {
      try {
        const count = await db.patients.where('syncStatus').equals(0).count();
        setPendingCount(count);
      } catch (err) {
        // Fallback
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    const res = await syncPendingRecords();
    const count = await db.patients.where('syncStatus').equals(0).count();
    setPendingCount(count);
    setIsSyncing(false);
    if (res.syncedCount > 0) {
      alert(res.message);
    }
  };



  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-outfit">HealthTrack</span>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 uppercase">
                AI Surveillance Platform
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">AI Triage • Fast2SMS Gateway • DBSCAN GIS • Live Bed Command</p>
          </div>
        </div>

        {/* Center Portal Switcher Tabs (4 Dedicated Hackathon Pages) */}
        {session && (
          <div className="flex flex-wrap items-center justify-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 gap-1">
            <button
              onClick={() => onTabChange('FIELD_TRIAGE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FIELD_TRIAGE'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" /> AI Prediction Engine
            </button>

            <button
              onClick={() => onTabChange('SMS_GATEWAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'SMS_GATEWAY'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-rose-400" /> Emergency SMS Gateway
            </button>

            <button
              onClick={() => onTabChange('CLUSTER_ANALYSIS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CLUSTER_ANALYSIS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Cluster Analysis
            </button>

            <button
              onClick={() => onTabChange('OFFICER_COMMAND')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'OFFICER_COMMAND'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Officer Command
            </button>
          </div>
        )}


        {/* Right Status Actions */}
        <div className="flex items-center gap-3">
          {/* Network Connection Status Indicator Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Online Sync Active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" /> <span>Offline Mode</span>
              </>
            )}
          </div>

          {/* Pending Sync Queue Badge & Trigger Button */}
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
              pendingCount > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 border-slate-800'
            }`}
            title="IndexedDB Store-and-Forward Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{pendingCount} Pending</span>
          </button>

          {/* User Account / Auth Modal Trigger */}
          {session ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-white">{session.user.name}</p>
                <p className="text-[10px] text-teal-400">{session.user.role === 'ASHA_WORKER' ? 'ASHA Field Worker' : 'District Health Officer'}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
