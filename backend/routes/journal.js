const crypto = require('crypto');
const store = require('../lib/store');
const { sendJson } = require('../lib/http-utils');

function round(n, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Given raw trade input, compute risk, reward, planned R:R, and (if closed) realized R.
function computeTrade(input) {
  const entry = Number(input.entry);
  const stopLoss = Number(input.stopLoss);
  const takeProfit = input.takeProfit !== undefined && input.takeProfit !== '' && input.takeProfit !== null
    ? Number(input.takeProfit)
    : null;
  const exitPrice = input.exitPrice !== undefined && input.exitPrice !== '' && input.exitPrice !== null
    ? Number(input.exitPrice)
    : null;
  const direction = input.direction === 'short' ? 'short' : 'long';
  const sign = direction === 'short' ? -1 : 1;

  const riskPerUnit = Math.abs(entry - stopLoss);
  const rewardPerUnit = takeProfit !== null ? Math.abs(takeProfit - entry) : null;
  const plannedRR = riskPerUnit > 0 && rewardPerUnit !== null ? rewardPerUnit / riskPerUnit : null;

  let realizedR = null;
  let outcome = 'open';
  if (exitPrice !== null && riskPerUnit > 0) {
    const pnlUnits = (exitPrice - entry) * sign;
    realizedR = pnlUnits / riskPerUnit;
    if (realizedR > 0.05) outcome = 'win';
    else if (realizedR < -0.05) outcome = 'loss';
    else outcome = 'breakeven';
  }

  return {
    entry,
    stopLoss,
    takeProfit,
    exitPrice,
    direction,
    riskPerUnit: round(riskPerUnit, 5),
    plannedRR: round(plannedRR, 2),
    realizedR: round(realizedR, 2),
    outcome,
  };
}

function validateTradeInput(input) {
  if (!input.pair || typeof input.pair !== 'string') return 'A pair or symbol is required.';
  if (input.entry === undefined || input.entry === '' || Number.isNaN(Number(input.entry))) {
    return 'Entry price is required.';
  }
  if (input.stopLoss === undefined || input.stopLoss === '' || Number.isNaN(Number(input.stopLoss))) {
    return 'Stop loss is required.';
  }
  if (Number(input.entry) === Number(input.stopLoss)) {
    return 'Entry and stop loss cannot be equal.';
  }
  return null;
}

async function listTrades(req, res, { user }) {
  const db = store.readDb();
  const trades = db.trades
    .filter((t) => t.userId === user.id)
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  return sendJson(res, 200, { trades });
}

async function createTrade(req, res, { user, body }) {
  const err = validateTradeInput(body);
  if (err) return sendJson(res, 400, { error: err });

  const computed = computeTrade(body);
  const trade = {
    id: crypto.randomUUID(),
    userId: user.id,
    pair: body.pair.trim().toUpperCase(),
    notes: (body.notes || '').trim(),
    date: body.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...computed,
  };

  await store.update((db) => {
    db.trades.push(trade);
  });

  return sendJson(res, 201, { trade });
}

async function updateTrade(req, res, { user, body, params }) {
  const id = params.id;
  let updated = null;
  let notFound = false;

  await store.update((db) => {
    const idx = db.trades.findIndex((t) => t.id === id && t.userId === user.id);
    if (idx === -1) {
      notFound = true;
      return;
    }
    const merged = { ...db.trades[idx], ...body };
    const err = validateTradeInput(merged);
    if (err) {
      updated = { error: err };
      return;
    }
    const computed = computeTrade(merged);
    db.trades[idx] = {
      ...db.trades[idx],
      ...merged,
      ...computed,
      pair: (merged.pair || db.trades[idx].pair).trim().toUpperCase(),
    };
    updated = { trade: db.trades[idx] };
  });

  if (notFound) return sendJson(res, 404, { error: 'Trade not found.' });
  if (updated.error) return sendJson(res, 400, { error: updated.error });
  return sendJson(res, 200, updated);
}

async function deleteTrade(req, res, { user, params }) {
  const id = params.id;
  let found = false;
  await store.update((db) => {
    const before = db.trades.length;
    db.trades = db.trades.filter((t) => !(t.id === id && t.userId === user.id));
    found = db.trades.length < before;
  });
  if (!found) return sendJson(res, 404, { error: 'Trade not found.' });
  return sendJson(res, 200, { ok: true });
}

module.exports = { listTrades, createTrade, updateTrade, deleteTrade, computeTrade };
