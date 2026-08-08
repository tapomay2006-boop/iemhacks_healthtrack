import React, { useEffect, useState } from 'react';
import { db, HealthAdvisory } from '../../engine/dexieDb';
import { ShieldAlert, AlertTriangle, CheckCircle2, Radio, X } from 'lucide-react';

export const HealthAdvisoryModal: React.FC = () => {
  const [activeAdvisory, setActiveAdvisory] = useState<HealthAdvisory | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkAdvisories = async () => {
      const unread = await db.advisories.where('isRead').equals(0).toArray();
      if (unread && unread.length > 0) {
        setActiveAdvisory(unread[0]);
        setIsOpen(true);
      } else {
        // Mock fallback advisory if none in DB to demonstrate hackathon functionality
        const mockAdvisory: HealthAdvisory = {
          advisoryId: 'ADV-WB-9921',
          title: '🚨 DENGUE & CHOLERA OUTBREAK ADVISORY',
          category: 'OUTBREAK_ALERT',
          targetClusterName: 'Sonarpur & Adisaptagram Sector 4',
          targetDistrict: 'Hooghly / North 24 Parganas',
          priority: 'CRITICAL',
          message: 'Contaminated well water detected in Sector 4 cluster. Elevated febrile pediatric cases with respiratory distress reported.',
          actionSteps: [
            'Immediate ORS hydration packet distribution to all pediatric patients with fever.',
            'Conduct mandatory Rapid NS1 Antigen Cards for fever > 102°F.',
            'Isolate waterborne cases & instruct immediate boil-water protocols.'
          ],
          issuedBy: 'Chief District Medical Officer (CDMO Office)',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        setActiveAdvisory(mockAdvisory);
        setIsOpen(true);
      }
    };

    checkAdvisories();
  }, []);

  const handleAcknowledge = async () => {
    if (activeAdvisory && activeAdvisory.id) {
      await db.advisories.update(activeAdvisory.id, { isRead: true });
    }
    setIsOpen(false);
  };

  if (!isOpen || !activeAdvisory) return null;

  const isCritical = activeAdvisory.priority === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className={`max-w-lg w-full rounded-3xl glass-panel border p-6 space-y-5 shadow-2xl relative overflow-hidden ${
        isCritical ? 'border-rose-500/80 shadow-rose-500/20 bg-rose-950/30' : 'border-amber-500/80 shadow-amber-500/20 bg-amber-950/30'
      }`}>
        {/* Glow backdrop */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isCritical ? 'bg-rose-500/20' : 'bg-amber-500/20'
        }`} />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-2.5">
            <div className={`p-3 rounded-2xl border ${
              isCritical ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                isCritical ? 'bg-rose-500/30 text-rose-300 border-rose-500/50' : 'bg-amber-500/30 text-amber-300 border-amber-500/50'
              }`}>
                {activeAdvisory.priority} DIRECTIVE
              </span>
              <h2 className="text-lg font-black text-white font-outfit mt-0.5">
                {activeAdvisory.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Issued By Header */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> {activeAdvisory.issuedBy}
          </span>
          <span className="text-[11px] text-slate-500">
            {new Date(activeAdvisory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Advisory Message */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-xs space-y-2">
          <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Target Cluster Sector</span>
          <p className="text-white font-semibold text-sm">{activeAdvisory.targetClusterName}</p>
          <p className="text-slate-300 mt-1 leading-relaxed">{activeAdvisory.message}</p>
        </div>

        {/* Action Guidelines */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Mandatory Field Action Protocol
          </span>
          <ul className="space-y-1.5">
            {activeAdvisory.actionSteps.map((step, idx) => (
              <li key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAcknowledge}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          Acknowledge Directive & Sync to ASHA Field Kit
        </button>
      </div>
    </div>
  );
};
