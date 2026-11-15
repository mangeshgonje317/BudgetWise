// ========== Data & State ==========
const CATEGORIES = {
    expense: [
        { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
        { name: 'Transportation', icon: '🚗', color: '#f59e0b' },
        { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
        { name: 'Entertainment', icon: '🎮', color: '#ec4899' },
        { name: 'Bills & Utilities', icon: '💡', color: '#3b82f6' },
        { name: 'Health', icon: '🏥', color: '#10b981' },
        { name: 'Education', icon: '📚', color: '#6366f1' },
        { name: 'Rent', icon: '🏠', color: '#0ea5e9' },
        { name: 'Insurance', icon: '🛡️', color: '#14b8a6' },
        { name: 'Personal Care', icon: '💆', color: '#f472b6' },
        { name: 'Gifts & Donations', icon: '🎁', color: '#a855f7' },
        { name: 'Other Expense', icon: '📦', color: '#64748b' },
    ],
    income: [
        { name: 'Salary', icon: '💼', color: '#10b981' },
        { name: 'Freelance', icon: '💻', color: '#3b82f6' },
        { name: 'Business', icon: '🏢', color: '#6366f1' },
        { name: 'Investment', icon: '📈', color: '#f59e0b' },
        { name: 'Rental Income', icon: '🏘️', color: '#0ea5e9' },
        { name: 'Refund', icon: '💸', color: '#8b5cf6' },
        { name: 'Other Income', icon: '💰', color: '#64748b' },
    ]
};

const PAYMENT_ICONS = {
    cash: '💵',
    card: '💳',
    upi: '📱',
    bank: '🏦',
    other: '📦'
};

let state = {
    transactions: [],
    budgets: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    currentPage: 1,
    itemsPerPage: 15,
    deleteId: null,
};

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEventListeners();
    updateCurrentDate();
    updateMonthDisplay();
    renderAll();
});

function loadData() {
    try {
        const txData = localStorage.getItem('budgetwise_transactions');
        const budgetData = localStorage.getItem('budgetwise_budgets');
        if (txData) state.transactions = JSON.parse(txData);
        if (budgetData) state.budgets = JSON.parse(budgetData);
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function saveData() {
    localStorage.setItem('budgetwise_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('budgetwise_budgets', JSON.stringify(state.budgets));
}

// ========== Event Listeners ==========
function initEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.querySelectorAll('.btn-link[data-view]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));

    // Mobile menu
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Transaction modal
    document.getElementById('addTransactionBtn').addEventListener('click', () => openTransactionModal());
    document.getElementById('closeModal').addEventListener('click', closeTransactionModal);
    document.getElementById('cancelModal').addEventListener('click', closeTransactionModal);
    document.getElementById('transactionForm').addEventListener('submit', saveTransaction);

    // Type toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            populateCategorySelect(btn.dataset.type);
        });
    });

    // Budget modal
    document.getElementById('addBudgetBtn').addEventListener('click', openBudgetModal);
    document.getElementById('closeBudgetModal').addEventListener('click', closeBudgetModal);
    document.getElementById('cancelBudgetModal').addEventListener('click', closeBudgetModal);
    document.getElementById('budgetForm').addEventListener('submit', saveBudget);

    // Confirm modal
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDelete').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteTransaction);

    // Filters
    document.getElementById('searchInput').addEventListener('input', debounce(renderTransactionTable, 300));
    document.getElementById('filterType').addEventListener('change', renderTransactionTable);
    document.getElementById('filterCategory').addEventListener('change', renderTransactionTable);
    document.getElementById('sortBy').addEventListener('change', renderTransactionTable);

    // Export / Import
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importData);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openTransactionModal();
        }
    });
}

// ========== Navigation ==========
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`${viewName}View`).classList.add('active');
    document.querySelector(`.nav-item[data-view="${viewName}"]`).classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        transactions: 'Transactions',
        budgets: 'Budgets',
        reports: 'Reports'
    };
    document.getElementById('viewTitle').textContent = titles[viewName];

    if (viewName === 'transactions') {
        populateFilterCategories();
        renderTransactionTable();
    } else if (viewName === 'budgets') {
        renderBudgets();
    } else if (viewName === 'reports') {
        renderReports();
    } else {
        renderDashboard();
    }
}

// ========== Utility ==========
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getCategoryInfo(categoryName, type) {
    const cats = CATEGORIES[type] || [...CATEGORIES.expense, ...CATEGORIES.income];
    return cats.find(c => c.name === categoryName) || { icon: '📦', color: '#64748b' };
}

function updateCurrentDate() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function updateMonthDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent =
        `${monthNames[state.currentMonth]} ${state.currentYear}`;
}

function changeMonth(delta) {
    state.currentMonth += delta;
    if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
    } else if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
    }
    updateMonthDisplay();
    renderAll();
}

function getMonthTransactions(month = state.currentMonth, year = state.currentYear) {
    return state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== Render All ==========
function renderAll() {
    renderDashboard();
    renderTransactionTable();
    renderBudgets();
}

// ========== Dashboard ==========
function renderDashboard() {
    const txs = getMonthTransactions();
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;

    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('savingsRate').textContent = savingsRate.toFixed(1) + '%';

    // Balance card color
    const balanceEl = document.getElementById('totalBalance');
    balanceEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';

    // Trends (compare with previous month)
    let prevMonth = state.currentMonth - 1;
    let prevYear = state.currentYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear--; }

    const prevTxs = getMonthTransactions(prevMonth, prevYear);
    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    updateTrend('incomeTrend', income, prevIncome, true);
    updateTrend('expenseTrend', expenses, prevExpenses, false);

    const prevBalance = prevIncome - prevExpenses;
    const balanceTrendEl = document.getElementById('balanceTrend');
    if (prevBalance === 0) {
        balanceTrendEl.textContent = 'N/A';
        balanceTrendEl.className = 'card-trend';
    } else {
        const pct = ((balance - prevBalance) / Math.abs(prevBalance) * 100).toFixed(0);
        balanceTrendEl.textContent = (pct >= 0 ? '+' : '') + pct + '%';
        balanceTrendEl.className = `card-trend ${balance >= prevBalance ? 'up' : 'down'}`;
    }

    // Recent transactions
    renderRecentTransactions(txs);

    // Charts
    renderIncomeExpenseChart(txs);
    renderCategoryChart(txs);
}

function updateTrend(elementId, current, previous, higherIsGood) {
    const el = document.getElementById(elementId);
    if (previous === 0) {
        el.textContent = current > 0 ? 'New' : '-';
        el.className = `card-trend ${current > 0 ? (higherIsGood ? 'up' : 'down') : ''}`;
        return;
    }
    const pct = ((current - previous) / previous * 100).toFixed(0);
    el.textContent = (pct >= 0 ? '+' : '') + pct + '%';
    const isPositive = higherIsGood ? pct >= 0 : pct <= 0;
    el.className = `card-trend ${isPositive ? 'up' : 'down'}`;
}

function renderRecentTransactions(txs) {
    const container = document.getElementById('recentTransactions');
    const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>No transactions this month. Click "Add Transaction" to get started!</p>
            </div>`;
        return;
    }

    container.innerHTML = recent.map(tx => {
        const cat = getCategoryInfo(tx.category, tx.type);
        return `
        <div class="transaction-item">
            <div class="tx-icon" style="background: ${cat.color}15">${cat.icon}</div>
            <div class="tx-info">
                <div class="tx-desc">${escapeHtml(tx.description)}</div>
                <div class="tx-meta">
                    <span>${formatDateShort(tx.date)}</span>
                    <span>${tx.category}</span>
                    <span>${PAYMENT_ICONS[tx.payment] || ''} ${tx.payment}</span>
                </div>
            </div>
            <div class="tx-amount ${tx.type}">
                ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== Charts ==========
let charts = {};

function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

function renderIncomeExpenseChart(txs) {
    destroyChart('incomeExpense');

    // Group by week of month
    const weeks = {};
    txs.forEach(tx => {
        const d = new Date(tx.date);
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `Week ${weekNum}`;
        if (!weeks[key]) weeks[key] = { income: 0, expense: 0 };
        weeks[key][tx.type] += tx.amount;
    });

    const labels = Object.keys(weeks).sort();
    if (labels.length === 0) {
        labels.push('Week 1', 'Week 2', 'Week 3', 'Week 4');
    }

    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
    charts.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: labels.map(l => weeks[l]?.income || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Expenses',
                    data: labels.map(l => weeks[l]?.expense || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 6,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: 'Inter' } }
                },
                tooltip: {
                    callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val/1000).toFixed(0) + 'K' : val),
                        font: { family: 'Inter' }
                    }
                },
                x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } }
            }
        }
    });
}

function renderCategoryChart(txs) {
    destroyChart('category');

    const expenseTxs = txs.filter(t => t.type === 'expense');
    const categoryTotals = {};
    expenseTxs.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([, val]) => val);
    const colors = sorted.map(([name]) => {
        const cat = getCategoryInfo(name, 'expense');
        return cat.color;
    });

    const ctx = document.getElementById('categoryChart').getContext('2d');
    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.length ? colors : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11, family: 'Inter' } }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ========== Transaction Modal ==========
function openTransactionModal(editId = null) {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    form.reset();

    document.getElementById('transactionId').value = '';
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

    // Reset type toggle
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));

    if (editId) {
        const tx = state.transactions.find(t => t.id === editId);
        if (!tx) return;

        document.getElementById('modalTitle').textContent = 'Edit Transaction';
        document.getElementById('transactionId').value = tx.id;
        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txDate').value = tx.date;
        document.getElementById('txDescription').value = tx.description;
        document.getElementById('txPayment').value = tx.payment;
        document.getElementById('txNotes').value = tx.notes || '';

        const typeBtn = document.querySelector(`.type-btn[data-type="${tx.type}"]`);
        typeBtn.classList.add('active');
        populateCategorySelect(tx.type);
        document.getElementById('txCategory').value = tx.category;
    } else {
        document.getElementById('modalTitle').textContent = 'Add Transaction';
        document.querySelector('.type-btn[data-type="expense"]').classList.add('active');
        populateCategorySelect('expense');
    }

    modal.classList.add('active');
    document.getElementById('txAmount').focus();
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

function populateCategorySelect(type) {
    const select = document.getElementById('txCategory');
    const cats = CATEGORIES[type] || CATEGORIES.expense;
    select.innerHTML = cats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
}

function saveTransaction(e) {
    e.preventDefault();

    const id = document.getElementById('transactionId').value;
    const type = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const description = document.getElementById('txDescription').value.trim();
    const category = document.getElementById('txCategory').value;
    const payment = document.getElementById('txPayment').value;
    const notes = document.getElementById('txNotes').value.trim();

    if (!amount || amount <= 0 || !date || !description || !category) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const tx = { id: id || generateId(), type, amount, date, description, category, payment, notes };

    if (id) {
        const idx = state.transactions.findIndex(t => t.id === id);
        if (idx !== -1) state.transactions[idx] = tx;
        showToast('Transaction updated successfully');
    } else {
        state.transactions.push(tx);
        showToast('Transaction added successfully');
    }

    saveData();
    closeTransactionModal();
    renderAll();
}

// ========== Delete Transaction ==========
function openDeleteConfirm(id) {
    state.deleteId = id;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    state.deleteId = null;
}

function confirmDeleteTransaction() {
    if (state.deleteId) {
        state.transactions = state.transactions.filter(t => t.id !== state.deleteId);
        saveData();
        showToast('Transaction deleted');
        renderAll();
    }
    closeConfirmModal();
}

// ========== Transaction Table ==========
function populateFilterCategories() {
    const select = document.getElementById('filterCategory');
    const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
    select.innerHTML = '<option value="all">All Categories</option>' +
        allCats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
}

function renderTransactionTable() {
    const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('filterType')?.value || 'all';
    const catFilter = document.getElementById('filterCategory')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';

    let txs = getMonthTransactions();

    // Filters
    if (search) {
        txs = txs.filter(t =>
            t.description.toLowerCase().includes(search) ||
            t.category.toLowerCase().includes(search) ||
            t.notes?.toLowerCase().includes(search)
        );
    }
    if (typeFilter !== 'all') txs = txs.filter(t => t.type === typeFilter);
    if (catFilter !== 'all') txs = txs.filter(t => t.category === catFilter);

    // Sort
    txs.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc': return new Date(a.date) - new Date(b.date);
            case 'amount-desc': return b.amount - a.amount;
            case 'amount-asc': return a.amount - b.amount;
            default: return new Date(b.date) - new Date(a.date);
        }
    });

    // Pagination
    const totalPages = Math.ceil(txs.length / state.itemsPerPage);
    if (state.currentPage > totalPages) state.currentPage = 1;
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginated = txs.slice(start, start + state.itemsPerPage);

    const tbody = document.getElementById('transactionTableBody');

    if (txs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <span class="empty-icon">🔍</span>
                        <p>No transactions found for this month.</p>
                    </div>
                </td>
            </tr>`;
    } else {
        tbody.innerHTML = paginated.map(tx => {
            const cat = getCategoryInfo(tx.category, tx.type);
            return `
            <tr>
                <td>${formatDate(tx.date)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-size:1.1rem">${cat.icon}</span>
                        <div>
                            <div style="font-weight:500">${escapeHtml(tx.description)}</div>
                            ${tx.notes ? `<div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(tx.notes)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span style="color:${cat.color};font-weight:500">${tx.category}</span></td>
                <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
                <td class="text-right">
                    <span class="tx-amount ${tx.type}">
                        ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-btns">
                        <button class="btn-sm" onclick="openTransactionModal('${tx.id}')" title="Edit">✏️</button>
                        <button class="btn-sm delete" onclick="openDeleteConfirm('${tx.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    document.getElementById('transactionCount').textContent = `${txs.length} transaction${txs.length !== 1 ? 's' : ''}`;
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === state.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

function goToPage(page) {
    state.currentPage = page;
    renderTransactionTable();
}

// ========== Budgets ==========
function openBudgetModal() {
    document.getElementById('budgetForm').reset();
    const select = document.getElementById('budgetCategory');
    select.innerHTML = CATEGORIES.expense.map(c =>
        `<option value="${c.name}">${c.icon} ${c.name}</option>`
    ).join('');
    document.getElementById('budgetModal').classList.add('active');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('active');
}

function saveBudget(e) {
    e.preventDefault();
    const category = document.getElementById('budgetCategory').value;
    const limit = parseFloat(document.getElementById('budgetAmount').value);

    if (!category || !limit || limit <= 0) {
        showToast('Please fill all fields', 'error');
        return;
    }

    const existing = state.budgets.findIndex(b => b.category === category);
    if (existing !== -1) {
        state.budgets[existing].limit = limit;
        showToast('Budget updated');
    } else {
        state.budgets.push({ id: generateId(), category, limit });
        showToast('Budget created');
    }

    saveData();
    closeBudgetModal();
    renderBudgets();
}

function deleteBudget(id) {
    state.budgets = state.budgets.filter(b => b.id !== id);
    saveData();
    renderBudgets();
    showToast('Budget removed');
}

function renderBudgets() {
    const container = document.getElementById('budgetGrid');
    const txs = getMonthTransactions();

    if (state.budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <span class="empty-icon">🎯</span>
                <p>No budgets set yet. Click "Set Budget" to create spending limits!</p>
            </div>`;
        return;
    }

    container.innerHTML = state.budgets.map(budget => {
        const cat = getCategoryInfo(budget.category, 'expense');
        const spent = txs.filter(t => t.type === 'expense' && t.category === budget.category)
            .reduce((s, t) => s + t.amount, 0);
        const pct = Math.min((spent / budget.limit) * 100, 100);
        const remaining = budget.limit - spent;
        const isOver = spent > budget.limit;

        let barColor;
        if (pct > 90) barColor = 'var(--danger)';
        else if (pct > 70) barColor = 'var(--warning)';
        else barColor = 'var(--success)';

        return `
        <div class="budget-card">
            <div class="budget-actions">
                <button class="budget-delete" onclick="deleteBudget('${budget.id}')" title="Remove budget">✕</button>
            </div>
            <div class="budget-card-header">
                <div class="budget-category">
                    <div class="budget-category-icon" style="background:${cat.color}15">${cat.icon}</div>
                    <span class="budget-category-name">${budget.category}</span>
                </div>
                <div class="budget-amounts">
                    <div class="budget-spent" style="color:${isOver ? 'var(--danger)' : 'var(--text)'}">${formatCurrency(spent)}</div>
                    <div class="budget-limit">of ${formatCurrency(budget.limit)}</div>
                </div>
            </div>
            <div class="budget-progress">
                <div class="budget-progress-bar" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div class="budget-footer">
                <span class="budget-remaining ${isOver ? 'over' : 'ok'}">
                    ${isOver ? '⚠️ Over by ' + formatCurrency(Math.abs(remaining)) : '✅ ' + formatCurrency(remaining) + ' left'}
                </span>
                <span class="budget-percentage" style="color:${barColor}">${pct.toFixed(0)}%</span>
            </div>
        </div>`;
    }).join('');
}

// ========== Reports ==========
function renderReports() {
    renderTrendChart();
    renderIncomeSourceChart();
    renderTopExpenseChart();
    renderDailyChart();
    renderStats();
}

function renderTrendChart() {
    destroyChart('trend');

    const months = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
        let m = state.currentMonth - i;
        let y = state.currentYear;
        while (m < 0) { m += 12; y--; }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.push(`${monthNames[m]} ${y}`);

        const txs = getMonthTransactions(m, y);
        incomeData.push(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
        expenseData.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    const ctx = document.getElementById('trendChart').getContext('2d');
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: 'Inter' } }
                },
                tooltip: {
                    callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val/1000).toFixed(0) + 'K' : val),
                        font: { family: 'Inter' }
                    }
                },
                x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } }
            }
        }
    });
}

function renderIncomeSourceChart() {
    destroyChart('incomeSource');

    const txs = getMonthTransactions().filter(t => t.type === 'income');
    const groups = {};
    txs.forEach(tx => { groups[tx.category] = (groups[tx.category] || 0) + tx.amount; });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const colors = sorted.map(([name]) => getCategoryInfo(name, 'income').color);

    const ctx = document.getElementById('incomeSourceChart').getContext('2d');
    charts.incomeSource = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sorted.map(([n]) => n),
            datasets: [{
                data: sorted.map(([, v]) => v),
                backgroundColor: colors.length ? colors : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11, family: 'Inter' } }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });
}

function renderTopExpenseChart() {
    destroyChart('topExpense');

    const txs = getMonthTransactions().filter(t => t.type === 'expense');
    const groups = {};
    txs.forEach(tx => { groups[tx.category] = (groups[tx.category] || 0) + tx.amount; });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const colors = sorted.map(([name]) => getCategoryInfo(name, 'expense').color);

    const ctx = document.getElementById('topExpenseChart').getContext('2d');
    charts.topExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([n]) => n),
            datasets: [{
                data: sorted.map(([, v]) => v),
                backgroundColor: colors.map(c => c + 'cc'),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: ctx => `₹${ctx.parsed.x.toLocaleString('en-IN')}` }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val/1000).toFixed(0) + 'K' : val),
                        font: { family: 'Inter' }
                    }
                },
                y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
            }
        }
    });
}

function renderDailyChart() {
    destroyChart('daily');

    const txs = getMonthTransactions().filter(t => t.type === 'expense');
    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const dailyData = new Array(daysInMonth).fill(0);

    txs.forEach(tx => {
        const day = new Date(tx.date).getDate();
        dailyData[day - 1] += tx.amount;
    });

    const ctx = document.getElementById('dailyChart').getContext('2d');
    charts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
            datasets: [{
                label: 'Daily Spending',
                data: dailyData,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderRadius: 3,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: ctx => `₹${ctx.parsed.y.toLocaleString('en-IN')}` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: val => '₹' + (val >= 1000 ? (val/1000).toFixed(0) + 'K' : val),
                        font: { family: 'Inter' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 10 },
                        maxRotation: 0,
                        callback: (val, idx) => (idx + 1) % 5 === 0 || idx === 0 ? idx + 1 : ''
                    }
                }
            }
        }
    });
}

function renderStats() {
    const txs = getMonthTransactions();
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expenseTxs = txs.filter(t => t.type === 'expense');

    const avgExpense = expenseTxs.length > 0 ? expenses / expenseTxs.length : 0;
    const maxExpense = expenseTxs.length > 0 ? Math.max(...expenseTxs.map(t => t.amount)) : 0;
    const minExpense = expenseTxs.length > 0 ? Math.min(...expenseTxs.map(t => t.amount)) : 0;

    // Most frequent category
    const catCount = {};
    expenseTxs.forEach(t => { catCount[t.category] = (catCount[t.category] || 0) + 1; });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    // Daily average
    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const today = new Date();
    const currentDay = (today.getMonth() === state.currentMonth && today.getFullYear() === state.currentYear)
        ? today.getDate() : daysInMonth;
    const dailyAvg = currentDay > 0 ? expenses / currentDay : 0;

    const stats = [
        { label: 'Total Transactions', value: txs.length },
        { label: 'Average Expense', value: formatCurrency(avgExpense) },
        { label: 'Largest Expense', value: formatCurrency(maxExpense) },
        { label: 'Smallest Expense', value: formatCurrency(minExpense) },
        { label: 'Daily Average Spend', value: formatCurrency(dailyAvg) },
        { label: 'Most Frequent Category', value: topCat ? `${topCat[0]} (${topCat[1]}×)` : 'N/A' },
        { label: 'Income Sources', value: txs.filter(t => t.type === 'income').length },
        { label: 'Net Savings', value: formatCurrency(income - expenses) },
    ];

    document.getElementById('statsList').innerHTML = stats.map(s => `
        <div class="stat-item">
            <span class="stat-label">${s.label}</span>
            <span class="stat-value">${s.value}</span>
        </div>
    `).join('');
}

// ========== Export / Import ==========
function exportData() {
    if (state.transactions.length === 0) {
        showToast('No data to export', 'info');
        return;
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment', 'Notes'];
    const rows = state.transactions.map(tx => [
        tx.date, tx.type, tx.category, `"${tx.description}"`,
        tx.amount, tx.payment, `"${tx.notes || ''}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgetwise_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported successfully');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            if (file.name.endsWith('.json')) {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    let count = 0;
                    data.forEach(tx => {
                        if (tx.date && tx.amount && tx.type && tx.description && tx.category) {
                            tx.id = tx.id || generateId();
                            state.transactions.push(tx);
                            count++;
                        }
                    });
                    saveData();
                    renderAll();
                    showToast(`Imported ${count} transactions`);
                }
            } else {
                const lines = event.target.result.split('\n').filter(l => l.trim());
                if (lines.length < 2) {
                    showToast('Empty CSV file', 'error');
                    return;
                }

                let count = 0;
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    if (cols && cols.length >= 5) {
                        const clean = s => s?.replace(/^"|"$/g, '').trim() || '';
                        state.transactions.push({
                            id: generateId(),
                            date: clean(cols[0]),
                            type: clean(cols[1]).toLowerCase(),
                            category: clean(cols[2]),
                            description: clean(cols[3]),
                            amount: parseFloat(clean(cols[4])) || 0,
                            payment: clean(cols[5]) || 'cash',
                            notes: clean(cols[6]) || ''
                        });
                        count++;
                    }
                }
                saveData();
                renderAll();
                showToast(`Imported ${count} transactions`);
            }
        } catch (err) {
            showToast('Error importing file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
