import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  PiggyBank,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { ChartConfiguration } from 'chart.js';
import {
  formatCurrency,
  formatDateShort,
  getCategoryInfo,
  getMonthTransactions,
  PAYMENT_LABELS,
  type Transaction,
} from '../types/finance';
import { ChartCanvas } from './ChartCanvas';

interface DashboardViewProps {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  onViewAllTransactions: () => void;
  onAddTransaction: () => void;
}

function computeTrend(
  current: number,
  previous: number,
  higherIsGood: boolean
): { label: string; isPositive: boolean | null } {
  if (previous === 0) {
    if (current > 0) {
      return { label: 'New', isPositive: higherIsGood };
    }
    return { label: '—', isPositive: null };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const isPositive = higherIsGood ? pct >= 0 : pct <= 0;
  return {
    label: `${pct >= 0 ? '+' : ''}${pct}%`,
    isPositive,
  };
}

export function DashboardView({
  transactions,
  currentMonth,
  currentYear,
  onViewAllTransactions,
  onAddTransaction,
}: DashboardViewProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const monthTxs = useMemo(
    () => getMonthTransactions(transactions, currentMonth, currentYear),
    [transactions, currentMonth, currentYear]
  );

  const prevMonthTxs = useMemo(() => {
    let pm = currentMonth - 1;
    let py = currentYear;
    if (pm < 0) {
      pm = 11;
      py--;
    }
    return getMonthTransactions(transactions, pm, py);
  }, [transactions, currentMonth, currentYear]);

  const income = useMemo(
    () =>
      monthTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [monthTxs]
  );

  const expenses = useMemo(
    () =>
      monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [monthTxs]
  );

  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const prevIncome = prevMonthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevExpenses = prevMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevBalance = prevIncome - prevExpenses;

  const incomeTrend = computeTrend(income, prevIncome, true);
  const expenseTrend = computeTrend(expenses, prevExpenses, false);

  const balanceTrend = useMemo(() => {
    if (prevBalance === 0) {
      return { label: '—', isPositive: null as boolean | null };
    }
    const pct = Math.round(
      ((balance - prevBalance) / Math.abs(prevBalance)) * 100
    );
    return {
      label: `${pct >= 0 ? '+' : ''}${pct}%`,
      isPositive: balance >= prevBalance,
    };
  }, [balance, prevBalance]);

  const recentTransactions = useMemo(
    () =>
      [...monthTxs]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7),
    [monthTxs]
  );

  const incomeExpenseConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const weeks: Record<string, { income: number; expense: number }> = {};
    monthTxs.forEach((tx) => {
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

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: labels.map((l) => weeks[l]?.income ?? 0),
            backgroundColor: 'rgba(22, 163, 74, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expenses',
            data: labels.map((l) => weeks[l]?.expense ?? 0),
            backgroundColor: 'rgba(220, 38, 38, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14,
              font: { family: 'DM Sans', size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(15, 23, 42, 0.05)' },
            ticks: {
              callback: (val) => {
                const n = Number(val);
                return '₹' + (n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n);
              },
              font: { family: 'JetBrains Mono', size: 10 },
            },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'DM Sans', size: 11 } },
          },
        },
      },
    };
  }, [monthTxs]);

  const categoryConfig = useMemo<ChartConfiguration<'doughnut'>>(() => {
    const expenseTxs = monthTxs.filter((t) => t.type === 'expense');
    const totals: Record<string, number> = {};
    expenseTxs.forEach((tx) => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.length ? sorted.map(([name]) => name) : ['No expenses'];
    const data = sorted.length ? sorted.map(([, val]) => val) : [1];
    const colors = sorted.length
      ? sorted.map(([name]) => getCategoryInfo(name, 'expense').color)
      : ['#e2e8f0'];

    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 10,
              font: { family: 'DM Sans', size: 11 },
            },
          },
          tooltip: {
            enabled: sorted.length > 0,
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce(
                  (a, b) => a + b,
                  0
                );
                const pct =
                  total > 0 ? ((Number(ctx.parsed) / total) * 100).toFixed(1) : '0';
                return `${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN')} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [monthTxs, isMobile]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 2x2 Summary Metrics on Mobile, 4-col on Desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Income
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 truncate font-mono-num text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
            {formatCurrency(income)}
          </div>
          <div
            className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
              incomeTrend.isPositive === true
                ? 'text-emerald-600'
                : incomeTrend.isPositive === false
                ? 'text-rose-600'
                : 'text-slate-400'
            }`}
          >
            {incomeTrend.isPositive !== null &&
              (incomeTrend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              ))}
            <span className="truncate">{incomeTrend.label} vs last mo</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Expenses
            </span>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1.5 truncate font-mono-num text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
            {formatCurrency(expenses)}
          </div>
          <div
            className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
              expenseTrend.isPositive === true
                ? 'text-emerald-600'
                : expenseTrend.isPositive === false
                ? 'text-rose-600'
                : 'text-slate-400'
            }`}
          >
            {expenseTrend.isPositive !== null &&
              (expenseTrend.isPositive ? (
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              ))}
            <span className="truncate">{expenseTrend.label} vs last mo</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Balance
            </span>
            <Wallet className="h-4 w-4 text-indigo-600" />
          </div>
          <div
            className={`mt-1.5 truncate font-mono-num text-lg font-bold sm:mt-2 sm:text-2xl ${
              balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {balance < 0 ? '-' : ''}
            {formatCurrency(balance)}
          </div>
          <div
            className={`mt-1.5 truncate text-xs font-medium ${
              balanceTrend.isPositive === true
                ? 'text-emerald-600'
                : balanceTrend.isPositive === false
                ? 'text-rose-600'
                : 'text-slate-400'
            }`}
          >
            {balanceTrend.label} vs last mo
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:rounded-xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Savings Rate
            </span>
            <PiggyBank className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 truncate font-mono-num text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
            {savingsRate.toFixed(1)}%
          </div>
          <div className="mt-1.5 truncate text-xs text-slate-500">
            of income saved
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-5 lg:col-span-7">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-900 sm:mb-4 sm:text-base">
            Income vs Expenses
          </h3>
          <ChartCanvas
            config={incomeExpenseConfig}
            heightClass="h-56 sm:h-68"
            ariaLabel="Weekly Income versus Expenses bar chart"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-5 lg:col-span-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-900 sm:mb-4 sm:text-base">
            Expenses by Category
          </h3>
          <ChartCanvas
            config={categoryConfig}
            heightClass="h-64 sm:h-68"
            ariaLabel="Expenses breakdown by category doughnut chart"
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="font-display text-sm font-semibold text-slate-900 sm:text-base">
            Recent Transactions
          </h3>
          <button
            type="button"
            onClick={onViewAllTransactions}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 sm:min-h-0"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center sm:py-12">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <ReceiptText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              No transactions recorded for this month
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tap + below to log an entry or tap Scan to import from receipts.
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Transaction</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const cat = getCategoryInfo(tx.category, tx.type);
              return (
                <div
                  key={tx.id}
                  className="flex min-h-[60px] items-center gap-3 py-2.5 sm:gap-4 sm:px-2"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${cat.color}18` }}
                    aria-hidden="true"
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {tx.description}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono-num">
                        {formatDateShort(tx.date)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{PAYMENT_LABELS[tx.payment] || tx.payment}</span>
                    </div>
                  </div>
                  <div
                    className={`font-mono-num text-sm font-semibold whitespace-nowrap ${
                      tx.type === 'income'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
