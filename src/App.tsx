import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  Menu,
  Plus,
  ScanLine,
  Target,
} from 'lucide-react';
import {
  generateId,
  MONTH_NAMES,
  MONTH_SHORT,
  type Budget,
  type PaymentMethod,
  type ToastMessage,
  type Transaction,
  type ViewName,
} from './types/finance';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ScanModal } from './components/ScanModal';
import { ToastContainer } from './components/ToastContainer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const STORAGE_TX_KEY = 'budgetwise_transactions';
const STORAGE_BUDGET_KEY = 'budgetwise_budgets';

const VIEW_TITLES: Record<ViewName, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  budgets: 'Budgets',
  reports: 'Reports',
};

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TX_KEY);
      return raw ? (JSON.parse(raw) as Transaction[]) : [];
    } catch {
      return [];
    }
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_BUDGET_KEY);
      return raw ? (JSON.parse(raw) as Budget[]) : [];
    } catch {
      return [];
    }
  });

  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BUDGET_KEY, JSON.stringify(budgets));
  }, [budgets]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTxModalOpen(false);
        setBudgetModalOpen(false);
        setDeleteTxId(null);
        setScanModalOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTx(null);
        setTxModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const changeMonth = (delta: number) => {
    let nextMonth = currentMonth + delta;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  const handleSaveTransaction = (tx: Transaction, isEdit: boolean) => {
    if (isEdit) {
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
      showToast('Transaction updated');
    } else {
      setTransactions((prev) => [...prev, tx]);
      showToast('Transaction added');
    }
    setTxModalOpen(false);
    setEditingTx(null);
  };

  const handleConfirmDelete = () => {
    if (deleteTxId) {
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTxId));
      showToast('Transaction deleted');
    }
    setDeleteTxId(null);
  };

  const handleSaveBudget = (category: string, limit: number) => {
    const exists = budgets.some((b) => b.category === category);
    if (exists) {
      setBudgets((prev) =>
        prev.map((b) => (b.category === category ? { ...b, limit } : b))
      );
      showToast('Budget updated');
    } else {
      setBudgets((prev) => [...prev, { id: generateId(), category, limit }]);
      showToast('Budget created');
    }
    setBudgetModalOpen(false);
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    showToast('Budget removed');
  };

  const handleAddScanned = (scannedTxs: Transaction[]) => {
    setTransactions((prev) => [...prev, ...scannedTxs]);
    showToast(`Added ${scannedTxs.length} scanned transaction(s)`);
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'info');
      return;
    }

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const headers = [
      'Date',
      'Type',
      'Category',
      'Description',
      'Amount',
      'Payment',
      'Notes',
    ];
    const rows = transactions.map((tx) => [
      tx.date,
      tx.type,
      escapeCsv(tx.category),
      escapeCsv(tx.description),
      String(tx.amount),
      tx.payment,
      escapeCsv(tx.notes ?? ''),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budgetwise_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Transactions exported to CSV');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result ?? '');
        const imported: Transaction[] = [];

        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach((tx) => {
              if (
                tx &&
                tx.date &&
                tx.amount &&
                tx.type &&
                tx.description &&
                tx.category
              ) {
                imported.push({
                  id: tx.id || generateId(),
                  date: String(tx.date),
                  type: tx.type === 'income' ? 'income' : 'expense',
                  category: String(tx.category),
                  description: String(tx.description),
                  amount: Math.abs(Number(tx.amount)) || 0,
                  payment: (tx.payment as PaymentMethod) || 'cash',
                  notes: tx.notes ? String(tx.notes) : '',
                });
              }
            });
          }
        } else {
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) {
            showToast('CSV file appears empty', 'error');
            return;
          }

          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvRow(lines[i]);
            if (cols.length >= 5) {
              const amount = parseFloat(cols[4]);
              if (!Number.isNaN(amount) && amount > 0 && cols[0] && cols[3]) {
                imported.push({
                  id: generateId(),
                  date: cols[0],
                  type:
                    cols[1].toLowerCase() === 'income' ? 'income' : 'expense',
                  category: cols[2] || 'Other Expense',
                  description: cols[3],
                  amount,
                  payment: (cols[5]?.toLowerCase() as PaymentMethod) || 'cash',
                  notes: cols[6] || '',
                });
              }
            }
          }
        }

        if (imported.length === 0) {
          showToast('No valid transactions found in file', 'error');
          return;
        }

        setTransactions((prev) => [...prev, ...imported]);
        showToast(`Imported ${imported.length} transaction(s)`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid file format';
        showToast(`Import failed: ${msg}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const todayDisplay = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const openNewTransaction = () => {
    setEditingTx(null);
    setTxModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        onExport={handleExportCsv}
        onImportFile={handleImportFile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-md sm:h-[70px] sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold text-slate-900 sm:text-xl">
                {VIEW_TITLES[activeView]}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                {todayDisplay}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs font-semibold text-slate-700 sm:gap-1 sm:px-2 sm:py-1 sm:text-sm">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="flex min-h-[36px] min-w-[32px] items-center justify-center rounded text-slate-500 transition-colors hover:bg-white hover:text-slate-900 sm:min-h-[32px]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-1 text-center whitespace-nowrap sm:hidden font-mono-num">
                {MONTH_SHORT[currentMonth]} {String(currentYear).slice(-2)}
              </span>
              <span className="hidden min-w-[132px] text-center whitespace-nowrap sm:inline">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="flex min-h-[36px] min-w-[32px] items-center justify-center rounded text-slate-500 transition-colors hover:bg-white hover:text-slate-900 sm:min-h-[32px]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <PWAInstallButton variant="compact" />

            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 whitespace-nowrap shrink-0 sm:min-h-[40px] sm:px-3.5"
              title="Scan UPI screenshot, receipt, or bank statement PDF"
              aria-label="Scan receipt or statement"
            >
              <ScanLine className="h-4 w-4 text-amber-600" />
              <span className="hidden sm:inline">Scan</span>
            </button>

            <button
              type="button"
              onClick={openNewTransaction}
              className="hidden items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap shrink-0 lg:inline-flex"
            >
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3.5 pt-4 pb-24 sm:px-8 sm:py-8 lg:pb-8">
          {activeView === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onViewAllTransactions={() => setActiveView('transactions')}
              onAddTransaction={openNewTransaction}
            />
          )}

          {activeView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onEdit={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onRequestDelete={(id) => setDeleteTxId(id)}
            />
          )}

          {activeView === 'budgets' && (
            <BudgetsView
              budgets={budgets}
              transactions={transactions}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onOpenBudgetModal={() => setBudgetModalOpen(true)}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeView === 'reports' && (
            <ReportsView
              transactions={transactions}
              currentMonth={currentMonth}
              currentYear={currentYear}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="grid h-14 grid-cols-5 items-center">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'dashboard'
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('transactions')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'transactions'
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-500'
            }`}
          >
            <ListOrdered className="h-5 w-5" />
            <span>Activity</span>
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={openNewTransaction}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 active:scale-95 transition-transform"
              aria-label="Add Transaction"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('budgets')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'budgets'
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-500'
            }`}
          >
            <Target className="h-5 w-5" />
            <span>Budgets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('reports')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              activeView === 'reports'
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-500'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
          </button>
        </div>
      </nav>

      <TransactionModal
        isOpen={txModalOpen}
        editingTransaction={editingTx}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        onError={(msg) => showToast(msg, 'error')}
      />

      <BudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onSave={handleSaveBudget}
        onError={(msg) => showToast(msg, 'error')}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTxId)}
        onClose={() => setDeleteTxId(null)}
        onConfirm={handleConfirmDelete}
      />

      <ScanModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onAddTransactions={handleAddScanned}
        onToast={showToast}
      />

      <OfflineIndicator />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
