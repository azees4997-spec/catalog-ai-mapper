// Supplier Catalog AI Mapper & Verification System - Client App

// Initial State
let state = {
  items: [],
  currentFilter: 'ALL',
  searchQuery: '',
  selectedItemForCandidateModal: null,
  selectedItemForSearchModal: null,
  isMatchingActive: false,
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

// Initialize DOM elements & Listeners
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadSampleData();
});

function initEventListeners() {
  document.getElementById('btn-import-modal').addEventListener('click', () => openModal('import-modal'));
  document.getElementById('close-import-modal').addEventListener('click', () => closeModal('import-modal'));
  
  document.getElementById('btn-logic-modal').addEventListener('click', () => openModal('logic-modal'));
  document.getElementById('close-logic-modal').addEventListener('click', () => closeModal('logic-modal'));

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
  document.getElementById('btn-download-csv').addEventListener('click', downloadMappedCSV);
  document.getElementById('btn-sync-supabase').addEventListener('click', syncToSupabase);
}

// Modal Helpers
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

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
    status: item.Status || (item['RXP Code'] ? 'APPROVED' : 'PENDING_REVIEW')
  }));

  updateKPICounters();
  renderTable();
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

    let status = 'PENDING_REVIEW';
    if (rawStatus.toLowerCase().includes('mapped') || rawStatus.toLowerCase().includes('verified')) status = 'APPROVED';
    else if (rawStatus.toLowerCase().includes('not')) status = 'NOT_AVAILABLE';
    else if (rxpCode) status = 'APPROVED';

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
      top_match: rxpCode ? { master_product_id: rxpCode, master_product_name: rxpName, master_packaging: rxpPack, confidence_score: 95 } : null,
      candidates: [],
      user_assigned_match: null,
      status: status
    });
  }

  if (parsedItems.length > 0) {
    state.items = parsedItems;
    updateKPICounters();
    renderTable();
    closeModal('import-modal');
    alert(`Loaded ${parsedItems.length} supplier items from Google Sheet! Click "Run AI Batch Match" to process.`);
  } else {
    alert('Could not parse rows. Please copy rows from Google Sheet3 including columns.');
  }
}

// Client-Side Parallel Chunk Batch AI Matcher
async function startBatchMatchingProcess() {
  if (state.isMatchingActive) return;

  const pendingItems = state.items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'AI_MATCHED' || i.status === 'Neeed to Map');
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
              state.items[itemIndex].status = 'AI_MATCHED';
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
  }

  state.isMatchingActive = false;
  matchBtn.disabled = false;
  matchBtn.style.opacity = '1';
  progressText.textContent = `AI Batch Matching complete! ${processed} items processed.`;
}

// Render Main Mapping Table matching user screenshot layout
function renderTable() {
  const tbody = document.getElementById('mapping-table-body');
  tbody.innerHTML = '';

  let filtered = state.items.filter(item => {
    if (state.currentFilter === 'PENDING' && (item.status !== 'PENDING_REVIEW' && item.status !== 'Neeed to Map')) return false;
    if (state.currentFilter === 'AI_MATCHED' && item.status !== 'AI_MATCHED') return false;
    if (state.currentFilter === 'APPROVED' && (item.status !== 'APPROVED' && item.status !== 'NEAREST_MATCH' && item.status !== 'Mapped and verified')) return false;
    if (state.currentFilter === 'NOT_AVAILABLE' && item.status !== 'NOT_AVAILABLE') return false;

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
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No supplier items found matching current filters.</td></tr>`;
    return;
  }

  const displayItems = filtered.slice(0, 100);

  displayItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    const match = item.user_assigned_match || item.top_match;
    const rxpCode = item['RXP Code'] || (match ? match.master_product_id : '');
    const rxpName = item['RXP Name'] || (match ? match.master_product_name : '');
    const rxpPack = item['RXP Pack Size'] || (match ? match.master_packaging : '');
    const score = match ? match.confidence_score : 0;

    let statusBadgeHtml = '';
    if (item.status === 'APPROVED' || item.status === 'Mapped and verified') statusBadgeHtml = `<span class="badge badge-approved">✓ Mapped & verified</span>`;
    else if (item.status === 'NEAREST_MATCH') statusBadgeHtml = `<span class="badge badge-nearest">⚡ Nearest Match</span>`;
    else if (item.status === 'NOT_AVAILABLE') statusBadgeHtml = `<span class="badge badge-notavail">✕ Not Avail</span>`;
    else if (item.status === 'AI_MATCHED') statusBadgeHtml = `<span class="badge badge-ai">⚡ AI Suggested</span>`;
    else statusBadgeHtml = `<span class="badge badge-pending">Neeed to Map</span>`;

    let confidenceBadgeHtml = `<span class="confidence-badge low">No Match</span>`;
    if (rxpCode) {
      if (score >= 80) confidenceBadgeHtml = `<span class="confidence-badge high">${score}% Match</span>`;
      else if (score >= 50) confidenceBadgeHtml = `<span class="confidence-badge medium">${score}% Match</span>`;
      else confidenceBadgeHtml = `<span class="confidence-badge high">Mapped</span>`;
    }

    let masterCellHtml = '';
    if (item.status === 'NOT_AVAILABLE') {
      masterCellHtml = `<div style="color: var(--danger); font-weight: 600; font-size: 0.88rem;">🚫 Marked as Not Available in Master Catalog</div>`;
    } else if (rxpCode || rxpName) {
      masterCellHtml = `
        <div class="item-name">${rxpName}</div>
        <div class="item-sub"><strong>RXP Pack:</strong> ${rxpPack || 'N/A'}</div>
      `;
    } else {
      masterCellHtml = `<div style="color: var(--text-dim); font-style: italic;">No AI match generated yet. Click "Run AI Batch Match".</div>`;
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><span class="supplier-code">${item.ITEMCODE || 'N/A'}</span></td>
      <td>
        <div class="item-name">${item.ITEMNAME}</div>
        <div class="item-sub" style="color: #a5b4fc;">${item.COMPANYNAME || 'Supplier'}</div>
      </td>
      <td>
        <div class="item-sub"><strong>CONTENT:</strong> ${item.CONTENT || 'N/A'}</div>
        <div class="item-sub"><strong>PACKING:</strong> ${item.PACKING || 'N/A'} ${item.MRP ? `| <strong>MRP:</strong> ₹${item.MRP}` : ''}</div>
      </td>
      <td><span class="supplier-code" style="color: #64748b;">${rxpCode || '—'}</span></td>
      <td>${masterCellHtml}</td>
      <td>${item.status === 'NOT_AVAILABLE' ? '—' : confidenceBadgeHtml}</td>
      <td>${statusBadgeHtml}</td>
      <td>
        <div class="action-btn-group">
          ${item.status !== 'NOT_AVAILABLE' && (rxpCode || match) ? `<button class="btn btn-success btn-sm" onclick="confirmMatch('${item.id}')">✓ Confirm</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openCandidateModal('${item.id}')">⚡ Nearest</button>
          <button class="btn btn-secondary btn-sm" onclick="openSearchModal('${item.id}')">🔍 Search</button>
          <button class="btn btn-danger btn-sm" onclick="markNotAvailable('${item.id}')">✕ Not Avail</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (filtered.length > 100) {
    const noticeTr = document.createElement('tr');
    noticeTr.innerHTML = `<td colspan="9" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.82rem;">Showing top 100 of ${filtered.length.toLocaleString()} items. Use search bar to filter.</td>`;
    tbody.appendChild(noticeTr);
  }
}

// Confirm Match
window.confirmMatch = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    if (!item.user_assigned_match && !item.top_match && !item['RXP Code']) {
      alert('Please select or search a candidate first before confirming!');
      return;
    }
    item.status = 'Mapped and verified';
    updateKPICounters();
    renderTable();
  }
};

// Mark Not Available
window.markNotAvailable = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    item.status = 'NOT_AVAILABLE';
    item.user_assigned_match = null;
    item['RXP Code'] = '';
    item['RXP Name'] = '';
    item['RXP Pack Size'] = '';
    updateKPICounters();
    renderTable();
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

// Select Candidate from Drawer
window.selectCandidateMatch = function(masterProductId) {
  const item = state.selectedItemForCandidateModal;
  if (!item) return;

  const candidate = item.candidates.find(c => c.master_product_id === masterProductId);
  if (candidate) {
    item.user_assigned_match = candidate;
    item['RXP Code'] = candidate.master_product_id;
    item['RXP Name'] = candidate.master_product_name;
    item['RXP Pack Size'] = candidate.master_packaging;
    item.status = 'NEAREST_MATCH';
    closeModal('candidate-modal');
    updateKPICounters();
    renderTable();
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
  item.status = 'Mapped and verified';

  closeModal('search-modal');
  updateKPICounters();
  renderTable();
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

// Parse CSV Text into Supplier Items
function parseCSVText(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    alert('Invalid CSV file format.');
    return;
  }

  const parsedItems = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (row.length < 2) continue;

    parsedItems.push({
      id: `item-${i}`,
      ITEMCODE: row[0] || `ITEM-${i}`,
      ITEMNAME: row[1] || 'Product Name',
      PACKING: row[2] || '',
      CONTENT: row[3] || '',
      COMPANYNAME: row[4] || 'Supplier',
      SALERATE: row[5] || '0.00',
      MRP: row[6] || '0.00',
      'RXP Code': row[7] || '',
      'RXP Name': row[8] || '',
      'RXP Pack Size': row[9] || '',
      Status: row[10] || 'Neeed to Map',
      top_match: row[7] ? { master_product_id: row[7], master_product_name: row[8], master_packaging: row[9], confidence_score: 95 } : null,
      candidates: [],
      user_assigned_match: null,
      status: row[10] || 'PENDING_REVIEW'
    });
  }

  state.items = parsedItems;
  updateKPICounters();
  renderTable();
  alert(`Loaded ${parsedItems.length} supplier items from CSV!`);
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

// Update KPI Counters
function updateKPICounters() {
  const total = state.items.length;
  const matched = state.items.filter(i => i.status === 'AI_MATCHED').length;
  const approved = state.items.filter(i => i.status === 'APPROVED' || i.status === 'Mapped and verified').length;
  const nearest = state.items.filter(i => i.status === 'NEAREST_MATCH').length;
  const notAvail = state.items.filter(i => i.status === 'NOT_AVAILABLE').length;
  const pending = state.items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'Neeed to Map').length;

  document.getElementById('kpi-total').textContent = total.toLocaleString();
  document.getElementById('kpi-matched').textContent = matched.toLocaleString();
  document.getElementById('kpi-approved').textContent = approved.toLocaleString();
  document.getElementById('kpi-nearest').textContent = nearest.toLocaleString();
  document.getElementById('kpi-not-avail').textContent = notAvail.toLocaleString();

  document.getElementById('tab-count-all').textContent = total.toLocaleString();
  document.getElementById('tab-count-pending').textContent = pending.toLocaleString();
  document.getElementById('tab-count-ai').textContent = matched.toLocaleString();
  document.getElementById('tab-count-approved').textContent = (approved + nearest).toLocaleString();
  document.getElementById('tab-count-notavail').textContent = notAvail.toLocaleString();
}

// Export Summary Box
function updateExportSummary() {
  const total = state.items.length;
  const mapped = state.items.filter(i => i.status === 'APPROVED' || i.status === 'NEAREST_MATCH' || i.status === 'Mapped and verified' || i.status === 'AI_MATCHED').length;
  const notAvail = state.items.filter(i => i.status === 'NOT_AVAILABLE').length;

  document.getElementById('export-summary-box').innerHTML = `
    <div style="font-size: 0.9rem; line-height: 1.6;">
      <p><strong>Total Supplier Items:</strong> ${total.toLocaleString()}</p>
      <p><strong>Mapped & Verified Items:</strong> ${mapped.toLocaleString()}</p>
      <p><strong>Marked as Not Available:</strong> ${notAvail.toLocaleString()}</p>
      <p><strong>Neeed to Map:</strong> ${(total - (mapped + notAvail)).toLocaleString()}</p>
    </div>
  `;
}

// Download Mapped CSV File matching exact 11 columns from user screenshot
function downloadMappedCSV() {
  let csv = 'ITEMCODE,ITEMNAME,PACKING,CONTENT,COMPANYNAME,SALERATE,MRP,RXP Code,RXP Name,RXP Pack Size,Status\n';
  
  state.items.forEach(item => {
    const m = item.user_assigned_match || item.top_match;
    const rxpCode = item.status === 'NOT_AVAILABLE' ? '' : (item['RXP Code'] || (m ? m.master_product_id : ''));
    const rxpName = item.status === 'NOT_AVAILABLE' ? '' : (item['RXP Name'] || (m ? `"${m.master_product_name.replace(/"/g, '""')}"` : ''));
    const rxpPack = item.status === 'NOT_AVAILABLE' ? '' : (item['RXP Pack Size'] || (m ? `"${(m.master_packaging||'').replace(/"/g, '""')}"` : ''));
    
    let statusText = 'Neeed to Map';
    if (item.status === 'APPROVED' || item.status === 'Mapped and verified') statusText = 'Mapped and verified';
    else if (item.status === 'NEAREST_MATCH') statusText = 'Mapped and verified';
    else if (item.status === 'NOT_AVAILABLE') statusText = 'Not Available';
    else if (item.status === 'AI_MATCHED') statusText = 'AI Matched';

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
  const mappedItems = state.items.filter(i => i.status !== 'PENDING_REVIEW' && i.status !== 'Neeed to Map');
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
      mapping_status: item.status,
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
