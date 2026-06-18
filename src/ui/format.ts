// SI / engineering number formatting helpers for the instrument panels.

const NF = (d: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Fixed-decimal with thousands separators. */
export function num(v: number, d = 0): string {
  if (!isFinite(v)) return '—';
  return NF(d).format(v);
}

/** Altitude/length: meters -> km with 1 decimal (or m below 1 km). */
export function dist(m: number): string {
  if (!isFinite(m)) return '—';
  const km = m / 1000;
  if (Math.abs(km) >= 1000) return `${num(km, 0)} km`;
  if (Math.abs(km) >= 1) return `${num(km, 1)} km`;
  return `${num(m, 0)} m`;
}

/** Speed in m/s (with km/s above 1000). */
export function speed(ms: number): string {
  if (!isFinite(ms)) return '—';
  if (Math.abs(ms) >= 1000) return `${num(ms / 1000, 3)} km/s`;
  return `${num(ms, 0)} m/s`;
}

/** Pressure Pa -> kPa. */
export function pressure(pa: number): string {
  return `${num(pa / 1000, 1)} kPa`;
}

/** Mass kg -> t (tonnes) above 1000 kg. */
export function mass(kg: number): string {
  if (kg >= 1000) return `${num(kg / 1000, 1)} t`;
  return `${num(kg, 0)} kg`;
}

/** Mission elapsed time -> T+HH:MM:SS (or T- before launch). */
export function clock(t: number): string {
  const neg = t < 0;
  const s = Math.abs(Math.floor(t));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${neg ? 'T-' : 'T+'}${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export function deg(rad: number): string {
  return `${num((rad * 180) / Math.PI, 1)}°`;
}

export function pct(frac: number, d = 0): string {
  return `${num(frac * 100, d)}%`;
}

export function dv(ms: number): string {
  return `${num(ms, 0)} m/s`;
}
