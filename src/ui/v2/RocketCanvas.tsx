import { useEffect, useRef } from 'react';
import { PARTS, type PartInstance } from '../../data/parts';

interface Slot {
  uid: string;
  defId: string;
  yTop: number;
  yBot: number;
  w: number; // px width
  cx: number;
}

/** Canvas 2D renderer of an assembled rocket stack (bottom index 0 → top). Real-ish
 *  proportions, engine clusters, fuel-fill tanks, gold interstages, clamshell fairing.
 *  Tapping a part calls onPick with its uid. */
export default function RocketCanvas({
  rocket,
  selected,
  onPick,
}: {
  rocket: PartInstance[];
  selected?: string | null;
  onPick?: (uid: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slotsRef = useRef<Slot[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 300;
    const cssH = canvas.clientHeight || 400;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (rocket.length === 0) {
      ctx.fillStyle = '#3a4750';
      ctx.font = '13px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EMPTY PAD', cssW / 2, cssH / 2 - 8);
      ctx.fillStyle = '#2a3742';
      ctx.fillText('add parts from the tray below', cssW / 2, cssH / 2 + 12);
      slotsRef.current = [];
      return;
    }

    // total height in ratio units (engines render as a short block)
    const heights = rocket.map((inst) => {
      const d = PARTS[inst.defId];
      const scale = d.cat === 'tank' ? inst.scale ?? 1 : 1;
      return d.h * scale;
    });
    const totalH = heights.reduce((a, b) => a + b, 0) + 0.4; // +nozzle overhang
    const margin = 24;
    const unit = (cssH - margin * 2) / totalH; // px per ratio unit
    const maxW = rocket.reduce((m, inst) => Math.max(m, PARTS[inst.defId].w), 1);
    const baseD = Math.min(cssW - 40, maxW * unit * 1.1); // diameter px for w=1
    const cx = cssW / 2;

    // draw top → bottom (last array element is the nose)
    let y = margin;
    const slots: Slot[] = [];
    for (let i = rocket.length - 1; i >= 0; i--) {
      const inst = rocket[i];
      const d = PARTS[inst.defId];
      const scale = d.cat === 'tank' ? inst.scale ?? 1 : 1;
      const hpx = d.h * scale * unit;
      const wpx = (d.w / maxW) * baseD;
      const widthAbove = i < rocket.length - 1 ? (PARTS[rocket[i + 1].defId].w / maxW) * baseD : wpx;
      drawPart(ctx, d, inst, cx, y, hpx, wpx, widthAbove, unit);
      slots.push({ uid: inst.uid, defId: inst.defId, yTop: y, yBot: y + hpx, w: wpx, cx });
      y += hpx;
    }
    slotsRef.current = slots;

    // selection outline
    if (selected) {
      const s = slots.find((s) => s.uid === selected);
      if (s) {
        ctx.strokeStyle = '#39c0d6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(s.cx - s.w / 2 - 4, s.yTop - 3, s.w + 8, s.yBot - s.yTop + 6);
        ctx.setLineDash([]);
      }
    }
  }, [rocket, selected]);

  function handlePick(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hit = slotsRef.current.find((s) => y >= s.yTop - 6 && y <= s.yBot + 6);
    if (hit) onPick(hit.uid);
  }

  return <canvas ref={canvasRef} onPointerDown={handlePick} className="h-full w-full touch-none" style={{ display: 'block' }} />;
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  d: ReturnType<() => (typeof PARTS)[string]> | (typeof PARTS)[string],
  inst: PartInstance,
  cx: number,
  yTop: number,
  hpx: number,
  wpx: number,
  widthAbove: number,
  unit: number,
) {
  const def = d as (typeof PARTS)[string];
  const left = cx - wpx / 2;

  if (def.cat === 'engine') {
    // engine block + nozzle bells (cluster). nozzles overhang below.
    ctx.fillStyle = '#3a4048';
    ctx.fillRect(left + wpx * 0.08, yTop, wpx * 0.84, hpx * 0.55);
    const n = inst.engines ?? 1;
    const bellH = hpx * 0.55 + unit * 0.32;
    const bellTop = yTop + hpx * 0.45;
    ctx.fillStyle = '#52585f';
    const positions: number[] = [];
    if (n === 1) positions.push(cx);
    else {
      // center + ring
      const ring = n - 1;
      positions.push(cx);
      for (let k = 0; k < ring; k++) {
        const a = (k / ring) * Math.PI * 2;
        positions.push(cx + Math.cos(a) * wpx * 0.3);
      }
    }
    const bw = Math.min(wpx * 0.34, (wpx * 0.9) / Math.max(1, Math.ceil(Math.sqrt(n))));
    for (const px of positions) {
      ctx.beginPath();
      ctx.moveTo(px - bw * 0.28, bellTop);
      ctx.lineTo(px + bw * 0.28, bellTop);
      ctx.lineTo(px + bw * 0.5, bellTop + bellH);
      ctx.lineTo(px - bw * 0.5, bellTop + bellH);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (def.cat === 'tank') {
    const fill = (def.color || '#e6e8ec') as string;
    const grad = ctx.createLinearGradient(left, 0, left + wpx, 0);
    grad.addColorStop(0, '#9aa4ad');
    grad.addColorStop(0.5, fill);
    grad.addColorStop(1, '#8a949d');
    ctx.fillStyle = grad;
    roundRect(ctx, left, yTop, wpx, hpx, Math.min(8, wpx * 0.12));
    ctx.fill();
    // fuel level hint (dark blue lower portion)
    ctx.fillStyle = 'rgba(40,90,150,0.25)';
    roundRect(ctx, left + 2, yTop + hpx * 0.12, wpx - 4, hpx * 0.86, 4);
    ctx.fill();
    // seams
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, yTop + hpx * 0.5);
    ctx.lineTo(left + wpx, yTop + hpx * 0.5);
    ctx.stroke();
    return;
  }

  if (def.cat === 'structural') {
    // tapered interstage between this width and the one above
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(cx - widthAbove / 2, yTop);
    ctx.lineTo(cx + widthAbove / 2, yTop);
    ctx.lineTo(left + wpx, yTop + hpx);
    ctx.lineTo(left, yTop + hpx);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (def.cat === 'fairing') {
    // clamshell shroud with ogive nose
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(cx, yTop);
    ctx.quadraticCurveTo(left, yTop + hpx * 0.35, left, yTop + hpx);
    ctx.lineTo(left + wpx, yTop + hpx);
    ctx.quadraticCurveTo(left + wpx, yTop + hpx * 0.35, cx, yTop);
    ctx.closePath();
    ctx.fill();
    // split line
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(cx, yTop);
    ctx.lineTo(cx, yTop + hpx);
    ctx.stroke();
    return;
  }

  if (def.cat === 'payload') {
    if (def.crew) {
      // capsule cone
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(cx, yTop);
      ctx.lineTo(left + wpx, yTop + hpx);
      ctx.lineTo(left, yTop + hpx);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a2228';
      ctx.fillRect(cx - wpx * 0.12, yTop + hpx * 0.55, wpx * 0.24, hpx * 0.18); // window band
    } else {
      // satellite body + solar wings
      ctx.fillStyle = def.color;
      ctx.fillRect(cx - wpx * 0.22, yTop + hpx * 0.1, wpx * 0.44, hpx * 0.8);
      ctx.fillStyle = '#2b5a7a';
      ctx.fillRect(left, yTop + hpx * 0.3, wpx * 0.26, hpx * 0.4);
      ctx.fillRect(left + wpx * 0.74, yTop + hpx * 0.3, wpx * 0.26, hpx * 0.4);
    }
    return;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
