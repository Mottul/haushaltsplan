(() => {
  'use strict';

  const STORAGE_KEY = 'haushaltsplan_data_v1';

  const RECURRENCE_LABELS = {
    none: 'Einmalig',
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    biweekly: '14-täglich',
    monthly: 'Monatlich',
    quarterly: 'Vierteljährlich',
    yearly: 'Jährlich',
  };

  const COLOR_PALETTE = [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7',
    '#64748b', '#eab308',
  ];

  const DEFAULT_CATEGORIES = [
    { name: 'Lebensmittel', icon: '🛒', color: '#10b981', type: 'expense' },
    { name: 'Wohnen / Miete', icon: '🏠', color: '#0ea5e9', type: 'expense' },
    { name: 'Energie & Wasser', icon: '💡', color: '#f59e0b', type: 'expense' },
    { name: 'Transport', icon: '🚗', color: '#6366f1', type: 'expense' },
    { name: 'Restaurant & Café', icon: '🍽️', color: '#f97316', type: 'expense' },
    { name: 'Freizeit', icon: '🎬', color: '#ec4899', type: 'expense' },
    { name: 'Kleidung', icon: '👕', color: '#8b5cf6', type: 'expense' },
    { name: 'Gesundheit', icon: '💊', color: '#ef4444', type: 'expense' },
    { name: 'Abos & Verträge', icon: '📱', color: '#14b8a6', type: 'expense' },
    { name: 'Bildung', icon: '🎓', color: '#06b6d4', type: 'expense' },
    { name: 'Versicherungen', icon: '🛡️', color: '#64748b', type: 'expense' },
    { name: 'Sparen & Anlage', icon: '💰', color: '#84cc16', type: 'expense', exclude: true },
    { name: 'Bargeld', icon: '💵', color: '#16a34a', type: 'expense' },
    { name: 'Bankgebühren', icon: '🏦', color: '#475569', type: 'expense' },
    { name: 'Spenden', icon: '❤️', color: '#e11d48', type: 'expense' },
    { name: 'Kinderbetreuung', icon: '🧸', color: '#fb923c', type: 'expense' },
    { name: 'Alimente/Unterhalt', icon: '🤝', color: '#7c3aed', type: 'expense' },
    { name: 'Tabak', icon: '🚬', color: '#a8a29e', type: 'expense' },
    { name: 'Drogerie', icon: '🧴', color: '#0891b2', type: 'expense' },
    { name: 'Haushalt & Heimwerker', icon: '🔧', color: '#ea580c', type: 'expense' },
    { name: 'Auto', icon: '🚙', color: '#4f46e5', type: 'expense' },
    { name: 'Geschenke', icon: '🎁', color: '#a855f7', type: 'expense' },
    { name: 'Sonstiges', icon: '📦', color: '#94a3b8', type: 'expense' },
    { name: 'Gehalt', icon: '💼', color: '#10b981', type: 'income' },
    { name: 'Nebeneinkommen', icon: '💵', color: '#14b8a6', type: 'income' },
    { name: 'Kapitalerträge', icon: '📈', color: '#0ea5e9', type: 'income' },
    { name: 'Erstattungen', icon: '↩️', color: '#6366f1', type: 'income' },
    { name: 'Sonstige Einnahmen', icon: '🪙', color: '#84cc16', type: 'income' },
    { name: 'Umbuchung', icon: '🔄', color: '#94a3b8', type: 'expense', exclude: true },
  ];

  let state = { entries: [], categories: [], settings: { currency: 'EUR', theme: 'auto' } };
  let donutType = 'expense';

  // ---------- Utilities ----------
  const el = (id) => document.getElementById(id);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const uid = () =>
    (crypto.randomUUID && crypto.randomUUID()) ||
    'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function parseDate(str) {
    const [y, m, d] = String(str).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  function formatMoney(amount) {
    try {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: state.settings.currency,
      }).format(amount || 0);
    } catch {
      return (amount || 0).toFixed(2) + ' ' + state.settings.currency;
    }
  }

  function currencySymbol() {
    const map = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };
    return map[state.settings.currency] || state.settings.currency;
  }

  const formatDateDisplay = (str) =>
    parseDate(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const monthLabel = (y, m) =>
    new Date(y, m, 1).toLocaleDateString('de-DE', { month: 'short' }) +
    (m === 0 || new Date(y, m, 1).getMonth() === 0 ? " '" + String(y).slice(2) : '');

  // ---------- Storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
        state.categories = Array.isArray(parsed.categories) ? parsed.categories : [];
        state.settings = Object.assign({ currency: 'EUR', theme: 'auto' }, parsed.settings || {});
        if (!state.categories.length) seedCategories();
        return;
      }
    } catch (e) {
      console.error('Laden fehlgeschlagen', e);
    }
    seedCategories();
    save();
  }

  function seedCategories() {
    state.categories = DEFAULT_CATEGORIES.map((c) => ({ id: uid(), ...c }));
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast('Speichern fehlgeschlagen — Speicher voll?');
    }
  }

  // ---------- Category helpers ----------
  const FALLBACK_CAT = { id: null, name: 'Ohne Kategorie', icon: '❓', color: '#94a3b8', type: 'expense' };
  const getCategory = (id) => state.categories.find((c) => c.id === id) || FALLBACK_CAT;

  // Eine Buchung zählt nicht in die Statistik, wenn sie explizit markiert ist
  // oder ihre Kategorie als "exclude" gilt (Umbuchung, Sparen & Anlage).
  const isExcluded = (entry) =>
    entry.excludeFromStats != null ? entry.excludeFromStats : !!getCategory(entry.categoryId).exclude;

  function ensureCategory(name, type) {
    let c = state.categories.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (c) return c;
    const def = DEFAULT_CATEGORIES.find((d) => d.name.toLowerCase() === String(name).toLowerCase());
    c = def ? { id: uid(), ...def } : { id: uid(), name, icon: '🏷️', color: '#94a3b8', type: type || 'expense' };
    state.categories.push(c);
    return c;
  }

  // ---------- Recurrence ----------
  function addMonths(d, n, anchorDay) {
    const target = d.getMonth() + n;
    d.setDate(1);
    d.setMonth(target);
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(anchorDay, dim));
  }

  function stepDate(date, recurrence, anchorDay) {
    const d = new Date(date);
    switch (recurrence) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': addMonths(d, 1, anchorDay); break;
      case 'quarterly': addMonths(d, 3, anchorDay); break;
      case 'yearly': addMonths(d, 12, anchorDay); break;
      default: d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function expandEntry(entry, rangeFrom, rangeTo) {
    const rec = entry.recurrence || 'none';
    const start = parseDate(entry.date);

    if (rec === 'none') {
      if (start >= rangeFrom && start <= rangeTo) {
        return [{ ...entry, date: entry.date }];
      }
      return [];
    }

    const out = [];
    const anchorDay = start.getDate();
    const recEnd = entry.recurrenceEnd ? parseDate(entry.recurrenceEnd) : null;
    let cur = new Date(start);
    let guard = 0;

    while (cur <= rangeTo && guard < 20000) {
      guard++;
      if (recEnd && cur > recEnd) break;
      if (cur >= rangeFrom) out.push({ ...entry, date: toISODate(cur) });
      cur = stepDate(cur, rec, anchorDay);
    }
    return out;
  }

  function getOccurrences(rangeFrom, rangeTo) {
    const result = [];
    for (const entry of state.entries) {
      for (const occ of expandEntry(entry, rangeFrom, rangeTo)) result.push(occ);
    }
    result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return result;
  }

  // ---------- Timeframe ----------
  function getTimeframe() {
    const mode = el('timeframe').value;
    const now = today();
    let from, to;

    switch (mode) {
      case 'current-month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-3-months':
        from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-6-months':
        from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-12-months':
        from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'current-year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom': {
        const f = el('range-from').value;
        const t = el('range-to').value;
        from = f ? parseDate(f) : new Date(now.getFullYear(), now.getMonth(), 1);
        to = t ? parseDate(t) : now;
        if (from > to) [from, to] = [to, from];
        break;
      }
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const { from, to } = getTimeframe();
    const occ = getOccurrences(from, to);

    let income = 0, expense = 0;
    for (const o of occ) {
      if (isExcluded(o)) continue;
      if (o.type === 'income') income += o.amount;
      else expense += o.amount;
    }
    const balance = income - expense;

    el('sum-income').textContent = formatMoney(income);
    el('sum-expense').textContent = formatMoney(expense);
    const balEl = el('sum-balance');
    balEl.textContent = formatMoney(balance);
    balEl.classList.toggle('positive', balance >= 0);
    balEl.classList.toggle('negative', balance < 0);
    el('sum-count').textContent = String(occ.length);

    renderDonut(occ);
    renderTrend(occ, from, to);
    renderComparison(income, expense);
    renderBudgets();
    renderUpcoming();
    renderTopList(occ);
    renderRecent(occ);
  }

  function renderBudgets() {
    const list = el('budget-list');
    const budgeted = state.categories.filter((c) => c.type === 'expense' && c.budget > 0);
    if (!budgeted.length) {
      list.innerHTML = '<li class="budget-empty">Noch keine Budgets. Lege beim Bearbeiten einer Ausgaben-Kategorie ein monatliches Budget fest.</li>';
      return;
    }
    const now = today();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    const occ = getOccurrences(from, to);
    const spentByCat = new Map();
    for (const o of occ) {
      if (o.type === 'expense' && !isExcluded(o)) spentByCat.set(o.categoryId, (spentByCat.get(o.categoryId) || 0) + o.amount);
    }
    const rows = budgeted
      .map((c) => {
        const spent = spentByCat.get(c.id) || 0;
        return { c, spent, pct: c.budget > 0 ? (spent / c.budget) * 100 : 0 };
      })
      .sort((a, b) => b.pct - a.pct);

    list.innerHTML = rows
      .map(({ c, spent, pct }) => {
        const cls = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
        const barW = Math.min(100, pct);
        const remaining = c.budget - spent;
        const metaText =
          remaining >= 0
            ? `${pct.toFixed(0)} % · ${esc(formatMoney(remaining))} übrig`
            : `${pct.toFixed(0)} % · ${esc(formatMoney(-remaining))} über Budget`;
        const barStyle = cls === 'ok' ? `width:${barW.toFixed(1)}%;background:${c.color}` : `width:${barW.toFixed(1)}%`;
        return `<li class="budget-item">
          <div class="budget-top">
            <span class="budget-name">${esc(c.icon)} ${esc(c.name)}</span>
            <span class="budget-figures">${esc(formatMoney(spent))} / ${esc(formatMoney(c.budget))}</span>
          </div>
          <div class="budget-track"><div class="budget-bar ${cls}" style="${barStyle}"></div></div>
          <div class="budget-meta ${cls}">${metaText}</div>
        </li>`;
      })
      .join('');
  }

  function renderUpcoming() {
    const list = el('upcoming-list');
    const now = today();
    const to = new Date(now);
    to.setDate(to.getDate() + 30);
    to.setHours(23, 59, 59, 999);
    const items = getOccurrences(now, to)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(0, 8);
    if (!items.length) {
      list.innerHTML = '<li class="upcoming-empty">Keine anstehenden Zahlungen in den nächsten 30 Tagen.</li>';
      return;
    }
    list.innerHTML = items
      .map((o) => {
        const cat = getCategory(o.categoryId);
        const sign = o.type === 'income' ? '+' : '−';
        return `<li class="upcoming-item">
          <span class="upcoming-icon" style="background:${cat.color}22">${esc(cat.icon)}</span>
          <span class="upcoming-body">
            <span class="upcoming-title">${esc(o.description)}</span>
            <span class="upcoming-date">${formatDateDisplay(o.date)}</span>
          </span>
          <span class="entry-amount ${o.type}">${sign}${esc(formatMoney(o.amount))}</span>
        </li>`;
      })
      .join('');
  }

  function renderComparison(income, expense) {
    const box = el('comparison');
    if (income <= 0 && expense <= 0) {
      box.innerHTML = '<div class="comparison-empty">Keine Daten im Zeitraum.</div>';
      return;
    }
    const max = Math.max(income, expense, 1);
    const balance = income - expense;
    const rate = income > 0 ? (balance / income) * 100 : null;
    const balClass = balance >= 0 ? 'positive' : 'negative';
    const rateText = rate === null ? '–' : `${rate >= 0 ? '' : ''}${rate.toFixed(0)} %`;

    box.innerHTML = `
      <div class="cmp-row">
        <span class="cmp-label">Einnahmen</span>
        <div class="cmp-track"><div class="cmp-bar income" style="width:${((income / max) * 100).toFixed(1)}%"></div></div>
        <span class="cmp-val income">${esc(formatMoney(income))}</span>
      </div>
      <div class="cmp-row">
        <span class="cmp-label">Ausgaben</span>
        <div class="cmp-track"><div class="cmp-bar expense" style="width:${((expense / max) * 100).toFixed(1)}%"></div></div>
        <span class="cmp-val expense">${esc(formatMoney(expense))}</span>
      </div>
      <div class="cmp-footer">
        <div class="cmp-stat"><span>Bilanz</span><strong class="${balClass}">${esc(formatMoney(balance))}</strong></div>
        <div class="cmp-stat"><span>Sparquote</span><strong class="${rate !== null && rate >= 0 ? 'positive' : rate !== null ? 'negative' : ''}">${rateText}</strong></div>
      </div>`;
  }

  function aggregateByCategory(occ, type) {
    const map = new Map();
    for (const o of occ) {
      if (o.type !== type || isExcluded(o)) continue;
      const cat = getCategory(o.categoryId);
      const key = cat.id || '__none__';
      if (!map.has(key)) map.set(key, { name: cat.name, color: cat.color, icon: cat.icon, value: 0 });
      map.get(key).value += o.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }

  function renderDonut(occ) {
    const segments = aggregateByCategory(occ, donutType);
    const container = el('donut-chart');
    const legend = el('donut-legend');
    const label = donutType === 'expense' ? 'Ausgaben' : 'Einnahmen';

    if (!segments.length) {
      container.innerHTML = `<div class="donut-empty">Keine ${label.toLowerCase()}<br>im Zeitraum</div>`;
      legend.innerHTML = '';
      return;
    }

    const r = 80, cx = 100, cy = 100, sw = 28;
    const C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0);
    const track = cssVar('--bg-subtle') || '#f1f5f9';

    let offset = 0;
    let circles = '';
    for (const seg of segments) {
      const frac = total ? seg.value / total : 0;
      const len = frac * C;
      const pct = (frac * 100).toFixed(1);
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" data-name="${esc(seg.icon + ' ' + seg.name)}" data-sub="${esc(formatMoney(seg.value) + ' · ' + pct + '%')}"/>`;
      offset += len;
    }

    container.innerHTML = `
      <svg viewBox="0 0 200 200" role="img" aria-label="${label} nach Kategorie">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
        ${circles}
      </svg>
      <div class="donut-center">
        <div class="donut-total">${esc(formatMoney(total))}</div>
        <div class="donut-label">${label}</div>
      </div>`;

    legend.innerHTML = segments
      .map((s) => {
        const pct = total ? ((s.value / total) * 100).toFixed(1) : '0.0';
        return `<li>
          <span class="legend-swatch" style="background:${s.color}"></span>
          <span class="legend-name">${esc(s.icon)} ${esc(s.name)}</span>
          <span><span class="legend-amount">${esc(formatMoney(s.value))}</span> <span class="legend-pct">${pct}%</span></span>
        </li>`;
      })
      .join('');
  }

  function renderTrend(occ, from, to) {
    const container = el('trend-chart');

    const buckets = [];
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end && buckets.length < 24) {
      buckets.push({ y: cur.getFullYear(), m: cur.getMonth(), income: 0, expense: 0 });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    for (const o of occ) {
      if (isExcluded(o)) continue;
      const d = parseDate(o.date);
      const b = buckets.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
      if (!b) continue;
      if (o.type === 'income') b.income += o.amount;
      else b.expense += o.amount;
    }

    const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)));
    const hasData = buckets.some((b) => b.income > 0 || b.expense > 0);

    if (!hasData) {
      container.innerHTML = '<div class="trend-empty">Keine Daten im Zeitraum</div>';
      return;
    }

    const W = Math.max(280, container.clientWidth || 560);
    const H = 240;
    const padT = 14, padB = 28, padX = 6;
    const plotH = H - padT - padB;
    const plotW = W - padX * 2;
    const groupW = plotW / buckets.length;
    const barGap = Math.min(6, groupW * 0.08);
    const barW = Math.max(3, (groupW - barGap * 3) / 2);

    const incomeColor = cssVar('--income') || '#10b981';
    const expenseColor = cssVar('--expense') || '#ef4444';
    const axis = cssVar('--text-subtle') || '#94a3b8';
    const grid = cssVar('--border') || '#e2e8f0';

    let bars = '';
    let labels = '';
    const baseY = padT + plotH;

    buckets.forEach((b, i) => {
      const gx = padX + i * groupW;
      const incH = (b.income / maxVal) * plotH;
      const expH = (b.expense / maxVal) * plotH;
      const x1 = gx + groupW / 2 - barW - barGap / 2;
      const x2 = gx + groupW / 2 + barGap / 2;

      if (b.income > 0)
        bars += `<rect x="${x1.toFixed(1)}" y="${(baseY - incH).toFixed(1)}" width="${barW.toFixed(1)}" height="${incH.toFixed(1)}" rx="2" fill="${incomeColor}" data-name="${esc(monthLabel(b.y, b.m) + ' · Einnahmen')}" data-sub="${esc(formatMoney(b.income))}" aria-label="${esc(monthLabel(b.y, b.m) + ' Einnahmen ' + formatMoney(b.income))}"/>`;
      if (b.expense > 0)
        bars += `<rect x="${x2.toFixed(1)}" y="${(baseY - expH).toFixed(1)}" width="${barW.toFixed(1)}" height="${expH.toFixed(1)}" rx="2" fill="${expenseColor}" data-name="${esc(monthLabel(b.y, b.m) + ' · Ausgaben')}" data-sub="${esc(formatMoney(b.expense))}" aria-label="${esc(monthLabel(b.y, b.m) + ' Ausgaben ' + formatMoney(b.expense))}"/>`;

      const showEvery = buckets.length > 12 ? 2 : 1;
      if (i % showEvery === 0)
        labels += `<text x="${(gx + groupW / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${axis}">${monthLabel(b.y, b.m)}</text>`;
    });

    const gridLines = [0.5, 1]
      .map((f) => {
        const y = baseY - f * plotH;
        return `<line x1="${padX}" y1="${y.toFixed(1)}" x2="${W - padX}" y2="${y.toFixed(1)}" stroke="${grid}" stroke-width="1" stroke-dasharray="3 4"/>
                <text x="${padX}" y="${(y - 4).toFixed(1)}" font-size="10" fill="${axis}">${formatMoney(maxVal * f)}</text>`;
      })
      .join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Verlauf nach Monat">
        ${gridLines}
        <line x1="${padX}" y1="${baseY}" x2="${W - padX}" y2="${baseY}" stroke="${grid}" stroke-width="1.5"/>
        ${bars}
        ${labels}
      </svg>`;
  }

  function renderTopList(occ) {
    const list = el('top-list');
    const segments = aggregateByCategory(occ, 'expense').slice(0, 6);
    if (!segments.length) {
      list.innerHTML = '<li style="color:var(--text-subtle)">Keine Ausgaben im Zeitraum.</li>';
      return;
    }
    const max = segments[0].value || 1;
    list.innerHTML = segments
      .map((s) => {
        const pct = (s.value / max) * 100;
        return `<li>
          <span class="top-icon" style="background:${s.color}22">${esc(s.icon)}</span>
          <span class="top-info">
            <span class="top-name">${esc(s.name)}</span>
            <span class="top-bar-wrap"><span class="top-bar" style="width:${pct.toFixed(1)}%;background:${s.color}"></span></span>
          </span>
          <span class="top-amount">${esc(formatMoney(s.value))}</span>
        </li>`;
      })
      .join('');
  }

  function renderRecent(occ) {
    const list = el('recent-entries');
    const items = occ.slice(0, 6);
    if (!items.length) {
      list.innerHTML = '<li style="color:var(--text-subtle);padding:8px 0">Noch keine Einträge im Zeitraum.</li>';
      return;
    }
    list.innerHTML = items.map((o) => entryItemHtml(o, true)).join('');
  }

  // ---------- Entry item ----------
  function entryItemHtml(entry, isOccurrence) {
    const cat = getCategory(entry.categoryId);
    const sign = entry.type === 'income' ? '+' : '−';
    const recBadge =
      entry.recurrence && entry.recurrence !== 'none'
        ? `<span class="entry-recurring-badge">↻ ${RECURRENCE_LABELS[entry.recurrence]}</span>`
        : '';
    return `<li class="entry-item" data-entry-id="${entry.id}">
      <span class="entry-icon" style="background:${cat.color}22">${esc(cat.icon)}</span>
      <span class="entry-body">
        <span class="entry-title">${esc(entry.description)}</span>
        <span class="entry-meta">
          <span>${esc(cat.name)}</span><span class="dot"></span>
          <span>${formatDateDisplay(entry.date)}</span>
          ${recBadge}
        </span>
      </span>
      <span class="entry-amount ${entry.type}">${sign}${esc(formatMoney(entry.amount))}</span>
    </li>`;
  }

  // ---------- Entries view ----------
  function renderEntries() {
    const list = el('entries-list');
    const empty = el('entries-empty');
    const search = el('entries-search').value.trim().toLowerCase();
    const typeFilter = el('entries-filter-type').value;
    const catFilter = el('entries-filter-category').value;
    const recFilter = el('entries-filter-recurrence').value;
    const sortBy = el('entries-sort').value;
    const summary = el('entries-summary');

    let entries = state.entries.slice();

    entries = entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (catFilter !== 'all' && e.categoryId !== catFilter) return false;
      const isRecurring = e.recurrence && e.recurrence !== 'none';
      if (recFilter === 'once' && isRecurring) return false;
      if (recFilter === 'recurring' && !isRecurring) return false;
      if (search) {
        const cat = getCategory(e.categoryId);
        const hay = (e.description + ' ' + cat.name + ' ' + (e.note || '')).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    entries.sort((a, b) => {
      if (sortBy === 'date-asc') return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    if (!state.entries.length) {
      list.innerHTML = '';
      summary.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    if (!entries.length) {
      list.innerHTML = '<li style="color:var(--text-subtle);padding:16px;text-align:center">Keine Treffer.</li>';
      summary.hidden = true;
      return;
    }

    let inc = 0, exp = 0;
    for (const e of entries) {
      if (e.type === 'income') inc += e.amount;
      else exp += e.amount;
    }
    const parts = [`${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'}`];
    if (exp > 0) parts.push(`<span class="es-expense">−${esc(formatMoney(exp))}</span>`);
    if (inc > 0) parts.push(`<span class="es-income">+${esc(formatMoney(inc))}</span>`);
    summary.innerHTML = parts.join('<span class="es-sep">·</span>');
    summary.hidden = false;

    list.innerHTML = entries.map((e) => entryItemHtml(e, false)).join('');
  }

  function populateEntryCategoryFilter() {
    const sel = el('entries-filter-category');
    const current = sel.value;
    const opts = ['<option value="all">Alle Kategorien</option>'];
    for (const c of state.categories) {
      opts.push(`<option value="${c.id}">${esc(c.icon)} ${esc(c.name)}</option>`);
    }
    sel.innerHTML = opts.join('');
    sel.value = [...sel.options].some((o) => o.value === current) ? current : 'all';
  }

  // ---------- Categories view ----------
  function renderCategories() {
    const usage = new Map();
    for (const e of state.entries) usage.set(e.categoryId, (usage.get(e.categoryId) || 0) + 1);

    const build = (type, target) => {
      const cats = state.categories.filter((c) => c.type === type);
      el(target).innerHTML = cats
        .map((c) => {
          const n = usage.get(c.id) || 0;
          return `<li class="category-card" data-category-id="${c.id}">
            <span class="category-icon" style="background:${c.color}22">${esc(c.icon)}</span>
            <span class="category-info">
              <span class="category-name">${esc(c.name)}</span>
              <span class="category-count">${n} ${n === 1 ? 'Eintrag' : 'Einträge'}</span>
            </span>
          </li>`;
        })
        .join('') || '<li style="color:var(--text-subtle)">Keine Kategorien.</li>';
    };

    build('expense', 'categories-expense');
    build('income', 'categories-income');
  }

  // ---------- Entry modal ----------
  function populateEntryCategorySelect(type) {
    const sel = el('entry-category');
    const cats = state.categories.filter((c) => c.type === type);
    sel.innerHTML = cats
      .map((c) => `<option value="${c.id}">${esc(c.icon)} ${esc(c.name)}</option>`)
      .join('');
  }

  function openEntryModal(entry) {
    const form = el('entry-form');
    form.reset();
    el('currency-suffix').textContent = currencySymbol();

    if (entry) {
      el('entry-modal-title').textContent = 'Eintrag bearbeiten';
      el('entry-id').value = entry.id;
      (entry.type === 'income' ? el('type-income') : el('type-expense')).checked = true;
      populateEntryCategorySelect(entry.type);
      el('entry-amount').value = entry.amount;
      el('entry-description').value = entry.description;
      el('entry-category').value = entry.categoryId || '';
      el('entry-date').value = entry.date;
      el('entry-recurrence').value = entry.recurrence || 'none';
      el('entry-recurrence-end').value = entry.recurrenceEnd || '';
      el('entry-note').value = entry.note || '';
      el('delete-entry-btn').hidden = false;
      el('duplicate-entry-btn').hidden = false;
    } else {
      el('entry-modal-title').textContent = 'Neuer Eintrag';
      el('entry-id').value = '';
      el('type-expense').checked = true;
      populateEntryCategorySelect('expense');
      el('entry-date').value = toISODate(today());
      el('entry-recurrence').value = 'none';
      el('delete-entry-btn').hidden = true;
      el('duplicate-entry-btn').hidden = true;
    }
    el('recurrence-end-row').hidden = el('entry-recurrence').value === 'none';
    openModal('entry-modal');
    setTimeout(() => el('entry-amount').focus(), 50);
  }

  function submitEntry(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="entry-type"]:checked').value;
    const amount = parseFloat(el('entry-amount').value);
    if (!(amount > 0)) {
      showToast('Bitte einen gültigen Betrag eingeben.');
      return;
    }
    const id = el('entry-id').value || uid();
    const existing = state.entries.find((x) => x.id === id);
    const entry = {
      id,
      type,
      amount: Math.round(amount * 100) / 100,
      description: el('entry-description').value.trim() || RECURRENCE_LABELS.none,
      categoryId: el('entry-category').value || null,
      date: el('entry-date').value,
      recurrence: el('entry-recurrence').value,
      recurrenceEnd: el('entry-recurrence').value !== 'none' ? el('entry-recurrence-end').value || null : null,
      note: el('entry-note').value.trim() || null,
      createdAt: existing ? existing.createdAt : Date.now(),
    };

    if (existing) Object.assign(existing, entry);
    else state.entries.push(entry);

    markChanged();
    save();
    closeModal('entry-modal');
    refreshAll();
    showToast(existing ? 'Eintrag aktualisiert' : 'Eintrag gespeichert');
  }

  function deleteCurrentEntry() {
    const id = el('entry-id').value;
    if (!id) return;
    confirmAction('Eintrag löschen', 'Diesen Eintrag wirklich löschen?', () => {
      state.entries = state.entries.filter((e) => e.id !== id);
      markChanged();
      save();
      closeModal('entry-modal');
      refreshAll();
      showToast('Eintrag gelöscht');
    });
  }

  function duplicateCurrentEntry() {
    const src = state.entries.find((e) => e.id === el('entry-id').value);
    if (!src) return;
    openEntryModal(null);
    (src.type === 'income' ? el('type-income') : el('type-expense')).checked = true;
    populateEntryCategorySelect(src.type);
    el('entry-amount').value = src.amount;
    el('entry-description').value = src.description;
    el('entry-category').value = src.categoryId || '';
    el('entry-date').value = toISODate(today());
    el('entry-recurrence').value = src.recurrence || 'none';
    el('recurrence-end-row').hidden = (src.recurrence || 'none') === 'none';
    el('entry-recurrence-end').value = src.recurrenceEnd || '';
    el('entry-note').value = src.note || '';
    showToast('Kopie erstellt — prüfen und speichern');
  }

  // ---------- Category modal ----------
  function buildColorPicker(selected) {
    const picker = el('color-picker');
    picker.innerHTML = COLOR_PALETTE.map(
      (c) =>
        `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}" data-selected="${c === selected}" aria-label="Farbe ${c}"></button>`
    ).join('');
    el('category-color').value = selected;
  }

  function toggleCategoryBudgetRow() {
    const isExpense = document.querySelector('input[name="category-type"]:checked').value === 'expense';
    el('category-budget-row').hidden = !isExpense;
  }

  function openCategoryModal(cat) {
    const form = el('category-form');
    form.reset();
    el('budget-currency-suffix').textContent = currencySymbol();
    if (cat) {
      el('category-modal-title').textContent = 'Kategorie bearbeiten';
      el('category-id').value = cat.id;
      (cat.type === 'income' ? el('cat-type-income') : el('cat-type-expense')).checked = true;
      el('category-name').value = cat.name;
      el('category-icon').value = cat.icon;
      el('category-budget').value = cat.budget != null ? cat.budget : '';
      buildColorPicker(cat.color);
      el('delete-category-btn').hidden = false;
    } else {
      el('category-modal-title').textContent = 'Neue Kategorie';
      el('category-id').value = '';
      el('cat-type-expense').checked = true;
      el('category-icon').value = '🏷️';
      buildColorPicker(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
      el('delete-category-btn').hidden = true;
    }
    toggleCategoryBudgetRow();
    openModal('category-modal');
  }

  function submitCategory(e) {
    e.preventDefault();
    const id = el('category-id').value || uid();
    const existing = state.categories.find((c) => c.id === id);
    const type = document.querySelector('input[name="category-type"]:checked').value;
    const budgetVal = parseFloat(el('category-budget').value);
    const cat = {
      id,
      name: el('category-name').value.trim(),
      icon: el('category-icon').value.trim() || '🏷️',
      color: el('category-color').value,
      type,
      budget: type === 'expense' && budgetVal > 0 ? Math.round(budgetVal * 100) / 100 : null,
    };
    if (!cat.name) {
      showToast('Bitte einen Namen eingeben.');
      return;
    }
    if (existing) Object.assign(existing, cat);
    else state.categories.push(cat);

    markChanged();
    save();
    closeModal('category-modal');
    refreshAll();
    showToast(existing ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
  }

  function deleteCurrentCategory() {
    const id = el('category-id').value;
    if (!id) return;
    const inUse = state.entries.filter((e) => e.categoryId === id).length;
    const msg = inUse
      ? `Diese Kategorie wird von ${inUse} ${inUse === 1 ? 'Eintrag' : 'Einträgen'} verwendet. Diese werden zu „Ohne Kategorie“. Fortfahren?`
      : 'Diese Kategorie wirklich löschen?';
    confirmAction('Kategorie löschen', msg, () => {
      state.categories = state.categories.filter((c) => c.id !== id);
      for (const e of state.entries) if (e.categoryId === id) e.categoryId = null;
      markChanged();
      save();
      closeModal('category-modal');
      refreshAll();
      showToast('Kategorie gelöscht');
    });
  }

  // ---------- Bank-CSV-Import (meinELBA) ----------
  const RULES_KEY = 'haushaltsplan_rules_v1';

  const IMPORT_RULES = [
    { any: ['TRADE REPUBLIC', 'FLATEX', 'BITPANDA'], cat: 'Sparen & Anlage' },
    { any: ['BANKOMAT', 'SB-BEHEBUNG', 'SB BEHEBUNG', 'ATM '], cat: 'Bargeld' },
    { any: ['KONTOFÜHRUNG', 'BUCHUNGSENTGELT', 'SOLLZINSEN', 'KREDITBEARBEITUNG', 'BUCHUNGSGEBÜHR', 'KONTOGEBÜHR'], cat: 'Bankgebühren' },
    { any: ['APOTHEKE'], cat: 'Gesundheit' },
    { any: ['MPREIS', 'HOFER', 'BILLA', 'LIDL', 'PENNY', 'SPAR ', 'DISK ', 'MERKUR', 'UNIMARKT', 'NAH&FRISCH'], cat: 'Lebensmittel' },
    { any: ['BAECKER', 'BÄCKER', 'BAGUETTE', 'BAECKEREI', 'BÄCKEREI', 'KONDITOREI'], cat: 'Lebensmittel' },
    { any: ['BIPA', 'MÜLLER', 'MUELLER', 'DM FIL', 'DM-DROGERIE', 'DROGERIE'], cat: 'Drogerie' },
    { any: ['SHELL', 'OMV', 'ARAL', 'AVANTI', 'ENI ', 'JET ', 'ELAN', 'BP ', 'TANKSTELLE', 'DIESEL'], cat: 'Auto' },
    { any: ['GARAGE', 'PARKPLAT', 'PARKHAUS', 'PARKEN', 'PARKGARAGE'], cat: 'Auto' },
    { any: ['VERKEHRSVERBUND', 'VVT', 'ÖBB', 'OEBB', ' IVB', 'POSTBUS', 'WIENER LINIEN'], cat: 'Transport' },
    { any: ['SPUSU', 'MASS RESPONSE', 'MAGENTA', 'A1 TELEKOM', 'DREI ', 'YESSS', 'TIDAL', 'NETFLIX', 'SPOTIFY', 'DISNEY', 'ANTHROPIC', 'OPENAI', 'YOUTUBE', 'AMAZON PRIME', 'MICROSOFT', 'GOOGLE'], cat: 'Abos & Verträge' },
    { any: ['ÄRZTE OHNE GRENZEN', 'ARZTE OHNE GRENZEN', 'ROTES KREUZ', 'ÖRK', 'OERK', 'VIER PFOTEN', 'CARITAS', 'GREENPEACE', 'SOS-KINDERDORF', 'WWF', 'UNICEF'], cat: 'Spenden' },
    { any: ['SLW', 'KINDERGARTEN', 'SCHISCHULE', 'JUGENDLAND', 'KRABBELSTUBE', 'KINDERBETREUUNG', 'KINDERKRIPPE'], cat: 'Kinderbetreuung' },
    { any: ['ALIMENTE', 'UNTERHALT', 'KRENKEL'], cat: 'Alimente/Unterhalt' },
    { any: ['TRAFIK', 'TABAK'], cat: 'Tabak' },
    { any: ['TAEKWONDO', 'ALPENVEREIN', 'HALLENBAD', 'GLUNGEZER', 'THERME', ' KINO', 'FITNESS', 'BERGBAHN', 'SCHWIMMBAD', 'MUSEUM', 'KLETTER'], cat: 'Freizeit' },
    { any: ['OBI', 'BAUHAUS', 'HORNBACH', 'IKEA', 'XXXLUTZ', 'MÖBELIX', 'MOEMAX', 'LAGERHAUS'], cat: 'Haushalt & Heimwerker' },
    { any: ['SMYTHS', 'TOYS'], cat: 'Geschenke' },
    { any: ['EISAUTOMAT', 'EISSALON', 'TOMASELLI', 'RESTAURANT', 'CAFE', 'CAFÉ', 'MCDONALD', 'GASTHAUS', 'PIZZ', 'BURGER', 'KEBAB', 'IMBISS', 'WIRTSHAUS'], cat: 'Restaurant & Café' },
    { any: ['KIEWEG', 'KAUTION'], cat: 'Wohnen / Miete' },
    { any: ['VERSICHERUNG', 'UNIQA', 'GENERALI', 'ALLIANZ', 'MUKI', 'HELVETIA', 'WIENER STÄDTISCHE', 'DONAU VERS', 'GRAWE'], cat: 'Versicherungen' },
  ];

  function loadRules() {
    try {
      const a = JSON.parse(localStorage.getItem(RULES_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }
  function saveRules(rules) {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch (e) { /* unkritisch */ }
  }
  function addRule(key, categoryName, amount, exclude) {
    if (!key) return;
    const K = key.toUpperCase();
    const amt = amount != null ? Math.abs(amount) : null;
    const rules = loadRules().filter((r) => !(r.key === K && r.amount === amt));
    rules.push({ key: K, cat: categoryName, amount: amt, exclude: exclude != null ? exclude : null });
    saveRules(rules);
  }

  function matchedRule(text, amount) {
    const t = String(text).toUpperCase();
    for (const r of loadRules()) {
      if (r.key && t.includes(r.key) && (r.amount == null || Math.abs(Math.abs(amount) - r.amount) < 0.005)) return r;
    }
    return null;
  }

  function ownIdentifiers() {
    return String(state.settings.ownIdentifiers || '')
      .split(/[,\n;]/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  function parseAmountDe(s) {
    return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  }
  function isoFromDe(d) {
    const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  // Generischer CSV-Parser (beliebiger Trenner, Quotes mit "" + Zeilenumbrüche in Feldern)
  function parseCsvRows(text, delim) {
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function detectFormat(text) {
    const head = text.slice(0, 3000);
    if (/"datetime","date"/.test(head) || /"transaction_id"/.test(head)) return 'tr';
    if (/Venue:\s*Bitpanda/i.test(head) || /"Transaction ID",Timestamp/.test(head)) return 'bitpanda';
    const firstLine = head.split(/\r?\n/).find((l) => l.trim()) || '';
    if (/^Buchungstag;Valuta/i.test(firstLine)) return 'flatex';
    if (/^\d{2}\.\d{2}\.\d{4};/.test(firstLine)) return 'elba';
    return null;
  }

  // Merchant Category Codes → Kategorie (für Trade-Republic-Kartenzahlungen)
  const MCC_CATEGORY = {
    '5411': 'Lebensmittel', '5422': 'Lebensmittel', '5451': 'Lebensmittel', '5462': 'Lebensmittel', '5499': 'Lebensmittel',
    '5811': 'Restaurant & Café', '5812': 'Restaurant & Café', '5813': 'Restaurant & Café', '5814': 'Restaurant & Café',
    '5912': 'Drogerie', '5122': 'Drogerie',
    '8062': 'Gesundheit', '8011': 'Gesundheit', '8021': 'Gesundheit', '8042': 'Gesundheit', '8043': 'Gesundheit',
    '5942': 'Bildung', '5943': 'Bildung', '8211': 'Bildung', '8220': 'Bildung', '8299': 'Bildung',
    '5541': 'Auto', '5542': 'Auto', '5533': 'Auto', '7523': 'Auto', '7538': 'Auto', '7549': 'Auto',
    '4111': 'Transport', '4112': 'Transport', '4131': 'Transport', '4789': 'Transport',
    '5993': 'Tabak',
    '5200': 'Haushalt & Heimwerker', '5211': 'Haushalt & Heimwerker', '5251': 'Haushalt & Heimwerker', '5712': 'Haushalt & Heimwerker', '5722': 'Haushalt & Heimwerker',
    '5611': 'Kleidung', '5621': 'Kleidung', '5641': 'Kleidung', '5651': 'Kleidung', '5661': 'Kleidung', '5691': 'Kleidung', '5699': 'Kleidung',
    '5945': 'Geschenke', '5947': 'Geschenke', '5948': 'Geschenke',
    '7991': 'Freizeit', '7997': 'Freizeit', '7999': 'Freizeit', '7832': 'Freizeit', '7941': 'Freizeit', '7911': 'Freizeit',
    '8398': 'Spenden', '8661': 'Spenden',
    '5311': 'Sonstiges', '5331': 'Sonstiges', '5399': 'Sonstiges',
  };

  const findCatDef = (name) =>
    DEFAULT_CATEGORIES.find((d) => d.name === name) || state.categories.find((c) => c.name === name);

  function makeRow(importKey, date, amount, desc, rawText, category, exclude, existing) {
    return {
      importKey, date, rawText,
      amount, type: amount > 0 ? 'income' : 'expense',
      desc: (desc || '').trim() || 'Buchung',
      category, exclude: !!exclude, remember: false,
      dup: existing.has(importKey),
    };
  }

  // --- meinELBA (Girokonto) ---
  function parseElba(text, existing) {
    const out = [];
    for (const f of parseCsvRows(text, ';')) {
      if (f.length < 6 || !/^\d{2}\.\d{2}\.\d{4}$/.test((f[0] || '').trim())) continue;
      const amount = parseAmountDe(f[3]);
      if (!isFinite(amount) || amount === 0) continue;
      const rawText = f[1];
      const cat = categorizeTx(rawText, amount);
      const mr = matchedRule(rawText, amount);
      const def = findCatDef(cat);
      const exclude = mr && mr.exclude != null ? mr.exclude : !!(def && def.exclude);
      const key = (f[5] || '').trim() || `elba|${f[0]}|${f[3]}|${f[1].slice(0, 24)}`;
      out.push(makeRow(key, isoFromDe((f[2] || f[0]).trim()), amount, extractDesc(rawText), rawText, cat, exclude, existing));
    }
    return out;
  }

  // --- Trade Republic ---
  function parseTradeRepublic(text, existing) {
    const rows = parseCsvRows(text, ',');
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim());
    const ix = (n) => head.indexOf(n);
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      const amtStr = (r[ix('amount')] || '').trim();
      if (!amtStr) continue;
      const amount = parseFloat(amtStr);
      if (!isFinite(amount) || amount === 0) continue;
      const type = (r[ix('type')] || '').trim();
      const name = (r[ix('name')] || '').trim();
      const descCol = (r[ix('description')] || '').trim();
      const mcc = (r[ix('mcc_code')] || '').trim();
      let cat, exclude = false, label;
      if (type === 'CARD_TRANSACTION') {
        cat = categorizeTx(name, -1);
        if (cat === 'Sonstiges' && MCC_CATEGORY[mcc]) cat = MCC_CATEGORY[mcc];
        label = name || descCol;
      } else if (type === 'INTEREST_PAYMENT') {
        cat = 'Kapitalerträge'; exclude = true; label = 'Zinsen (Trade Republic)';
      } else if (type === 'BUY' || type === 'SELL') {
        cat = 'Sparen & Anlage'; exclude = true; label = (type === 'BUY' ? 'Kauf ' : 'Verkauf ') + name;
      } else if (/TRANSFER|INPAYMENT/.test(type)) {
        cat = 'Umbuchung'; exclude = true; label = 'Übertrag (Trade Republic)';
      } else {
        cat = 'Sonstiges'; label = name || descCol || type;
      }
      const key = (r[ix('transaction_id')] || '').trim() || `tr|${r[ix('date')]}|${amtStr}`;
      out.push(makeRow(key, (r[ix('date')] || '').trim(), amount, label, `[Trade Republic] ${type} ${name} ${descCol}`.trim(), cat, exclude, existing));
    }
    return out;
  }

  // --- Flatex (Depot) ---
  function parseFlatex(text, existing) {
    const out = [];
    for (const f of parseCsvRows(text, ';')) {
      if (f.length < 7 || !/^\d{2}\.\d{2}\.\d{4}$/.test((f[0] || '').trim())) continue;
      const amount = parseAmountDe(f[6]);
      if (!isFinite(amount) || amount === 0) continue;
      const empf = (f[2] || '').trim();
      const info = (f[5] || '').trim();
      const U = (info + ' ' + empf + ' ' + (f[3] || '')).toUpperCase();
      let cat, exclude = false, label;
      if (/ERTRÄGNIS|ERTRAGNIS|DIVIDEND|ZINSABSCHLUSS/.test(U)) {
        cat = 'Kapitalerträge'; exclude = true; label = 'Erträge (Flatex)';
      } else if (/ORDER|KAUF|VERKAUF|THESAURIERUNG/.test(U)) {
        cat = 'Sparen & Anlage'; exclude = true; label = info.slice(0, 40);
      } else {
        cat = 'Umbuchung'; exclude = true; label = 'Übertrag (Flatex)';
      }
      const key = (f[4] || '').trim() ? `flatex|${f[4].trim()}` : `flatex|${f[0]}|${f[6]}`;
      out.push(makeRow(key, isoFromDe((f[1] || f[0]).trim()), amount, label, `[Flatex] ${info} ${empf}`.trim(), cat, exclude, existing));
    }
    return out;
  }

  // --- Bitpanda ---
  function parseBitpanda(text, existing) {
    const rows = parseCsvRows(text, ',');
    const h = rows.findIndex((r) => (r[0] || '').trim() === 'Transaction ID');
    if (h < 0) return [];
    const head = rows[h].map((s) => s.trim());
    const ix = (n) => head.indexOf(n);
    const out = [];
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      const ttype = (r[ix('Transaction Type')] || '').toLowerCase();
      if (ttype.startsWith('transfer')) continue; // interne Staking-Bewegungen (netto 0)
      const mag = parseFloat(r[ix('Amount Fiat')]);
      if (!isFinite(mag) || mag === 0) continue;
      const amount = (r[ix('In/Out')] || '').toLowerCase() === 'outgoing' ? -mag : mag;
      const asset = (r[ix('Asset')] || '').trim();
      let cat, exclude = false, label;
      if (ttype === 'deposit' || ttype === 'withdrawal') {
        cat = 'Umbuchung'; exclude = true; label = 'Übertrag (Bitpanda)';
      } else if (ttype === 'buy' || ttype === 'sell') {
        cat = 'Sparen & Anlage'; exclude = true; label = (ttype === 'buy' ? 'Kauf ' : 'Verkauf ') + asset;
      } else if (ttype === 'reward' || ttype.includes('stake')) {
        cat = 'Kapitalerträge'; exclude = true; label = 'Staking ' + asset;
      } else {
        cat = 'Sparen & Anlage'; exclude = true; label = ttype;
      }
      const ts = (r[ix('Timestamp')] || '').trim();
      const key = (r[0] || '').trim() ? `bp|${r[0].trim()}` : `bp|${ts}|${mag}`;
      out.push(makeRow(key, ts.slice(0, 10), amount, label, `[Bitpanda] ${ttype} ${asset}`.trim(), cat, exclude, existing));
    }
    return out;
  }

  function buildImportRows(text) {
    const existing = new Set(state.entries.map((e) => e.importKey).filter(Boolean));
    const fmt = detectFormat(text);
    const map = { elba: parseElba, tr: parseTradeRepublic, flatex: parseFlatex, bitpanda: parseBitpanda };
    return { fmt, rows: fmt ? map[fmt](text, existing) : [] };
  }

  function extractDesc(text) {
    for (const key of ['Zahlungsempfänger:', 'Auftraggeber:', 'Empfänger:']) {
      const re = new RegExp(
        key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '\\s*(.*?)(?:\\s+(?:Verwendungszweck:|Zahlungsreferenz:|IBAN|BIC|Empfänger-Kennung:|Mandat:|Auftraggeberreferenz:)|$)'
      );
      const m = text.match(re);
      if (m && m[1].trim()) return m[1].trim();
    }
    let m = text.match(/Verwendungszweck:\s*(.*?)\s+(?:[A-ZÄÖÜ.]+\s+\d{4,5}|Zahlungsreferenz:|IBAN)/);
    if (m && m[1].trim()) return m[1].trim();
    m = text.match(/Zahlungsreferenz:\s*([A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9&.\-/ ]{2,}?)\s{2,}/);
    if (m && m[1].trim()) return m[1].trim();
    return text.slice(0, 40).trim();
  }

  function categorizeTx(text, amount) {
    const mr = matchedRule(text, amount);
    if (mr) return mr.cat;
    const t = text.toUpperCase();
    const isIncome = amount > 0;
    const ownHit = ownIdentifiers().some((id) => t.includes(id));

    if (t.includes('ONLINE SPAREN')) return isIncome ? 'Umbuchung' : 'Sparen & Anlage';
    if (isIncome) {
      if (t.includes('GEHALT') || t.includes('LOHN')) return 'Gehalt';
      if (ownHit) return 'Umbuchung';
      return 'Erstattungen';
    }
    if (t.includes('KOMMUNALBETRIEBE')) return t.includes('TELEKOM') ? 'Abos & Verträge' : 'Energie & Wasser';
    for (const rule of IMPORT_RULES) {
      const hit = rule.all ? rule.all.every((k) => t.includes(k)) : rule.any.some((k) => t.includes(k));
      if (hit) return rule.cat;
    }
    if (ownHit) return 'Umbuchung';
    return 'Sonstiges';
  }

  let importRows = [];

  function importCategoryNames() {
    const names = new Set();
    state.categories.forEach((c) => names.add(c.name));
    DEFAULT_CATEGORIES.forEach((d) => names.add(d.name));
    return [...names];
  }

  let importFormat = null;

  async function handleBankCsv(file) {
    let text;
    try {
      const buf = await file.arrayBuffer();
      text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
      text = text.replace(/^﻿/, '');
    } catch (e) {
      showToast('Datei konnte nicht gelesen werden.');
      return;
    }
    const { fmt, rows } = buildImportRows(text);
    if (!fmt) {
      showToast('Format nicht erkannt (meinELBA, Trade Republic, Flatex, Bitpanda).');
      return;
    }
    if (!rows.length) {
      showToast('Keine importierbaren Buchungen gefunden.');
      return;
    }
    importFormat = fmt;
    importRows = rows;
    renderImportPreview();
    openModal('import-modal');
  }

  function willImport(r) {
    if (r.dup) return false;
    if (el('import-skip-excluded').checked && r.exclude) return false;
    if (el('import-skip-small').checked && Math.abs(r.amount) < (parseFloat(el('import-small-threshold').value) || 0)) return false;
    return true;
  }

  function renderImportPreview() {
    const fmtLabel = { elba: 'meinELBA', tr: 'Trade Republic', flatex: 'Flatex', bitpanda: 'Bitpanda' }[importFormat] || 'CSV';
    let imp = 0, dup = 0, skip = 0;
    for (const r of importRows) {
      if (r.dup) dup++;
      else if (willImport(r)) imp++;
      else skip++;
    }
    let s = `Quelle: ${fmtLabel} · ${imp} werden importiert`;
    if (dup) s += ` · ${dup} Duplikate`;
    if (skip) s += ` · ${skip} per Filter übersprungen`;
    el('import-summary').textContent = s;

    const optionsHtml = (sel) =>
      importCategoryNames().map((n) => `<option${n === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');

    el('import-tbody').innerHTML = importRows
      .map((r, i) => {
        const sign = r.type === 'income' ? '+' : '−';
        const amt = `<td class="imp-amt ${r.type}">${sign}${esc(formatMoney(Math.abs(r.amount)))}</td>`;
        const base = `<td>${formatDateDisplay(r.date)}</td><td class="imp-desc" title="${esc(r.rawText)}">${esc(r.desc)}</td>${amt}`;
        if (r.dup) {
          return `<tr class="imp-row dup">${base}<td colspan="3"><span class="imp-dup">bereits importiert</span></td></tr>`;
        }
        if (!willImport(r)) {
          return `<tr class="imp-row skip">${base}<td colspan="3"><span class="imp-dup">per Filter übersprungen</span></td></tr>`;
        }
        return `<tr class="imp-row" data-idx="${i}">
          ${base}
          <td><select class="imp-cat" data-idx="${i}">${optionsHtml(r.category)}</select></td>
          <td class="imp-center"><input type="checkbox" class="imp-excl" data-idx="${i}"${r.exclude ? ' checked' : ''}></td>
          <td class="imp-center"><input type="checkbox" class="imp-rem" data-idx="${i}"${r.remember ? ' checked' : ''}></td>
        </tr>`;
      })
      .join('');
    el('import-commit-btn').disabled = imp === 0;
  }

  function commitImport() {
    const toImport = importRows.filter(willImport);
    if (!toImport.length) { closeModal('import-modal'); return; }
    takeSnapshot('Vor Import', true);
    if (el('import-clear-existing').checked) state.entries = [];
    let added = 0;
    for (const r of toImport) {
      const cat = ensureCategory(r.category, r.type);
      if (r.remember && r.desc) {
        if (/PAYPAL/i.test(r.rawText)) addRule('PAYPAL', r.category, Math.abs(r.amount), r.exclude);
        else addRule(r.desc, r.category, null, r.exclude);
      }
      state.entries.push({
        id: uid(),
        type: r.type,
        amount: Math.round(Math.abs(r.amount) * 100) / 100,
        description: r.desc || 'Buchung',
        categoryId: cat.id,
        date: r.date,
        recurrence: 'none',
        recurrenceEnd: null,
        note: r.rawText,
        excludeFromStats: r.exclude,
        importKey: r.importKey,
        source: 'import',
        createdAt: Date.now(),
      });
      added++;
    }
    markChanged();
    save();
    closeModal('import-modal');
    refreshAll();
    showToast(`${added} Buchungen importiert`);
  }

  // ---------- Import / Export ----------
  async function shareOrDownload(filename, content, mime, label) {
    if (navigator.canShare) {
      try {
        const file = new File([content], filename, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Haushaltsplan', text: label });
          showToast(label + ' geteilt');
          return true;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    downloadFile(filename, content, mime);
    showToast(label + ' exportiert');
    return true;
  }

  async function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    const ok = await shareOrDownload(`haushaltsplan-backup-${toISODate(today())}.json`, data, 'application/json', 'JSON-Backup');
    if (ok) {
      state.settings.lastBackupAt = Date.now();
      state.settings.reminderSnoozeUntil = null;
      save();
      updateBackupReminder();
    }
  }

  function exportCSV() {
    const headers = ['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag', 'Wiederholung', 'Wiederholung-Ende', 'Notiz'];
    const rows = state.entries
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => {
        const cat = getCategory(e.categoryId);
        return [
          e.date,
          e.type === 'income' ? 'Einnahme' : 'Ausgabe',
          cat.name,
          e.description,
          String(e.amount).replace('.', ','),
          RECURRENCE_LABELS[e.recurrence] || 'Einmalig',
          e.recurrenceEnd || '',
          e.note || '',
        ]
          .map(csvCell)
          .join(';');
      });
    const csv = '﻿' + headers.join(';') + '\r\n' + rows.join('\r\n');
    shareOrDownload(`haushaltsplan-${toISODate(today())}.csv`, csv, 'text/csv', 'CSV');
  }

  const csvCell = (v) => {
    const s = String(v == null ? '' : v);
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.entries) || !Array.isArray(parsed.categories)) {
          showToast('Ungültige Backup-Datei.');
          return;
        }
        confirmAction(
          'Daten importieren',
          `Backup mit ${parsed.entries.length} Einträgen und ${parsed.categories.length} Kategorien laden? Aktuelle Daten werden ersetzt.`,
          () => {
            takeSnapshot('Vor Import', true);
            state.entries = parsed.entries;
            state.categories = parsed.categories;
            state.settings = Object.assign({ currency: 'EUR', theme: 'auto' }, parsed.settings || {});
            save();
            applySettingsToUI();
            applyTheme();
            refreshAll();
            showToast('Import erfolgreich');
          }
        );
      } catch {
        showToast('Datei konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
  }

  // ---------- Theme & Settings ----------
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }

  function applySettingsToUI() {
    el('theme-select').value = state.settings.theme;
    el('currency-select').value = state.settings.currency;
    el('currency-suffix').textContent = currencySymbol();
    el('own-identifiers').value = state.settings.ownIdentifiers || '';
  }

  // ---------- Navigation ----------
  function setView(view) {
    $$('.view').forEach((v) => v.setAttribute('data-active', v.id === 'view-' + view));
    $$('[data-view]').forEach((b) => {
      if (b.classList.contains('nav-btn') || b.classList.contains('bottom-nav-btn')) {
        if (b.getAttribute('data-view') === view) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      }
    });
    el('fab-add').hidden = !(view === 'dashboard' || view === 'entries');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (view === 'dashboard') renderDashboard();
  }

  // ---------- Modals ----------
  function openModal(id) {
    el(id).hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    el(id).hidden = true;
    document.body.style.overflow = '';
  }
  function closeAllModals() {
    $$('.modal-backdrop').forEach((m) => (m.hidden = true));
    document.body.style.overflow = '';
  }

  let confirmCallback = null;
  function confirmAction(title, message, cb) {
    el('confirm-title').textContent = title;
    el('confirm-message').textContent = message;
    confirmCallback = cb;
    openModal('confirm-modal');
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------- Chart tooltip ----------
  function showChartTip(target, clientX, clientY) {
    const tip = el('chart-tooltip');
    tip.innerHTML = '<strong></strong><span></span>';
    tip.firstChild.textContent = target.getAttribute('data-name') || '';
    tip.lastChild.textContent = target.getAttribute('data-sub') || '';
    tip.hidden = false;
    const pad = 10;
    const rect = tip.getBoundingClientRect();
    let left = clientX + 14;
    let top = clientY + 16;
    if (left + rect.width + pad > window.innerWidth) left = clientX - rect.width - 14;
    if (top + rect.height + pad > window.innerHeight) top = clientY - rect.height - 14;
    tip.style.left = Math.max(pad, left) + 'px';
    tip.style.top = Math.max(pad, top) + 'px';
  }

  function hideChartTip() {
    const tip = el('chart-tooltip');
    if (tip) tip.hidden = true;
  }

  function setupChartTooltips() {
    ['donut-chart', 'trend-chart'].forEach((id) => {
      const c = el(id);
      if (!c) return;
      const handler = (e) => {
        const seg = e.target.closest('[data-name]');
        if (seg) showChartTip(seg, e.clientX, e.clientY);
        else hideChartTip();
      };
      c.addEventListener('pointermove', handler);
      c.addEventListener('pointerdown', handler);
      c.addEventListener('pointerleave', hideChartTip);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#donut-chart') && !e.target.closest('#trend-chart')) hideChartTip();
    });
  }

  // ---------- Backup reminder ----------
  const DAY_MS = 86400000;
  const REMIND_AFTER_DAYS = 7;

  function markChanged() {
    const s = state.settings;
    s.lastChangeAt = Date.now();
    if (!s.firstEntryAt) s.firstEntryAt = s.lastChangeAt;
    takeSnapshot('Änderung', false);
  }

  function backupReminderDue() {
    const s = state.settings;
    if (!state.entries.length) return false;
    const now = Date.now();
    if (s.reminderSnoozeUntil && now < s.reminderSnoozeUntil) return false;
    const changedSinceBackup = !s.lastBackupAt || (s.lastChangeAt && s.lastChangeAt > s.lastBackupAt);
    if (!changedSinceBackup) return false;
    const ref = s.lastBackupAt || s.firstEntryAt || now;
    return (now - ref) / DAY_MS >= REMIND_AFTER_DAYS;
  }

  function updateBackupReminder() {
    const banner = el('backup-banner');
    if (!banner) return;
    const due = backupReminderDue();
    banner.hidden = !due;
    if (!due) return;
    const s = state.settings;
    const detail = el('backup-banner-detail');
    if (s.lastBackupAt) {
      const days = Math.max(1, Math.floor((Date.now() - s.lastBackupAt) / DAY_MS));
      detail.textContent = `Dein letztes Backup ist ${days} Tage her — sichere deine Daten in deine Cloud.`;
    } else {
      detail.textContent = 'Du hast noch kein Backup erstellt — sichere deine Daten in deine Cloud.';
    }
  }

  function snoozeBackupReminder() {
    state.settings.reminderSnoozeUntil = Date.now() + 3 * DAY_MS;
    save();
    updateBackupReminder();
  }

  // ---------- Local snapshots ----------
  const SNAP_KEY = 'haushaltsplan_snapshots_v1';
  const MAX_SNAPSHOTS = 12;
  const SNAP_MIN_INTERVAL = 3 * 60 * 60 * 1000;

  function loadSnapshots() {
    try {
      const arr = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveSnapshots(arr) {
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify(arr));
    } catch (e) {
      try {
        localStorage.setItem(SNAP_KEY, JSON.stringify(arr.slice(-Math.ceil(MAX_SNAPSHOTS / 2))));
      } catch (_) {
        /* Speicher voll — Snapshots unkritisch */
      }
    }
  }

  function takeSnapshot(reason, force) {
    if (!force && !state.entries.length) return;
    const snaps = loadSnapshots();
    const now = Date.now();
    if (!force && snaps.length) {
      const last = snaps[snaps.length - 1];
      const unchanged =
        JSON.stringify(last.data.entries) === JSON.stringify(state.entries) &&
        JSON.stringify(last.data.categories) === JSON.stringify(state.categories);
      if (unchanged) return;
      if (now - last.at < SNAP_MIN_INTERVAL) return;
    }
    const data = JSON.parse(JSON.stringify({ entries: state.entries, categories: state.categories, settings: state.settings }));
    snaps.push({ at: now, reason, count: state.entries.length, data });
    while (snaps.length > MAX_SNAPSHOTS) snaps.shift();
    saveSnapshots(snaps);
  }

  function renderSnapshots() {
    const list = el('snapshots-list');
    if (!list) return;
    const snaps = loadSnapshots().slice().reverse();
    if (!snaps.length) {
      list.innerHTML = '<li class="snap-empty">Noch keine Sicherungspunkte vorhanden.</li>';
      return;
    }
    list.innerHTML = snaps
      .map((s) => {
        const when = new Date(s.at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        return `<li class="snapshot-item">
          <span class="snap-info">
            <span class="snap-when">${esc(when)}</span>
            <span class="snap-meta">${esc(s.reason)} · ${s.count} ${s.count === 1 ? 'Eintrag' : 'Einträge'}</span>
          </span>
          <button class="btn-secondary btn-sm" data-snapshot-at="${s.at}">Wiederherstellen</button>
        </li>`;
      })
      .join('');
  }

  function restoreSnapshot(at) {
    const snap = loadSnapshots().find((s) => String(s.at) === String(at));
    if (!snap) return;
    const when = new Date(snap.at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
    confirmAction(
      'Sicherungspunkt wiederherstellen',
      `Daten auf den Stand vom ${when} zurücksetzen? Der aktuelle Stand wird vorher als Sicherungspunkt gespeichert.`,
      () => {
        takeSnapshot('Vor Wiederherstellung', true);
        const d = JSON.parse(JSON.stringify(snap.data));
        state.entries = Array.isArray(d.entries) ? d.entries : [];
        state.categories = Array.isArray(d.categories) ? d.categories : [];
        state.settings = Object.assign({ currency: 'EUR', theme: 'auto' }, d.settings || {});
        save();
        applySettingsToUI();
        applyTheme();
        refreshAll();
        renderSnapshots();
        showToast('Wiederhergestellt');
      }
    );
  }

  // ---------- Refresh ----------
  function refreshAll() {
    populateEntryCategoryFilter();
    renderDashboard();
    renderEntries();
    renderCategories();
    updateBackupReminder();
    renderSnapshots();
  }

  // ---------- Events ----------
  function wireEvents() {
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-view]');
      if (navBtn) {
        setView(navBtn.getAttribute('data-view'));
        return;
      }
      const entryItem = e.target.closest('[data-entry-id]');
      if (entryItem) {
        const found = state.entries.find((x) => x.id === entryItem.getAttribute('data-entry-id'));
        if (found) openEntryModal(found);
        return;
      }
      const catCard = e.target.closest('[data-category-id]');
      if (catCard) {
        const found = state.categories.find((x) => x.id === catCard.getAttribute('data-category-id'));
        if (found) openCategoryModal(found);
        return;
      }
      const snapBtn = e.target.closest('[data-snapshot-at]');
      if (snapBtn) {
        restoreSnapshot(snapBtn.getAttribute('data-snapshot-at'));
        return;
      }
      const swatch = e.target.closest('.color-swatch');
      if (swatch) {
        $$('.color-swatch').forEach((s) => s.setAttribute('data-selected', 'false'));
        swatch.setAttribute('data-selected', 'true');
        el('category-color').value = swatch.getAttribute('data-color');
        return;
      }
      const chip = e.target.closest('.chip[data-chart-type]');
      if (chip) {
        donutType = chip.getAttribute('data-chart-type');
        $$('.chip[data-chart-type]').forEach((c) => c.classList.toggle('active', c === chip));
        el('view-dashboard').querySelector('.panel-header h2').textContent =
          donutType === 'expense' ? 'Ausgaben nach Kategorie' : 'Einnahmen nach Kategorie';
        renderDashboard();
        return;
      }
      if (e.target.closest('[data-close-modal]')) {
        closeAllModals();
        return;
      }
      if (e.target.classList.contains('modal-backdrop')) {
        closeAllModals();
      }
    });

    el('fab-add').addEventListener('click', () => openEntryModal(null));
    el('empty-add-btn').addEventListener('click', () => openEntryModal(null));
    el('add-category-btn').addEventListener('click', () => openCategoryModal(null));

    el('entry-form').addEventListener('submit', submitEntry);
    el('delete-entry-btn').addEventListener('click', deleteCurrentEntry);
    el('duplicate-entry-btn').addEventListener('click', duplicateCurrentEntry);
    el('category-form').addEventListener('submit', submitCategory);
    el('delete-category-btn').addEventListener('click', deleteCurrentCategory);

    $$('input[name="entry-type"]').forEach((r) =>
      r.addEventListener('change', () => {
        populateEntryCategorySelect(r.value);
      })
    );
    $$('input[name="category-type"]').forEach((r) =>
      r.addEventListener('change', toggleCategoryBudgetRow)
    );
    el('entry-recurrence').addEventListener('change', (e) => {
      el('recurrence-end-row').hidden = e.target.value === 'none';
    });

    el('confirm-ok').addEventListener('click', () => {
      closeModal('confirm-modal');
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });

    el('timeframe').addEventListener('change', (e) => {
      el('custom-range').hidden = e.target.value !== 'custom';
      renderDashboard();
    });
    el('range-from').addEventListener('change', renderDashboard);
    el('range-to').addEventListener('change', renderDashboard);

    el('entries-search').addEventListener('input', renderEntries);
    el('entries-filter-type').addEventListener('change', renderEntries);
    el('entries-filter-category').addEventListener('change', renderEntries);
    el('entries-filter-recurrence').addEventListener('change', renderEntries);
    el('entries-sort').addEventListener('change', renderEntries);

    el('export-json-btn').addEventListener('click', exportJSON);
    el('export-csv-btn').addEventListener('click', exportCSV);
    el('backup-now-btn').addEventListener('click', exportJSON);
    el('backup-snooze-btn').addEventListener('click', snoozeBackupReminder);
    el('snapshot-now-btn').addEventListener('click', () => {
      takeSnapshot('Manuell', true);
      renderSnapshots();
      showToast('Sicherungspunkt erstellt');
    });
    el('import-json-btn').addEventListener('click', () => el('import-json-input').click());
    el('import-json-input').addEventListener('change', (e) => {
      if (e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = '';
    });

    el('import-bank-btn').addEventListener('click', () => el('import-bank-input').click());
    el('import-bank-input').addEventListener('change', (e) => {
      if (e.target.files[0]) handleBankCsv(e.target.files[0]);
      e.target.value = '';
    });
    el('import-commit-btn').addEventListener('click', commitImport);
    el('import-tbody').addEventListener('change', (e) => {
      const t = e.target;
      const i = Number(t.getAttribute('data-idx'));
      if (isNaN(i) || !importRows[i]) return;
      if (t.classList.contains('imp-cat')) {
        importRows[i].category = t.value;
        const def = findCatDef(t.value);
        importRows[i].exclude = !!(def && def.exclude);
        renderImportPreview();
      } else if (t.classList.contains('imp-excl')) {
        importRows[i].exclude = t.checked;
        renderImportPreview();
      } else if (t.classList.contains('imp-rem')) {
        importRows[i].remember = t.checked;
      }
    });
    el('import-skip-excluded').addEventListener('change', renderImportPreview);
    el('import-skip-small').addEventListener('change', renderImportPreview);
    el('import-small-threshold').addEventListener('input', renderImportPreview);
    el('own-identifiers').addEventListener('input', (e) => {
      state.settings.ownIdentifiers = e.target.value;
      save();
    });

    el('reset-data-btn').addEventListener('click', () => {
      confirmAction('Alle Daten zurücksetzen', 'Alle Einträge und Kategorien werden gelöscht. Über die lokalen Sicherungspunkte kannst du das rückgängig machen.', () => {
        takeSnapshot('Vor Zurücksetzen', true);
        localStorage.removeItem(STORAGE_KEY);
        state = { entries: [], categories: [], settings: { currency: 'EUR', theme: 'auto' } };
        seedCategories();
        save();
        applySettingsToUI();
        applyTheme();
        refreshAll();
        showToast('Daten zurückgesetzt');
      });
    });

    el('theme-select').addEventListener('change', (e) => {
      state.settings.theme = e.target.value;
      save();
      applyTheme();
      renderDashboard();
    });
    el('currency-select').addEventListener('change', (e) => {
      state.settings.currency = e.target.value;
      save();
      applySettingsToUI();
      refreshAll();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (el('view-dashboard').getAttribute('data-active') === 'true') renderDashboard();
      }, 200);
    });

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      el('install-btn').hidden = false;
    });
    el('install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      el('install-btn').hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      el('install-btn').hidden = true;
      el('install-hint').textContent = 'App ist installiert. Viel Spaß!';
    });
  }

  // ---------- Persistent storage ----------
  async function requestPersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const already = await navigator.storage.persisted();
        if (!already) await navigator.storage.persist();
      }
    } catch (e) {
      /* nicht unterstützt — unkritisch */
    }
  }

  // ---------- Service Worker ----------
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW-Registrierung fehlgeschlagen', err));
      });
    }
  }

  // ---------- Init ----------
  function init() {
    load();
    takeSnapshot('Beim Öffnen', false);
    applyTheme();
    applySettingsToUI();
    wireEvents();
    setupChartTooltips();
    populateEntryCategoryFilter();
    refreshAll();
    setView('dashboard');
    registerSW();
    requestPersistentStorage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
