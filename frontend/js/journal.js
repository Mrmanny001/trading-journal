(function () {
  if (!Auth.requireAuth()) return;

  let allTrades = [];
  let activeFilter = 'all';
  let searchTerm = '';

  const tableWrap = document.getElementById('table-wrap');
  const modal = document.getElementById('trade-modal');
  const form = document.getElementById('trade-form');
  const modalTitle = document.getElementById('modal-title');
  const formError = document.getElementById('form-error');
  const saveBtn = document.getElementById('save-trade-btn');
  const directionToggle = document.getElementById('direction-toggle');

  let currentDirection = 'long';

  init();

  async function init() {
    document.getElementById('add-trade-btn').addEventListener('click', () => openModal());
    document.getElementById('modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.getElementById('outcome-filters').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      document.querySelectorAll('#outcome-filters .filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderTable();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toUpperCase();
      renderTable();
    });

    directionToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      currentDirection = btn.dataset.value;
      [...directionToggle.children].forEach((b) => b.classList.toggle('active', b === btn));
      updatePreview();
    });

    ['entry', 'stopLoss', 'takeProfit', 'exitPrice'].forEach((id) => {
      document.getElementById(id).addEventListener('input', updatePreview);
    });

    form.addEventListener('submit', handleSubmit);

    await loadTrades();
  }

  async function loadTrades() {
    tableWrap.innerHTML = `<div class="empty-state"><div class="empty-state-title">Loading…</div></div>`;
    try {
      const { trades } = await Api.get('/api/journal');
      allTrades = trades;
      renderTable();
    } catch (err) {
      showToast(err.message, 'error');
      tableWrap.innerHTML = `<div class="empty-state"><div class="empty-state-title">Couldn't load your journal</div></div>`;
    }
  }

  function renderTable() {
    let rows = allTrades;
    if (activeFilter !== 'all') {
      rows = rows.filter((t) => t.outcome === activeFilter);
    }
    if (searchTerm) {
      rows = rows.filter((t) => t.pair.includes(searchTerm));
    }

    if (rows.length === 0) {
      tableWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">${allTrades.length === 0 ? 'No trades logged yet' : 'No trades match this filter'}</div>
          <div class="empty-state-text">${allTrades.length === 0 ? 'Log your first trade to start building your track record.' : 'Try a different filter or search term.'}</div>
        </div>`;
      return;
    }

    tableWrap.innerHTML = `
      <table class="trade-table">
        <thead>
          <tr>
            <th>Pair</th>
            <th>Entry</th>
            <th>Stop</th>
            <th>Target</th>
            <th>Planned R:R</th>
            <th>Result</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join('')}
        </tbody>
      </table>`;

    tableWrap.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openModal(allTrades.find((t) => t.id === btn.dataset.edit)));
    });
    tableWrap.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteTrade(btn.dataset.delete));
    });
  }

  function rowHtml(t) {
    const badgeClass = { win: 'badge-win', loss: 'badge-loss', open: 'badge-open', breakeven: 'badge-breakeven' }[t.outcome];
    const resultText = t.outcome === 'open' ? 'Open' : t.outcome === 'breakeven' ? 'Breakeven' : `${t.realizedR > 0 ? '+' : ''}${t.realizedR}R`;
    const dateStr = new Date(t.date || t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>
          <div class="pair-cell">
            <span class="direction-dot ${t.direction}"></span>
            <span class="mono">${t.pair}</span>
          </div>
        </td>
        <td class="mono">${t.entry}</td>
        <td class="mono">${t.stopLoss}</td>
        <td class="mono">${t.takeProfit ?? '—'}</td>
        <td class="mono">${t.plannedRR ?? '—'}</td>
        <td><span class="badge ${badgeClass}">${resultText}</span></td>
        <td>${dateStr}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${t.id}" aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-delete="${t.id}" aria-label="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function openModal(trade) {
    form.reset();
    formError.textContent = '';
    document.getElementById('trade-id').value = trade ? trade.id : '';
    modalTitle.textContent = trade ? 'Edit trade' : 'Log a trade';

    currentDirection = trade ? trade.direction : 'long';
    [...directionToggle.children].forEach((b) => b.classList.toggle('active', b.dataset.value === currentDirection));

    document.getElementById('pair').value = trade ? trade.pair : '';
    document.getElementById('entry').value = trade ? trade.entry : '';
    document.getElementById('stopLoss').value = trade ? trade.stopLoss : '';
    document.getElementById('takeProfit').value = trade && trade.takeProfit !== null ? trade.takeProfit : '';
    document.getElementById('exitPrice').value = trade && trade.exitPrice !== null ? trade.exitPrice : '';
    document.getElementById('notes').value = trade ? trade.notes : '';
    document.getElementById('date').value = (trade ? new Date(trade.date) : new Date()).toISOString().slice(0, 10);

    updatePreview();
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  function updatePreview() {
    const entry = parseFloat(document.getElementById('entry').value);
    const stop = parseFloat(document.getElementById('stopLoss').value);
    const target = parseFloat(document.getElementById('takeProfit').value);
    const exit = parseFloat(document.getElementById('exitPrice').value);
    const sign = currentDirection === 'short' ? -1 : 1;

    const riskEl = document.getElementById('preview-risk');
    const rrEl = document.getElementById('preview-rr');
    const realizedEl = document.getElementById('preview-realized');

    if (!isFinite(entry) || !isFinite(stop) || entry === stop) {
      riskEl.textContent = '—';
      rrEl.textContent = '—';
      realizedEl.textContent = '—';
      return;
    }

    const risk = Math.abs(entry - stop);
    riskEl.textContent = risk.toPrecision(4);

    if (isFinite(target)) {
      const reward = Math.abs(target - entry);
      rrEl.textContent = (reward / risk).toFixed(2);
    } else {
      rrEl.textContent = '—';
    }

    if (isFinite(exit)) {
      const realizedR = ((exit - entry) * sign) / risk;
      realizedEl.textContent = `${realizedR > 0 ? '+' : ''}${realizedR.toFixed(2)}`;
      realizedEl.style.color = realizedR > 0.05 ? 'var(--green)' : realizedR < -0.05 ? 'var(--red)' : 'var(--text-muted)';
    } else {
      realizedEl.textContent = '—';
      realizedEl.style.color = 'var(--yellow-soft)';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    formError.textContent = '';

    const id = document.getElementById('trade-id').value;
    const payload = {
      pair: document.getElementById('pair').value.trim(),
      direction: currentDirection,
      entry: document.getElementById('entry').value,
      stopLoss: document.getElementById('stopLoss').value,
      takeProfit: document.getElementById('takeProfit').value,
      exitPrice: document.getElementById('exitPrice').value,
      date: document.getElementById('date').value ? new Date(document.getElementById('date').value).toISOString() : undefined,
      notes: document.getElementById('notes').value,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      if (id) {
        await Api.put(`/api/journal/${id}`, payload);
        showToast('Trade updated.');
      } else {
        await Api.post('/api/journal', payload);
        showToast('Trade logged.');
      }
      closeModal();
      await loadTrades();
    } catch (err) {
      formError.textContent = err.message;
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save trade';
    }
  }

  async function deleteTrade(id) {
    if (!confirm('Delete this trade? This can\'t be undone.')) return;
    try {
      await Api.delete(`/api/journal/${id}`);
      showToast('Trade deleted.');
      await loadTrades();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
})();
