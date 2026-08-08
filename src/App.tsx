import React, { useState, useEffect } from 'react';
import { Navbar, ActivePageTab } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ASHAFieldPortal } from './components/asha/ASHAFieldPortal';
import { EmergencySMSPortal } from './components/asha/EmergencySMSPortal';
import { AdminOutbreakPortal } from './components/admin/AdminOutbreakPortal';
import { getStoredSession, clearSession, AuthSession } from './types/auth';
import { registerAutomaticSyncListener } from './engine/syncManager';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [activeTab, setActiveTab] = useState<ActivePageTab>('FIELD_TRIAGE');
  const [isAuthOpen, setIsAuthOpen] = useState(() => !getStoredSession());

  // Automatically adjust view based on user session role
  useEffect(() => {
    if (!session) {
      setIsAuthOpen(true);
      return;
    }
    if (session.user.role === 'DISTRICT_ADMIN') {
      setActiveTab('OFFICER_COMMAND');
    } else {
      setActiveTab('FIELD_TRIAGE');
    }
  }, [session]);

  // Register offline store-and-forward automatic sync listener
  useEffect(() => {
    const cleanup = registerAutomaticSyncListener((count) => {
      console.log(`🎉 Auto-synced ${count} offline records to central database!`);
    });
    return cleanup;
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = () => {
    const current = getStoredSession();
    setSession(current);
  };

  const handleTabChange = (tab: ActivePageTab) => {
    if (tab === 'OFFICER_COMMAND' && session?.user.role !== 'DISTRICT_ADMIN') {
      alert('🔒 Access Restricted: Only District Health Officers can access the Officer Command Portal.');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <Navbar
        session={session}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
              🔒 Please sign in to access HealthTrack AI Triage & Officer Outbreak Portal.
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
            >
              Open Authentication Login Modal
            </button>
          </div>
        ) : activeTab === 'FIELD_TRIAGE' ? (
          <ASHAFieldPortal />
        ) : activeTab === 'SMS_GATEWAY' ? (
          <EmergencySMSPortal />
        ) : activeTab === 'CLUSTER_ANALYSIS' ? (
          <AdminOutbreakPortal />
        ) : (
          <AdminOutbreakPortal />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HealthTrack AI Triage & Outbreak Command System</span>
          <span className="text-[11px] text-slate-600">Sarvam AI • Edge ONNX • Fast2SMS Gateway • DBSCAN GIS</span>
        </div>
      </footer>

      {/* JWT Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;


