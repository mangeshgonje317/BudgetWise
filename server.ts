import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Education',
  'Rent',
  'Insurance',
  'Personal Care',
  'Gifts & Donations',
  'Other Expense',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Rental Income',
  'Refund',
  'Other Income',
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const VALID_PAYMENTS = ['cash', 'card', 'upi', 'bank', 'other'];

function normalizeDate(dateStr: unknown): string {
  const today = new Date().toISOString().split('T')[0];
  if (typeof dateStr !== 'string' || !dateStr.trim()) return today;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().split('T')[0];
}

function validateCategory(category: unknown, type: 'income' | 'expense'): string {
  const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (typeof category === 'string') {
    if (pool.includes(category)) return category;
    const lower = category.toLowerCase();
    const match = pool.find(
      (c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
    );
    if (match) return match;
  }
  return type === 'income' ? 'Other Income' : 'Other Expense';
}

function validatePayment(payment: unknown): string {
  if (typeof payment === 'string') {
    const lower = payment.toLowerCase();
    if (VALID_PAYMENTS.includes(lower)) return lower;
  }
  return 'other';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '28mb' }));

  app.post('/api/scan', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.',
        });
        return;
      }

      const { fileName, mimeType, base64Data } = req.body ?? {};
      if (
        typeof mimeType !== 'string' ||
        typeof base64Data !== 'string' ||
        !base64Data
      ) {
        res.status(400).json({ error: 'Missing file data or MIME type.' });
        return;
      }

      const isPdf = mimeType === 'application/pdf';
      const isImage = mimeType.startsWith('image/');
      if (!isPdf && !isImage) {
        res.status(400).json({
          error: 'Unsupported file type. Please upload an image or PDF.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const todayIso = new Date().toISOString().split('T')[0];
      const prompt = `Analyze this ${
        isPdf ? 'bank statement PDF' : 'UPI/payment screenshot or receipt'
      } and extract ALL financial transactions visible.

Rules:
1. Extract EVERY visible transaction, including partial rows.
2. "date": YYYY-MM-DD format. If only day/month is shown, use the current year (${new Date().getFullYear()}). If unclear, use ${todayIso}.
3. "description": concise merchant/payee name or description (max 60 characters).
4. "amount": positive numeric value without currency symbols.
5. "type": "expense" for debits/payments/sent money (Debit, Dr, Paid to), "income" for credits/received money/refunds (Credit, Cr, Received from).
6. "category": choose the best fit from ${JSON.stringify(ALL_CATEGORIES)}.
7. "payment": "upi" for UPI/PhonePe/GPay/Paytm, "card" for card payments, "bank" for NEFT/IMPS/RTGS/bank transfer, "cash" for cash, or "other".
8. "notes": transaction ID, UTR number, or reference code if visible, otherwise empty string.
If no transactions are found, return an empty array [].`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING },
                category: { type: Type.STRING },
                payment: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ['date', 'description', 'amount', 'type', 'category', 'payment'],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      let parsed: unknown = [];
      try {
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '');
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = [];
      }

      if (!Array.isArray(parsed)) {
        res.json({ transactions: [] });
        return;
      }

      const transactions = parsed
        .filter(
          (tx): tx is Record<string, unknown> =>
            Boolean(tx && typeof tx === 'object' && tx.amount && tx.description)
        )
        .map((tx) => {
          const txType: 'income' | 'expense' =
            tx.type === 'income' ? 'income' : 'expense';
          return {
            date: normalizeDate(tx.date),
            description: String(tx.description).trim().slice(0, 100),
            amount: Math.abs(Number(tx.amount)) || 0,
            type: txType,
            category: validateCategory(tx.category, txType),
            payment: validatePayment(tx.payment),
            notes: typeof tx.notes === 'string' ? tx.notes.trim().slice(0, 200) : '',
            source: typeof fileName === 'string' ? fileName : 'Uploaded file',
          };
        })
        .filter((tx) => tx.amount > 0 && tx.description.length > 0);

      res.json({ transactions });
    } catch (err: unknown) {
      console.error('Scan error:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to analyze document.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BudgetWise server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
