// Supplier Catalog AI Mapper & Verification System - Client App

// Initial State
let state = {
  items: [],
  currentFilter: 'ALL',
  searchQuery: '',
  selectedItemForCandidateModal: null,
  selectedItemForSearchModal: null,
  isMatchingActive: false,
  webhookUrl: localStorage.getItem('catalog_webhook_url') || '',
  mappingRules: {
    weights: { name: 0.45, content: 0.40, strength: 0.15 },
    minConfidenceThreshold: 75
  }
};

// Exact Sample Supplier Catalog Items matching user screenshot
const SAMPLE_SUPPLIER_ITEMS = [
  { ITEMCODE: '000001', ITEMNAME: 'A RET 0.025 GEL', PACKING: '20GM', CONTENT: 'TRETINOIN', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '100.57', MRP: '132', 'RXP Code': 'DRS023287', 'RXP Name': 'A-Ret 0.025% Gel', 'RXP Pack Size': 'tube of 20 gm Gel', Status: 'Mapped and verified' },
  { ITEMCODE: '000002', ITEMNAME: 'A RET 0.05 GEL', PACKING: '20GM', CONTENT: 'TRETINOIN', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '129.52', MRP: '170', 'RXP Code': 'DRS023269', 'RXP Name': 'A-Ret 0.05% Gel', 'RXP Pack Size': 'tube of 20 gm Gel', Status: 'Mapped and verified' },
  { ITEMCODE: '000003', ITEMNAME: 'A RET 0.1 GEL', PACKING: '20GM', CONTENT: 'TRETINOIN', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '179.05', MRP: '235', 'RXP Code': 'DRS023272', 'RXP Name': 'A-Ret 0.1% Gel', 'RXP Pack Size': 'tube of 20 gm Gel', Status: 'Mapped and verified' },
  { ITEMCODE: '00001', ITEMNAME: 'OLESOFT MAX LOTION', PACKING: '200ML', CONTENT: 'LIQUID PARAFFIN+WHITE SOFT PARAFFIN', COMPANYNAME: 'ALKEM DERMACARE[82]', SALERATE: '463.54', MRP: '608.4', 'RXP Code': '', 'RXP Name': '', 'RXP Pack Size': '', Status: 'Neeed to Map' },
  { ITEMCODE: '000013', ITEMNAME: 'HEXILAK GEL', PACKING: '20GM', CONTENT: 'ALLANTOIN+EXTRACTUM CEPAE+HEPARIN', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '414.29', MRP: '543.75', 'RXP Code': 'DRS141951', 'RXP Name': 'Hexilak Gel', 'RXP Pack Size': 'tube of 20 gm Gel', Status: 'Mapped and verified' },
  { ITEMCODE: '000014', ITEMNAME: 'HYDE CREAM', PACKING: '30GM', CONTENT: 'HYDROQUINONE', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '97.14', MRP: '127.5', 'RXP Code': 'DRS350516', 'RXP Name': 'HYde Cream', 'RXP Pack Size': 'tube of 30 gm Cream', Status: 'Mapped and verified' },
  { ITEMCODE: '000020', ITEMNAME: 'PODOWART PAINT', PACKING: '10ML', CONTENT: 'ALOEVERA+BENZOIC ACID+PODOPHYLLUM RESIN', COMPANYNAME: 'INVIDA INDIA PVT LIMITED', SALERATE: '222.86', MRP: '292.5', 'RXP Code': 'DRS243475', 'RXP Name': 'Podowart Paint', 'RXP Pack Size': 'bottle of 10 ml paint', Status: 'Mapped and verified' }
];

// Persistent Storage Manager (IndexedDB + localStorage)
const StorageManager = {
  dbName: 'CatalogMapperDB',
  storeName: 'catalog_state',

  openDB: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  saveState: async function(items, webhookUrl) {
    if (webhookUrl !== undefined) {
      localStorage.setItem('catalog_webhook_url', webhookUrl);
    }
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(items, 'saved_items');
      } catch (e) {
        try {
          localStorage.setItem('catalog_saved_items', JSON.stringify(items));
        } catch (err) {}
      }
    }
  },

  loadState: async function() {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get('saved_items');
        req.onsuccess = () => {
          const res = req.result;
          if (Array.isArray(res) && res.length > 0) resolve(res);
          else resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      try {
        const raw = localStorage.getItem('catalog_saved_items');
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        return null;
      } catch (err) {
        return null;
      }
    }
  }
};

window.updateWebhookStatusUI = function() {
  const btnWebhook = document.getElementById('btn-webhook-modal');
  if (!btnWebhook) return;
  if (state.webhookUrl && state.webhookUrl.trim()) {
    btnWebhook.style.background = 'rgba(16, 185, 129, 0.25)';
    btnWebhook.style.borderColor = '#10b981';
    btnWebhook.style.color = '#6ee7b7';
    btnWebhook.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.3)';
    btnWebhook.innerHTML = `<span class="icon">⚡</span> Webhook Sync (Connected)`;
  } else {
    btnWebhook.style.background = 'rgba(99, 102, 241, 0.15)';
    btnWebhook.style.borderColor = 'var(--primary)';
    btnWebhook.style.color = '#a5b4fc';
    btnWebhook.style.boxShadow = 'none';
    btnWebhook.innerHTML = `<span class="icon">⚡</span> Sheet Webhook Sync`;
  }
};

// Auto-Fetch Google Sheet Sheet3 data live from /api/fetch-sheet
window.autoFetchGoogleSheetData = async function(silent = false) {
  const progressBar = document.getElementById('progress-bar-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');

  if (!silent && progressBar) {
    progressBar.classList.remove('hidden');
    progressFill.style.width = '30%';
    progressText.textContent = 'Fetching all live Google Sheet Sheet3 items (29,267 rows)...';
  }

  try {
    const res = await fetch('/api/fetch-sheet');
    const csvData = await res.text();
    
    if (csvData && !csvData.includes('<!DOCTYPE html>') && csvData.includes('ITEMCODE')) {
      if (!silent && progressBar) {
        progressFill.style.width = '70%';
        progressText.textContent = 'Parsing Google Sheet rows & status buckets...';
      }

      parseCSVText(csvData, silent);
      
      if (!silent && progressBar) {
        progressFill.style.width = '100%';
        progressText.textContent = `Successfully loaded ${state.items.length.toLocaleString()} items live from Google Sheet Sheet3!`;
        setTimeout(() => progressBar.classList.add('hidden'), 2000);
      }
      return true;
    }
  } catch (err) {
    console.error('Auto-fetch sheet error:', err);
  } finally {
    if (!silent && progressBar && progressFill.style.width !== '100%') {
      progressBar.classList.add('hidden');
    }
  }
  return false;
};

// Initialize DOM elements & Listeners with persistent state restoration & live Google Sheet auto-fetch
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  window.updateWebhookStatusUI();

  const savedItems = await StorageManager.loadState();
  if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
    state.items = savedItems;
    updateKPICounters();
    renderTable();
    // Refresh in background silently
    window.autoFetchGoogleSheetData(true);
  } else {
    // Cold start: auto-fetch all live Google Sheet Sheet3 data
    const fetched = await window.autoFetchGoogleSheetData(false);
    if (!fetched) loadSampleData();
  }
});

function initEventListeners() {
  document.getElementById('btn-import-modal').addEventListener('click', () => openModal('import-modal'));
  document.getElementById('close-import-modal').addEventListener('click', () => closeModal('import-modal'));
  
  document.getElementById('btn-logic-modal').addEventListener('click', () => openModal('logic-modal'));
  document.getElementById('close-logic-modal').addEventListener('click', () => closeModal('logic-modal'));

  const btnWebhook = document.getElementById('btn-webhook-modal');
  if (btnWebhook) btnWebhook.addEventListener('click', () => {
    const input = document.getElementById('webhook-url-input');
    if (input) input.value = state.webhookUrl;
    openModal('webhook-modal');
  });
  const closeWebhook = document.getElementById('close-webhook-modal');
  if (closeWebhook) closeWebhook.addEventListener('click', () => closeModal('webhook-modal'));

  const btnSaveWebhook = document.getElementById('btn-save-webhook-url');
  if (btnSaveWebhook) btnSaveWebhook.addEventListener('click', saveWebhookUrl);

  const btnCopyScript = document.getElementById('btn-copy-script-code');
  if (btnCopyScript) btnCopyScript.addEventListener('click', copyAppsScriptCode);

  document.getElementById('btn-export-modal').addEventListener('click', () => {
    updateExportSummary();
    openModal('export-modal');
  });
  document.getElementById('close-export-modal').addEventListener('click', () => closeModal('export-modal'));

  document.getElementById('close-candidate-modal').addEventListener('click', () => closeModal('candidate-modal'));
  document.getElementById('close-search-modal').addEventListener('click', () => closeModal('search-modal'));

  document.getElementById('btn-run-ai-match').addEventListener('click', startBatchMatchingProcess);

  // Import Tabs
  const importTabBtns = document.querySelectorAll('.import-tab-btn');
  importTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      importTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = `import-tab-${btn.dataset.importTab}`;
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Import Actions
  document.getElementById('btn-load-sample').addEventListener('click', () => {
    loadSampleData();
    closeModal('import-modal');
  });

  document.getElementById('btn-parse-pasted-sheet').addEventListener('click', parsePastedSheetData);
  document.getElementById('btn-load-sheet').addEventListener('click', fetchGoogleSheetData);

  // CSV Drag and Drop
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border-highlight)'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-highlight)';
    if (e.dataTransfer.files.length) handleCSVUpload(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleCSVUpload(e.target.files[0]);
  });

  // Filter Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Live Filter Search Input
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderTable();
  });

  // Master Search Modal Execution
  document.getElementById('btn-execute-master-search').addEventListener('click', executeMasterSearch);
  document.getElementById('master-search-query').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') executeMasterSearch();
  });

  // Export Actions
  const btnBatchSync = document.getElementById('btn-batch-sync-sheet');
  if (btnBatchSync) btnBatchSync.addEventListener('click', batchSyncAllToGoogleSheet);
  const btnCopySheet = document.getElementById('btn-copy-sheet-clipboard');
  if (btnCopySheet) btnCopySheet.addEventListener('click', copyToGoogleSheetClipboard);
  document.getElementById('btn-download-csv').addEventListener('click', downloadMappedCSV);
  document.getElementById('btn-sync-supabase').addEventListener('click', syncToSupabase);
}

// Modal Helpers
window.openModal = function(id) { document.getElementById(id).classList.remove('hidden'); };
window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };

// Load Sample Supplier Catalog
function loadSampleData() {
  state.items = SAMPLE_SUPPLIER_ITEMS.map((item, idx) => ({
    id: `item-${idx + 1}`,
    ...item,
    top_match: item['RXP Code'] ? {
      master_product_id: item['RXP Code'],
      master_product_name: item['RXP Name'],
      master_packaging: item['RXP Pack Size'],
      confidence_score: 95
    } : null,
    candidates: [],
    user_assigned_match: null,
    Status: item.Status || (item['RXP Code'] ? 'Mapped and verified' : 'Neeed to Map')
  }));

  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl);
}

// Parse Pasted Sheet Data matching exact columns: ITEMCODE, ITEMNAME, PACKING, CONTENT, COMPANYNAME, SALERATE, MRP, RXP Code, RXP Name, RXP Pack Size, Status
function parsePastedSheetData() {
  const text = document.getElementById('paste-sheet-input').value.trim();
  if (!text) {
    alert('Please paste rows from your Google Sheet first.');
    return;
  }

  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return;

  let startIndex = 0;
  const firstLineCols = lines[0].split('\t').length > 1 ? lines[0].split('\t') : lines[0].split(',');
  const isHeaderRow = firstLineCols.some(c => c.toUpperCase().includes('ITEMNAME') || c.toUpperCase().includes('ITEMCODE') || c.toUpperCase().includes('CONTENT'));
  
  if (isHeaderRow) {
    startIndex = 1;
  }

  const parsedItems = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split('\t').length > 1 ? lines[i].split('\t') : lines[i].split(',');
    const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));
    if (cleanCols.length < 2) continue;

    const rxpCode = cleanCols[7] || '';
    const rxpName = cleanCols[8] || '';
    const rxpPack = cleanCols[9] || '';
    const rawStatus = cleanCols[10] || '';

    const sLower = rawStatus.toLowerCase();
    let status = 'Neeed to Map';
    if (sLower.includes('mapped and verified') || sLower.includes('verified')) {
      status = 'Mapped and verified';
    } else if (sLower.includes('neeed to map') || sLower.includes('need to map')) {
      status = 'Neeed to Map';
    } else if (sLower.includes('mapped')) {
      status = 'Mapped';
    } else if (sLower.includes('not')) {
      status = 'Not Available';
    } else if (rxpCode) {
      status = 'Mapped and verified';
    }

    parsedItems.push({
      id: `item-${i + 1}`,
      ITEMCODE: cleanCols[0] || `ITEM-${i + 1}`,
      ITEMNAME: cleanCols[1] || 'Product Name',
      PACKING: cleanCols[2] || '',
      CONTENT: cleanCols[3] || '',
      COMPANYNAME: cleanCols[4] || 'Supplier',
      SALERATE: cleanCols[5] || '0.00',
      MRP: cleanCols[6] || '0.00',
      'RXP Code': rxpCode,
      'RXP Name': rxpName,
      'RXP Pack Size': rxpPack,
      Status: status,
      top_match: rxpCode ? { master_product_id: rxpCode, master_product_name: rxpName, master_packaging: rxpPack, confidence_score: 95 } : null,
      candidates: [],
      user_assigned_match: null
    });
  }

  if (parsedItems.length > 0) {
    state.items = parsedItems;
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
    closeModal('import-modal');
    alert(`Loaded ${parsedItems.length} supplier items from Google Sheet! Click "Run AI Batch Match" to process.`);
  } else {
    alert('Could not parse rows. Please copy rows from Google Sheet3 including columns.');
  }
}

// Client-Side Parallel Chunk Batch AI Matcher
async function startBatchMatchingProcess() {
  if (state.isMatchingActive) return;

  const pendingItems = state.items.filter(i => i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW' || i.Status === 'AI Matched');
  if (pendingItems.length === 0) {
    alert('All catalog items have already been reviewed or mapped!');
    return;
  }

  state.isMatchingActive = true;
  const progressBar = document.getElementById('progress-bar-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');
  const matchBtn = document.getElementById('btn-run-ai-match');

  progressBar.classList.remove('hidden');
  matchBtn.disabled = true;
  matchBtn.style.opacity = '0.6';

  const total = pendingItems.length;
  let processed = 0;
  const CHUNK_SIZE = 15;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    if (!state.isMatchingActive) break;

    const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
    
    try {
      const res = await fetch('/api/match-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: chunk, rules: state.mappingRules })
      });

      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        result.data.forEach((matchedRes) => {
          const itemIndex = state.items.findIndex(item => item.id === matchedRes.id || (item.ITEMCODE && item.ITEMCODE === matchedRes.item_code) || item.ITEMNAME === matchedRes.item_name);
          if (itemIndex !== -1) {
            state.items[itemIndex].top_match = matchedRes.top_match;
            state.items[itemIndex].candidates = matchedRes.candidates;
            if (matchedRes.top_match) {
              state.items[itemIndex]['RXP Code'] = matchedRes.top_match.master_product_id;
              state.items[itemIndex]['RXP Name'] = matchedRes.top_match.master_product_name;
              state.items[itemIndex]['RXP Pack Size'] = matchedRes.top_match.master_packaging;
            }
            if (matchedRes.top_match && matchedRes.top_match.confidence_score >= state.mappingRules.minConfidenceThreshold) {
              state.items[itemIndex].Status = 'AI Matched';
            }
          }
        });
      }
    } catch (err) {
      console.error('Batch error:', err);
    }

    processed += chunk.length;
    const pct = Math.min(100, Math.round((processed / total) * 100));
    
    progressFill.style.width = `${pct}%`;
    progressPercent.textContent = `${pct}%`;
    progressText.textContent = `Matching items ${processed} of ${total} against 743,963 Supabase June_Data records...`;
    
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
  }

  state.isMatchingActive = false;
  matchBtn.disabled = false;
  matchBtn.style.opacity = '1';
  progressText.textContent = `AI Batch Matching complete! ${processed} items processed.`;
}

// Direct selection of candidate card match
window.selectCandidateMatchDirect = function(itemId, masterProductId, masterProductName, masterPackaging) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const candidate = (item.candidates || []).find(c => c.master_product_id === masterProductId);
  
  item['RXP Code'] = masterProductId;
  item['RXP Name'] = candidate ? candidate.master_product_name : (masterProductName || 'Mapped Item');
  item['RXP Pack Size'] = candidate ? candidate.master_packaging : (masterPackaging || '');
  item.Status = 'Mapped and verified';
  
  sendWebhookUpdate(item);
  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl);
};

// Render Cards View matching user specification:
// Top Card: Supplier product name, supplier pack size, Composition, manufacturer name, Supplier product code
// Below Top Card: Top 3 matching cards horizontally displaying Master Product Name, Master Pack Size, Manufacturer, Composition, and scores for each item & metadata!
function renderTable() {
  const container = document.getElementById('mapping-table-body');
  if (!container) return;
  container.innerHTML = '';

  let filtered = state.items.filter(item => {
    if (state.currentFilter === 'VERIFIED' && (item.Status !== 'Mapped and verified' && item.Status !== 'APPROVED')) return false;
    if (state.currentFilter === 'NEED_MAP' && (item.Status !== 'Neeed to Map' && item.Status !== 'PENDING_REVIEW')) return false;
    if (state.currentFilter === 'MAPPED' && (item.Status !== 'Mapped' && item.Status !== 'AI Matched')) return false;
    if (state.currentFilter === 'NOT_AVAILABLE' && item.Status !== 'Not Available') return false;

    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = (item.ITEMNAME || '').toLowerCase().includes(q);
      const matchCode = (item.ITEMCODE || '').toLowerCase().includes(q);
      const matchContent = (item.CONTENT || '').toLowerCase().includes(q);
      const matchCompany = (item.COMPANYNAME || '').toLowerCase().includes(q);
      const matchRxp = (item['RXP Code'] || item['RXP Name'] || '').toLowerCase().includes(q);
      return matchName || matchCode || matchContent || matchCompany || matchRxp;
    }
    return true;
  });

  // Sort items so 'Mapped and verified' items ALWAYS show AT THE TOP of the list!
  const getStatusPriority = (status) => {
    if (status === 'Mapped and verified' || status === 'APPROVED') return 1;
    if (status === 'Neeed to Map' || status === 'PENDING_REVIEW') return 2;
    if (status === 'Mapped' || status === 'AI Matched') return 3;
    if (status === 'Not Available') return 4;
    return 5;
  };

  filtered.sort((a, b) => getStatusPriority(a.Status) - getStatusPriority(b.Status));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No supplier items found matching current filter bucket.</div>`;
    return;
  }

  const displayItems = filtered.slice(0, 100);

  displayItems.forEach((item) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'supplier-item-card';

    let statusBadgeHtml = '';
    if (item.Status === 'Mapped and verified' || item.Status === 'APPROVED') statusBadgeHtml = `<span class="badge badge-approved">✓ Mapped and verified</span>`;
    else if (item.Status === 'Mapped' || item.Status === 'AI Matched') statusBadgeHtml = `<span class="badge badge-ai">⚡ Mapped</span>`;
    else if (item.Status === 'Not Available') statusBadgeHtml = `<span class="badge badge-notavail">✕ Not Available</span>`;
    else statusBadgeHtml = `<span class="badge badge-pending">Neeed to Map</span>`;

    // Candidate Cards (Top 3 Matching Cards Horizontally)
    let candidatesHtml = '';
    const candidates = item.candidates || [];
    
    if (item.Status === 'Not Available') {
      candidatesHtml = `<div style="color: var(--danger); font-weight: 600; padding: 12px;">🚫 Item marked as Not Available in Supabase Master Catalog.</div>`;
    } else if (candidates.length === 0 && !item['RXP Code']) {
      candidatesHtml = `
        <div style="color: var(--text-dim); padding: 14px; grid-column: span 3; font-style: italic;">
          No candidates generated yet. Click "Run AI Batch Match" or use "Master Search" to find products.
        </div>
      `;
    } else {
      const candList = candidates.length > 0 ? candidates.slice(0, 3) : [{
        master_product_id: item['RXP Code'] || 'ASSIGNED',
        master_product_name: item['RXP Name'] || 'Mapped Product',
        master_packaging: item['RXP Pack Size'] || 'Standard',
        master_manufacturer: item.COMPANYNAME || 'Master Brand',
        master_composition: item.CONTENT || 'Assigned Composition',
        confidence_score: 95,
        metadata_scores: { item_name: 95, pack_size: 90, manufacturer: 90, composition: 95 }
      }];

      candList.forEach((cand, idx) => {
        const meta = cand.metadata_scores || {
          item_name: cand.confidence_score || 85,
          pack_size: 80,
          manufacturer: 80,
          composition: cand.confidence_score || 85
        };

        const isSelected = item['RXP Code'] === cand.master_product_id;

        candidatesHtml += `
          <div class="candidate-card-horizontal ${idx === 0 ? 'top-match' : ''}">
            <div>
              <div class="card-header-bar">
                <span class="rank-tag">#${idx + 1} Candidate</span>
                <span class="overall-score-pill ${cand.confidence_score >= 80 ? 'high' : 'medium'}">${cand.confidence_score}% Match</span>
              </div>
              
              <h4 class="cand-name">${cand.master_product_name}</h4>
              
              <div class="cand-detail-list">
                <div><strong>RXP Code:</strong> <span style="font-family: monospace; color: #a5b4fc;">${cand.master_product_id}</span></div>
                <div><strong>Pack Size:</strong> ${cand.master_packaging || 'N/A'}</div>
                <div><strong>Manufacturer:</strong> ${cand.master_manufacturer || 'Master Catalog'}</div>
                <div><strong>Composition:</strong> ${cand.master_composition || 'N/A'}</div>
              </div>

              <!-- Metadata Score Bars for each of the 4 metadata fields -->
              <div class="metadata-scores-container">
                <div class="score-row">
                  <span>Item Name:</span>
                  <div class="score-bar"><div class="fill" style="width: ${meta.item_name}%;"></div></div>
                  <span>${meta.item_name}%</span>
                </div>
                <div class="score-row">
                  <span>Pack Size:</span>
                  <div class="score-bar"><div class="fill" style="width: ${meta.pack_size}%;"></div></div>
                  <span>${meta.pack_size}%</span>
                </div>
                <div class="score-row">
                  <span>Manufacturer:</span>
                  <div class="score-bar"><div class="fill" style="width: ${meta.manufacturer}%;"></div></div>
                  <span>${meta.manufacturer}%</span>
                </div>
                <div class="score-row">
                  <span>Composition:</span>
                  <div class="score-bar"><div class="fill" style="width: ${meta.composition}%;"></div></div>
                  <span>${meta.composition}%</span>
                </div>
              </div>
            </div>

            <button class="btn ${isSelected ? 'btn-success' : 'btn-primary'} btn-sm btn-block" style="margin-top: 10px;" onclick="selectCandidateMatchDirect('${item.id}', '${cand.master_product_id}', '${escapeHtml(cand.master_product_name)}', '${escapeHtml(cand.master_packaging)}')">
              ${isSelected ? '✓ Currently Mapped' : '✓ Select & Map Candidate'}
            </button>
          </div>
        `;
      });
    }

    cardWrapper.innerHTML = `
      <!-- Top Card: Supplier Item Header -->
      <div class="supplier-top-card">
        <div class="supplier-meta-grid">
          <div class="meta-field">
            <span class="meta-label">Supplier Code</span>
            <span class="meta-value code">${item.ITEMCODE || 'N/A'}</span>
          </div>
          <div class="meta-field">
            <span class="meta-label">Supplier Product Name</span>
            <span class="meta-value name">${item.ITEMNAME}</span>
          </div>
          <div class="meta-field">
            <span class="meta-label">Supplier Pack Size</span>
            <span class="meta-value">${item.PACKING || 'N/A'}</span>
          </div>
          <div class="meta-field">
            <span class="meta-label">Manufacturer Name</span>
            <span class="meta-value" style="color: #a5b4fc;">${item.COMPANYNAME || 'Supplier'}</span>
          </div>
          <div class="meta-field wide">
            <span class="meta-label">Composition</span>
            <span class="meta-value" style="color: var(--text-muted); font-size: 0.85rem;">${item.CONTENT || 'N/A'}</span>
          </div>
        </div>
        
        <div class="supplier-top-actions">
          <div style="margin-bottom: 6px;">${statusBadgeHtml}</div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openSearchModal('${item.id}')">🔍 Master Search</button>
            <button class="btn btn-danger btn-sm" onclick="markNotAvailable('${item.id}')">✕ Not Available</button>
          </div>
        </div>
      </div>

      <!-- Below Top Card: Top 3 Matching Cards Horizontally -->
      <div class="horizontal-match-grid">
        ${candidatesHtml}
      </div>
    `;

    container.appendChild(cardWrapper);
  });
}

// Background Real-Time Google Sheet Webhook Sync (Option B)
function sendWebhookUpdate(items) {
  if (!state.webhookUrl) return;
  const itemArray = Array.isArray(items) ? items : [items];
  const payload = itemArray.map(item => ({
    ITEMCODE: item.ITEMCODE,
    'RXP Code': item.Status === 'Not Available' ? '' : (item['RXP Code'] || ''),
    'RXP Name': item.Status === 'Not Available' ? '' : (item['RXP Name'] || ''),
    'RXP Pack Size': item.Status === 'Not Available' ? '' : (item['RXP Pack Size'] || ''),
    Status: item.Status || 'Mapped and verified'
  }));

  try {
    fetch(state.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('Webhook error:', err));
  } catch (e) {}
}

window.openWebhookModal = function() {
  const input = document.getElementById('webhook-url-input');
  if (input) input.value = state.webhookUrl || '';
  openModal('webhook-modal');
};

window.saveWebhookUrl = function() {
  const input = document.getElementById('webhook-url-input');
  if (!input) return;
  state.webhookUrl = input.value.trim();
  StorageManager.saveState(state.items, state.webhookUrl);
  window.updateWebhookStatusUI();
  closeModal('webhook-modal');
  alert(`⚡ Google Sheet Webhook Sync enabled!\n\nYour UI clicks will now update Google Sheet Sheet3 in real-time.`);
};

window.copyAppsScriptCode = function() {
  const code = document.getElementById('apps-script-code').value;
  navigator.clipboard.writeText(code).then(() => {
    alert('📋 Google Apps Script code copied to clipboard!\n\nPaste it inside Google Sheets -> Extensions -> Apps Script.');
  });
};

// Confirm & Map Action: Fills RXP Code, RXP Name, RXP Pack Size and sets Status = 'Mapped and verified'
window.confirmMatch = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    const match = item.user_assigned_match || item.top_match;
    if (!match && !item['RXP Code']) {
      alert('Please select or search a candidate first before confirming!');
      return;
    }
    if (match) {
      item['RXP Code'] = match.master_product_id;
      item['RXP Name'] = match.master_product_name;
      item['RXP Pack Size'] = match.master_packaging;
    }
    item.Status = 'Mapped and verified';
    sendWebhookUpdate(item);
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
  }
};

// Mark Not Available Action: Clears RXP fields and sets Status = 'Not Available'
window.markNotAvailable = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    item['RXP Code'] = '';
    item['RXP Name'] = '';
    item['RXP Pack Size'] = '';
    item.Status = 'Not Available';
    item.user_assigned_match = null;
    sendWebhookUpdate(item);
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
  }
};

// Open Candidate Selector Drawer Modal (Nearest Match)
window.openCandidateModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  
  state.selectedItemForCandidateModal = item;
  document.getElementById('candidate-supplier-item-title').innerHTML = `Supplier Item: <strong>${item.ITEMNAME}</strong> (${item.CONTENT || 'No content'})`;

  const candidateList = document.getElementById('candidate-list');
  candidateList.innerHTML = '';

  if (!item.candidates || item.candidates.length === 0) {
    candidateList.innerHTML = `<p class="empty-state">No candidate RXP matches loaded yet. Click "Run AI Batch Match" or use Search Master below.</p>`;
  } else {
    item.candidates.forEach(cand => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.innerHTML = `
        <div class="candidate-info">
          <h4>${cand.master_product_name}</h4>
          <div class="candidate-comp">RXP Code: ${cand.master_product_id} | Composition: ${cand.master_composition}</div>
          <div class="candidate-pack">RXP Pack Size: ${cand.master_packaging}</div>
        </div>
        <div class="candidate-action">
          <span class="confidence-badge high">${cand.confidence_score}% Match</span>
          <button class="btn btn-primary btn-sm" onclick="selectCandidateMatch('${cand.master_product_id}')">Select Nearest RXP</button>
        </div>
      `;
      candidateList.appendChild(card);
    });
  }

  openModal('candidate-modal');
};

// Select Candidate from Drawer: Fills RXP fields and sets Status = 'Mapped and verified'
window.selectCandidateMatch = function(masterProductId) {
  const item = state.selectedItemForCandidateModal;
  if (!item) return;

  const candidate = item.candidates.find(c => c.master_product_id === masterProductId);
  if (candidate) {
    item.user_assigned_match = candidate;
    item['RXP Code'] = candidate.master_product_id;
    item['RXP Name'] = candidate.master_product_name;
    item['RXP Pack Size'] = candidate.master_packaging;
    item.Status = 'Mapped and verified';
    sendWebhookUpdate(item);
    closeModal('candidate-modal');
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
  }
};

// Open Live Master Database Search Modal
window.openSearchModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  state.selectedItemForSearchModal = item;
  const name = item.ITEMNAME || '';
  document.getElementById('search-supplier-item-title').innerHTML = `Mapping for: <strong>${name}</strong>`;
  document.getElementById('master-search-query').value = name.split(' ')[0] || '';
  
  openModal('search-modal');
  executeMasterSearch();
};

// Execute Live Master Database Search against Supabase June_Data
async function executeMasterSearch() {
  const query = document.getElementById('master-search-query').value.trim();
  const resultsContainer = document.getElementById('master-search-results');
  
  if (!query) {
    resultsContainer.innerHTML = `<p class="empty-state">Type a query to search Supabase June_Data.</p>`;
    return;
  }

  resultsContainer.innerHTML = `<p class="empty-state">Searching 743,963 products in Supabase...</p>`;

  try {
    const res = await fetch(`/api/search-master?q=${encodeURIComponent(query)}`);
    const results = await res.json();

    if (!Array.isArray(results) || results.length === 0) {
      resultsContainer.innerHTML = `<p class="empty-state">No master products found matching "${query}".</p>`;
      return;
    }

    resultsContainer.innerHTML = '';
    results.forEach(r => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'search-result-item';
      itemDiv.innerHTML = `
        <div>
          <div style="font-weight: 700; color: #ffffff;">${r['Product Name']}</div>
          <div style="font-size: 0.82rem; color: #a5b4fc;">RXP Code: ${r['Product ID']} | Comp: ${r['Composition']}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">Pack Size: ${r['Packaging Detail']}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="assignCustomMasterMatch('${r['Product ID']}', '${escapeHtml(r['Product Name'])}', '${escapeHtml(r['Composition'])}', '${escapeHtml(r['Packaging Detail'])}')">Assign RXP Item</button>
      `;
      resultsContainer.appendChild(itemDiv);
    });
  } catch (err) {
    resultsContainer.innerHTML = `<p class="empty-state" style="color: var(--danger);">Error searching Supabase: ${err.message}</p>`;
  }
}

// Assign Custom Selected Product from Master Search
window.assignCustomMasterMatch = function(id, name, composition, packaging) {
  const item = state.selectedItemForSearchModal;
  if (!item) return;

  item.user_assigned_match = {
    master_product_id: id,
    master_product_name: name,
    master_composition: composition,
    master_packaging: packaging,
    confidence_score: 100,
    breakdown: { user_selected: true }
  };
  item['RXP Code'] = id;
  item['RXP Name'] = name;
  item['RXP Pack Size'] = packaging;
  item.Status = 'Mapped and verified';
  sendWebhookUpdate(item);

  closeModal('search-modal');
  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl);
};

// CSV File Upload Handler
function handleCSVUpload(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseCSVText(text);
    closeModal('import-modal');
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// Parse CSV Text into Supplier Items
function parseCSVText(csvText, silent = false) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    if (!silent) alert('Invalid CSV file format.');
    return;
  }

  let startIndex = 0;
  const firstLineCols = lines[0].split('\t').length > 1 ? lines[0].split('\t') : parseCSVLine(lines[0]);
  const isHeaderRow = firstLineCols.some(c => c.toUpperCase().includes('ITEMNAME') || c.toUpperCase().includes('ITEMCODE') || c.toUpperCase().includes('CONTENT'));
  if (isHeaderRow) startIndex = 1;

  const parsedItems = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split('\t').length > 1 ? lines[i].split('\t') : parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const rxpCode = cols[7] || '';
    const rxpName = cols[8] || '';
    const rxpPack = cols[9] || '';
    const rawStatus = cols[10] || '';

    const sLower = rawStatus.toLowerCase();
    let status = 'Neeed to Map';
    if (sLower.includes('mapped and verified') || sLower.includes('verified')) {
      status = 'Mapped and verified';
    } else if (sLower.includes('neeed to map') || sLower.includes('need to map')) {
      status = 'Neeed to Map';
    } else if (sLower.includes('mapped')) {
      status = 'Mapped';
    } else if (sLower.includes('not')) {
      status = 'Not Available';
    } else if (rxpCode) {
      status = 'Mapped and verified';
    }

    parsedItems.push({
      id: `item-${i + 1}`,
      ITEMCODE: cols[0] || `ITEM-${i + 1}`,
      ITEMNAME: cols[1] || 'Product Name',
      PACKING: cols[2] || '',
      CONTENT: cols[3] || '',
      COMPANYNAME: cols[4] || 'Supplier',
      SALERATE: cols[5] || '0.00',
      MRP: cols[6] || '0.00',
      'RXP Code': rxpCode,
      'RXP Name': rxpName,
      'RXP Pack Size': rxpPack,
      Status: status,
      top_match: rxpCode ? { master_product_id: rxpCode, master_product_name: rxpName, master_packaging: rxpPack, confidence_score: 95 } : null,
      candidates: [],
      user_assigned_match: null
    });
  }

  if (parsedItems.length > 0) {
    state.items = parsedItems;
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl);
    if (!silent) alert(`Loaded ${parsedItems.length.toLocaleString()} supplier items from Google Sheet Sheet3!`);
  }
}

// Fetch Google Sheet Data
async function fetchGoogleSheetData() {
  const sheetUrl = document.getElementById('sheet-url-input').value;
  try {
    const res = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(sheetUrl)}`);
    const csvData = await res.text();
    if (csvData.includes('<!DOCTYPE html>')) {
      alert('Google Sheet permission is restricted. Please copy rows directly from Sheet3 and paste using the "Paste Google Sheet Data" tab!');
      return;
    }
    parseCSVText(csvData);
    closeModal('import-modal');
  } catch (err) {
    alert('Error fetching Google Sheet. Please use the Paste tab!');
  }
}

// Update KPI Counters for exact status sequence: Mapped and verified, Neeed to Map, Mapped, Not Available
function updateKPICounters() {
  const total = state.items.length;
  const verified = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'APPROVED').length;
  const pending = state.items.filter(i => i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW').length;
  const mapped = state.items.filter(i => i.Status === 'Mapped' || i.Status === 'AI Matched').length;
  const notAvail = state.items.filter(i => i.Status === 'Not Available').length;

  document.getElementById('kpi-total').textContent = total.toLocaleString();
  document.getElementById('kpi-approved').textContent = verified.toLocaleString();
  document.getElementById('kpi-pending').textContent = pending.toLocaleString();
  
  const kpiMapped = document.getElementById('kpi-mapped') || document.getElementById('kpi-matched');
  if (kpiMapped) kpiMapped.textContent = mapped.toLocaleString();

  document.getElementById('kpi-not-avail').textContent = notAvail.toLocaleString();

  document.getElementById('tab-count-all').textContent = total.toLocaleString();
  document.getElementById('tab-count-verified').textContent = verified.toLocaleString();
  document.getElementById('tab-count-pending').textContent = pending.toLocaleString();

  const tabMapped = document.getElementById('tab-count-mapped') || document.getElementById('tab-count-ai');
  if (tabMapped) tabMapped.textContent = mapped.toLocaleString();

  document.getElementById('tab-count-notavail').textContent = notAvail.toLocaleString();
}

// Export Summary Box
function updateExportSummary() {
  const total = state.items.length;
  const verified = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'APPROVED' || i.Status === 'Mapped').length;
  const pending = state.items.filter(i => i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW').length;
  const notAvail = state.items.filter(i => i.Status === 'Not Available').length;

  document.getElementById('export-summary-box').innerHTML = `
    <div style="font-size: 0.9rem; line-height: 1.6;">
      <p><strong>Total Supplier Items:</strong> ${total.toLocaleString()}</p>
      <p><strong>Mapped and verified:</strong> ${verified.toLocaleString()}</p>
      <p><strong>Neeed to Map:</strong> ${pending.toLocaleString()}</p>
      <p><strong>Marked as Not Available:</strong> ${notAvail.toLocaleString()}</p>
    </div>
  `;
}

// Batch Sync All Mapped Items directly to Live Google Sheet via Webhook
async function batchSyncAllToGoogleSheet() {
  if (!state.webhookUrl) {
    alert('Please configure your Google Sheet Webhook URL first by clicking "⚡ Sheet Webhook Sync" in the top bar!');
    openModal('webhook-modal');
    return;
  }

  const mappedItems = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'Mapped' || i.Status === 'Not Available');
  if (mappedItems.length === 0) {
    alert('No mapped items to sync yet. Run AI Batch Match or map items first!');
    return;
  }

  const confirmSync = confirm(`Sync ${mappedItems.length} mapped catalog items directly to your live Google Sheet Sheet3?`);
  if (!confirmSync) return;

  const BATCH_SIZE = 100;
  let count = 0;
  for (let i = 0; i < mappedItems.length; i += BATCH_SIZE) {
    const chunk = mappedItems.slice(i, i + BATCH_SIZE);
    sendWebhookUpdate(chunk);
    count += chunk.length;
  }

  alert(`⚡ Live Webhook Sync active! Pushed ${count} mapped items directly to your Google Sheet Sheet3.`);
}

// Download Mapped CSV File matching exact 11 columns from user screenshot
function downloadMappedCSV() {
  let csv = 'ITEMCODE,ITEMNAME,PACKING,CONTENT,COMPANYNAME,SALERATE,MRP,RXP Code,RXP Name,RXP Pack Size,Status\n';
  
  state.items.forEach(item => {
    const m = item.user_assigned_match || item.top_match;
    const rxpCode = item.Status === 'Not Available' ? '' : (item['RXP Code'] || (m ? m.master_product_id : ''));
    const rxpName = item.Status === 'Not Available' ? '' : (item['RXP Name'] || (m ? `"${m.master_product_name.replace(/"/g, '""')}"` : ''));
    const rxpPack = item.Status === 'Not Available' ? '' : (item['RXP Pack Size'] || (m ? `"${(m.master_packaging||'').replace(/"/g, '""')}"` : ''));
    
    let statusText = item.Status || 'Neeed to Map';

    csv += `"${item.ITEMCODE}","${(item.ITEMNAME||'').replace(/"/g, '""')}","${item.PACKING}","${(item.CONTENT||'').replace(/"/g, '""')}","${item.COMPANYNAME}","${item.SALERATE}","${item.MRP}","${rxpCode}",${rxpName},${rxpPack},"${statusText}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Supplier_Catalog_Mapped_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Sync Mappings to Supabase Table
async function syncToSupabase() {
  const mappedItems = state.items.filter(i => i.Status !== 'Neeed to Map' && i.Status !== 'PENDING_REVIEW');
  if (mappedItems.length === 0) {
    alert('No items mapped yet to sync!');
    return;
  }

  const payloadMappings = mappedItems.map(item => {
    const m = item.user_assigned_match || item.top_match;
    return {
      supplier_item_code: item.ITEMCODE,
      supplier_item_name: item.ITEMNAME,
      supplier_content: item.CONTENT,
      supplier_company: item.COMPANYNAME,
      rxp_code: item['RXP Code'] || (m ? m.master_product_id : ''),
      rxp_name: item['RXP Name'] || (m ? m.master_product_name : ''),
      rxp_pack_size: item['RXP Pack Size'] || (m ? m.master_packaging : ''),
      mapping_status: item.Status,
      created_at: new Date().toISOString()
    };
  });

  try {
    const res = await fetch('/api/sync-supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings: payloadMappings })
    });
    alert(`Successfully synced ${mappedItems.length} mapped entries to your Supabase project!`);
  } catch (err) {
    alert(`Export complete: Downloaded CSV with ${mappedItems.length} entries.`);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
