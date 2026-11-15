// ========== Scanner Module ==========
// AI-powered transaction extraction from UPI screenshots & bank PDFs

(function () {
    'use strict';

    const GEMINI_MODEL = 'gemini-2.5-flash';
    let pendingFiles = [];
    let extractedTransactions = [];

    // ========== Init ==========
    function initScanner() {
        // Scan button
        document.getElementById('scanBtn').addEventListener('click', openScanModal);
        document.getElementById('closeScanModal').addEventListener('click', closeScanModal);

        // API Key
        document.getElementById('setApiKeyBtn').addEventListener('click', openApiKeyModal);
        document.getElementById('closeApiKeyModal').addEventListener('click', closeApiKeyModal);
        document.getElementById('cancelApiKey').addEventListener('click', closeApiKeyModal);
        document.getElementById('saveApiKey').addEventListener('click', saveApiKey);

        // Drop zone
        const dropzone = document.getElementById('scanDropzone');
        const fileInput = document.getElementById('scanFileInput');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            e.target.value = '';
        });

        // Actions
        document.getElementById('clearScanFiles').addEventListener('click', clearFiles);
        document.getElementById('startScanBtn').addEventListener('click', startScanning);
        document.getElementById('scanBackBtn').addEventListener('click', goBackToUpload);
        document.getElementById('selectAllScan').addEventListener('click', toggleSelectAll);
        document.getElementById('addScannedBtn').addEventListener('click', addSelectedTransactions);

        // Close on overlay click
        document.getElementById('scanModal').addEventListener('click', (e) => {
            if (e.target.id === 'scanModal') closeScanModal();
        });
        document.getElementById('apiKeyModal').addEventListener('click', (e) => {
            if (e.target.id === 'apiKeyModal') closeApiKeyModal();
        });

        updateApiStatus();
    }

    // ========== API Key ==========
    function getApiKey() {
        return localStorage.getItem('budgetwise_gemini_key') || '';
    }

    function updateApiStatus() {
        const key = getApiKey();
        const statusEl = document.getElementById('apiStatus');
        if (key) {
            statusEl.innerHTML = '<span class="status-dot online"></span> API Key configured';
        } else {
            statusEl.innerHTML = '<span class="status-dot offline"></span> API Key not set';
        }
    }

    function openApiKeyModal() {
        document.getElementById('apiKeyInput').value = getApiKey();
        document.getElementById('apiKeyModal').classList.add('active');
    }

    function closeApiKeyModal() {
        document.getElementById('apiKeyModal').classList.remove('active');
    }

    function saveApiKey() {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            localStorage.setItem('budgetwise_gemini_key', key);
            showToast('API Key saved securely');
        } else {
            localStorage.removeItem('budgetwise_gemini_key');
            showToast('API Key removed', 'info');
        }
        updateApiStatus();
        closeApiKeyModal();
    }

    // ========== Scan Modal ==========
    function openScanModal() {
        pendingFiles = [];
        extractedTransactions = [];
        showStep(1);
        renderFileList();
        document.getElementById('scanModal').classList.add('active');
    }

    function closeScanModal() {
        document.getElementById('scanModal').classList.remove('active');
    }

    function showStep(step) {
        document.getElementById('scanStep1').style.display = step === 1 ? 'block' : 'none';
        document.getElementById('scanStep2').style.display = step === 2 ? 'block' : 'none';
        document.getElementById('scanStep3').style.display = step === 3 ? 'block' : 'none';
    }

    function goBackToUpload() {
        pendingFiles = [];
        extractedTransactions = [];
        showStep(1);
        renderFileList();
    }

    // ========== File Handling ==========
    function handleFiles(fileList) {
        for (const file of fileList) {
            const isImage = file.type.startsWith('image/');
            const isPDF = file.type === 'application/pdf';
            if (!isImage && !isPDF) {
                showToast(`"${file.name}" is not a supported format`, 'error');
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                showToast(`"${file.name}" is too large (max 20 MB)`, 'error');
                continue;
            }
            // Avoid duplicates
            if (pendingFiles.some(f => f.file.name === file.name && f.file.size === file.size)) continue;

            pendingFiles.push({
                file,
                type: isPDF ? 'pdf' : 'image',
                preview: null
            });

            // Generate preview for images
            if (isImage) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const entry = pendingFiles.find(f => f.file === file);
                    if (entry) {
                        entry.preview = e.target.result;
                        renderFileList();
                    }
                };
                reader.readAsDataURL(file);
            }
        }
        renderFileList();
    }

    function renderFileList() {
        const container = document.getElementById('scanFileList');
        const actions = document.getElementById('scanActions');

        if (pendingFiles.length === 0) {
            container.innerHTML = '';
            actions.style.display = 'none';
            return;
        }

        actions.style.display = 'flex';
        container.innerHTML = pendingFiles.map((entry, idx) => {
            const sizeStr = formatFileSize(entry.file.size);
            const icon = entry.type === 'pdf' ? '📄' : '🖼️';
            const previewHtml = entry.preview
                ? `<img class="file-preview" src="${entry.preview}" alt="preview">`
                : '';
            return `
                <div class="scan-file-item">
                    ${previewHtml || `<span class="file-icon">${icon}</span>`}
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(entry.file.name)}</div>
                        <div class="file-size">${sizeStr} · ${entry.type === 'pdf' ? 'PDF Document' : 'Image'}</div>
                    </div>
                    <button class="scan-file-remove" onclick="window._scanner.removeFile(${idx})">✕</button>
                </div>`;
        }).join('');
    }

    function removeFile(idx) {
        pendingFiles.splice(idx, 1);
        renderFileList();
    }

    function clearFiles() {
        pendingFiles = [];
        renderFileList();
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ========== Scanning ==========
    async function startScanning() {
        const apiKey = getApiKey();
        if (!apiKey) {
            showToast('Please set your Gemini API key first', 'error');
            openApiKeyModal();
            return;
        }
        if (pendingFiles.length === 0) {
            showToast('Please add files to scan', 'error');
            return;
        }

        showStep(2);
        extractedTransactions = [];
        const progressBar = document.getElementById('scanProgressBar');
        const progressText = document.getElementById('scanProgress');

        for (let i = 0; i < pendingFiles.length; i++) {
            const entry = pendingFiles[i];
            progressText.textContent = `Processing file ${i + 1} of ${pendingFiles.length}: ${entry.file.name}`;
            progressBar.style.width = `${((i) / pendingFiles.length) * 100}%`;

            try {
                let results;
                if (entry.type === 'pdf') {
                    results = await processPDF(entry.file, apiKey);
                } else {
                    results = await processImage(entry.file, apiKey);
                }

                if (results && results.length > 0) {
                    results.forEach(tx => {
                        tx._source = entry.file.name;
                        tx._selected = true;
                    });
                    extractedTransactions.push(...results);
                }
            } catch (err) {
                console.error(`Error processing ${entry.file.name}:`, err);
                showToast(`Failed to process "${entry.file.name}": ${err.message}`, 'error');
            }

            progressBar.style.width = `${((i + 1) / pendingFiles.length) * 100}%`;
        }

        // Show results
        if (extractedTransactions.length > 0) {
            showStep(3);
            renderScanResults();
            showToast(`Found ${extractedTransactions.length} transaction(s)!`);
        } else {
            showToast('No transactions could be extracted. Try a clearer image.', 'error');
            showStep(1);
        }
    }

    // ========== Image Processing ==========
    async function processImage(file, apiKey) {
        const base64 = await fileToBase64(file);
        const mimeType = file.type;

        const prompt = buildExtractionPrompt('image');

        const response = await callGeminiVision(apiKey, prompt, [{
            inlineData: { mimeType, data: base64 }
        }]);

        return parseGeminiResponse(response);
    }

    // ========== PDF Processing ==========
    async function processPDF(file, apiKey) {
        // First try: send PDF directly to Gemini as file data
        const base64 = await fileToBase64(file);
        const prompt = buildExtractionPrompt('pdf');

        const response = await callGeminiVision(apiKey, prompt, [{
            inlineData: { mimeType: 'application/pdf', data: base64 }
        }]);

        return parseGeminiResponse(response);
    }

    // ========== Gemini API ==========
    function buildExtractionPrompt(sourceType) {
        const categoryList = [
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
            'Bills & Utilities', 'Health', 'Education', 'Rent', 'Insurance',
            'Personal Care', 'Gifts & Donations', 'Other Expense',
            'Salary', 'Freelance', 'Business', 'Investment',
            'Rental Income', 'Refund', 'Other Income'
        ];

        return `You are a financial transaction extraction AI. Analyze this ${sourceType === 'pdf' ? 'bank statement PDF' : 'UPI/payment screenshot'} and extract ALL transactions visible.

For each transaction, return a JSON object with these exact fields:
- "date": transaction date in YYYY-MM-DD format. If only day/month visible, use current year. If date unclear, use today's date.
- "description": merchant/payee name or transaction description (concise, max 50 chars)
- "amount": numeric amount (positive number, no currency symbols)
- "type": "expense" for debits/payments/sent money, "income" for credits/received money/refunds
- "category": best matching category from this list: ${JSON.stringify(categoryList)}
- "payment": payment method - "upi" for UPI/PhonePe/GPay/Paytm, "card" for card transactions, "bank" for NEFT/IMPS/bank transfers, "cash" for cash, "other" for unknown
- "notes": any transaction ID, UTR number, or reference number found (optional)

IMPORTANT RULES:
1. Extract EVERY transaction visible, even partial ones
2. For UPI screenshots: look for amount, receiver/sender name, date, UPI ID, transaction ID
3. For bank statements: extract each row/entry as a separate transaction
4. Amounts should always be positive numbers
5. Determine type (income/expense) from context (Debit/Dr = expense, Credit/Cr = income, "Paid to" = expense, "Received from" = income)
6. Pick the most specific category that fits

Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array.
If no transactions can be found, return an empty array: []

Example response:
[{"date":"2026-11-15","description":"Swiggy Food Order","amount":349.00,"type":"expense","category":"Food & Dining","payment":"upi","notes":"UTR: 433012345678"}]`;
    }

    async function callGeminiVision(apiKey, prompt, parts) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    ...parts
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json'
            }
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${resp.status}`;
            if (resp.status === 401 || resp.status === 403) {
                throw new Error('Invalid API key. Please check your Gemini API key.');
            }
            if (resp.status === 429) {
                throw new Error('Rate limited. Please wait a moment and try again.');
            }
            throw new Error(errMsg);
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text;
    }

    // ========== Response Parsing ==========
    function parseGeminiResponse(text) {
        if (!text || !text.trim()) return [];

        try {
            // Clean up response - remove markdown code fences if present
            let cleaned = text.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed)) return [];

            // Validate and normalize each transaction
            return parsed.filter(tx => tx && tx.amount && tx.description).map(tx => ({
                date: normalizeDate(tx.date),
                description: String(tx.description || '').substring(0, 100),
                amount: Math.abs(parseFloat(tx.amount)) || 0,
                type: tx.type === 'income' ? 'income' : 'expense',
                category: validateCategory(tx.category, tx.type),
                payment: validatePayment(tx.payment),
                notes: String(tx.notes || '').substring(0, 200),
            }));
        } catch (e) {
            console.error('Failed to parse Gemini response:', e, text);
            return [];
        }
    }

    function normalizeDate(dateStr) {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
            return d.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    function validateCategory(category, type) {
        const expenseCats = [
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
            'Bills & Utilities', 'Health', 'Education', 'Rent', 'Insurance',
            'Personal Care', 'Gifts & Donations', 'Other Expense'
        ];
        const incomeCats = [
            'Salary', 'Freelance', 'Business', 'Investment',
            'Rental Income', 'Refund', 'Other Income'
        ];
        const cats = type === 'income' ? incomeCats : expenseCats;
        if (cats.includes(category)) return category;
        // Try fuzzy match
        const lower = (category || '').toLowerCase();
        const match = cats.find(c => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
        return match || (type === 'income' ? 'Other Income' : 'Other Expense');
    }

    function validatePayment(payment) {
        const valid = ['cash', 'card', 'upi', 'bank', 'other'];
        if (valid.includes(payment)) return payment;
        return 'other';
    }

    // ========== Utility ==========
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                // Remove data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ========== Render Results ==========
    function renderScanResults() {
        const container = document.getElementById('scanResultsList');
        const countEl = document.getElementById('scanResultCount');

        countEl.textContent = `${extractedTransactions.length} transaction(s) found`;

        container.innerHTML = extractedTransactions.map((tx, idx) => {
            const catInfo = getCategoryInfo(tx.category, tx.type);
            const paymentIcons = { cash: '💵', card: '💳', upi: '📱', bank: '🏦', other: '📦' };

            return `
                <div class="scan-result-item ${tx._selected ? 'selected' : ''}" 
                     onclick="window._scanner.toggleSelect(${idx})">
                    <div class="scan-result-check">${tx._selected ? '✓' : ''}</div>
                    <div class="scan-result-details">
                        <div class="scan-result-top">
                            <span class="scan-result-desc">${catInfo.icon} ${escapeHtml(tx.description)}</span>
                            <span class="scan-result-amount ${tx.type}">
                                ${tx.type === 'income' ? '+' : '-'}₹${Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div class="scan-result-meta">
                            <span>📅 ${formatDate(tx.date)}</span>
                            <span>📁 ${tx.category}</span>
                            <span>${paymentIcons[tx.payment] || '📦'} ${tx.payment.toUpperCase()}</span>
                            ${tx.notes ? `<span>🔗 ${escapeHtml(tx.notes.substring(0, 30))}</span>` : ''}
                        </div>
                        <div style="margin-top:4px">
                            <span class="scan-source-badge">📎 ${escapeHtml(tx._source)}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        updateSelectAllButton();
    }

    function toggleSelect(idx) {
        extractedTransactions[idx]._selected = !extractedTransactions[idx]._selected;
        renderScanResults();
    }

    function toggleSelectAll() {
        const allSelected = extractedTransactions.every(t => t._selected);
        extractedTransactions.forEach(t => t._selected = !allSelected);
        renderScanResults();
    }

    function updateSelectAllButton() {
        const btn = document.getElementById('selectAllScan');
        const allSelected = extractedTransactions.every(t => t._selected);
        btn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }

    // ========== Add Transactions ==========
    function addSelectedTransactions() {
        const selected = extractedTransactions.filter(t => t._selected);
        if (selected.length === 0) {
            showToast('No transactions selected', 'error');
            return;
        }

        let added = 0;
        selected.forEach(tx => {
            // Create clean transaction (remove scanner metadata)
            const newTx = {
                id: generateId(),
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                type: tx.type,
                category: tx.category,
                payment: tx.payment,
                notes: tx.notes || ''
            };
            state.transactions.push(newTx);
            added++;
        });

        saveData();
        renderAll();
        closeScanModal();
        showToast(`✅ Added ${added} transaction(s) successfully!`);
    }

    // ========== Expose public API ==========
    window._scanner = {
        removeFile,
        toggleSelect,
    };

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScanner);
    } else {
        initScanner();
    }
})();
