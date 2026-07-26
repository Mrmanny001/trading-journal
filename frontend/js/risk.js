(function () {
  if (!Auth.requireAuth()) return;

  const balanceEl = document.getElementById('account-balance');
  const riskModeToggle = document.getElementById('risk-mode-toggle');
  const riskValueEl = document.getElementById('risk-value');
  const riskValueLabel = document.getElementById('risk-value-label');
  const stopPipsEl = document.getElementById('stop-pips');
  const lotTypeEl = document.getElementById('lot-type');
  const pipValueEl = document.getElementById('pip-value');

  const outLots = document.getElementById('out-lots');
  const outUnits = document.getElementById('out-units');
  const outRiskAmount = document.getElementById('out-risk-amount');
  const outPipValue = document.getElementById('out-pip-value');

  let riskMode = 'percent';

  const LOT_LABELS = { 100000: 'standard lots', 10000: 'mini lots', 1000: 'micro lots' };

  riskModeToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    riskMode = btn.dataset.value;
    [...riskModeToggle.children].forEach((b) => b.classList.toggle('active', b === btn));
    riskValueLabel.textContent = riskMode === 'percent' ? 'Risk %' : 'Risk amount ($)';
    riskValueEl.placeholder = riskMode === 'percent' ? '1' : '100';
    calculatePositionSize();
  });

  [balanceEl, riskValueEl, stopPipsEl, lotTypeEl, pipValueEl].forEach((el) => {
    el.addEventListener('input', calculatePositionSize);
    el.addEventListener('change', calculatePositionSize);
  });

  function calculatePositionSize() {
    const balance = parseFloat(balanceEl.value);
    const riskValue = parseFloat(riskValueEl.value);
    const stopPips = parseFloat(stopPipsEl.value);
    const lotUnits = parseFloat(lotTypeEl.value);
    const pipValueStandard = parseFloat(pipValueEl.value);

    if (![balance, riskValue, stopPips, lotUnits, pipValueStandard].every((v) => isFinite(v) && v > 0)) {
      outLots.textContent = '—';
      outUnits.textContent = '—';
      outRiskAmount.textContent = '—';
      outPipValue.textContent = '—';
      return;
    }

    const riskAmount = riskMode === 'percent' ? balance * (riskValue / 100) : riskValue;
    const standardLots = riskAmount / (stopPips * pipValueStandard);
    const units = standardLots * 100000;
    const displayLots = units / lotUnits;
    const pipValueAtSize = pipValueStandard * standardLots;

    outLots.textContent = `${displayLots.toFixed(2)} ${LOT_LABELS[lotUnits]}`;
    outUnits.textContent = Math.round(units).toLocaleString();
    outRiskAmount.textContent = `$${riskAmount.toFixed(2)}`;
    outPipValue.textContent = `$${pipValueAtSize.toFixed(2)} / pip`;
  }

  // Quick R:R calculator
  const qrrEntry = document.getElementById('qrr-entry');
  const qrrStop = document.getElementById('qrr-stop');
  const qrrTarget = document.getElementById('qrr-target');
  const qrrOut = document.getElementById('qrr-out');

  [qrrEntry, qrrStop, qrrTarget].forEach((el) => el.addEventListener('input', calculateQuickRR));

  function calculateQuickRR() {
    const entry = parseFloat(qrrEntry.value);
    const stop = parseFloat(qrrStop.value);
    const target = parseFloat(qrrTarget.value);

    if (!isFinite(entry) || !isFinite(stop) || !isFinite(target) || entry === stop) {
      qrrOut.textContent = '—';
      qrrOut.style.color = 'var(--yellow-soft)';
      return;
    }

    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    const rr = reward / risk;
    qrrOut.textContent = `1 : ${rr.toFixed(2)}`;
    qrrOut.style.color = rr >= 2 ? 'var(--green)' : rr >= 1 ? 'var(--yellow-soft)' : 'var(--red)';
  }

  calculatePositionSize();
  calculateQuickRR();
})();
