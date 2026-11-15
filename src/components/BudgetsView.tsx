import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Target, X } from 'lucide-react';
import {
  formatCurrency,
  getCategoryInfo,
  getMonthTransactions,
  type Budget,
  type Transaction,
} from '../types/finance';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  onOpenBudgetModal: () => void;
  onDeleteBudget: (id: string) => void;
}

export function BudgetsView({
  budgets,
  transactions,
  currentMonth,
  currentYear,
  onOpenBudgetModal,
  onDeleteBudget,
}: BudgetsViewProps) {
  const monthTxs = useMemo(
    () => getMonthTransactions(transactions, currentMonth, currentYear),
    [transactions, currentMonth, currentYear]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Set monthly spending limits per category
        </p>
        <button
          type="button"
          onClick={onOpenBudgetModal}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap shrink-0 sm:min-h-0 sm:rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Set Budget</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center sm:rounded-xl sm:py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Target className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-800">
            No monthly budgets configured yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create category limits to track spending progress throughout the month.
          </p>
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:rounded-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Budget</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const cat = getCategoryInfo(budget.category, 'expense');
            const spent = monthTxs
              .filter(
                (t) => t.type === 'expense' && t.category === budget.category
              )
              .reduce((sum, t) => sum + t.amount, 0);

            const rawPct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
            const barPct = Math.min(rawPct, 100);
            const remaining = budget.limit - spent;
            const isOver = spent > budget.limit;

            let barClass = 'bg-emerald-600';
            let pctClass = 'text-emerald-600';
            if (rawPct > 90) {
              barClass = 'bg-rose-600';
              pctClass = 'text-rose-600';
            } else if (rawPct > 70) {
              barClass = 'bg-amber-500';
              pctClass = 'text-amber-600';
            }

            return (
              <div
                key={budget.id}
                className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-xl sm:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${cat.color}18` }}
                      aria-hidden="true"
                    >
                      {cat.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-semibold text-slate-900">
                        {budget.category}
                      </h3>
                      <p className="font-mono-num text-xs text-slate-500">
                        Limit {formatCurrency(budget.limit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div
                      className={`font-mono-num text-base font-bold ${
                        isOver ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(spent)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteBudget(budget.id)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:min-h-[32px] sm:min-w-[32px]"
                      title="Remove budget"
                      aria-label={`Remove ${budget.category} budget`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      isOver ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {isOver ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          Over by {formatCurrency(Math.abs(remaining))}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{formatCurrency(remaining)} remaining</span>
                      </>
                    )}
                  </span>
                  <span className={`font-mono-num font-semibold ${pctClass}`}>
                    {Math.round(rawPct)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
