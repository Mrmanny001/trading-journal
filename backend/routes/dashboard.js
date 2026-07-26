const store = require('../lib/store');
const { sendJson } = require('../lib/http-utils');

function round(n, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

async function getStats(req, res, { user }) {
  const db = store.readDb();
  const trades = db.trades.filter((t) => t.userId === user.id);

  const closed = trades.filter((t) => t.outcome !== 'open');
  const wins = closed.filter((t) => t.outcome === 'win');
  const losses = closed.filter((t) => t.outcome === 'loss');
  const open = trades.filter((t) => t.outcome === 'open');

  const totalR = closed.reduce((sum, t) => sum + (t.realizedR || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const plannedRRs = trades.map((t) => t.plannedRR).filter((v) => v !== null && v !== undefined);
  const avgPlannedRR = plannedRRs.length ? plannedRRs.reduce((a, b) => a + b, 0) / plannedRRs.length : 0;

  const avgWinR = wins.length ? wins.reduce((s, t) => s + t.realizedR, 0) / wins.length : 0;
  const avgLossR = losses.length ? losses.reduce((s, t) => s + t.realizedR, 0) / losses.length : 0;

  // Equity curve as cumulative R, sorted chronologically.
  const sortedClosed = [...closed].sort(
    (a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
  );
  let running = 0;
  const equityCurve = sortedClosed.map((t) => {
    running += t.realizedR || 0;
    return { date: t.date || t.createdAt, cumulativeR: round(running, 2) };
  });

  const pairCounts = {};
  trades.forEach((t) => {
    pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
  });
  const topPairs = Object.entries(pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => ({ pair, count }));

  return sendJson(res, 200, {
    stats: {
      totalTrades: trades.length,
      openTrades: open.length,
      closedTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: round(winRate, 1),
      totalR: round(totalR, 2),
      avgPlannedRR: round(avgPlannedRR, 2),
      avgWinR: round(avgWinR, 2),
      avgLossR: round(avgLossR, 2),
      equityCurve,
      topPairs,
    },
  });
}

module.exports = { getStats };
