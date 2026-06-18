import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';
import type { ChartSample } from '../store/useSimStore';
import { dist, speed, pressure } from './format';

type Field = 'alt' | 'vel' | 'q';

interface ChartSpec {
  field: Field;
  label: string;
  fmt: (v: number) => string;
}

const SPECS: ChartSpec[] = [
  { field: 'alt', label: 'ALTITUDE', fmt: dist },
  { field: 'vel', label: 'SURFACE VELOCITY', fmt: speed },
  { field: 'q', label: 'DYNAMIC PRESSURE', fmt: pressure },
];

/** Three live strip charts drawn on canvas from store samples. */
export default function StripCharts() {
  const samples = useSimStore((s) => s.samples);
  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="border-b border-edge px-2 py-1 text-[10px] tracking-[0.2em] text-dim">
        STRIP CHARTS
      </div>
      <div className="flex flex-1 flex-col">
        {SPECS.map((spec) => (
          <Chart key={spec.field} spec={spec} samples={samples} />
        ))}
      </div>
    </div>
  );
}

function Chart({ spec, samples }: { spec: ChartSpec; samples: ChartSample[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 320;
    const cssH = canvas.clientHeight || 110;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.fillStyle = '#0a0d10';
    ctx.fillRect(0, 0, cssW, cssH);

    const padL = 4;
    const padR = 4;
    const padT = 14;
    const padB = 4;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    // grid
    ctx.strokeStyle = '#1c2630';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padL + (plotW * i) / 6;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
    }

    const vals = samples.map((s) => s[spec.field]);
    const ts = samples.map((s) => s.t);
    let curText = '—';
    let maxText = '—';
    let minText = '—';

    if (vals.length >= 2) {
      let vMin = Math.min(...vals);
      let vMax = Math.max(...vals);
      if (vMax - vMin < 1e-6) {
        vMax = vMin + 1;
      }
      // pad a little
      const span = vMax - vMin;
      vMin -= span * 0.05;
      vMax += span * 0.05;
      const tMin = ts[0];
      const tMax = ts[ts.length - 1];
      const tSpan = tMax - tMin || 1;

      ctx.strokeStyle = '#39c0d6';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let i = 0; i < vals.length; i++) {
        const x = padL + ((ts[i] - tMin) / tSpan) * plotW;
        const y = padT + plotH - ((vals[i] - vMin) / (vMax - vMin)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // current value dot
      const lastX = padL + plotW;
      const lastY = padT + plotH - ((vals[vals.length - 1] - vMin) / (vMax - vMin)) * plotH;
      ctx.fillStyle = '#39c0d6';
      ctx.beginPath();
      ctx.arc(lastX - 1, lastY, 2, 0, Math.PI * 2);
      ctx.fill();

      curText = spec.fmt(vals[vals.length - 1]);
      maxText = spec.fmt(Math.max(...vals));
      minText = spec.fmt(Math.min(...vals));
    }

    // axis labels
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6b7c88';
    ctx.fillText(`MAX ${maxText}`, cssW - padR, 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(`MIN ${minText}`, cssW - padR, cssH - 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6b7c88';
    ctx.fillText(spec.label, padL + 2, 2);
    ctx.fillStyle = '#c7d2da';
    ctx.textBaseline = 'bottom';
    ctx.fillText(curText, padL + 2, cssH - 2);
  }, [samples, spec]);

  return (
    <div className="min-h-0 flex-1 border-b border-grid last:border-b-0" style={{ minHeight: 96 }}>
      <canvas ref={canvasRef} className="h-full w-full" style={{ display: 'block' }} />
    </div>
  );
}
