/**
 * PEPS Income / Expense App — Web Preview JavaScript
 * Mode: GitHub Pages / Local Preview (localStorage mock)
 * No Google Apps Script dependency.
 */

(() => {
  'use strict';

  /* ── Constants ── */
  const STORAGE_KEY = 'peps-finance-v2';
  const MAX_SLIP_SIZE = 5 * 1024 * 1024;

  /* ── State ── */
  const state = {
    categories: { income: [], expense: [] },
    dashboard: null,
    recent: [],
    loading: false,
  };

  /* ── Default seed categories ── */
  const SEED = {
    income: ['งานถ่ายภาพ', 'ไลฟ์สดกีฬา', 'มัดจำลูกค้า', 'ขายรูปออนไลน์', 'งานดนตรี', 'ขายเพลง/ลิขสิทธิ์', 'อื่น ๆ'],
    expense: ['น้ำมัน', 'อุปกรณ์กล้อง', 'ค่าเน็ต', 'ค่าเดินทาง', 'ค่าอาหาร', 'ค่าโปรแกรม/ซอฟต์แวร์', 'ค่าโฆษณา', 'ทีมงาน/ผู้ช่วย', 'อื่น ๆ'],
  };

  /* ── Utility helpers ── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const money = (value) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const escapeHtml = (str) =>
    String(str || '').replace(/[&<>'"/]/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      "'": '&#39;', '"': '&quot;', '/': '&#47;',
    }[ch]));

  const nowBangkok = () => {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(new Date());
  };

  const dateBangkok = () => {
    const d = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d); // returns yyyy-MM-dd
  };

  const timeBangkok = () => {
    const d = new Date();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(d);
  };

  const unique = (arr) => [...new Set(arr.filter(Boolean))];

  /* ── LocalStorage store ── */
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return {
      categories: { income: [...SEED.income], expense: [...SEED.expense] },
      txns: [],
    };
  }

  function saveStore(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* ignore */ }
  }

  /* ── Mock GAS API ── */
  function mockApi(fn, payload) {
    const store = loadStore();

    if (fn === 'getBootstrapData') {
      const dashboard = buildDashboard(store.txns);
      return Promise.resolve({
        ok: true,
        categories: store.categories,
        dashboard,
        recent: store.txns.slice(0, 25),
        timezone: 'Asia/Bangkok (Preview)',
      });
    }

    if (fn === 'addCategory') {
      const type = payload.type;
      const category = (payload.category || '').trim();
      if (!category) return Promise.reject(new Error('กรอกชื่อหมวดหมู่ก่อน'));
      if (!store.categories[type]) store.categories[type] = [];
      store.categories[type] = unique([...store.categories[type], category]);
      saveStore(store);
      return Promise.resolve({ ok: true, categories: store.categories });
    }

    if (fn === 'addTransaction') {
      const type = payload.type;
      const amount = Number(payload.amount);
      if (!type || (type !== 'income' && type !== 'expense'))
        return Promise.reject(new Error('type ต้องเป็น income หรือ expense'));
      if (!Number.isFinite(amount) || amount <= 0)
        return Promise.reject(new Error('จำนวนเงินต้องมากกว่า 0'));
      if (!payload.category)
        return Promise.reject(new Error('กรุณาเลือกหรือเพิ่มหมวดหมู่'));
      if (!payload.title || !payload.title.trim())
        return Promise.reject(new Error('กรุณากรอกชื่อรายการ'));

      // Auto-register category
      if (!store.categories[type]) store.categories[type] = [];
      store.categories[type] = unique([...store.categories[type], payload.category]);

      const id = (type === 'income' ? 'INC' : 'EXP') + '-' +
        Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000);
      const txn = {
        id,
        created_at: nowBangkok(),
        date: dateBangkok(),
        time: timeBangkok(),
        type,
        category: payload.category,
        title: (payload.title || '').trim(),
        amount,
        note: (payload.note || '').trim(),
        payment_method: payload.payment_method || 'โอน',
        project: (payload.project || '').trim(),
        client: (payload.client || '').trim(),
        slip_url: '',
        status: payload.status || 'paid',
        updated_at: nowBangkok(),
        source: 'preview',
      };
      store.txns.unshift(txn);
      saveStore(store);
      const dashboard = buildDashboard(store.txns);
      return Promise.resolve({
        ok: true,
        message: type === 'income' ? 'บันทึกรายรับแล้ว (Preview)' : 'บันทึกรายจ่ายแล้ว (Preview)',
        transaction: txn,
        dashboard,
        recent: store.txns.slice(0, 25),
        categories: store.categories,
      });
    }

    return Promise.resolve({ ok: true, categories: store.categories, dashboard: buildDashboard(store.txns), recent: store.txns.slice(0, 25) });
  }

  /* ── Dashboard builder (client-side) ── */
  function buildDashboard(txns) {
    const todayStr = dateBangkok();

    const sum = (list) => list.reduce((acc, t) => {
      if (t.type === 'income') acc.income += Number(t.amount || 0);
      if (t.type === 'expense') acc.expense += Number(t.amount || 0);
      acc.net = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, net: 0 });

    const todayTxns = txns.filter(t => t.date === todayStr);

    // Week: Mon–Sun
    const now = new Date(todayStr);
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek + 1);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const weekTxns = txns.filter(t => t.date >= weekStartStr && t.date <= weekEndStr);

    // Month
    const monthPrefix = todayStr.slice(0, 7);
    const monthTxns = txns.filter(t => t.date && t.date.startsWith(monthPrefix));

    // By category
    const byCat = (type) => {
      const map = {};
      txns.filter(t => t.type === type && t.status !== 'cancelled').forEach(t => {
        const key = t.category || 'ไม่ระบุ';
        map[key] = (map[key] || 0) + Number(t.amount || 0);
      });
      return Object.keys(map).sort().map(c => ({ category: c, amount: map[c] }));
    };

    // Monthly series
    const seriesMap = {};
    txns.filter(t => t.status !== 'cancelled').forEach(t => {
      if (!t.date) return;
      const key = t.date.slice(0, 7);
      if (!seriesMap[key]) seriesMap[key] = { month: key, income: 0, expense: 0, net: 0 };
      if (t.type === 'income') seriesMap[key].income += Number(t.amount || 0);
      if (t.type === 'expense') seriesMap[key].expense += Number(t.amount || 0);
      seriesMap[key].net = seriesMap[key].income - seriesMap[key].expense;
    });

    return {
      today: sum(todayTxns),
      week: sum(weekTxns),
      month: sum(monthTxns),
      all: sum(txns),
      missingSlipCount: txns.filter(t => !t.slip_url && t.status !== 'cancelled').length,
      expenseByCategory: byCat('expense'),
      incomeByCategory: byCat('income'),
      monthlySeries: Object.values(seriesMap).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /* ── GAS bridge (auto-fallback to mock) ── */
  function gas(fn, payload) {
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          [fn](payload);
      });
    }
    return mockApi(fn, payload);
  }

  /* ── File to base64 payload ── */
  function fileToPayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: String(reader.result).split(',')[1],
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Navigation ── */
  function navigate(page) {
    $$('.page').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    $$('.nav-btn').forEach(el => el.classList.toggle('active', el.dataset.nav === page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Loading & UI state ── */
  function setLoading(value, message) {
    state.loading = value;
    const syncBtn = $('#syncBtn');
    if (syncBtn) syncBtn.disabled = value;
    if (value && message) setStatus(message);
  }

  function setStatus(text, type) {
    const pill = $('#syncStatus');
    if (!pill) return;
    pill.textContent = text;
    pill.className = 'status-pill' + (type ? ' ' + type : '');
  }

  /* ── Toast ── */
  let _toastTimer;
  function toast(message, type) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ── Live clock ── */
  function startClock() {
    const tick = () => {
      const el = $('#liveClock');
      if (!el) return;
      el.textContent = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(new Date());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ── Render functions ── */
  function renderAll() {
    renderCategories();
    renderDashboard();
    renderRecent();
    renderReports();
  }

  function renderCategories() {
    ['income', 'expense'].forEach(type => {
      const form = $(`#${type}Form`);
      if (!form) return;
      const select = $('select[name="category"]', form);
      if (!select) return;
      const current = select.value;
      select.innerHTML = '';
      (state.categories[type] || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
      if (current) select.value = current;
    });
  }

  function renderDashboard() {
    const d = state.dashboard;
    if (!d) return;
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('#todayIncome', money(d.today.income));
    set('#todayExpense', money(d.today.expense));
    set('#monthIncome', money(d.month.income));
    set('#monthExpense', money(d.month.expense));
    set('#monthNet', money(d.month.net));
    set('#missingSlipCount', d.missingSlipCount || 0);
    set('#incomeTodayMini', money(d.today.income));
    set('#incomeWeekMini', money(d.week.income));
    set('#incomeMonthMini', money(d.month.income));
    set('#expenseTodayMini', money(d.today.expense));
    set('#expenseWeekMini', money(d.week.expense));
    set('#expenseMonthMini', money(d.month.expense));
  }

  function renderRecent() {
    const list = $('#recentList');
    if (!list) return;
    const data = state.recent || [];
    if (!data.length) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">📋</div>ยังไม่มีรายการ<br><small>เพิ่มรายรับหรือรายจ่ายได้เลย</small></div>';
      return;
    }
    list.innerHTML = data.map(txn => {
      const sign = txn.type === 'income' ? '+' : '-';
      const cls = txn.type === 'income' ? 'income' : 'expense';
      const slip = txn.slip_url
        ? ` · <a href="${escapeHtml(txn.slip_url)}" target="_blank" rel="noopener">ดูสลิป</a>` : '';
      const noteHtml = txn.note ? `<div class="txn-meta">${escapeHtml(txn.note)}</div>` : '';
      return `
        <article class="txn-item">
          <div style="flex:1;min-width:0">
            <strong>${escapeHtml(txn.title || '-')}</strong>
            <div class="txn-meta">${escapeHtml(txn.category || '-')} · ${escapeHtml(txn.date || '')} ${escapeHtml(txn.time || '')}${slip}</div>
            ${noteHtml}
          </div>
          <div class="txn-amount ${cls}">${sign}${money(txn.amount)}</div>
        </article>`;
    }).join('');
  }

  function renderReports() {
    const d = state.dashboard;
    if (!d) return;
    renderMonthlyBars(d.monthlySeries || []);
    renderCategoryList('#expenseCats', d.expenseByCategory || []);
    renderCategoryList('#incomeCats', d.incomeByCategory || []);
  }

  function renderMonthlyBars(series) {
    const el = $('#monthlyBars');
    if (!el) return;
    if (!series.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div>ยังไม่มีข้อมูลสำหรับกราฟ</div>';
      return;
    }
    const max = Math.max(...series.flatMap(s => [s.income, s.expense, 1]));
    el.innerHTML = series.map(item => `
      <div class="bar-row">
        <div class="bar-label">
          <span>${escapeHtml(item.month)}</span>
          <b>${money(item.net)}</b>
        </div>
        <div class="bars">
          <div class="bar income" style="width:${Math.max(2, item.income / max * 100).toFixed(1)}%" title="รายรับ ${money(item.income)}"></div>
          <div class="bar expense" style="width:${Math.max(2, item.expense / max * 100).toFixed(1)}%" title="รายจ่าย ${money(item.expense)}"></div>
        </div>
      </div>`).join('');
  }

  function renderCategoryList(selector, rows) {
    const el = $(selector);
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="empty">ยังไม่มีข้อมูล</div>';
      return;
    }
    const max = Math.max(...rows.map(r => r.amount), 1);
    el.innerHTML = rows.map(row => `
      <div class="category-row">
        <span>${escapeHtml(row.category)}</span>
        <strong>${money(row.amount)}</strong>
      </div>`).join('');
  }

  /* ── Load data ── */
  async function loadData() {
    if (state.loading) return;
    setLoading(true, 'กำลัง Sync...');
    setStatus('กำลัง Sync...', 'syncing');
    try {
      const data = await gas('getBootstrapData');
      state.categories = data.categories || { income: [], expense: [] };
      state.dashboard = data.dashboard || null;
      state.recent = data.recent || [];
      renderAll();
      setStatus('พร้อมใช้งาน');
    } catch (err) {
      console.error('[PEPS] loadData error:', err);
      setStatus('โหลดไม่สำเร็จ', 'error');
      toast('โหลดข้อมูลไม่สำเร็จ: ' + (err.message || String(err)), 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ── Submit form ── */
  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.dataset.type;
    const fd = new FormData(form);

    const payload = {
      type,
      amount: fd.get('amount'),
      category: fd.get('category'),
      title: (fd.get('title') || '').trim(),
      note: (fd.get('note') || '').trim(),
      payment_method: fd.get('payment_method') || 'โอน',
      project: (fd.get('project') || '').trim(),
      client: (fd.get('client') || '').trim(),
      status: fd.get('status') || 'paid',
    };

    const file = fd.get('slip');
    if (file && file.name && file.size > 0) {
      if (file.size > MAX_SLIP_SIZE) return toast('ไฟล์ใหญ่เกิน 5 MB', 'error');
      try { payload.slip = await fileToPayload(file); } catch (_) { /* skip */ }
    }

    setLoading(true, type === 'income' ? 'กำลังบันทึกรายรับ...' : 'กำลังบันทึกรายจ่าย...');
    try {
      const res = await gas('addTransaction', payload);
      state.dashboard = res.dashboard;
      state.recent = res.recent;
      state.categories = res.categories;
      form.reset();
      renderAll();
      toast(res.message || 'บันทึกแล้ว', 'success');
      navigate('dashboard');
    } catch (err) {
      console.error('[PEPS] addTransaction error:', err);
      toast(err.message || String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ── Add category inline ── */
  async function promptAddCategory(type) {
    const label = type === 'income' ? 'เพิ่มหัวข้อรายรับใหม่' : 'เพิ่มหัวข้อรายจ่ายใหม่';
    const category = window.prompt(label);
    if (!category || !category.trim()) return;
    setLoading(true, 'กำลังเพิ่มหมวดหมู่...');
    try {
      const res = await gas('addCategory', { type, category: category.trim() });
      state.categories = res.categories;
      renderCategories();
      toast('เพิ่มหมวดหมู่แล้ว', 'success');
    } catch (err) {
      toast(err.message || String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ── Bind events ── */
  function bindNavigation() {
    $$('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
    const syncBtn = $('#syncBtn');
    if (syncBtn) syncBtn.addEventListener('click', loadData);
  }

  function bindForms() {
    ['incomeForm', 'expenseForm'].forEach(id => {
      const form = $('#' + id);
      if (!form) return;
      form.addEventListener('submit', handleSubmit);

      const addCatBtn = $('.add-inline-category', form);
      if (addCatBtn) {
        addCatBtn.addEventListener('click', () => promptAddCategory(form.dataset.type));
      }

      const fileInput = $('input[name="slip"]', form);
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          if (fileInput.files[0] && fileInput.files[0].size > MAX_SLIP_SIZE) {
            toast('ไฟล์ใหญ่เกิน 5 MB', 'error');
            fileInput.value = '';
          }
        });
      }
    });
  }

  function bindSettings() {
    const addBtn = $('#addCategoryBtn');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const type = $('#newCategoryType').value;
        const category = ($('#newCategoryName').value || '').trim();
        if (!category) return toast('กรอกชื่อหมวดหมู่ก่อน', 'error');
        setLoading(true, 'กำลังเพิ่มหมวดหมู่...');
        try {
          const res = await gas('addCategory', { type, category });
          state.categories = res.categories;
          renderCategories();
          $('#newCategoryName').value = '';
          toast('เพิ่มหมวดหมู่แล้ว', 'success');
        } catch (err) {
          toast(err.message || String(err), 'error');
        } finally {
          setLoading(false);
        }
      });
    }

    const clearBtn = $('#clearDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!window.confirm('ลบข้อมูล Preview ทั้งหมด? (localStorage จะถูก reset)')) return;
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      });
    }
  }

  /* ── Init ── */
  function init() {
    bindNavigation();
    bindForms();
    bindSettings();
    startClock();
    loadData();
    // Auto-refresh every 30s when in GAS production mode
    setInterval(() => {
      if (window.google && google.script && google.script.run) loadData();
    }, 30000);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
