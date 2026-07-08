/**
 * ═══════════════════════════════════════════════════════
 * WANDERSPLIT — App Logic
 * ═══════════════════════════════════════════════════════
 *
 * Modules:
 *   1.  STATE            — single source of truth
 *   2.  STORAGE          — LocalStorage persistence
 *   3.  HELPERS          — pure utility functions
 *   4.  DOM REFS         — cached element references
 *   5.  RENDER           — pure DOM-update functions
 *   6.  SETTLEMENT       — debt-minimization algorithm
 *   7.  TOAST            — notification system
 *   8.  MODAL            — confirmation dialog
 *   9.  THEME            — dark/light mode
 *  10.  TRAVELER LOGIC   — add / delete travelers
 *  11.  EXPENSE LOGIC    — add / delete expenses
 *  12.  NAVBAR           — scroll, active-link, mobile
 *  13.  INTERSECTION OBS — scroll reveal animations
 *  14.  BACK TO TOP      — floating button
 *  15.  INIT             — bootstrap
 */

'use strict';

/* ══════════════════════════════════════
   1. STATE
══════════════════════════════════════ */
const state = {
  travelers: [],   // string[]
  expenses:  [],   // Expense[]
  theme:     'light',
};

/**
 * @typedef {Object} Expense
 * @property {string}   id
 * @property {string}   title
 * @property {number}   amount
 * @property {string}   currency
 * @property {string}   symbol
 * @property {string}   paidBy
 * @property {string[]} splitWith
 * @property {number}   timestamp
 */

/* ══════════════════════════════════════
   2. STORAGE
══════════════════════════════════════ */
const STORAGE_KEY = 'wandersplit_lp_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.travelers)) state.travelers = saved.travelers;
    if (Array.isArray(saved.expenses))  state.expenses  = saved.expenses;
    if (saved.theme === 'dark' || saved.theme === 'light') state.theme = saved.theme;
  } catch (e) {
    console.warn('Wandersplit: failed to parse saved state.', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      travelers: state.travelers,
      expenses:  state.expenses,
      theme:     state.theme,
    }));
  } catch (e) {
    console.warn('Wandersplit: failed to save state.', e);
  }
}

/* ══════════════════════════════════════
   3. HELPERS
══════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(amount, symbol = '$') {
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function titleCase(str) {
  return str
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Infer a representative emoji from an expense title. Falls back to ✦. */
function guessEmoji(title) {
  const t = title.toLowerCase();
  if (/hotel|hostel|riad|villa|airbnb|lodg|accomm|sleep|inn|camp/.test(t))             return '🏨';
  if (/food|dinner|lunch|breakfast|eat|restaur|cafe|coffee|bar|drink|meal|pizza/.test(t)) return '🍽️';
  if (/taxi|uber|lyft|transport|bus|train|metro|tram|drive|ride|flight|plane|ferry/.test(t)) return '🚕';
  if (/museum|ticket|tour|entry|sight|show|event|concert|gallery|park/.test(t))         return '🎟️';
  if (/shop|market|grocery|supermarket|souvenir|buy|purchase/.test(t))                  return '🛍️';
  if (/beach|swim|surf|dive|snork|ocean|sea/.test(t))                                   return '🏖️';
  if (/hike|trek|mount|trail|walk/.test(t))                                             return '🥾';
  if (/spa|massage|wellness|gym/.test(t))                                               return '💆';
  if (/fuel|gas|petrol|car/.test(t))                                                    return '⛽';
  return '✦';
}

/* ══════════════════════════════════════
   4. DOM REFS
══════════════════════════════════════ */
const $ = id => document.getElementById(id);

const D = {
  // Nav
  mainNav:          $('mainNav'),
  navLinks:         $('navLinks'),
  navBurger:        $('navBurger'),
  navOverlay:       $('navOverlay'),
  themeToggle:      $('themeToggle'),

  // Traveler
  travelerInput:    $('travelerInput'),
  addTravelerBtn:   $('addTravelerBtn'),
  travelerList:     $('travelerList'),
  travelerCount:    $('travelerCount'),
  travelerHint:     $('travelerHint'),

  // Expense form
  expenseTitle:     $('expenseTitle'),
  expenseAmount:    $('expenseAmount'),
  expenseCurrency:  $('expenseCurrency'),
  currencySymbol:   $('currencySymbol'),
  expensePaidBy:    $('expensePaidBy'),
  splitTypeGroup:   $('splitTypeGroup'),
  customSplitGroup: $('customSplitGroup'),
  splitCheckboxes:  $('splitCheckboxes'),
  addExpenseBtn:    $('addExpenseBtn'),

  // Lists
  expenseList:      $('expenseList'),
  expenseEmpty:     $('expenseEmpty'),
  totalBadge:       $('totalBadge'),
  clearExpensesBtn: $('clearExpensesBtn'),

  // Settlement
  settlementList:   $('settlementList'),
  settlementEmpty:  $('settlementEmpty'),
  calcBtn:          $('calcBtn'),

  // UI
  toastContainer:   $('toastContainer'),
  modalOverlay:     $('modalOverlay'),
  modalTitle:       $('modalTitle'),
  modalBody:        $('modalBody'),
  modalConfirm:     $('modalConfirm'),
  modalCancel:      $('modalCancel'),
  backToTop:        $('backToTop'),
};

/* ══════════════════════════════════════
   5. RENDER
══════════════════════════════════════ */

/** Full traveler panel re-render. */
function renderTravelers() {
  const { travelers } = state;

  D.travelerCount.textContent = travelers.length;
  D.travelerHint.style.display = travelers.length > 0 ? 'none' : 'block';

  D.travelerList.innerHTML = '';
  travelers.forEach(name => {
    const li = document.createElement('li');
    li.className = 'traveler-item';
    li.dataset.name = name;
    li.innerHTML = `
      <span class="traveler-name-wrap">
        <span class="traveler-avatar">${initials(name)}</span>
        ${escapeHtml(name)}
      </span>
      <button class="icon-btn" data-action="del-traveler" data-name="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>`;
    D.travelerList.appendChild(li);
  });

  // Sync paidBy dropdown
  const prev = D.expensePaidBy.value;
  D.expensePaidBy.innerHTML = '<option value="" disabled>Select traveler…</option>';
  travelers.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === prev) opt.selected = true;
    D.expensePaidBy.appendChild(opt);
  });
  if (!travelers.includes(prev)) D.expensePaidBy.value = '';

  renderSplitCheckboxes();
}

/** Re-build the custom split checkbox panel. */
function renderSplitCheckboxes() {
  D.splitCheckboxes.innerHTML = '';
  state.travelers.forEach(name => {
    const label = document.createElement('label');
    label.className = 'checkbox-pill';
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(name)}" checked/>
      ${escapeHtml(name)}`;
    D.splitCheckboxes.appendChild(label);
  });
}

/** Full expense list re-render + recalculate settlement. */
function renderExpenses() {
  const { expenses } = state;
  const isEmpty = expenses.length === 0;

  D.expenseEmpty.style.display = isEmpty ? 'flex' : 'none';
  D.clearExpensesBtn.style.display = isEmpty ? 'none' : 'inline-flex';

  if (expenses.length > 0) {
    const grouped = {};
    expenses.forEach(e => {
      grouped[e.symbol] = (grouped[e.symbol] ?? 0) + e.amount;
    });
    D.totalBadge.textContent = 'Total: ' + Object.entries(grouped)
      .map(([sym, amt]) => `${sym}${amt.toFixed(2)}`)
      .join(' + ');
  } else {
    D.totalBadge.textContent = 'Total: $0.00';
  }

  D.expenseList.innerHTML = '';
  [...expenses]
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((exp, i) => {
      const li = document.createElement('li');
      li.className = 'expense-item';
      li.dataset.id = exp.id;
      li.style.animationDelay = `${i * 35}ms`;

      const allTravelers = exp.splitWith.length === state.travelers.length;
      const splitLabel = allTravelers ? 'everyone' : exp.splitWith.join(', ');

      li.innerHTML = `
        <div class="expense-emoji">${guessEmoji(exp.title)}</div>
        <div class="expense-info">
          <div class="expense-title-text">${escapeHtml(exp.title)}</div>
          <div class="expense-meta">
            Paid by <strong>${escapeHtml(exp.paidBy)}</strong>
            &middot; Split with ${escapeHtml(splitLabel)}
          </div>
        </div>
        <div class="expense-right">
          <span class="expense-amount">${formatAmount(exp.amount, exp.symbol)}</span>
          <button class="icon-btn" data-action="del-expense" data-id="${exp.id}" aria-label="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>`;
      D.expenseList.appendChild(li);
    });

  renderSettlement();
}

/* ══════════════════════════════════════
   6. SETTLEMENT ENGINE
   ──────────────────────────────────────
   Algorithm: Minimum-Transactions Greedy

   For each currency:
   1. Build a net-balance map (credit payers, debit sharers).
   2. Split into positive (owed) and negative (owes) lists.
   3. Repeatedly match the largest creditor with the largest debtor,
      settle the minimum of their two absolute balances, repeat
      until all near-zero.

   This doesn't always achieve the absolute global minimum but
   performs perfectly for the practical n ≤ ~20 range.
══════════════════════════════════════ */
function computeSettlements() {
  if (state.travelers.length < 2 || state.expenses.length === 0) return [];

  // Group by currency code
  const byCurrency = {};

  state.expenses.forEach(exp => {
    if (!byCurrency[exp.currency]) {
      byCurrency[exp.currency] = {
        symbol:   exp.symbol,
        balances: Object.fromEntries(state.travelers.map(t => [t, 0])),
      };
    }
    const { balances } = byCurrency[exp.currency];
    const perHead = exp.amount / exp.splitWith.length;

    balances[exp.paidBy] = (balances[exp.paidBy] ?? 0) + exp.amount;
    exp.splitWith.forEach(name => {
      balances[name] = (balances[name] ?? 0) - perHead;
    });
  });

  const EPSILON = 0.005;
  const result = [];

  Object.values(byCurrency).forEach(({ symbol, balances }) => {
    const bal = { ...balances };

    for (;;) {
      const entries = Object.entries(bal).filter(([, v]) => Math.abs(v) > EPSILON);
      if (entries.length < 2) break;

      const creditor = entries.reduce((a, b) => b[1] > a[1] ? b : a);
      const debtor   = entries.reduce((a, b) => b[1] < a[1] ? b : a);

      if (creditor[1] <= EPSILON || debtor[1] >= -EPSILON) break;

      const amt = Math.min(creditor[1], -debtor[1]);
      result.push({ from: debtor[0], to: creditor[0], amount: amt, symbol });

      bal[creditor[0]] -= amt;
      bal[debtor[0]]   += amt;

      if (Math.abs(bal[creditor[0]]) < EPSILON) delete bal[creditor[0]];
      if (Math.abs(bal[debtor[0]])   < EPSILON) delete bal[debtor[0]];
    }
  });

  return result;
}

function renderSettlement() {
  const settlements = computeSettlements();

  if (settlements.length === 0) {
    D.settlementEmpty.style.display = 'flex';
    D.settlementList.innerHTML = '';
    return;
  }

  D.settlementEmpty.style.display = 'none';
  D.settlementList.innerHTML = '';

  settlements.forEach(({ from, to, amount, symbol }, i) => {
    const li = document.createElement('li');
    li.className = 'settlement-item';
    li.style.animationDelay = `${i * 55}ms`;
    li.innerHTML = `
      <span class="settle-av">${initials(from)}</span>
      <div class="settle-text">
        <strong>${escapeHtml(from)}</strong> owes <strong>${escapeHtml(to)}</strong>
      </div>
      <span class="settle-arrow">→</span>
      <span class="settle-av receive">${initials(to)}</span>
      <span class="settle-amount">${formatAmount(amount, symbol)}</span>`;
    D.settlementList.appendChild(li);
  });
}

/* ══════════════════════════════════════
   7. TOAST
══════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3200) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span>${escapeHtml(message)}`;
  D.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ══════════════════════════════════════
   8. MODAL
══════════════════════════════════════ */
let _modalResolve = null;

function confirmModal(title, body) {
  D.modalTitle.textContent = title;
  D.modalBody.textContent  = body;
  D.modalOverlay.classList.add('active');
  return new Promise(resolve => { _modalResolve = resolve; });
}

function closeModal(result) {
  D.modalOverlay.classList.remove('active');
  if (_modalResolve) { _modalResolve(result); _modalResolve = null; }
}

D.modalConfirm.addEventListener('click', () => closeModal(true));
D.modalCancel.addEventListener('click',  () => closeModal(false));
D.modalOverlay.addEventListener('click', e => {
  if (e.target === D.modalOverlay) closeModal(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && D.modalOverlay.classList.contains('active')) closeModal(false);
});

/* ══════════════════════════════════════
   9. THEME
══════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  state.theme = theme;
}

function toggleTheme() {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
  saveState();
}

D.themeToggle.addEventListener('click', toggleTheme);

/* ══════════════════════════════════════
   10. TRAVELER LOGIC
══════════════════════════════════════ */
function addTraveler() {
  const raw = D.travelerInput.value.trim();
  if (!raw) { showToast('Please enter a name.', 'error'); return; }
  if (raw.length > 32) { showToast('Name is too long (max 32 chars).', 'error'); return; }

  const name = titleCase(raw);
  if (state.travelers.includes(name)) {
    showToast(`"${name}" is already on the trip.`, 'error'); return;
  }

  state.travelers.push(name);
  saveState();
  renderTravelers();
  renderExpenses();
  D.travelerInput.value = '';
  D.travelerInput.focus();
  showToast(`${name} added to the trip!`, 'success');
}

async function deleteTraveler(name) {
  const used = state.expenses.filter(
    e => e.paidBy === name || e.splitWith.includes(name)
  );

  const msg = used.length > 0
    ? `${name} appears in ${used.length} expense(s). Removing them will also delete those expenses.`
    : `Remove ${name} from the trip?`;

  const ok = await confirmModal('Remove Traveler', msg);
  if (!ok) return;

  state.travelers = state.travelers.filter(t => t !== name);
  state.expenses  = state.expenses.filter(
    e => e.paidBy !== name && !e.splitWith.includes(name)
  );
  saveState();
  renderTravelers();
  renderExpenses();
  showToast(`${name} removed.`, 'info');
}

D.addTravelerBtn.addEventListener('click', addTraveler);
D.travelerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTraveler(); });
D.travelerList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="del-traveler"]');
  if (btn) deleteTraveler(btn.dataset.name);
});

/* ══════════════════════════════════════
   11. EXPENSE LOGIC
══════════════════════════════════════ */

// Toggle custom split panel
D.splitTypeGroup.addEventListener('change', e => {
  if (e.target.name === 'splitType') {
    D.customSplitGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
  }
});

// Live currency symbol update
D.expenseCurrency.addEventListener('change', () => {
  const opt = D.expenseCurrency.selectedOptions[0];
  D.currencySymbol.textContent = opt.dataset.symbol || opt.value;
});

function addExpense() {
  if (state.travelers.length < 2) {
    showToast('Add at least two travelers first.', 'error'); return;
  }

  const title    = D.expenseTitle.value.trim();
  const amount   = parseFloat(D.expenseAmount.value);
  const paidBy   = D.expensePaidBy.value;
  const selOpt   = D.expenseCurrency.selectedOptions[0];
  const currency = selOpt.value;
  const symbol   = selOpt.dataset.symbol || currency;

  if (!title) {
    showToast('Please enter an expense title.', 'error');
    D.expenseTitle.focus(); return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than 0.', 'error');
    D.expenseAmount.focus(); return;
  }
  if (!paidBy) {
    showToast('Please select who paid.', 'error');
    D.expensePaidBy.focus(); return;
  }

  const splitType = document.querySelector('input[name="splitType"]:checked').value;
  let splitWith;

  if (splitType === 'equal') {
    splitWith = [...state.travelers];
  } else {
    splitWith = [...D.splitCheckboxes.querySelectorAll('input:checked')].map(cb => cb.value);
    if (splitWith.length === 0) {
      showToast('Select at least one person to split with.', 'error'); return;
    }
  }

  /** @type {Expense} */
  const expense = {
    id: uid(),
    title,
    amount,
    currency,
    symbol,
    paidBy,
    splitWith,
    timestamp: Date.now(),
  };

  state.expenses.push(expense);
  saveState();
  renderExpenses();

  D.expenseTitle.value  = '';
  D.expenseAmount.value = '';
  D.expenseTitle.focus();
  showToast(`"${title}" recorded!`, 'success');
}

async function deleteExpense(id) {
  const exp = state.expenses.find(e => e.id === id);
  if (!exp) return;

  const ok = await confirmModal(
    'Delete Expense',
    `Remove "${exp.title}" (${formatAmount(exp.amount, exp.symbol)})?`
  );
  if (!ok) return;

  // Animate item out before removing from state
  const li = D.expenseList.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    li.style.opacity = '0';
    li.style.transform = 'scale(0.96)';
    await new Promise(r => setTimeout(r, 220));
  }

  state.expenses = state.expenses.filter(e => e.id !== id);
  saveState();
  renderExpenses();
  showToast('Expense deleted.', 'info');
}

async function clearAllExpenses() {
  if (state.expenses.length === 0) return;
  const ok = await confirmModal(
    'Clear All Expenses',
    `Permanently delete all ${state.expenses.length} expense(s)? This cannot be undone.`
  );
  if (!ok) return;
  state.expenses = [];
  saveState();
  renderExpenses();
  showToast('All expenses cleared.', 'info');
}

D.addExpenseBtn.addEventListener('click', addExpense);
D.clearExpensesBtn.addEventListener('click', clearAllExpenses);
D.calcBtn.addEventListener('click', renderSettlement);

D.expenseList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="del-expense"]');
  if (btn) deleteExpense(btn.dataset.id);
});

/* ══════════════════════════════════════
   12. NAVBAR
══════════════════════════════════════ */

// Scroll: add shadow + highlight active link
const navLinkEls = document.querySelectorAll('.nav-link');
const sections   = document.querySelectorAll('section[id], div[id]');

function updateNav() {
  const scrollY = window.scrollY;

  D.mainNav.classList.toggle('scrolled', scrollY > 20);

  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 100;
    if (scrollY >= top) current = sec.id;
  });

  navLinkEls.forEach(link => {
    const href = link.getAttribute('href')?.replace('#', '');
    link.classList.toggle('active', href === current);
  });

  D.backToTop.classList.toggle('visible', scrollY > 400);
}

window.addEventListener('scroll', updateNav, { passive: true });

// Mobile nav
function openNav() {
  D.navLinks.classList.add('open');
  D.navBurger.classList.add('open');
  D.navBurger.setAttribute('aria-expanded', 'true');
  D.navOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  D.navLinks.classList.remove('open');
  D.navBurger.classList.remove('open');
  D.navBurger.setAttribute('aria-expanded', 'false');
  D.navOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

D.navBurger.addEventListener('click', () => {
  D.navLinks.classList.contains('open') ? closeNav() : openNav();
});

D.navOverlay.addEventListener('click', closeNav);

// Close mobile nav when a link is clicked
D.navLinks.addEventListener('click', e => {
  if (e.target.closest('.nav-link')) closeNav();
});

/* ══════════════════════════════════════
   13. SCROLL REVEAL (Intersection Observer)
══════════════════════════════════════ */
function initReveal() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // fire once
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════
   14. BACK TO TOP
══════════════════════════════════════ */
D.backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ══════════════════════════════════════
   15. INIT
══════════════════════════════════════ */
function init() {
  loadState();
  applyTheme(state.theme);

  // Sync currency symbol with default selection
  const defOpt = D.expenseCurrency.selectedOptions[0];
  D.currencySymbol.textContent = defOpt?.dataset.symbol ?? '$';

  renderTravelers();
  renderExpenses();
  initReveal();
  updateNav();

  console.info('Wandersplit initialized.', {
    travelers: state.travelers.length,
    expenses:  state.expenses.length,
    theme:     state.theme,
  });
}

document.addEventListener('DOMContentLoaded', init);
