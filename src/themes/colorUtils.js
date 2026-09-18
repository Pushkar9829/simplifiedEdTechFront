/** HSL / color helpers for ERP theme builders */

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function hsl(h, s, l, a = 1) {
  const hh = ((h % 360) + 360) % 360;
  if (a >= 1) return `hsl(${hh} ${s}% ${l}%)`;
  return `hsl(${hh} ${s}% ${l}% / ${a})`;
}

export function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbCss({ r, g, b }, a = 1) {
  if (a >= 1) return `rgb(${r} ${g} ${b})`;
  return `rgb(${r} ${g} ${b} / ${a})`;
}

export function accentFromHue(hue, sat = 85, light = 52) {
  return hsl(hue, sat, light);
}

export function mixWhite(rgb, amount) {
  const a = clamp(amount, 0, 1);
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * a),
    g: Math.round(rgb.g + (255 - rgb.g) * a),
    b: Math.round(rgb.b + (255 - rgb.b) * a),
  };
}

export function mixBlack(rgb, amount) {
  const a = clamp(amount, 0, 1);
  return {
    r: Math.round(rgb.r * (1 - a)),
    g: Math.round(rgb.g * (1 - a)),
    b: Math.round(rgb.b * (1 - a)),
  };
}
