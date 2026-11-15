import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import {
  formatCurrency,
  getCategoryInfo,
  getMonthTransactions,
  MONTH_SHORT,
  type Transaction,
} from '../types/finance';
import { ChartCanvas } from './ChartCanvas';

interface ReportsViewProps {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
}

export function ReportsView({
  transactions,
  currentMonth,
  currentYear,
}: ReportsViewProps) {
  const monthTxs = useMemo(
    () => getMonthTransactions(transactions, currentMonth, currentYear),
    [transactions, currentMonth, currentYear]
  );

  const trendConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m < 0) {
        m += 12;
        y--;
      }
      labels.push(`${MONTH_SHORT[m]} ${y}`);
      const txs = getMonthTransactions(transactions, m, y);
      incomeData.push(
        txs
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
      );
      expenseData.push(
        txs
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      );
    }

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2.5,
          },
          {
            label: 'Expenses',
            data: expenseData,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2.5,
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
              padding: 16,
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
              font: { family: 'JetBrains Mono', size: 11 },
            },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'DM Sans', size: 12 } },
          },
        },
      },
    };
  }, [transactions, currentMonth, currentYear]);

  const incomeSourceConfig = useMemo<ChartConfiguration<'pie'>>(() => {
    const incomeTxs = monthTxs.filter((t) => t.type === 'income');
    const groups: Record<string, number> = {};
    incomeTxs.forEach((tx) => {
      groups[tx.category] = (groups[tx.category] || 0) + tx.amount;
    });
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);

    return {
      type: 'pie',
      data: {
        labels: sorted.length ? sorted.map(([n]) => n) : ['No income'],
        datasets: [
          {
            data: sorted.length ? sorted.map(([, v]) => v) : [1],
            backgroundColor: sorted.length
              ? sorted.map(([n]) => getCategoryInfo(n, 'income').color)
              : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12,
              font: { family: 'DM Sans', size: 11 },
            },
          },
          tooltip: {
            enabled: sorted.length > 0,
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN')}`,
            },
          },
        },
      },
    };
  }, [monthTxs]);

  const topExpenseConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const expenseTxs = monthTxs.filter((t) => t.type === 'expense');
    const groups: Record<string, number> = {};
    expenseTxs.forEach((tx) => {
      groups[tx.category] = (groups[tx.category] || 0) + tx.amount;
    });
    const sorted = Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      type: 'bar',
      data: {
        labels: sorted.map(([n]) => n),
        datasets: [
          {
            data: sorted.map(([, v]) => v),
            backgroundColor: sorted.map(
              ([n]) => `${getCategoryInfo(n, 'expense').color}cc`
            ),
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `₹${Number(ctx.parsed.x).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(15, 23, 42, 0.05)' },
            ticks: {
              callback: (val) => {
                const n = Number(val);
                return '₹' + (n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n);
              },
              font: { family: 'JetBrains Mono', size: 11 },
            },
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'DM Sans', size: 11 } },
          },
        },
      },
    };
  }, [monthTxs]);

  const dailyConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const expenseTxs = monthTxs.filter((t) => t.type === 'expense');
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = new Array<number>(daysInMonth).fill(0);

    expenseTxs.forEach((tx) => {
      const day = new Date(tx.date).getDate();
      if (day >= 1 && day <= daysInMonth) {
        dailyData[day - 1] += tx.amount;
      }
    });

    return {
      type: 'bar',
      data: {
        labels: Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
        datasets: [
          {
            label: 'Daily Spending',
            data: dailyData,
            backgroundColor: 'rgba(79, 70, 229, 0.72)',
            borderRadius: 3,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
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
              font: { family: 'JetBrains Mono', size: 11 },
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'JetBrains Mono', size: 10 },
              maxRotation: 0,
              callback: (_val, idx) =>
                (idx + 1) % 5 === 0 || idx === 0 ? String(idx + 1) : '',
            },
          },
        },
      },
    };
  }, [monthTxs, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const income = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenseTxs = monthTxs.filter((t) => t.type === 'expense');
    const expenses = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

    const avgExpense = expenseTxs.length ? expenses / expenseTxs.length : 0;
    const maxExpense = expenseTxs.length
      ? Math.max(...expenseTxs.map((t) => t.amount))
      : 0;
    const minExpense = expenseTxs.length
      ? Math.min(...expenseTxs.map((t) => t.amount))
      : 0;

    const catCount: Record<string, number> = {};
    expenseTxs.forEach((t) => {
      catCount[t.category] = (catCount[t.category] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const activeDays =
      today.getMonth() === currentMonth && today.getFullYear() === currentYear
        ? today.getDate()
        : daysInMonth;
    const dailyAvg = activeDays > 0 ? expenses / activeDays : 0;

    return [
      { label: 'Total Transactions', value: String(monthTxs.length) },
      { label: 'Average Expense', value: formatCurrency(avgExpense) },
      { label: 'Largest Expense', value: formatCurrency(maxExpense) },
      { label: 'Smallest Expense', value: formatCurrency(minExpense) },
      { label: 'Daily Average Spend', value: formatCurrency(dailyAvg) },
      {
        label: 'Most Frequent Category',
        value: topCat ? `${topCat[0]} (${topCat[1]}×)` : 'N/A',
      },
      {
        label: 'Income Entries',
        value: String(monthTxs.filter((t) => t.type === 'income').length),
      },
      {
        label: 'Net Savings',
        value: `${income - expenses < 0 ? '-' : ''}${formatCurrency(
          income - expenses
        )}`,
      },
    ];
  }, [monthTxs, currentMonth, currentYear]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Monthly Trend (Last 6 Months)
        </h3>
        <ChartCanvas
          config={trendConfig}
          heightClass="h-72"
          ariaLabel="6-month income and expense trend line chart"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Income Sources
        </h3>
        <ChartCanvas
          config={incomeSourceConfig}
          heightClass="h-64"
          ariaLabel="Income sources pie chart"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Top Expense Categories
        </h3>
        <ChartCanvas
          config={topExpenseConfig}
          heightClass="h-64"
          ariaLabel="Top expense categories horizontal bar chart"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Monthly Statistics
        </h3>
        <div className="divide-y divide-slate-100">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-slate-600">{s.label}</span>
              <span className="font-mono-num font-semibold text-slate-900">
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Daily Spending Pattern
        </h3>
        <ChartCanvas
          config={dailyConfig}
          heightClass="h-64"
          ariaLabel="Daily spending pattern bar chart"
        />
      </div>
    </div>
  );
}
