import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';
import { num } from './format';

const RAD = 180 / Math.PI;

/**
 * Serious artificial-horizon / navball drawn on a canvas.
 * Pitch ladder rotates with body pitch; prograde and target markers overlaid.
 * Restrained dark palette — dark slate sky, dim amber ground.
 */
export default function AttitudeIndicator() {
  const derived = useSimStore((s) => s.derived);
  const runtime = useSimStore((s) => s.runtime);
  const sim = useSimStore((s) => s.sim);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pitchAngle = derived ? derived.pitchAngle : 0;
  const flightPath = derived ? derived.flightPathAngle : 0;
  // body heading proxy: use launch azimuth from runtime if present
  const heading = runtime ? runtime.mission.targetInclination : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 220;
    const cssH = canvas.clientHeight || 220;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW / 2;
    const cy = cssH / 2;
    const R = Math.min(cssW, cssH) / 2 - 6;

    // clip to the instrument circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    if (!derived || !sim) {
      ctx.fillStyle = '#0a0d10';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
      ctx.strokeStyle = '#2a3742';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#6b7c88';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO DATA', cx, cy);
      return;
    }

    // pixels per degree of pitch on the ladder
    const pxPerDeg = R / 55;
    const pitchDeg = pitchAngle * RAD; // body pitch above horizon
    // horizon offset: when pitch = 0 horizon at center; positive pitch moves horizon down
    const horizonY = cy + pitchDeg * pxPerDeg;

    // sky (above horizon) — dark slate
    const skyGrad = ctx.createLinearGradient(0, cy - R, 0, horizonY);
    skyGrad.addColorStop(0, '#10202a');
    skyGrad.addColorStop(1, '#16323f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(cx - R, cy - R, R * 2, horizonY - (cy - R));

    // ground (below horizon) — dim amber/brown, kept dark
    const grGrad = ctx.createLinearGradient(0, horizonY, 0, cy + R);
    grGrad.addColorStop(0, '#2a2113');
    grGrad.addColorStop(1, '#16110a');
    ctx.fillStyle = grGrad;
    ctx.fillRect(cx - R, horizonY, R * 2, cy + R - horizonY);

    // horizon line
    ctx.strokeStyle = '#e0a020';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - R, horizonY);
    ctx.lineTo(cx + R, horizonY);
    ctx.stroke();

    // pitch ladder
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p = -40; p <= 90; p += 10) {
      if (p === 0) continue;
      const y = cy + (pitchDeg - p) * pxPerDeg;
      if (y < cy - R + 8 || y > cy + R - 8) continue;
      const half = p % 30 === 0 ? 34 : 20;
      ctx.strokeStyle = p > 0 ? '#7a8a96' : '#9a8050';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
      ctx.fillStyle = '#9aa8b2';
      ctx.fillText(String(p), cx - half - 12, y);
      ctx.fillText(String(p), cx + half + 12, y);
    }

    ctx.restore();

    // instrument bezel
    ctx.strokeStyle = '#2a3742';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // fixed aircraft reference (boresight) — cyan
    ctx.strokeStyle = '#39c0d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    // prograde marker (velocity vector) at flight path angle relative to body pitch
    const fpDeg = flightPath * RAD;
    const progradeY = cy + (pitchDeg - fpDeg) * pxPerDeg;
    if (progradeY > cy - R + 6 && progradeY < cy + R - 6) {
      ctx.strokeStyle = '#35c66b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, progradeY, 5, 0, Math.PI * 2);
      ctx.moveTo(cx - 9, progradeY);
      ctx.lineTo(cx - 5, progradeY);
      ctx.moveTo(cx + 5, progradeY);
      ctx.lineTo(cx + 9, progradeY);
      ctx.moveTo(cx, progradeY - 9);
      ctx.lineTo(cx, progradeY - 5);
      ctx.stroke();
    }

    // target marker: orbital insertion ~ near 0 deg horizon
    const targetDeg = 0;
    const targetY = cy + (pitchDeg - targetDeg) * pxPerDeg;
    if (targetY > cy - R + 6 && targetY < cy + R - 6) {
      ctx.strokeStyle = '#e0a020';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 7, targetY - 7);
      ctx.lineTo(cx + 7, targetY + 7);
      ctx.moveTo(cx + 7, targetY - 7);
      ctx.lineTo(cx - 7, targetY + 7);
      ctx.stroke();
    }
  }, [pitchAngle, flightPath, derived, sim, heading]);

  const pitchReadout = derived ? `${num(pitchAngle * RAD, 1)}°` : '—';
  const fpReadout = derived ? `${num(flightPath * RAD, 1)}°` : '—';
  const hdgReadout = sim ? `${num(((sim.bodyPitch * RAD) % 360 + 360) % 360, 0)}°` : '—';

  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="flex items-center justify-between border-b border-edge px-2 py-1">
        <span className="text-[10px] tracking-[0.2em] text-dim">ATTITUDE</span>
        <span className="text-[10px] tracking-[0.15em] text-dim">ADI</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} className="aspect-square h-full max-h-[220px] w-auto" />
      </div>
      <div className="grid grid-cols-3 border-t border-edge text-center">
        <Readout label="PITCH" value={pitchReadout} accent />
        <Readout label="γ FPA" value={fpReadout} />
        <Readout label="BODY" value={hdgReadout} />
      </div>
    </div>
  );
}

function Readout({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-r border-edge px-1 py-1 last:border-r-0">
      <div className="text-[9px] tracking-[0.15em] text-dim">{label}</div>
      <div className={`tnum text-sm ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
