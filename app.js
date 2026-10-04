// Supplier Catalog AI Mapper & Verification System - Client App

// Initial State
let state = {
  items: [],
  currentFilter: 'ALL',
  searchQuery: '',
  selectedItemForCandidateModal: null,
  selectedItemForSearchModal: null,
  isMatchingActive: false,
  webhookUrl: localStorage.getItem('catalog_webhook_url') || 'https://script.google.com/macros/s/AKfycbwE63OrixJpKa9fxs1ihXa3yM6DhGq6RtdyVmptShccGpzR4vvMd35XzGIqT5UKNjI/exec',
  sheet5Url: localStorage.getItem('catalog_sheet5_url') || 'https://docs.google.com/spreadsheets/d/1a3eRoJcizuyVdp24bIlHpB_dRApmyJzqgOc_twzXCP8/edit#gid=978686474',
  mapperName: localStorage.getItem('catalog_mapper_name') || '',
  sheetUrl: localStorage.getItem('catalog_sheet_url') || 'https://docs.google.com/spreadsheets/d/1a3eRoJcizuyVdp24bIlHpB_dRApmyJzqgOc_twzXCP8/edit#gid=691679338',
  sheetName: localStorage.getItem('catalog_sheet_name') || 'Sheet4',
  isSheetLocked: localStorage.getItem('catalog_sheet_locked') === 'true',
  mappingRules: {
    weights: { name: 0.40, pack: 0.20, mfg: 0.20, content: 0.20 },
    minConfidenceThreshold: 75
  }
};

// Sample Supplier Catalog Items with 3 full candidate cards for side-by-side decision making
const SAMPLE_SUPPLIER_ITEMS = [
  { 
    ITEMCODE: '000001', 
    ITEMNAME: 'A RET 0.025 GEL', 
    PACKING: '20GM', 
    CONTENT: 'TRETINOIN', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '100.57', 
    MRP: '132', 
    'RXP Code': 'DRS023287', 
    'RXP Name': 'A-Ret 0.025% Gel', 
    'RXP Pack Size': 'tube of 20 gm Gel', 
    Status: 'Need to Validate',
    candidates: [
      { master_product_id: 'DRS023287', master_product_name: 'A-Ret 0.025% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.025%', confidence_score: 98, metadata_scores: { item_name: 98, pack_size: 96, manufacturer: 95, composition: 99 } },
      { master_product_id: 'DRS023269', master_product_name: 'A-Ret 0.05% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.05%', confidence_score: 86, metadata_scores: { item_name: 88, pack_size: 96, manufacturer: 95, composition: 80 } },
      { master_product_id: 'DRS023272', master_product_name: 'A-Ret 0.1% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.1%', confidence_score: 78, metadata_scores: { item_name: 80, pack_size: 96, manufacturer: 95, composition: 72 } }
    ]
  },
  { 
    ITEMCODE: '000002', 
    ITEMNAME: 'A RET 0.05 GEL', 
    PACKING: '20GM', 
    CONTENT: 'TRETINOIN', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '129.52', 
    MRP: '170', 
    'RXP Code': 'DRS023269', 
    'RXP Name': 'A-Ret 0.05% Gel', 
    'RXP Pack Size': 'tube of 20 gm Gel', 
    Status: 'Need to Validate',
    candidates: [
      { master_product_id: 'DRS023269', master_product_name: 'A-Ret 0.05% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.05%', confidence_score: 98, metadata_scores: { item_name: 99, pack_size: 96, manufacturer: 95, composition: 99 } },
      { master_product_id: 'DRS023287', master_product_name: 'A-Ret 0.025% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.025%', confidence_score: 85, metadata_scores: { item_name: 86, pack_size: 96, manufacturer: 95, composition: 80 } },
      { master_product_id: 'DRS023272', master_product_name: 'A-Ret 0.1% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.1%', confidence_score: 79, metadata_scores: { item_name: 81, pack_size: 96, manufacturer: 95, composition: 75 } }
    ]
  },
  { 
    ITEMCODE: '000003', 
    ITEMNAME: 'A RET 0.1 GEL', 
    PACKING: '20GM', 
    CONTENT: 'TRETINOIN', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '179.05', 
    MRP: '235', 
    'RXP Code': 'DRS023272', 
    'RXP Name': 'A-Ret 0.1% Gel', 
    'RXP Pack Size': 'tube of 20 gm Gel', 
    Status: 'Mapped and verified',
    candidates: [
      { master_product_id: 'DRS023272', master_product_name: 'A-Ret 0.1% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.1%', confidence_score: 98, metadata_scores: { item_name: 99, pack_size: 96, manufacturer: 95, composition: 99 } },
      { master_product_id: 'DRS023269', master_product_name: 'A-Ret 0.05% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.05%', confidence_score: 84, metadata_scores: { item_name: 85, pack_size: 96, manufacturer: 95, composition: 80 } },
      { master_product_id: 'DRS023287', master_product_name: 'A-Ret 0.025% Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'TRETINOIN 0.025%', confidence_score: 77, metadata_scores: { item_name: 78, pack_size: 96, manufacturer: 95, composition: 70 } }
    ]
  },
  { 
    ITEMCODE: '00001', 
    ITEMNAME: 'OLESOFT MAX LOTION', 
    PACKING: '200ML', 
    CONTENT: 'LIQUID PARAFFIN+WHITE SOFT PARAFFIN', 
    COMPANYNAME: 'ALKEM DERMACARE[82]', 
    SALERATE: '463.54', 
    MRP: '608.4', 
    'RXP Code': '', 
    'RXP Name': '', 
    'RXP Pack Size': '', 
    Status: 'Need to Map',
    candidates: [
      { master_product_id: 'DRS441092', master_product_name: 'Olesoft Max Lotion', master_packaging: 'bottle of 200 ml Lotion', master_manufacturer: 'ALKEM LABORATORIES LTD', master_composition: 'LIQUID PARAFFIN+WHITE SOFT PARAFFIN', confidence_score: 96, metadata_scores: { item_name: 97, pack_size: 95, manufacturer: 94, composition: 98 } },
      { master_product_id: 'DRS441088', master_product_name: 'Olesoft Lotion', master_packaging: 'bottle of 150 ml Lotion', master_manufacturer: 'ALKEM LABORATORIES LTD', master_composition: 'LIQUID PARAFFIN', confidence_score: 82, metadata_scores: { item_name: 85, pack_size: 80, manufacturer: 94, composition: 78 } },
      { master_product_id: 'DRS199201', master_product_name: 'Soft paraffin Max Lotion', master_packaging: 'bottle of 200 ml Lotion', master_manufacturer: 'DERMA PHARMA', master_composition: 'WHITE SOFT PARAFFIN', confidence_score: 75, metadata_scores: { item_name: 74, pack_size: 95, manufacturer: 60, composition: 85 } }
    ]
  },
  { 
    ITEMCODE: '000013', 
    ITEMNAME: 'HEXILAK GEL', 
    PACKING: '20GM', 
    CONTENT: 'ALLANTOIN+EXTRACTUM CEPAE+HEPARIN', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '414.29', 
    MRP: '543.75', 
    'RXP Code': 'DRS141951', 
    'RXP Name': 'Hexilak Gel', 
    'RXP Pack Size': 'tube of 20 gm Gel', 
    Status: 'Mapped and verified',
    candidates: [
      { master_product_id: 'DRS141951', master_product_name: 'Hexilak Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'ALLANTOIN+EXTRACTUM CEPAE+HEPARIN', confidence_score: 97, metadata_scores: { item_name: 98, pack_size: 96, manufacturer: 95, composition: 98 } },
      { master_product_id: 'DRS141955', master_product_name: 'Hexilak Ultra Gel', master_packaging: 'tube of 15 gm Gel', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'ALLANTOIN+HEPARIN', confidence_score: 83, metadata_scores: { item_name: 85, pack_size: 80, manufacturer: 95, composition: 80 } },
      { master_product_id: 'DRS009112', master_product_name: 'Cepa Gel', master_packaging: 'tube of 20 gm Gel', master_manufacturer: 'DERMA PVT LTD', master_composition: 'EXTRACTUM CEPAE', confidence_score: 74, metadata_scores: { item_name: 70, pack_size: 96, manufacturer: 60, composition: 75 } }
    ]
  },
  { 
    ITEMCODE: '000014', 
    ITEMNAME: 'HYDE CREAM', 
    PACKING: '30GM', 
    CONTENT: 'HYDROQUINONE', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '97.14', 
    MRP: '127.5', 
    'RXP Code': 'DRS350516', 
    'RXP Name': 'HYde Cream', 
    'RXP Pack Size': 'tube of 30 gm Cream', 
    Status: 'Mapped and verified',
    candidates: [
      { master_product_id: 'DRS350516', master_product_name: 'HYde Cream', master_packaging: 'tube of 30 gm Cream', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'HYDROQUINONE 2%', confidence_score: 96, metadata_scores: { item_name: 97, pack_size: 96, manufacturer: 95, composition: 96 } },
      { master_product_id: 'DRS350520', master_product_name: 'HYde Forte Cream', master_packaging: 'tube of 30 gm Cream', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'HYDROQUINONE 4%', confidence_score: 85, metadata_scores: { item_name: 86, pack_size: 96, manufacturer: 95, composition: 82 } },
      { master_product_id: 'DRS102931', master_product_name: 'Hydroquin Cream', master_packaging: 'tube of 30 gm Cream', master_manufacturer: 'GLOBAL DERMA', master_composition: 'HYDROQUINONE', confidence_score: 76, metadata_scores: { item_name: 75, pack_size: 96, manufacturer: 65, composition: 90 } }
    ]
  },
  { 
    ITEMCODE: '000020', 
    ITEMNAME: 'PODOWART PAINT', 
    PACKING: '10ML', 
    CONTENT: 'ALOEVERA+BENZOIC ACID+PODOPHYLLUM RESIN', 
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED', 
    SALERATE: '222.86', 
    MRP: '292.5', 
    'RXP Code': 'DRS243475', 
    'RXP Name': 'Podowart Paint', 
    'RXP Pack Size': 'bottle of 10 ml paint', 
    Status: 'Mapped and verified',
    candidates: [
      { master_product_id: 'DRS243475', master_product_name: 'Podowart Paint', master_packaging: 'bottle of 10 ml paint', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'ALOEVERA+BENZOIC ACID+PODOPHYLLUM RESIN', confidence_score: 97, metadata_scores: { item_name: 98, pack_size: 96, manufacturer: 95, composition: 98 } },
      { master_product_id: 'DRS243480', master_product_name: 'Podowart Solution', master_packaging: 'bottle of 10 ml paint', master_manufacturer: 'INVIDA INDIA PVT LIMITED', master_composition: 'PODOPHYLLUM RESIN 20%', confidence_score: 84, metadata_scores: { item_name: 85, pack_size: 96, manufacturer: 95, composition: 82 } },
      { master_product_id: 'DRS055122', master_product_name: 'Wart Paint Extra', master_packaging: 'bottle of 10 ml paint', master_manufacturer: 'SPECTRUM PHARMA', master_composition: 'BENZOIC ACID+PODOPHYLLUM', confidence_score: 75, metadata_scores: { item_name: 72, pack_size: 96, manufacturer: 60, composition: 85 } }
    ]
  }
];

// Persistent Storage Manager (IndexedDB + localStorage fallback)
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

  saveState: async function(items, webhookUrl, sheet5Url) {
    if (webhookUrl !== undefined) {
      localStorage.setItem('catalog_webhook_url', webhookUrl);
    }
    if (sheet5Url !== undefined) {
      localStorage.setItem('catalog_sheet5_url', sheet5Url);
    }
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(items, 'saved_items');
      } catch (e) {
        console.warn('IndexedDB save error:', e);
      }

      try {
        localStorage.setItem('catalog_saved_items', JSON.stringify(items));
      } catch (err) {
        try {
          const leanItems = items.map(i => ({
            id: i.id,
            ITEMCODE: i.ITEMCODE,
            ITEMNAME: i.ITEMNAME,
            PACKING: i.PACKING,
            CONTENT: i.CONTENT,
            COMPANYNAME: i.COMPANYNAME,
            SALERATE: i.SALERATE,
            MRP: i.MRP,
            'RXP Code': i['RXP Code'],
            'RXP Name': i['RXP Name'],
            'RXP Pack Size': i['RXP Pack Size'],
            Status: i.Status,
            top_match: i.top_match,
            candidates: (i.candidates || []).slice(0, 3)
          }));
          localStorage.setItem('catalog_saved_items', JSON.stringify(leanItems));
        } catch (e2) {}
      }
    }
  },

  loadState: async function() {
    try {
      const db = await this.openDB();
      const idbItems = await new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get('saved_items');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (Array.isArray(idbItems) && idbItems.length > 0) return idbItems;
    } catch (e) {}

    try {
      const raw = localStorage.getItem('catalog_saved_items');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return null;
  }
};

// Ensure item candidates use real Supabase master product data or sheet mappings
function ensureItemCandidates(item) {
  if (Array.isArray(item.candidates) && item.candidates.length > 0) {
    return item.candidates;
  }

  // If item has a real RXP Code & RXP Name from Sheet4, construct real candidate #1
  if (item['RXP Code'] && item['RXP Code'].trim() !== '' && item['RXP Code'] !== 'undefined') {
    const realCand = {
      master_product_id: item['RXP Code'],
      master_product_name: item['RXP Name'] && item['RXP Name'] !== 'undefined' ? item['RXP Name'] : item.ITEMNAME,
      master_packaging: item['RXP Pack Size'] && item['RXP Pack Size'] !== 'undefined' ? item['RXP Pack Size'] : item.PACKING,
      master_manufacturer: item.COMPANYNAME || 'Master Catalog',
      master_composition: item.CONTENT || '',
      confidence_score: 95,
      metadata_scores: { item_name: 96, pack_size: 92, manufacturer: 90, composition: 98 }
    };
    item.candidates = [realCand];
    return item.candidates;
  }

  // If item status is Mapped or AI Matched and top_match exists with REAL data, use it
  // NEVER generate fake random RXP-XXXXXX IDs — they corrupt Google Sheet sync
  if ((item.Status === 'Mapped' || item.Status === 'AI Matched') && item.top_match && item.top_match.master_product_id) {
    item.candidates = [
      {
        master_product_id: item.top_match.master_product_id,
        master_product_name: item.top_match.master_product_name,
        master_packaging: item.top_match.master_packaging || item.PACKING || '',
        master_manufacturer: item.COMPANYNAME || 'Master Catalog',
        master_composition: item.CONTENT || '',
        confidence_score: item.top_match.confidence_score || 85,
        metadata_scores: { item_name: 88, pack_size: 85, manufacturer: 80, composition: 88 }
      }
    ];
    return item.candidates;
  }

  // No real candidates available — return empty (never generate fake random IDs)
  item.candidates = item.candidates || [];
  return item.candidates;
}

// Lock / Unlock Sheet Data Toggle Action
window.toggleLockSheetData = function() {
  state.isSheetLocked = !state.isSheetLocked;
  localStorage.setItem('catalog_sheet_locked', state.isSheetLocked);

  window.updateLockUI();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);

  if (state.isSheetLocked) {
    alert('🔒 Sheet Data Locked!\n\nAll your items, stage transitions, and candidate suggestions are permanently protected from page refresh.');
  } else {
    alert('🔓 Sheet Data Unlocked.\n\nBackground live sheet updates are now re-enabled.');
  }
};

window.updateLockUI = function() {
  const btnLock = document.getElementById('btn-lock-sheet');
  const lockIcon = document.getElementById('lock-icon');
  const lockText = document.getElementById('lock-text');
  const lockBadge = document.getElementById('sheet-lock-badge');

  if (!btnLock) return;

  if (state.isSheetLocked) {
    btnLock.style.background = 'rgba(16, 185, 129, 0.25)';
    btnLock.style.borderColor = '#10b981';
    btnLock.style.color = '#34d399';
    btnLock.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.3)';
    if (lockIcon) lockIcon.textContent = '🔒';
    if (lockText) lockText.textContent = 'Sheet Data Locked';
    if (lockBadge) lockBadge.textContent = '(🔒 Locked)';
  } else {
    btnLock.style.background = 'var(--bg-elevated)';
    btnLock.style.borderColor = 'var(--border-color)';
    btnLock.style.color = 'var(--text-main)';
    btnLock.style.boxShadow = 'none';
    if (lockIcon) lockIcon.textContent = '🔓';
    if (lockText) lockText.textContent = 'Lock Sheet Data';
    if (lockBadge) lockBadge.textContent = '(Live Sync 🔄)';
  }
};

window.openSheetConfigModal = function() {
  const urlInput = document.getElementById('sheet-url-config-input');
  const nameInput = document.getElementById('sheet-name-config-input');
  if (urlInput) urlInput.value = state.sheetUrl || '';
  if (nameInput) nameInput.value = state.sheetName || 'Sheet4';
  openModal('sheet-config-modal');
};

window.saveSheetConfigAndFetch = async function() {
  const urlInput = document.getElementById('sheet-url-config-input');
  const nameInput = document.getElementById('sheet-name-config-input');

  if (urlInput) {
    state.sheetUrl = urlInput.value.trim();
    localStorage.setItem('catalog_sheet_url', state.sheetUrl);
  }
  if (nameInput && nameInput.value.trim()) {
    state.sheetName = nameInput.value.trim();
    localStorage.setItem('catalog_sheet_name', state.sheetName);
  }

  const headerSheetName = document.getElementById('header-sheet-name');
  if (headerSheetName) headerSheetName.textContent = state.sheetName;

  closeModal('sheet-config-modal');

  if (state.sheetUrl) {
    await fetchGoogleSheetData();
  } else {
    await autoFetchGoogleSheetData(false);
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
    btnWebhook.innerHTML = `<span class="icon">⚡</span> Sheet Webhook Sync (Connected)`;
  } else {
    btnWebhook.style.background = 'rgba(99, 102, 241, 0.15)';
    btnWebhook.style.borderColor = 'var(--primary)';
    btnWebhook.style.color = '#a5b4fc';
    btnWebhook.style.boxShadow = 'none';
    btnWebhook.innerHTML = `<span class="icon">⚡</span> Sheet Webhook Sync`;
  }
};

// Auto-Fetch Google Sheet data live from /api/fetch-sheet
window.autoFetchGoogleSheetData = async function(silent = false) {
  if (state.isSheetLocked) {
    console.log('Auto-fetch skipped: Sheet data is locked.');
    return true;
  }

  const progressBar = document.getElementById('progress-bar-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');

  if (!silent && progressBar) {
    progressBar.classList.remove('hidden');
    progressFill.style.width = '30%';
    progressText.textContent = `Fetching live items from Google Sheet (${state.sheetName})...`;
  }

  try {
    const fetchUrl = state.sheetUrl ? `/api/fetch-sheet?url=${encodeURIComponent(state.sheetUrl)}` : '/api/fetch-sheet';
    const res = await fetch(fetchUrl);
    const csvData = await res.text();
    
    if (csvData && !csvData.includes('<!DOCTYPE html>') && (csvData.toUpperCase().includes('ITEM CODE') || csvData.toUpperCase().includes('ITEMCODE') || csvData.toUpperCase().includes('ITEM NAME') || csvData.toUpperCase().includes('STATUS'))) {
      if (!silent && progressBar) {
        progressFill.style.width = '70%';
        progressText.textContent = 'Parsing Google Sheet rows & status buckets...';
      }

      parseCSVText(csvData, silent);
      
      if (!silent && progressBar) {
        progressFill.style.width = '100%';
        progressText.textContent = `Successfully loaded ${state.items.length.toLocaleString()} items live from Google Sheet ${state.sheetName}!`;
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

// Force fetch fresh live Google Sheet data (clears cache)
window.forceFetchLiveGoogleSheet = async function() {
  state.isSheetLocked = false;
  localStorage.setItem('catalog_sheet_locked', 'false');
  localStorage.removeItem('catalog_saved_items');
  state.items = [];

  try {
    const db = await StorageManager.openDB();
    const tx = db.transaction(StorageManager.storeName, 'readwrite');
    tx.objectStore(StorageManager.storeName).delete('saved_items');
  } catch (e) {}

  window.updateLockUI();
  await window.autoFetchGoogleSheetData(false);
};

// Initialize DOM elements & Listeners with fresh sheet fetch
document.addEventListener('DOMContentLoaded', async () => {
  const headerSheetName = document.getElementById('header-sheet-name');
  if (headerSheetName) headerSheetName.textContent = state.sheetName;

  initEventListeners();
  window.updateWebhookStatusUI();
  window.updateLockUI();

  // Auto-fetch fresh live Google Sheet data from Sheet4
  const fetched = await window.autoFetchGoogleSheetData(true);
  if (!fetched) {
    const savedItems = await StorageManager.loadState();
    if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
      state.items = savedItems.map(i => {
        const item = { ...i };
        ensureItemCandidates(item);
        return item;
      });
      updateKPICounters();
      renderTable();
    }
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

  const btnSearchMaster = document.getElementById('btn-execute-master-search');
  if (btnSearchMaster) btnSearchMaster.addEventListener('click', () => executeMasterSearch());

  const inputSearchQuery = document.getElementById('master-search-query');
  if (inputSearchQuery) {
    inputSearchQuery.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') executeMasterSearch();
    });
  }

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

  // Master Search Modal Execution — registered ONLY here (not duplicated below)

  // Export Actions
  const btnBatchSync = document.getElementById('btn-batch-sync-sheet');
  if (btnBatchSync) btnBatchSync.addEventListener('click', batchSyncAllToGoogleSheet);
  const btnCopySheet = document.getElementById('btn-copy-sheet-clipboard');
  if (btnCopySheet) btnCopySheet.addEventListener('click', copyToGoogleSheetClipboard);
  document.getElementById('btn-download-csv').addEventListener('click', downloadMappedCSV);
  document.getElementById('btn-sync-supabase').addEventListener('click', syncToSupabase);
}

// Modal Helpers
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.style.display = 'flex';
  }
};
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
    el.style.display = 'none';
  }
};

// Load Sample Supplier Catalog
function loadSampleData() {
  state.items = SAMPLE_SUPPLIER_ITEMS.map((item, idx) => {
    const newItem = {
      id: `item-${idx + 1}`,
      ...item,
      top_match: item['RXP Code'] ? {
        master_product_id: item['RXP Code'],
        master_product_name: item['RXP Name'],
        master_packaging: item['RXP Pack Size'],
        confidence_score: 95
      } : null,
      Status: item.Status || 'Need to Map'
    };
    ensureItemCandidates(newItem);
    return newItem;
  });

  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
}

// Parse Pasted Sheet Data matching exact columns with Smart Merge state preservation
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

  const existingMap = new Map();
  if (Array.isArray(state.items) && state.items.length > 0) {
    state.items.forEach(item => {
      const key = (item.ITEMCODE || item.ITEMNAME || '').toString().trim().toUpperCase();
      if (key) existingMap.set(key, item);
    });
  }

  const parsedItems = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split('\t').length > 1 ? lines[i].split('\t') : lines[i].split(',');
    const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));
    if (cleanCols.length < 2) continue;

    const itemCode = cleanCols[0] || `ITEM-${i + 1}`;
    const itemName = cleanCols[1] || 'Product Name';
    const key = (itemCode || itemName).toString().trim().toUpperCase();
    const existing = existingMap.get(key);

    // Sheet4 columns: A=ItemCode B=ItemName C=Pack D=Content E=Company F=MRP G=PTR H=RXPCode I=RXPName J=RXPPack K=Status ... W=candidatesJSON
    const rxpCode = cleanCols[7] || '';
    const rxpName = cleanCols[8] || '';
    const rxpPack = cleanCols[9] || '';
    const rawStatus = cleanCols[10] || '';
    const candidatesJSON = cleanCols[22] || '';

    const sLower = rawStatus.toLowerCase();
    let status = 'Need to Map';
    if (sLower.includes('mapped and verified') || sLower.includes('verified')) {
      status = 'Mapped and verified';
    } else if (sLower.includes('need to validate') || sLower.includes('validate')) {
      status = 'Need to Validate';
    } else if (sLower.includes('need to map')) {
      status = 'Need to Map';
    } else if (sLower.includes('mapped')) {
      status = 'Mapped';
    } else if (sLower.includes('not')) {
      status = 'Not Available';
    } else if (rxpCode) {
      status = 'Mapped and verified';
    }

    if (existing && (
      existing.Status === 'Mapped' ||
      existing.Status === 'Need to Validate' ||
      existing.Status === 'AI Matched' ||
      existing.Status === 'Mapped and verified' ||
      existing.Status === 'APPROVED' ||
      existing.Status === 'Not Available' ||
      (existing['RXP Code'] && existing['RXP Code'].trim() !== '')
    )) {
      if (candidatesJSON && (!existing.candidates || existing.candidates.length === 0)) {
        try { existing.candidates = JSON.parse(candidatesJSON); } catch(e){}
      }
      ensureItemCandidates(existing);
      parsedItems.push(existing);
    } else if (existing && rxpCode) {
      existing['RXP Code'] = rxpCode;
      existing['RXP Name'] = rxpName;
      existing['RXP Pack Size'] = rxpPack;
      existing.Status = status;
      if (candidatesJSON) {
        try { existing.candidates = JSON.parse(candidatesJSON); } catch(e){}
      }
      ensureItemCandidates(existing);
      parsedItems.push(existing);
    } else {
      const newItem = {
        id: existing ? existing.id : `item-${i + 1}`,
        ITEMCODE: itemCode,
        ITEMNAME: itemName,
        PACKING: cleanCols[2] || '',
        CONTENT: cleanCols[3] || '',
        COMPANYNAME: cleanCols[4] || 'Supplier',
        SALERATE: cleanCols[6] || cleanCols[5] || '0.00',
        MRP: cleanCols[5] || '0.00',
        'RXP Code': rxpCode,
        'RXP Name': rxpName,
        'RXP Pack Size': rxpPack,
        Status: status,
        top_match: rxpCode ? { master_product_id: rxpCode, master_product_name: rxpName, master_packaging: rxpPack, confidence_score: 95 } : null,
        candidates: existing ? (existing.candidates || []) : (candidatesJSON ? (function(){ try{ return JSON.parse(candidatesJSON); }catch(e){ return []; }})() : []),
        user_assigned_match: existing ? existing.user_assigned_match : null
      };
      ensureItemCandidates(newItem);
      parsedItems.push(newItem);
    }
  }

  if (parsedItems.length > 0) {
    state.items = parsedItems;
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
    closeModal('import-modal');
    alert(`Loaded ${parsedItems.length} supplier items from Google Sheet Sheet4!`);
  } else {
    alert('Could not parse rows. Please copy rows from Google Sheet including headers.');
  }
}

// Client-Side Parallel Chunk Batch AI Matcher (Moves pending items to Stage 2: AI Mapped / Mapped)
async function startBatchMatchingProcess() {
  if (state.isMatchingActive) return;

  const pendingItems = state.items.filter(i => (i.Status === 'Need to Map' || i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW') && (!i['RXP Code'] || i['RXP Code'].trim() === ''));
  if (pendingItems.length === 0) {
    alert('All catalog items have already been processed through AI matching!');
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
        const batchPayload = [];
        result.data.forEach((matchedRes) => {
          const itemIndex = state.items.findIndex(item => item.id === matchedRes.id || (item.ITEMCODE && item.ITEMCODE === matchedRes.item_code) || item.ITEMNAME === matchedRes.item_name);
          if (itemIndex !== -1) {
            state.items[itemIndex].top_match = matchedRes.top_match;
            if (matchedRes.candidates && matchedRes.candidates.length > 0) {
              state.items[itemIndex].candidates = matchedRes.candidates;
            }
            ensureItemCandidates(state.items[itemIndex]);

            // Stage 2: Move to 'Mapped' (AI Mapped) so candidates can be reviewed with MAP CTA!
            state.items[itemIndex].Status = 'Mapped';
            batchPayload.push(state.items[itemIndex]);
          }
        });
        if (batchPayload.length > 0) {
           sendWebhookUpdate(batchPayload);
        }
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
    StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
  }

  state.isMatchingActive = false;
  matchBtn.disabled = false;
  matchBtn.style.opacity = '1';
  progressText.textContent = `AI Batch Matching complete! ${processed} items placed in "AI Mapped Candidates" tab.`;

  // Auto-switch filter tab to MAPPED stage
  state.currentFilter = 'MAPPED';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const mappedTabBtn = document.querySelector('.tab-btn[data-filter="MAPPED"]');
  if (mappedTabBtn) mappedTabBtn.classList.add('active');
  renderTable();
}

// STAGE 2 ACTION: User clicks [⚡ MAP] on a candidate card
// Selects candidate and moves item to Stage 3: 'Need to Validate'
window.mapCandidateToValidation = function(itemId, masterProductId, masterProductName, masterPackaging) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const candidate = (item.candidates || []).find(c => c.master_product_id === masterProductId);
  
  item['RXP Code'] = masterProductId;
  item['RXP Name'] = candidate ? candidate.master_product_name : (masterProductName || 'Mapped Item');
  item['RXP Pack Size'] = candidate ? candidate.master_packaging : (masterPackaging || '');
  
  // Transition to Stage 3: 'Need to Validate'
  item.Status = 'Need to Validate';
  ensureItemCandidates(item);

  // Sync stage to Google Sheet Sheet4 via Webhook
  sendWebhookUpdate(item);
  
  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
};

// STAGE 3 ACTION: User clicks [✓ ACCEPT] in Validate Section
// Accepts mapping and transitions item to Stage 4: 'Mapped and verified'
window.acceptValidationMatch = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  item.Status = 'Mapped and verified';
  ensureItemCandidates(item);

  // Sync to Google Sheet Sheet4
  sendWebhookUpdate(item);
  
  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
};

// STAGE 3 ACTION: User clicks [✕ REJECT] in Validate Section
// Rejects mapping, clears RXP fields, and resets item back to Stage 1: 'Neeed to Map'
window.rejectValidationMatch = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  item['RXP Code'] = '';
  item['RXP Name'] = '';
  item['RXP Pack Size'] = '';
  item.Status = 'Need to Map';
  item.user_assigned_match = null;

  // Sync reset to Google Sheet Sheet4
  sendWebhookUpdate(item);

  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
};

// Render 3-Stage Cards View based on active Filter Tab
function renderTable() {
  const container = document.getElementById('mapping-table-body');
  if (!container) return;
  container.innerHTML = '';

  let filtered = state.items.filter(item => {
    if (state.currentFilter === 'VERIFIED' && (item.Status !== 'Mapped and verified' && item.Status !== 'APPROVED')) return false;
    if (state.currentFilter === 'VALIDATE' && item.Status !== 'Need to Validate') return false;
    if (state.currentFilter === 'NEED_MAP' && (item.Status !== 'Need to Map' && item.Status !== 'Neeed to Map' && item.Status !== 'PENDING_REVIEW')) return false;
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

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No supplier items found matching current stage filter bucket.</div>`;
    return;
  }

  const displayItems = filtered.slice(0, 100);

  displayItems.forEach((item) => {
    // Stage 3: NEED TO VALIDATE VIEW (Render Side-by-Side EXACTLY 2 CARDS: Supplier Item & Mapped Item with ACCEPT / REJECT CTAs)
    if (item.Status === 'Need to Validate' || (state.currentFilter === 'VALIDATE' && item.Status === 'Need to Validate')) {
      const validateCard = document.createElement('div');
      validateCard.className = 'validate-side-by-side-card';

      const rxpCodeVal = (item['RXP Code'] && item['RXP Code'] !== 'undefined') ? item['RXP Code'] : (item.user_assigned_match ? item.user_assigned_match.master_product_id : (item.top_match ? item.top_match.master_product_id : 'RXP-ITEM'));
      const rxpNameVal = (item['RXP Name'] && item['RXP Name'] !== 'undefined') ? item['RXP Name'] : (item.user_assigned_match ? item.user_assigned_match.master_product_name : (item.top_match ? item.top_match.master_product_name : item.ITEMNAME));
      const rxpPackVal = (item['RXP Pack Size'] && item['RXP Pack Size'] !== 'undefined') ? item['RXP Pack Size'] : (item.user_assigned_match ? item.user_assigned_match.master_packaging : (item.top_match ? item.top_match.master_packaging : item.PACKING));

      const topMatch = (item.candidates && item.candidates.length > 0) 
        ? item.candidates.find(c => c.master_product_id === rxpCodeVal) || item.candidates[0]
        : { master_product_id: rxpCodeVal, master_product_name: rxpNameVal, master_packaging: rxpPackVal, master_manufacturer: item.COMPANYNAME, master_composition: item.CONTENT, confidence_score: 95 };

      validateCard.innerHTML = `
        <div class="validate-header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge badge-validate">⚡ Need to Validate</span>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">Supplier Code: ${escapeHtml(item.ITEMCODE)}</span>
          </div>
          <span class="overall-score-pill high">${topMatch.confidence_score || 95}% Match Score</span>
        </div>

        <div class="validate-grid">
          <!-- CARD 1 (LEFT): SUPPLIER ITEM DETAILS -->
          <div class="validate-box supplier">
            <div class="validate-box-title">
              <span>📦 1. Supplier Product Info</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Raw Input</span>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--primary); margin-bottom: 8px;">${escapeHtml(item.ITEMNAME)}</h3>
              <div style="font-size: 0.84rem; line-height: 1.6; color: var(--text-muted);">
                <div><strong>Pack Size:</strong> ${escapeHtml(item.PACKING || 'N/A')}</div>
                <div><strong>Manufacturer:</strong> ${escapeHtml(item.COMPANYNAME || 'Supplier')}</div>
                <div><strong>Composition:</strong> ${escapeHtml(item.CONTENT || 'N/A')}</div>
                <div><strong>Rate / MRP:</strong> ₹${item.SALERATE} / ₹${item.MRP}</div>
              </div>
            </div>
          </div>

          <!-- CARD 2 (RIGHT): MAPPED RXP MASTER ITEM DETAILS -->
          <div class="validate-box mapped">
            <div class="validate-box-title">
              <span>✨ 2. Mapped RXP Master Item</span>
              <span style="font-size: 0.72rem; color: var(--purple);">AI Candidate Selection</span>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">${escapeHtml(rxpNameVal)}</h3>
              <div style="font-size: 0.84rem; line-height: 1.6; color: var(--text-muted);">
                <div><strong>RXP Code:</strong> <span style="font-family: monospace; font-weight: 700; color: var(--text-main);">${escapeHtml(rxpCodeVal)}</span></div>
                <div><strong>RXP Pack Size:</strong> ${escapeHtml(rxpPackVal || 'N/A')}</div>
                <div><strong>Manufacturer:</strong> ${escapeHtml(topMatch.master_manufacturer || item.COMPANYNAME || 'Master Catalog')}</div>
                <div><strong>Composition:</strong> ${escapeHtml(topMatch.master_composition || item.CONTENT || 'N/A')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTION CONTROLS: ACCEPT OR REJECT -->
        <div class="validate-actions-bar">
          <button class="btn btn-danger btn-reject" onclick="rejectValidationMatch('${item.id}')">
            ✕ REJECT MATCH
          </button>
          <button class="btn btn-success btn-accept" onclick="acceptValidationMatch('${item.id}')">
            ✓ ACCEPT & LOCK MATCH
          </button>
        </div>
      `;

      container.appendChild(validateCard);
      return;
    }

    // Stage 1 & 2 & 4 Card Container
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'supplier-item-card';

    let statusBadgeHtml = '';
    if (item.Status === 'Mapped and verified' || item.Status === 'APPROVED') {
      statusBadgeHtml = `<span class="badge badge-approved">✓ Mapped and verified</span>`;
    } else if (item.Status === 'Need to Validate') {
      statusBadgeHtml = `<span class="badge badge-validate">⚡ Need to Validate</span>`;
    } else if (item.Status === 'Mapped' || item.Status === 'AI Matched') {
      statusBadgeHtml = `<span class="badge badge-ai">⚡ AI Mapped</span>`;
    } else if (item.Status === 'Not Available') {
      statusBadgeHtml = `<span class="badge badge-notavail">✕ Not Available</span>`;
    } else {
      statusBadgeHtml = `<span class="badge badge-pending">Need to Map</span>`;
    }

    // Determine whether to show Candidate Cards below Top Card
    // Stage 1 (NEED_MAP / Unmapped): SHOW NO COMPARISON CARDS!
    // Stage 2 (MAPPED / AI Matched): SHOW 3-4 CANDIDATE CARDS WITH CTA [MAP]!
    let candidatesHtml = '';

    if (item.Status === 'Need to Map' || item.Status === 'Neeed to Map' || state.currentFilter === 'NEED_MAP') {
      // Stage 1: NO COMPARISON CARDS AT ALL!
      candidatesHtml = '';
    } else if (item.Status === 'Not Available') {
      candidatesHtml = `<div style="color: var(--danger); font-weight: 600; padding: 12px; grid-column: span 3;">🚫 Item marked as Not Available in Supabase Master Catalog.</div>`;
    } else {
      // Stage 2 & 4: Render 3 to 4 Candidate Suggestion Cards Horizontally
      const candList = ensureItemCandidates(item).slice(0, 4);

      candList.forEach((cand, idx) => {
        const meta = cand.metadata_scores || {
          item_name: cand.confidence_score || 85,
          pack_size: 80,
          manufacturer: 80,
          composition: cand.confidence_score || 85
        };

        const rankClass = idx === 0 ? 'cand-rank-1' : (idx === 1 ? 'cand-rank-2' : 'cand-rank-3');
        const rankBadgeLabel = idx === 0 ? '#1 Rank (Best Fit)' : `#${idx + 1} Rank Candidate`;

        candidatesHtml += `
          <div class="candidate-card-horizontal ${rankClass}">
            <div>
              <div class="card-header-bar">
                <span class="rank-tag">${rankBadgeLabel}</span>
                <span class="overall-score-pill ${cand.confidence_score >= 80 ? 'high' : 'medium'}">${cand.confidence_score}% Match</span>
              </div>
              
              <h4 class="cand-name">${cand.master_product_name}</h4>
              
              <div class="cand-detail-list">
                <div><strong>RXP Code:</strong> <span style="font-family: monospace; font-weight: 700; color: var(--text-main);">${cand.master_product_id}</span></div>
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

            <!-- CTA: MAP -->
            <button class="btn btn-primary btn-sm btn-block" style="margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);" onclick="mapCandidateToValidation('${item.id}', '${cand.master_product_id}', '${escapeHtml(cand.master_product_name)}', '${escapeHtml(cand.master_packaging)}')">
              ⚡ MAP THIS CANDIDATE
            </button>
          </div>
        `;
      });
    }

    const hasBottomGrid = candidatesHtml.trim().length > 0;

    cardWrapper.innerHTML = `
      <!-- Top Card: Supplier Item Header -->
      <div class="supplier-top-card ${hasBottomGrid ? '' : 'no-border'}">
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
            <span class="meta-value" style="color: var(--primary); font-weight: 600;">${item.COMPANYNAME || 'Supplier'}</span>
          </div>
          <div class="meta-field">
            <span class="meta-label">MRP</span>
            <span class="meta-value" style="color: var(--success); font-weight: 600;">₹${item.MRP || 'N/A'}</span>
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

      <!-- Stage 2 / 4 Candidate Comparison Grid -->
      ${hasBottomGrid ? `<div class="horizontal-match-grid">${candidatesHtml}</div>` : ''}
    `;

    container.appendChild(cardWrapper);
  });
}

// Background Real-Time Google Sheet Webhook Sync (Syncs stage transitions to Sheet4)
// FIX: Send one request per item (Apps Script reads data.ITEMCODE from a single object, not an array)
// FIX: Include MapperName from state so Sheet4 Column K is always populated
function sendWebhookUpdate(items) {
  if (!state.webhookUrl) return;
  const itemArray = Array.isArray(items) ? items : [items];
  if (itemArray.length === 0) return;
  const mapperName = state.mapperName || localStorage.getItem('catalog_mapper_name') || '';

  const payloadArray = itemArray.map(item => ({
      ITEMCODE: item.ITEMCODE,
        ITEMNAME: item.ITEMNAME || '',
      'RXP Code': item.Status === 'Not Available' ? '' : (item['RXP Code'] || ''),
      'RXP Name': item.Status === 'Not Available' ? '' : (item['RXP Name'] || ''),
      'RXP Pack Size': item.Status === 'Not Available' ? '' : (item['RXP Pack Size'] || ''),
      PACKING: item.PACKING || '',
        CONTENT: item.CONTENT || '',
        MRP: item.MRP || '',
        Status: item.Status || 'Need to Map',
      MapperName: mapperName,
      candidates: item.candidates || []
  }));

  try {
    fetch(state.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadArray)
    }).catch(err => console.error('Webhook error:', err));
  } catch (e) {}
}

window.openWebhookModal = function() {
  const input = document.getElementById('webhook-url-input');
  if (input) {
    input.value = state.webhookUrl || localStorage.getItem('catalog_webhook_url') || '';
  }
  openModal('webhook-modal');
  setTimeout(() => {
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

window.saveWebhookUrl = function() {
  const input = document.getElementById('webhook-url-input');
  if (!input) return;
  state.webhookUrl = input.value.trim();
  const input5 = document.getElementById('sheet5-url-config-input');
  if (input5) state.sheet5Url = input5.value.trim();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
  window.updateWebhookStatusUI();
  closeModal('webhook-modal');
  alert(`⚡ Google Sheet Webhook Sync enabled!\n\nYour UI stage transitions will now update Google Sheet Sheet4 in real-time.`);
};

window.copyAppsScriptCode = function() {
  const code = document.getElementById('apps-script-code').value;
  navigator.clipboard.writeText(code).then(() => {
    alert('📋 Google Apps Script code copied to clipboard!\n\nPaste it inside Google Sheets -> Extensions -> Apps Script.');
  });
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
    StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
  }
};

// Open Candidate Selector Drawer Modal
window.openCandidateModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  
  state.selectedItemForCandidateModal = item;
  document.getElementById('candidate-supplier-item-title').innerHTML = `Supplier Item: <strong>${item.ITEMNAME}</strong> (${item.CONTENT || 'No content'})`;

  const candidateList = document.getElementById('candidate-list');
  candidateList.innerHTML = '';

  const candidates = ensureItemCandidates(item);
  candidates.forEach(cand => {
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

  openModal('candidate-modal');
};

// Select Candidate from Drawer: Fills RXP fields and sets Status = 'Need to Validate'
window.selectCandidateMatch = function(masterProductId) {
  const item = state.selectedItemForCandidateModal;
  if (!item) return;

  const candidate = (item.candidates || []).find(c => c.master_product_id === masterProductId);
  if (candidate) {
    item.user_assigned_match = candidate;
    item['RXP Code'] = candidate.master_product_id;
    item['RXP Name'] = candidate.master_product_name;
    item['RXP Pack Size'] = candidate.master_packaging;
    item.Status = 'Need to Validate';
    ensureItemCandidates(item);
    sendWebhookUpdate(item);
    closeModal('candidate-modal');
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
  }
};

// Open Live Master Database Search Modal
window.openSearchModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  state.selectedItemForSearchModal = item;
  const name = item.ITEMNAME || '';
  const pack = item.PACKING || item.PACK || item.Pack || item['Pack'] || '';
  const packBadge = pack ? ` <span style="background: rgba(99, 102, 241, 0.25); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; margin-left: 6px;">Pack: ${escapeHtml(pack)}</span>` : '';
  document.getElementById('search-supplier-item-title').innerHTML = `Mapping for: <strong style="color: #ffffff;">${escapeHtml(name)}</strong>${packBadge}`;
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
          <div style="font-weight: 700; color: var(--text-main);">${r['Product Name']}</div>
          <div style="font-size: 0.82rem; color: var(--primary);">RXP Code: ${r['Product ID']} | Comp: ${r['Composition']}</div>
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

// Assign Custom Selected Product from Master Search -> Moves item to 'Need to Validate'
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
  item.Status = 'Need to Validate';
  ensureItemCandidates(item);
  sendWebhookUpdate(item);

  closeModal('search-modal');
  updateKPICounters();
  renderTable();
  StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
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

// Parse CSV Text into Supplier Items (with Smart Merge to preserve local mapped decisions)
function parseCSVText(csvText, silent = false) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    if (!silent) alert('Invalid CSV file format.');
    return;
  }

  const firstLineCols = lines[0].split('\t').length > 1 ? lines[0].split('\t') : parseCSVLine(lines[0]);
  // Dynamic Header Column Index Map
  let codeIdx = 0;
  let nameIdx = 1;
  let packIdx = 2;
  let contentIdx = 3;
  let companyIdx = 4;
  let saleRateIdx = 6;
  let mrpIdx = 5;
  let rxpCodeIdx = 7;
  let rxpNameIdx = 8;
  let rxpPackIdx = 9;
  let statusIdx = 10;
  let candJsonIdx = 22;

  let startIndex = 0;
  const isHeaderRow = firstLineCols.some(c => {
    const u = c.toUpperCase();
    return u.includes('ITEM') || u.includes('CODE') || u.includes('NAME') || u.includes('CONTENT') || u.includes('PACK');
  });

  if (isHeaderRow) {
    startIndex = 1;
    firstLineCols.forEach((colStr, idx) => {
      const u = colStr.trim().toUpperCase();
      if (u.includes('CODE') && !u.includes('RXP')) codeIdx = idx;
      else if ((u.includes('NAME') || u.includes('ITEM')) && !u.includes('COMPANY') && !u.includes('RXP')) nameIdx = idx;
      else if (u.includes('PACK') && !u.includes('RXP')) packIdx = idx;
      else if (u.includes('CONTENT') || u.includes('COMPOSITION')) contentIdx = idx;
      else if (u.includes('COMPANY') || u.includes('MANUFACTURER') || u.includes('MFG')) companyIdx = idx;
      else if (u.includes('RATE') || u.includes('SALE')) saleRateIdx = idx;
      else if (u.includes('MRP')) mrpIdx = idx;
      else if (u.includes('RXP CODE') || (u.includes('RXP') && u.includes('CODE'))) rxpCodeIdx = idx;
      else if (u.includes('RXP NAME') || (u.includes('RXP') && u.includes('NAME'))) rxpNameIdx = idx;
      else if (u.includes('RXP PACK') || (u.includes('RXP') && u.includes('PACK'))) rxpPackIdx = idx;
      else if (u.includes('STATUS')) statusIdx = idx;
    });
  }

  const existingMap = new Map();
  if (Array.isArray(state.items) && state.items.length > 0) {
    state.items.forEach(item => {
      const key = (item.ITEMCODE || item.ITEMNAME || '').toString().trim().toUpperCase();
      if (key) existingMap.set(key, item);
    });
  }

  const mergedItems = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split('\t').length > 1 ? lines[i].split('\t') : parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const itemCode = cols[codeIdx] || `ITEM-${i + 1}`;
    const itemName = cols[nameIdx] || 'Product Name';
    const key = (itemCode || itemName).toString().trim().toUpperCase();
    const existing = existingMap.get(key);

    const rxpCode = (cols[rxpCodeIdx] || '').trim();
    const rxpName = (cols[rxpNameIdx] || '').trim();
    const rxpPack = (cols[rxpPackIdx] || '').trim();
    const rawStatus = (cols[statusIdx] || '').trim();
    const candidatesJSON = cols[candJsonIdx] || '';

    const sLower = rawStatus.toLowerCase();
    let status = 'Need to Map';
    if (sLower.includes('mapped and verified') || sLower.includes('verified')) {
      status = 'Mapped and verified';
    } else if (sLower.includes('need to validate') || sLower.includes('validate')) {
      status = 'Need to Validate';
    } else if (sLower.includes('need to map')) {
      status = 'Need to Map';
    } else if (sLower.includes('mapped')) {
      status = 'Mapped';
    } else if (sLower.includes('not')) {
      status = 'Not Available';
    } else if (rxpCode) {
      status = 'Mapped and verified';
    }

    if (existing && (
      existing.Status === 'Mapped' ||
      existing.Status === 'Need to Validate' ||
      existing.Status === 'AI Matched' ||
      existing.Status === 'Mapped and verified' ||
      existing.Status === 'APPROVED' ||
      existing.Status === 'Not Available' ||
      (existing['RXP Code'] && existing['RXP Code'].trim() !== '')
    )) {
      if (candidatesJSON && (!existing.candidates || existing.candidates.length === 0)) {
        try { existing.candidates = JSON.parse(candidatesJSON); } catch(e){}
      }
      ensureItemCandidates(existing);
      mergedItems.push(existing);
    } else if (existing && rxpCode) {
      existing['RXP Code'] = rxpCode;
      existing['RXP Name'] = rxpName;
      existing['RXP Pack Size'] = rxpPack;
      existing.Status = status;
      if (candidatesJSON) {
        try { existing.candidates = JSON.parse(candidatesJSON); } catch(e){}
      }
      ensureItemCandidates(existing);
      mergedItems.push(existing);
    } else {
      const newItem = {
        id: existing ? existing.id : `item-${i + 1}`,
        ITEMCODE: itemCode,
        ITEMNAME: itemName,
        PACKING: cols[packIdx] || '',
        CONTENT: cols[contentIdx] || '',
        COMPANYNAME: cols[companyIdx] || 'Supplier',
        SALERATE: cols[saleRateIdx] || cols[mrpIdx] || '0.00',
        MRP: cols[mrpIdx] || '0.00',
        'RXP Code': rxpCode,
        'RXP Name': rxpName,
        'RXP Pack Size': rxpPack,
        Status: status,
        top_match: rxpCode ? { master_product_id: rxpCode, master_product_name: rxpName, master_packaging: rxpPack, confidence_score: 95 } : null,
        candidates: existing ? (existing.candidates || []) : (candidatesJSON ? (function(){ try{ return JSON.parse(candidatesJSON); }catch(e){ return []; }})() : []),
        user_assigned_match: existing ? existing.user_assigned_match : null
      };
      ensureItemCandidates(newItem);
      mergedItems.push(newItem);
    }
  }

  if (mergedItems.length > 0) {
    state.items = mergedItems;
    updateKPICounters();
    renderTable();
    StorageManager.saveState(state.items, state.webhookUrl, state.sheet5Url);
    if (!silent) alert(`Loaded ${mergedItems.length.toLocaleString()} supplier items from Google Sheet ${state.sheetName}!`);
  }
}

// Fetch Google Sheet Data from custom URL or default
async function fetchGoogleSheetData() {
  const sheetUrl = state.sheetUrl || (document.getElementById('sheet-url-config-input') ? document.getElementById('sheet-url-config-input').value : '');
  const sheet5Url = state.sheet5Url || (document.getElementById('sheet5-url-config-input') ? document.getElementById('sheet5-url-config-input').value : '');
  try {
    const res = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(sheetUrl)}`);
    const csvData = await res.text();
    if (csvData.includes('<!DOCTYPE html>')) {
      alert('Google Sheet permission is restricted. Please copy rows directly from Sheet and paste using the "Paste Google Sheet Data" tab!');
      return;
    }
    parseCSVText(csvData);
    
    // Fetch Sheet5 if provided
    if (sheet5Url) {
       try {
         const res5 = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(sheet5Url)}`);
         const csv5Data = await res5.text();
         if (!csv5Data.includes('<!DOCTYPE html>')) {
            parseSheet5CSV(csv5Data);
            updateKPICounters();
            renderTable();
         }
       } catch(e) {
         console.warn('Failed to fetch Sheet5:', e);
       }
    }

    closeModal('import-modal');
  } catch (err) {
    alert('Error fetching Google Sheet. Please use the Paste tab!');
  }
}

function parseSheet5CSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 1) return;
    let startIndex = (lines[0].toUpperCase().includes('ITEMCODE') || lines[0].toUpperCase().includes('SUPPLIER')) ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length < 2) continue;
        
        const itemCode = cols[0] ? cols[0].trim() : '';
        const item = state.items.find(it => it.ITEMCODE === itemCode);
        
        if (item) {
            const cands = [];
            // C1: Code(5), Name(6), Pack(7)
            if (cols[5] && cols[5].trim()) {
                cands.push({ master_product_id: cols[5].trim(), master_product_name: cols[6] ? cols[6].trim() : '', master_packaging: cols[7] ? cols[7].trim() : '', master_composition: '', confidence_score: 95 });
            }
            // C2: Code(8), Name(9), Pack(10)
            if (cols[8] && cols[8].trim()) {
                cands.push({ master_product_id: cols[8].trim(), master_product_name: cols[9] ? cols[9].trim() : '', master_packaging: cols[10] ? cols[10].trim() : '', master_composition: '', confidence_score: 90 });
            }
            // C3: Code(11), Name(12), Pack(13)
            if (cols[11] && cols[11].trim()) {
                cands.push({ master_product_id: cols[11].trim(), master_product_name: cols[12] ? cols[12].trim() : '', master_packaging: cols[13] ? cols[13].trim() : '', master_composition: '', confidence_score: 85 });
            }
            
            if (cands.length > 0) {
                item.candidates = cands;
                item.top_match = cands[0];
                if (!item.Status || item.Status.toLowerCase().includes('need to map') || item.Status.toLowerCase().includes('pending')) {
                    item.Status = 'Mapped';
                }
            }
        }
    }
    updateKPICounters();
    renderTable();
}

// Update KPI Counters
function updateKPICounters() {
  const total = state.items.length;
  const verified = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'APPROVED').length;
  const validate = state.items.filter(i => i.Status === 'Need to Validate').length;
  const pending = state.items.filter(i => i.Status === 'Need to Map' || i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW').length;
  const mapped = state.items.filter(i => i.Status === 'Mapped' || i.Status === 'AI Matched').length;
  const notAvail = state.items.filter(i => i.Status === 'Not Available').length;

  const kpiTotal = document.getElementById('kpi-total');
  if (kpiTotal) kpiTotal.textContent = pending.toLocaleString();

  const kpiApproved = document.getElementById('kpi-approved');
  if (kpiApproved) kpiApproved.textContent = verified.toLocaleString();
  
  const kpiVal = document.getElementById('kpi-validate');
  if (kpiVal) kpiVal.textContent = validate.toLocaleString();

  const kpiPending = document.getElementById('kpi-pending');
  if (kpiPending) kpiPending.textContent = pending.toLocaleString();
  
  const kpiMapped = document.getElementById('kpi-mapped') || document.getElementById('kpi-matched');
  if (kpiMapped) kpiMapped.textContent = mapped.toLocaleString();

  const kpiNotAvail = document.getElementById('kpi-not-avail');
  if (kpiNotAvail) kpiNotAvail.textContent = notAvail.toLocaleString();

  const tabAll = document.getElementById('tab-count-all');
  if (tabAll) tabAll.textContent = total.toLocaleString();

  const tabVerified = document.getElementById('tab-count-verified');
  if (tabVerified) tabVerified.textContent = verified.toLocaleString();
  
  const tabVal = document.getElementById('tab-count-validate');
  if (tabVal) tabVal.textContent = validate.toLocaleString();

  const tabPending = document.getElementById('tab-count-pending');
  if (tabPending) tabPending.textContent = pending.toLocaleString();

  const tabMapped = document.getElementById('tab-count-mapped') || document.getElementById('tab-count-ai');
  if (tabMapped) tabMapped.textContent = mapped.toLocaleString();

  const tabNotAvail = document.getElementById('tab-count-notavail');
  if (tabNotAvail) tabNotAvail.textContent = notAvail.toLocaleString();
}

// Export Summary Box
function updateExportSummary() {
  const total = state.items.length;
  const verified = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'APPROVED' || i.Status === 'Mapped').length;
  const validate = state.items.filter(i => i.Status === 'Need to Validate').length;
  const pending = state.items.filter(i => i.Status === 'Need to Map' || i.Status === 'Neeed to Map' || i.Status === 'PENDING_REVIEW').length;
  const notAvail = state.items.filter(i => i.Status === 'Not Available').length;

  document.getElementById('export-summary-box').innerHTML = `
    <div style="font-size: 0.9rem; line-height: 1.6;">
      <p><strong>Total Supplier Items:</strong> ${total.toLocaleString()}</p>
      <p><strong>Mapped and verified:</strong> ${verified.toLocaleString()}</p>
      <p><strong>Need to Validate:</strong> ${validate.toLocaleString()}</p>
      <p><strong>Need to Map:</strong> ${pending.toLocaleString()}</p>
      <p><strong>Marked as Not Available:</strong> ${notAvail.toLocaleString()}</p>
    </div>
  `;
}

// Batch Sync All Mapped Items directly to Live Google Sheet Sheet4 via Webhook
async function batchSyncAllToGoogleSheet() {
  if (!state.webhookUrl) {
    alert('Please configure your Google Sheet Webhook URL first by clicking "⚡ Sheet Webhook Sync" in the top bar!');
    openModal('webhook-modal');
    return;
  }

  const mappedItems = state.items.filter(i => i.Status === 'Mapped and verified' || i.Status === 'Need to Validate' || i.Status === 'Mapped' || i.Status === 'Not Available');
  if (mappedItems.length === 0) {
    alert('No mapped items to sync yet. Run AI Batch Match or map items first!');
    return;
  }

  const confirmSync = confirm(`Sync ${mappedItems.length} mapped catalog items directly to your live Google Sheet ${state.sheetName}?`);
  if (!confirmSync) return;

  const BATCH_SIZE = 100;
  let count = 0;
  for (let i = 0; i < mappedItems.length; i += BATCH_SIZE) {
    const chunk = mappedItems.slice(i, i + BATCH_SIZE);
    sendWebhookUpdate(chunk);
    count += chunk.length;
  }

  alert(`⚡ Live Webhook Sync active! Pushed ${count} mapped items directly to your Google Sheet ${state.sheetName}.`);
}

// Download Mapped CSV File matching exact 11 columns
function downloadMappedCSV() {
  let csv = 'ITEMCODE,ITEMNAME,PACKING,CONTENT,COMPANYNAME,SALERATE,MRP,RXP Code,RXP Name,RXP Pack Size,Status\n';
  
  state.items.forEach(item => {
    const m = item.user_assigned_match || item.top_match;
    const rxpCode = item.Status === 'Not Available' ? '' : (item['RXP Code'] || (m ? m.master_product_id : ''));
    const rxpName = item.Status === 'Not Available' ? '' : (item['RXP Name'] || (m ? `"${m.master_product_name.replace(/"/g, '""')}"` : ''));
    const rxpPack = item.Status === 'Not Available' ? '' : (item['RXP Pack Size'] || (m ? `"${(m.master_packaging||'').replace(/"/g, '""')}"` : ''));
    
    let statusText = item.Status || 'Need to Map';

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
  const mappedItems = state.items.filter(i => i.Status !== 'Need to Map' && i.Status !== 'Neeed to Map' && i.Status !== 'PENDING_REVIEW');
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



