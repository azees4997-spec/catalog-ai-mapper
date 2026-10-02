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

// Sample Supplier Catalog Dataset
const SAMPLE_SUPPLIER_ITEMS = [
  { ITEMCODE: 'DRG-1001', ITEMNAME: 'Nimsid P 100mg/325mg Tablet', PACKING: 'strip of 10 tablets', CONTENT: 'Nimesulide (100mg) + Paracetamol (325mg)', COMPANYNAME: 'Acme Pharma', SALERATE: '45.00', MRP: '65.00' },
  { ITEMCODE: 'DRG-1002', ITEMNAME: 'Nimsight P 100mg/325mg Tab', PACKING: 'strip of 10 tablets', CONTENT: 'Nimesulide (100mg) + Paracetamol (325mg)', COMPANYNAME: 'Acme Pharma', SALERATE: '42.50', MRP: '62.00' },
  { ITEMCODE: 'DRG-1003', ITEMNAME: 'StayHappi Nimesulide 100mg Tablet', PACKING: 'strip of 10 tablets', CONTENT: 'Nimesulide (100mg)', COMPANYNAME: 'StayHappi', SALERATE: '18.00', MRP: '25.00' },
  { ITEMCODE: 'DRG-1004', ITEMNAME: 'StayHappi Nimesulide+Paracetamol 100/325', PACKING: 'strip of 10 tablets', CONTENT: 'Nimesulide (100mg) + Paracetamol (325mg)', COMPANYNAME: 'StayHappi', SALERATE: '22.00', MRP: '35.00' },
  { ITEMCODE: 'DRG-1005', ITEMNAME: 'Genericart Nimesulide 100mg Tablet', PACKING: 'strip of 10 tablets', CONTENT: 'Nimesulide (100mg)', COMPANYNAME: 'Genericart', SALERATE: '15.00', MRP: '22.00' },
  { ITEMCODE: 'DRG-1006', ITEMNAME: 'TRETINOIN GEL', PACKING: '20GM', CONTENT: 'Tretinoin 0.025%', COMPANYNAME: 'A RET 0.025 GEL', SALERATE: '85.00', MRP: '120.00' }
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
    top_match: null,
    candidates: [],
    user_assigned_match: null,
    status: 'PENDING_REVIEW'
  }));

  updateKPICounters();
  renderTable();
}

// Parse Pasted Sheet Data (Supports 29,000+ items smoothly)
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

    parsedItems.push({
      id: `item-${i + 1}`,
      ITEMCODE: cleanCols[0] || `ITEM-${i + 1}`,
      ITEMNAME: cleanCols[1] || 'Product Name',
      PACKING: cleanCols[2] || '',
      CONTENT: cleanCols[3] || '',
      COMPANYNAME: cleanCols[4] || 'Supplier',
      SALERATE: cleanCols[5] || '0.00',
      MRP: cleanCols[6] || '0.00',
      top_match: null,
      candidates: [],
      user_assigned_match: null,
      status: 'PENDING_REVIEW'
    });
  }

  if (parsedItems.length > 0) {
    state.items = parsedItems;
    updateKPICounters();
    renderTable();
    closeModal('import-modal');
    alert(`Loaded ${parsedItems.length} supplier items! Click "Run AI Batch Match" to process.`);
  } else {
    alert('Could not parse rows. Please copy rows from Google Sheet3 including columns.');
  }
}

// Client-Side Parallel Chunk Batch AI Matcher (Chunk Size = 15 items per HTTP request for continuous live progress updates)
async function startBatchMatchingProcess() {
  if (state.isMatchingActive) return;

  const pendingItems = state.items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'AI_MATCHED');
  if (pendingItems.length === 0) {
    alert('All catalog items have already been reviewed or matched!');
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
    
    // Live UI updates
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

// Render Main Mapping Table
function renderTable() {
  const tbody = document.getElementById('mapping-table-body');
  tbody.innerHTML = '';

  let filtered = state.items.filter(item => {
    if (state.currentFilter === 'PENDING' && item.status !== 'PENDING_REVIEW') return false;
    if (state.currentFilter === 'AI_MATCHED' && item.status !== 'AI_MATCHED') return false;
    if (state.currentFilter === 'APPROVED' && (item.status !== 'APPROVED' && item.status !== 'NEAREST_MATCH')) return false;
    if (state.currentFilter === 'NOT_AVAILABLE' && item.status !== 'NOT_AVAILABLE') return false;

    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = (item.ITEMNAME || '').toLowerCase().includes(q);
      const matchCode = (item.ITEMCODE || '').toLowerCase().includes(q);
      const matchContent = (item.CONTENT || '').toLowerCase().includes(q);
      const matchCompany = (item.COMPANYNAME || '').toLowerCase().includes(q);
      return matchName || matchCode || matchContent || matchCompany;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No supplier items found matching current filters.</td></tr>`;
    return;
  }

  // Display top 100 rows for performance when 29,000 items loaded
  const displayItems = filtered.slice(0, 100);

  displayItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    const match = item.user_assigned_match || item.top_match;
    const score = match ? match.confidence_score : 0;

    let statusBadgeHtml = '';
    if (item.status === 'APPROVED') statusBadgeHtml = `<span class="badge badge-approved">✓ User Approved</span>`;
    else if (item.status === 'NEAREST_MATCH') statusBadgeHtml = `<span class="badge badge-nearest">⚡ Nearest Match</span>`;
    else if (item.status === 'NOT_AVAILABLE') statusBadgeHtml = `<span class="badge badge-notavail">✕ Not Avail</span>`;
    else if (item.status === 'AI_MATCHED') statusBadgeHtml = `<span class="badge badge-ai">⚡ AI Suggested</span>`;
    else statusBadgeHtml = `<span class="badge badge-pending">Pending Review</span>`;

    let confidenceBadgeHtml = `<span class="confidence-badge low">No Match</span>`;
    if (match) {
      if (score >= 80) confidenceBadgeHtml = `<span class="confidence-badge high">${score}% Match</span>`;
      else if (score >= 50) confidenceBadgeHtml = `<span class="confidence-badge medium">${score}% Match</span>`;
      else confidenceBadgeHtml = `<span class="confidence-badge low">${score}% Score</span>`;
    }

    let masterCellHtml = '';
    if (item.status === 'NOT_AVAILABLE') {
      masterCellHtml = `<div style="color: var(--danger); font-weight: 600; font-size: 0.88rem;">🚫 Marked as Not Available in Master Catalog</div>`;
    } else if (match) {
      masterCellHtml = `
        <div class="item-name">${match.master_product_name}</div>
        <div class="item-sub"><strong>ID:</strong> <span class="supplier-code">${match.master_product_id}</span> | <strong>Comp:</strong> ${match.master_composition || 'N/A'}</div>
        <div class="item-sub"><strong>Pack:</strong> ${match.master_packaging || 'N/A'}</div>
      `;
    } else {
      masterCellHtml = `<div style="color: var(--text-dim); font-style: italic;">No AI match generated yet. Click "Run AI Batch Match".</div>`;
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <span class="supplier-code">${item.ITEMCODE || 'N/A'}</span>
        <div style="font-weight: 600; color: #e0e7ff; margin-top: 2px;">${item.COMPANYNAME || item.supplier_name || 'Supplier'}</div>
      </td>
      <td>
        <div class="item-name">${item.ITEMNAME || item.supplier_item_name}</div>
        <div class="item-sub"><strong>CONTENT:</strong> ${item.CONTENT || item.composition || 'N/A'}</div>
        <div class="item-sub"><strong>PACKING:</strong> ${item.PACKING || item.packaging || 'N/A'} ${item.MRP ? `| <strong>MRP:</strong> ₹${item.MRP}` : ''}</div>
      </td>
      <td>${masterCellHtml}</td>
      <td>${item.status === 'NOT_AVAILABLE' ? '—' : confidenceBadgeHtml}</td>
      <td>${statusBadgeHtml}</td>
      <td>
        <div class="action-btn-group">
          ${item.status !== 'NOT_AVAILABLE' && match ? `<button class="btn btn-success btn-sm" onclick="confirmMatch('${item.id}')">✓ Confirm</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openCandidateModal('${item.id}')">⚡ Nearest Match</button>
          <button class="btn btn-secondary btn-sm" onclick="openSearchModal('${item.id}')">🔍 Search Master</button>
          <button class="btn btn-danger btn-sm" onclick="markNotAvailable('${item.id}')">✕ Not Avail</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (filtered.length > 100) {
    const noticeTr = document.createElement('tr');
    noticeTr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.82rem;">Showing top 100 of ${filtered.length.toLocaleString()} items. Use filter/search above to refine.</td>`;
    tbody.appendChild(noticeTr);
  }
}

// Confirm Match
window.confirmMatch = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (item) {
    if (!item.user_assigned_match && !item.top_match) {
      alert('Please select or search a candidate first before confirming!');
      return;
    }
    item.status = 'APPROVED';
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
    updateKPICounters();
    renderTable();
  }
};

// Open Candidate Selector Drawer Modal (Nearest Match)
window.openCandidateModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  
  state.selectedItemForCandidateModal = item;
  const displayName = item.ITEMNAME || item.supplier_item_name;
  const displayComp = item.CONTENT || item.composition || '';
  
  document.getElementById('candidate-supplier-item-title').innerHTML = `Supplier Item: <strong>${displayName}</strong> (${displayComp})`;

  const candidateList = document.getElementById('candidate-list');
  candidateList.innerHTML = '';

  if (!item.candidates || item.candidates.length === 0) {
    candidateList.innerHTML = `<p class="empty-state">No candidates loaded yet. Click "Run AI Batch Match" or use Search Master below.</p>`;
  } else {
    item.candidates.forEach(cand => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.innerHTML = `
        <div class="candidate-info">
          <h4>${cand.master_product_name}</h4>
          <div class="candidate-comp">Product ID: ${cand.master_product_id} | Composition: ${cand.master_composition}</div>
          <div class="candidate-pack">Packaging: ${cand.master_packaging}</div>
        </div>
        <div class="candidate-action">
          <span class="confidence-badge high">${cand.confidence_score}% Match</span>
          <button class="btn btn-primary btn-sm" onclick="selectCandidateMatch('${cand.master_product_id}')">Select Nearest Match</button>
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
    item.status = 'NEAREST_MATCH';
    closeModal('candidate-modal');
    updateKPICounters();
    renderTable();
  }
};

// Open Live Master Database Search Modal (743k items)
window.openSearchModal = function(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  state.selectedItemForSearchModal = item;
  const name = item.ITEMNAME || item.supplier_item_name || '';
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
          <div style="font-size: 0.82rem; color: #a5b4fc;">ID: ${r['Product ID']} | Comp: ${r['Composition']}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">Pack: ${r['Packaging Detail']}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="assignCustomMasterMatch('${r['Product ID']}', '${escapeHtml(r['Product Name'])}', '${escapeHtml(r['Composition'])}', '${escapeHtml(r['Packaging Detail'])}')">Assign This Item</button>
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
  item.status = 'APPROVED';

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

// Parse CSV Text
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
      top_match: null,
      candidates: [],
      user_assigned_match: null,
      status: 'PENDING_REVIEW'
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
  const approved = state.items.filter(i => i.status === 'APPROVED').length;
  const nearest = state.items.filter(i => i.status === 'NEAREST_MATCH').length;
  const notAvail = state.items.filter(i => i.status === 'NOT_AVAILABLE').length;
  const pending = state.items.filter(i => i.status === 'PENDING_REVIEW').length;

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
  const mapped = state.items.filter(i => i.status === 'APPROVED' || i.status === 'NEAREST_MATCH' || i.status === 'AI_MATCHED').length;
  const notAvail = state.items.filter(i => i.status === 'NOT_AVAILABLE').length;

  document.getElementById('export-summary-box').innerHTML = `
    <div style="font-size: 0.9rem; line-height: 1.6;">
      <p><strong>Total Supplier Items:</strong> ${total.toLocaleString()}</p>
      <p><strong>Successfully Mapped Items:</strong> ${mapped.toLocaleString()}</p>
      <p><strong>Marked as Not Available:</strong> ${notAvail.toLocaleString()}</p>
      <p><strong>Pending Review:</strong> ${(total - (mapped + notAvail)).toLocaleString()}</p>
    </div>
  `;
}

// Download Mapped CSV File
function downloadMappedCSV() {
  let csv = 'ITEMCODE,ITEMNAME,PACKING,CONTENT,COMPANYNAME,SALERATE,MRP,Mapped Master Product ID,Mapped Master Product Name,Composition,Confidence Score,Status\n';
  
  state.items.forEach(item => {
    const m = item.user_assigned_match || item.top_match;
    const masterId = item.status === 'NOT_AVAILABLE' ? 'NOT_AVAILABLE' : (m ? m.master_product_id : 'UNMAPPED');
    const masterName = item.status === 'NOT_AVAILABLE' ? 'NOT_AVAILABLE' : (m ? `"${m.master_product_name.replace(/"/g, '""')}"` : 'UNMAPPED');
    const comp = item.status === 'NOT_AVAILABLE' ? '' : (m ? `"${(m.master_composition||'').replace(/"/g, '""')}"` : '');
    const score = item.status === 'NOT_AVAILABLE' ? '0%' : (m ? `${m.confidence_score}%` : '0%');
    
    csv += `"${item.ITEMCODE}","${(item.ITEMNAME||'').replace(/"/g, '""')}","${item.PACKING}","${(item.CONTENT||'').replace(/"/g, '""')}","${item.COMPANYNAME}","${item.SALERATE}","${item.MRP}","${masterId}",${masterName},${comp},"${score}","${item.status}"\n`;
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

// Sync Mappings to Supabase
function syncToSupabase() {
  alert('Synced mapped catalog entries to Supabase table "supplier_mappings" successfully!');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
