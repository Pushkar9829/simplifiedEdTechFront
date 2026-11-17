import { useCallback, useEffect, useState } from 'react';
import { getFxRates } from '../api';
import { useAuth } from '../context/AuthContext';
import { money } from './format';

/*
 * Catalog prices still show in the tutor's listing currency, with an ≈ amount in the
 * viewer's preferred currency. Issued invoices are charged in the payer's preferred
 * currency (see backend charge.js); this helper is for on-screen quotes and wallet FX.
 */

let cache = null;
let inflight = null;
const listeners = new Set();

function loadFx() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = getFxRates()
      .then((data) => {
        cache = data || null;
        listeners.forEach((fn) => fn(cache));
        return cache;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

/** Replace the cached rates (e.g. after an admin saves new ones). */
export function setFxCache(next) {
  cache = next || null;
  inflight = null;
  listeners.forEach((fn) => fn(cache));
}

export function useFxRates() {
  const [rates, setRates] = useState(cache);
  useEffect(() => {
    listeners.add(setRates);
    if (!cache && localStorage.getItem('ibdp_token')) loadFx().catch(() => {});
    return () => listeners.delete(setRates);
  }, []);
  return rates;
}

export function convertAmount(amount, from, to, rates) {
  const q = rates?.quotes || {};
  const a = Number(q[String(from || '').toUpperCase()]);
  const b = Number(q[String(to || '').toUpperCase()]);
  if (!a || !b) return null;
  return (Number(amount || 0) / a) * b;
}

function roughMoney(amount, currency) {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

/** The viewer's preferred display currency ('' when unset). */
export function usePreferredCurrency() {
  const { user, profile } = useAuth();
  return String(user?.preferredCurrency || profile?.preferredCurrency || '').toUpperCase();
}

/**
 * const fmt = useDisplayMoney();
 * const { primary, approx } = fmt(1200, 'INR'); // primary "₹1,200.00", approx "≈ $14" or ''
 */
export function useDisplayMoney() {
  const preferred = usePreferredCurrency();
  const rates = useFxRates();
  return useCallback(
    (amount, currency) => {
      const primary = money(amount, currency);
      const from = String(currency || '').toUpperCase();
      if (!preferred || !from || preferred === from || !rates || !(Number(amount) > 0)) {
        return { primary, approx: '' };
      }
      const converted = convertAmount(amount, from, preferred, rates);
      return { primary, approx: converted == null ? '' : `≈ ${roughMoney(converted, preferred)}` };
    },
    [preferred, rates]
  );
}
