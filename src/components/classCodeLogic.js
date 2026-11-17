/* Decision #1 windows (mirrors the API): START 15 min before → 30 min after start; END midpoint → 2 h after end. */
export function codeWindows(b) {
  const start = new Date(b.startAt).getTime();
  const end = new Date(b.endAt || b.startAt).getTime();
  const fromApi = b.classProof || {};
  return {
    start: {
      opensAt: new Date(fromApi.start?.opensAt || start - 15 * 60000).getTime(),
      closesAt: new Date(fromApi.start?.closesAt || start + 30 * 60000).getTime(),
    },
    end: {
      opensAt: new Date(fromApi.end?.opensAt || start + (end - start) / 2).getTime(),
      closesAt: new Date(fromApi.end?.closesAt || end + 120 * 60000).getTime(),
    },
  };
}

/** Which code is next for this booking: { phase, state: waiting|open|closed|done, opensAt, closesAt }. */
export function nextCode(b, now = Date.now()) {
  const proof = b?.classProof || {};
  if (!b || b.status === 'cancelled' || b.status === 'completed') return { phase: null, state: 'done' };
  if (proof.override) return { phase: null, state: 'done', override: true };
  const w = codeWindows(b);
  const phase = !proof.startVerifiedAt ? 'start' : !proof.endVerifiedAt ? 'end' : null;
  if (!phase) return { phase: null, state: 'done' };
  const { opensAt, closesAt } = w[phase];
  const state = now < opensAt ? 'waiting' : now > closesAt ? 'closed' : 'open';
  return { phase, state, opensAt, closesAt };
}

/** Booking that should show a code card now (open window, or opening within `leadMin`). */
export function pickCodeBooking(items = [], leadMin = 60, now = Date.now()) {
  return (
    items
      .filter((b) => b && b.status !== 'cancelled' && b.status !== 'completed')
      .map((b) => ({ b, n: nextCode(b, now) }))
      .filter(({ n }) => n.phase && (n.state === 'open' || (n.state === 'waiting' && n.opensAt - now <= leadMin * 60000)))
      .sort((x, y) => new Date(x.b.startAt) - new Date(y.b.startAt))[0]?.b || null
  );
}

