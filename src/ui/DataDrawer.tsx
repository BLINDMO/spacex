import { useState } from 'react';
import AttitudeIndicator from './AttitudeIndicator';
import Telemetry from './Telemetry';
import StripCharts from './StripCharts';
import DvBudget from './DvBudget';
import StageBoard from './StageBoard';
import EventLog from './EventLog';

type Tab = 'flight' | 'charts' | 'stages' | 'log';

/** Full-screen instrument drawer for phones — the dense panels live here behind a toggle so
 *  the 3D view and controls stay front-and-centre. Tabs keep each panel readable. */
export default function DataDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('flight');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'flight', label: 'FLIGHT' },
    { id: 'charts', label: 'CHARTS' },
    { id: 'stages', label: 'STAGES' },
    { id: 'log', label: 'LOG' },
  ];
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#05070a]/97 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <span className="text-[11px] tracking-[0.3em] text-accent">FLIGHT DATA</span>
        <button onClick={onClose} className="dock-btn">CLOSE ✕</button>
      </div>
      <div className="flex gap-px border-b border-edge">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] tracking-[0.15em] ${
              tab === t.id ? 'bg-panel2 text-accent border-b-2 border-accent' : 'text-dim'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {tab === 'flight' && (
          <>
            <div className="h-[240px]"><AttitudeIndicator /></div>
            <Telemetry />
          </>
        )}
        {tab === 'charts' && (
          <>
            <div className="h-[330px]"><StripCharts /></div>
            <DvBudget />
          </>
        )}
        {tab === 'stages' && <StageBoard />}
        {tab === 'log' && <div className="h-[70vh]"><EventLog /></div>}
      </div>
    </div>
  );
}
