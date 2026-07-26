(async function () {
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();
  const greetingEl = document.getElementById('greeting');
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'there').split(' ')[0];
  greetingEl.textContent = `${timeGreeting}, ${firstName}`;

  // Refresh user info in the background in case it changed elsewhere.
  Api.get('/api/auth/me')
    .then(({ user: fresh }) => Auth.setSession(Auth.getToken(), fresh))
    .catch(() => {});

  const statGrid = document.getElementById('stat-grid');
  const chartWrap = document.getElementById('equity-chart-wrap');
  const pairsWrap = document.getElementById('top-pairs');

  try {
    const { stats } = await Api.get('/api/dashboard/stats');
    renderStats(stats);
    renderEquityChart(stats.equityCurve);
    renderTopPairs(stats.topPairs, stats.totalTrades);
  } catch (err) {
    showToast(err.message, 'error');
  }

  function renderStats(stats) {
    const rClass = stats.totalR > 0 ? 'positive' : stats.totalR < 0 ? 'negative' : '';
    const cards = [
      {
        label: 'Total R',
        value: `${stats.totalR > 0 ? '+' : ''}${stats.totalR.toFixed(2)}R`,
        cls: rClass,
        sub: `${stats.closedTrades} closed trade${stats.closedTrades === 1 ? '' : 's'}`,
      },
      {
        label: 'Win rate',
        value: `${stats.winRate.toFixed(1)}%`,
        cls: '',
        sub: `${stats.wins}W · ${stats.losses}L`,
      },
      {
        label: 'Avg planned R:R',
        value: `${stats.avgPlannedRR.toFixed(2)}`,
        cls: '',
        sub: 'Across all logged trades',
      },
      {
        label: 'Total trades',
        value: `${stats.totalTrades}`,
        cls: '',
        sub: `${stats.openTrades} open`,
      },
    ];

    statGrid.innerHTML = cards
      .map(
        (c) => `
      <div class="glass-panel stat-card">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value ${c.cls}">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`
      )
      .join('');
  }

  function renderEquityChart(curve) {
    if (!curve || curve.length < 2) {
      chartWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Not enough data yet</div>
          <div class="empty-state-text">Close a couple of trades and your equity curve will show up here.</div>
        </div>`;
      return;
    }

    const values = curve.map((p) => p.cumulativeR);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;
    const w = 560;
    const h = 200;
    const pad = 10;

    const points = curve.map((p, i) => {
      const x = (i / (curve.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((p.cumulativeR - min) / range) * (h - pad * 2);
      return [x, y];
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
    const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${zeroY.toFixed(1)} L${points[0][0].toFixed(1)},${zeroY.toFixed(1)} Z`;

    const last = values[values.length - 1];
    const lineColor = last >= 0 ? '#35d48b' : '#f0685f';

    chartWrap.innerHTML = `
      <svg class="equity-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line x1="${pad}" y1="${zeroY.toFixed(1)}" x2="${w - pad}" y2="${zeroY.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4 4" />
        <path d="${areaPath}" fill="${lineColor}" opacity="0.08" stroke="none" />
        <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </svg>`;
  }

  function renderTopPairs(pairs, total) {
    if (!pairs || pairs.length === 0) {
      pairsWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No trades yet</div>
          <div class="empty-state-text">Log your first trade to see your most active pairs.</div>
        </div>`;
      return;
    }
    const max = Math.max(...pairs.map((p) => p.count));
    pairsWrap.innerHTML = pairs
      .map(
        (p) => `
      <div class="pair-row">
        <span class="mono">${p.pair}</span>
        <div class="pair-bar-track"><div class="pair-bar-fill" style="width:${(p.count / max) * 100}%"></div></div>
        <span class="mono">${p.count}</span>
      </div>`
      )
      .join('');
  }
})();
