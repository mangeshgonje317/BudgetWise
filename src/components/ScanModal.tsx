import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ArrowLeft,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  ScanLine,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  generateId,
  getCategoryInfo,
  PAYMENT_LABELS,
  type ScannedTransaction,
  type Transaction,
} from '../types/finance';

interface PendingFile {
  id: string;
  file: File;
  kind: 'pdf' | 'image';
  previewUrl: string | null;
}

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (txs: Transaction[]) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ScanModal({
  isOpen,
  onClose,
  onAddTransactions,
  onToast,
}: ScanModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [extracted, setExtracted] = useState<ScannedTransaction[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPendingFiles([]);
      setExtracted([]);
      setProgressPct(0);
      setProgressText('');
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const additions: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        onToast(`"${file.name}" is not a supported image or PDF.`, 'error');
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        onToast(`"${file.name}" exceeds the 20 MB limit.`, 'error');
        continue;
      }

      const duplicate = pendingFiles.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      );
      if (duplicate) continue;

      const id = generateId();
      additions.push({
        id,
        file,
        kind: isPdf ? 'pdf' : 'image',
        previewUrl: null,
      });

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = typeof ev.target?.result === 'string' ? ev.target.result : null;
          setPendingFiles((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, previewUrl: url } : item
            )
          );
        };
        reader.readAsDataURL(file);
      }
    }

    if (additions.length > 0) {
      setPendingFiles((prev) => [...prev, ...additions]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const startScanning = async () => {
    if (pendingFiles.length === 0) {
      onToast('Please add at least one file to scan.', 'error');
      return;
    }

    setStep(2);
    setProgressPct(0);
    const collected: ScannedTransaction[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const entry = pendingFiles[i];
      setProgressText(
        `Processing file ${i + 1} of ${pendingFiles.length}: ${entry.file.name}`
      );
      setProgressPct((i / pendingFiles.length) * 100);

      try {
        const base64Data = await fileToBase64(entry.file);
        const resp = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: entry.file.name,
            mimeType: entry.file.type,
            base64Data,
          }),
        });

        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(payload?.error || `HTTP ${resp.status}`);
        }

        const list = Array.isArray(payload?.transactions)
          ? payload.transactions
          : [];
        list.forEach((tx: Omit<ScannedTransaction, 'selected'>) => {
          collected.push({
            ...tx,
            source: tx.source || entry.file.name,
            selected: true,
          });
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Unable to scan document.';
        onToast(`Failed to process "${entry.file.name}": ${msg}`, 'error');
      }

      setProgressPct(((i + 1) / pendingFiles.length) * 100);
    }

    if (collected.length > 0) {
      setExtracted(collected);
      setStep(3);
      onToast(`Found ${collected.length} transaction(s).`);
    } else {
      onToast(
        'No transactions could be extracted. Try a clearer image or statement.',
        'error'
      );
      setStep(1);
    }
  };

  const allSelected =
    extracted.length > 0 && extracted.every((item) => item.selected);
  const selectedCount = extracted.filter((item) => item.selected).length;

  const handleConfirmSelected = () => {
    const chosen = extracted.filter((item) => item.selected);
    if (chosen.length === 0) {
      onToast('Select at least one transaction to add.', 'error');
      return;
    }

    const toAdd: Transaction[] = chosen.map((tx) => ({
      id: generateId(),
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      payment: tx.payment,
      notes: tx.notes || '',
    }));

    onAddTransactions(toAdd);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 2) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-modal-title"
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-xl pb-safe sm:max-w-2xl sm:rounded-xl sm:pb-0">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-5 w-5 text-indigo-600" />
            <h2
              id="scan-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              Scan Transactions
            </h2>
          </div>
          {step !== 2 && (
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:min-h-[36px] sm:min-w-[36px]"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors sm:rounded-xl sm:py-10 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/70'
                    : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30'
                }`}
              >
                <UploadCloud className="mx-auto h-10 w-10 text-indigo-500" />
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Tap to choose files or drop here
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Supports UPI screenshots (PNG, JPG, WEBP), receipt photos, and bank statement PDFs up to 20 MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-2.5">
                  {pendingFiles.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 sm:rounded-lg"
                    >
                      {entry.previewUrl ? (
                        <img
                          src={entry.previewUrl}
                          alt={entry.file.name}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
                          {entry.kind === 'pdf' ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {entry.file.name}
                        </div>
                        <div className="mt-0.5 font-mono-num text-xs text-slate-500">
                          {formatFileSize(entry.file.size)} ·{' '}
                          {entry.kind === 'pdf' ? 'PDF Document' : 'Image'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPendingFiles((prev) =>
                            prev.filter((p) => p.id !== entry.id)
                          )
                        }
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:min-h-[32px] sm:min-w-[32px]"
                        aria-label={`Remove ${entry.file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-2.5 pt-2 sm:flex sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setPendingFiles([])}
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:rounded-lg"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={startScanning}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:rounded-lg"
                    >
                      <ScanLine className="h-4 w-4" />
                      <span>Extract</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
              <h3 className="mt-4 font-display text-base font-semibold text-slate-900">
                Extracting transactions...
              </h3>
              <p className="mt-1 text-sm text-slate-500">{progressText}</p>
              <div className="mx-auto mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Extracted Transactions
                  </h3>
                  <p className="font-mono-num text-xs text-slate-500">
                    {extracted.length} found · {selectedCount} selected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExtracted((prev) =>
                      prev.map((item) => ({ ...item, selected: !allSelected }))
                    )
                  }
                  className="min-h-[44px] px-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 sm:min-h-0"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1 sm:max-h-96">
                {extracted.map((tx, idx) => {
                  const cat = getCategoryInfo(tx.category, tx.type);
                  return (
                    <button
                      key={`${tx.source}-${idx}`}
                      type="button"
                      onClick={() =>
                        setExtracted((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, selected: !item.selected }
                              : item
                          )
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors sm:rounded-lg ${
                        tx.selected
                          ? 'border-indigo-500 bg-indigo-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          tx.selected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {cat.icon} {tx.description}
                          </span>
                          <span
                            className={`font-mono-num text-sm font-bold whitespace-nowrap ${
                              tx.type === 'income'
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono-num">
                            {formatDate(tx.date)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{tx.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{PAYMENT_LABELS[tx.payment] || tx.payment}</span>
                          {tx.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="max-w-[180px] truncate">
                                {tx.notes}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-indigo-600">
                            {tx.source}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4 sm:flex sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setPendingFiles([]);
                    setExtracted([]);
                    setStep(1);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Scan More</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelected}
                  disabled={selectedCount === 0}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-lg"
                >
                  <Check className="h-4 w-4" />
                  <span>Add ({selectedCount})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
