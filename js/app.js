// ==========================================
// SHOWDOWN OPTIMIZER - MAIN APPLICATION
// ==========================================

// Application State
const AppState = {
    currentTab: 'showdown',
    currentSlate: 1,
    slates: {
        1: { loaded: false, players: [], teams: '', time: '' },
        2: { loaded: false, players: [], teams: '', time: '' },
        3: { loaded: false, players: [], teams: '', time: '' },
        4: { loaded: false, players: [], teams: '', time: '' }
    },
    entries: [],
    isGenerating: false,
    playerDataLoaded: {
        QB: false,
        RB: false,
        WR: false,
        TE: false,
        DST: false
    }
};

// ==========================================
// TAB NAVIGATION
// ==========================================

/**
 * Switch between main tabs
 * @param {string} tabId - Tab identifier
 */
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}Tab`);
    });
    
    AppState.currentTab = tabId;
}

// ==========================================
// SLATE MANAGEMENT
// ==========================================

/**
 * Select a slate
 * @param {number} slateNum - Slate number (1-4)
 */
function selectSlate(slateNum) {
    AppState.currentSlate = slateNum;
    
    // Update UI
    document.querySelectorAll('.slate-btn').forEach(btn => {
        const num = parseInt(btn.dataset.slate);
        btn.classList.toggle('active', num === slateNum);
    });
    
    // Update slate info display
    updateSlateInfo();
    
    // Update slate badge on sections
    const badge = document.querySelector('.section-slate-badge');
    if (badge) {
        badge.textContent = `Slate ${slateNum}`;
        badge.classList.toggle('visible', AppState.slates[slateNum].loaded);
    }
}

/**
 * Update slate info display
 */
function updateSlateInfo() {
    const slate = AppState.slates[AppState.currentSlate];
    const infoDiv = document.getElementById('currentSlateInfo');
    
    if (!infoDiv) return;
    
    if (slate.loaded) {
        infoDiv.classList.add('visible');
        infoDiv.querySelector('.teams').textContent = slate.teams || 'Slate ' + AppState.currentSlate;
        infoDiv.querySelector('.datetime').textContent = slate.time || '';
        infoDiv.querySelector('.count').textContent = slate.players.length;
    } else {
        infoDiv.classList.remove('visible');
    }
}

// ==========================================
// FILE UPLOAD HANDLERS
// ==========================================

/**
 * Handle DraftKings CSV upload for Showdown
 * @param {Event} event - File input change event
 */
async function handleShowdownUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const players = await loadShowdownPlayers(file);
        
        // Update slate state
        const slate = AppState.slates[AppState.currentSlate];
        slate.loaded = true;
        slate.players = players;
        
        // Try to extract game info from players
        const teams = [...new Set(players.map(p => p.team))].filter(t => t).join(' vs ');
        slate.teams = teams;
        
        // Update UI
        updateSlateInfo();
        updateStats();
        renderPlayerTable();
        
        // Mark slate button as loaded
        document.querySelectorAll('.slate-btn').forEach(btn => {
            if (parseInt(btn.dataset.slate) === AppState.currentSlate) {
                btn.classList.add('loaded');
            }
        });
        
        showNotification(`Loaded ${players.length} players for Slate ${AppState.currentSlate}`, 'success');
    } catch (err) {
        showNotification('Error loading file: ' + err.message, 'error');
    }
}

/**
 * Handle DraftKings CSV upload for Classic
 * @param {Event} event - File input change event
 */
async function handleClassicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const players = await loadClassicPlayers(file);
        updateStats();
        renderClassicPlayerTable();
        showNotification(`Loaded ${players.length} players`, 'success');
    } catch (err) {
        showNotification('Error loading file: ' + err.message, 'error');
    }
}

/**
 * Handle individual position data upload
 * @param {Event} event - File input change event
 * @param {string} position - Position type
 */
async function handlePlayerDataUpload(event, position) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const count = await loadPlayerData(file, position);
        AppState.playerDataLoaded[position] = true;
        
        // Update UI
        const card = document.querySelector(`[data-position="${position}"]`);
        if (card) {
            card.classList.add('loaded');
            const status = card.querySelector('.pd-status-text');
            if (status) status.textContent = `${count} records loaded`;
        }
        
        // Check if all loaded
        checkAllPlayerDataLoaded();
        
        showNotification(`Loaded ${count} ${position} records`, 'success');
    } catch (err) {
        showNotification('Error loading file: ' + err.message, 'error');
    }
}

/**
 * Handle ALL files upload (multi-select)
 * @param {Event} event - File input change event
 */
async function handleAllFilesUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    let loadedCount = 0;
    const errors = [];
    
    for (const file of files) {
        const position = detectPositionFromFilename(file.name);
        
        if (!position) {
            errors.push(`Could not detect position for: ${file.name}`);
            continue;
        }
        
        try {
            const count = await loadPlayerData(file, position);
            AppState.playerDataLoaded[position] = true;
            loadedCount++;
            
            // Update individual card UI
            const card = document.querySelector(`[data-position="${position}"]`);
            if (card) {
                card.classList.add('loaded');
                const status = card.querySelector('.pd-status-text');
                if (status) status.textContent = `${count} records loaded`;
            }
            
            // Update ALL card indicator
            updateAllCardIndicator(position, true);
        } catch (err) {
            errors.push(`Error loading ${file.name}: ${err.message}`);
        }
    }
    
    // Check if all loaded
    checkAllPlayerDataLoaded();
    
    // Show results
    if (loadedCount > 0) {
        showNotification(`Loaded ${loadedCount} position files`, 'success');
    }
    if (errors.length > 0) {
        console.warn('Upload errors:', errors);
    }
}

/**
 * Update the ALL card file indicator
 * @param {string} position - Position loaded
 * @param {boolean} loaded - Whether loaded
 */
function updateAllCardIndicator(position, loaded) {
    const positionIndex = ['QB', 'RB', 'WR', 'TE', 'DST'].indexOf(position);
    if (positionIndex === -1) return;
    
    const indicators = document.querySelectorAll('.all-files-status .file-indicator');
    if (indicators[positionIndex]) {
        indicators[positionIndex].classList.toggle('loaded', loaded);
    }
    
    // Check if all loaded
    const allLoaded = ['QB', 'RB', 'WR', 'TE', 'DST'].every(p => AppState.playerDataLoaded[p]);
    const allCard = document.querySelector('.pd-upload-card.all-card');
    if (allCard) {
        allCard.classList.toggle('all-loaded', allLoaded);
    }
}

/**
 * Check if all player data is loaded and compute correlations
 */
function checkAllPlayerDataLoaded() {
    if (isAllPlayerDataLoaded()) {
        computeCorrelations();
        renderCorrelations();
        showNotification('All player data loaded! Correlations computed.', 'success');
    }
}

/**
 * Render correlations to UI
 */
function renderCorrelations() {
    const matrixContainer = document.getElementById('positionMatrix');
    if (matrixContainer) {
        renderPositionMatrix(matrixContainer);
    }
    
    const teamCardsContainer = document.getElementById('teamCardsContainer');
    if (teamCardsContainer) {
        renderTeamCards(teamCardsContainer);
    }
}

// ==========================================
// ENTRIES MANAGEMENT
// ==========================================

/**
 * Handle entries CSV upload
 * @param {Event} event - File input change event
 */
async function handleEntriesUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const entries = await parseEntriesCSV(file);
        AppState.entries = entries;
        renderEntries();
        updateStats();
        showNotification(`Loaded ${entries.length} entries`, 'success');
    } catch (err) {
        showNotification('Error loading entries: ' + err.message, 'error');
    }
}

/**
 * Parse entries CSV
 * @param {File} file - CSV file
 * @returns {Promise<Object[]>} - Array of entry objects
 */
async function parseEntriesCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const lines = e.target.result.trim().split('\n');
                if (lines.length < 2) {
                    resolve([]);
                    return;
                }
                
                const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
                const entries = [];
                
                // Find column indices
                const contestIdx = headers.findIndex(h => h.includes('contest'));
                const feeIdx = headers.findIndex(h => h.includes('fee') || h.includes('entry'));
                
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    
                    entries.push({
                        contest: contestIdx >= 0 ? values[contestIdx] : '',
                        fee: feeIdx >= 0 ? parseFloat(values[feeIdx].replace(/[$,]/g, '')) || 0 : 0,
                        lineup: null
                    });
                }
                
                resolve(entries);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Render entries grouped by contest
 */
function renderEntries() {
    const container = document.getElementById('entriesContainer');
    if (!container) return;
    
    if (AppState.entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>No Entries Loaded</h4>
                <p>Upload your DraftKings entries CSV to get started</p>
            </div>
        `;
        return;
    }
    
    // Group by contest
    const groups = {};
    for (const entry of AppState.entries) {
        if (!groups[entry.contest]) {
            groups[entry.contest] = {
                name: entry.contest,
                fee: entry.fee,
                entries: [],
                isCash: isCashGame(entry.contest)
            };
        }
        groups[entry.contest].entries.push(entry);
    }
    
    let html = '<div class="entries-grouped-container">';
    
    for (const [contestName, group] of Object.entries(groups)) {
        const gameType = group.isCash ? 'cash' : 'gpp';
        const totalFee = group.entries.length * group.fee;
        
        html += `
            <div class="contest-group">
                <div class="contest-group-header">
                    <div class="contest-group-left">
                        <div class="contest-group-icon ${gameType}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${gameType === 'cash' 
                                    ? '<circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 12h6"/>' 
                                    : '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'}
                            </svg>
                        </div>
                        <span class="contest-group-name">${contestName}</span>
                        <span class="game-type-badge ${gameType}">${gameType.toUpperCase()}</span>
                    </div>
                    <div class="contest-group-stats">
                        <span>${group.entries.length} entries</span>
                        <span class="dot">•</span>
                        <span class="contest-group-fee">$${totalFee.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Update summary
    const totalEntries = AppState.entries.length;
    const totalFees = AppState.entries.reduce((s, e) => s + e.fee, 0);
    const summaryEl = document.getElementById('entriesSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span>${totalEntries} total entries</span>
            <span class="entry-fee-total">$${totalFees.toFixed(2)} total fees</span>
        `;
    }
}

// ==========================================
// LINEUP GENERATION
// ==========================================

/**
 * Generate Showdown lineups
 */
async function generateShowdown() {
    if (AppState.isGenerating) return;
    
    const slate = AppState.slates[AppState.currentSlate];
    if (!slate.loaded) {
        showNotification('Please upload a player pool first', 'error');
        return;
    }
    
    AppState.isGenerating = true;
    const btn = document.getElementById('generateShowdownBtn');
    const progressContainer = document.getElementById('showdownProgress');
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    
    btn.disabled = true;
    progressContainer.classList.add('active');
    
    try {
        // Get settings from UI
        const lineupCount = parseInt(document.getElementById('showdownLineupCount')?.value) || 20;
        const salaryMin = parseInt(document.getElementById('showdownSalaryMin')?.value) || 49000;
        const salaryMax = parseInt(document.getElementById('showdownSalaryMax')?.value) || 50000;
        const diversity = parseInt(document.getElementById('showdownDiversity')?.value) || 50;
        
        updateShowdownSettings({
            lineupCount,
            salaryMin,
            salaryMax,
            diversityLevel: diversity
        });
        
        // Generate with progress
        showdownLineups = await new Promise((resolve) => {
            setTimeout(() => {
                const lineups = generateShowdownLineups(lineupCount, (progress) => {
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `Generating... ${Math.round(progress)}%`;
                });
                resolve(lineups);
            }, 50);
        });
        
        // Render results
        const container = document.getElementById('showdownLineupsOutput');
        if (container) renderShowdownLineups(container);
        
        // Update exposure
        renderExposure();
        
        // Update stats
        updateStats();
        
        showNotification(`Generated ${showdownLineups.length} lineups!`, 'success');
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    } finally {
        AppState.isGenerating = false;
        btn.disabled = false;
        progressContainer.classList.remove('active');
        progressFill.style.width = '0%';
    }
}

/**
 * Generate Classic lineups
 */
async function generateClassic() {
    if (AppState.isGenerating) return;
    
    if (classicPlayers.length === 0) {
        showNotification('Please upload a player pool first', 'error');
        return;
    }
    
    AppState.isGenerating = true;
    const btn = document.getElementById('generateClassicBtn');
    const progressContainer = document.getElementById('classicProgress');
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    
    btn.disabled = true;
    progressContainer.classList.add('active');
    
    try {
        const lineupCount = parseInt(document.getElementById('classicLineupCount')?.value) || 20;
        const salaryMin = parseInt(document.getElementById('classicSalaryMin')?.value) || 49000;
        const salaryMax = parseInt(document.getElementById('classicSalaryMax')?.value) || 50000;
        const diversity = parseInt(document.getElementById('classicDiversity')?.value) || 50;
        
        updateClassicSettings({
            lineupCount,
            salaryMin,
            salaryMax,
            diversityLevel: diversity
        });
        
        classicLineups = await new Promise((resolve) => {
            setTimeout(() => {
                const lineups = generateClassicLineups(lineupCount, (progress) => {
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `Generating... ${Math.round(progress)}%`;
                });
                resolve(lineups);
            }, 50);
        });
        
        const container = document.getElementById('classicLineupsOutput');
        if (container) renderClassicLineups(container);
        
        updateStats();
        showNotification(`Generated ${classicLineups.length} lineups!`, 'success');
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    } finally {
        AppState.isGenerating = false;
        btn.disabled = false;
        progressContainer.classList.remove('active');
        progressFill.style.width = '0%';
    }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

/**
 * Export Showdown lineups to CSV
 */
function exportShowdown() {
    if (showdownLineups.length === 0) {
        showNotification('No lineups to export', 'error');
        return;
    }
    
    const csv = exportShowdownLineups(showdownLineups);
    downloadFile(csv, `showdown_lineups_${getTodayString()}.csv`);
    showNotification('Lineups exported!', 'success');
}

/**
 * Export Classic lineups to CSV
 */
function exportClassic() {
    if (classicLineups.length === 0) {
        showNotification('No lineups to export', 'error');
        return;
    }
    
    const csv = exportClassicLineups(classicLineups);
    downloadFile(csv, `classic_lineups_${getTodayString()}.csv`);
    showNotification('Lineups exported!', 'success');
}

// ==========================================
// UI RENDERING
// ==========================================

/**
 * Render player table for Showdown
 */
function renderPlayerTable() {
    const container = document.getElementById('playerTableContainer');
    if (!container) return;
    
    const players = showdownPlayers;
    
    if (players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>No Players Loaded</h4>
                <p>Upload a DraftKings CSV to see player pool</p>
            </div>
        `;
        return;
    }
    
    // Filter by search
    const searchInput = document.getElementById('playerSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    
    const filtered = players.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.team.toLowerCase().includes(searchTerm)
    );
    
    // Sort by projection desc
    filtered.sort((a, b) => b.projection - a.projection);
    
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Pos</th>
                        <th>Team</th>
                        <th>Salary</th>
                        <th>Proj</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const player of filtered.slice(0, 50)) {
        html += `
            <tr>
                <td>${player.name}</td>
                <td><span class="position-badge ${player.position.toLowerCase()}">${player.position}</span></td>
                <td class="team-badge">${player.team}</td>
                <td>$${player.salary.toLocaleString()}</td>
                <td>${player.projection.toFixed(2)}</td>
                <td>${player.value.toFixed(2)}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/**
 * Render player table for Classic
 */
function renderClassicPlayerTable() {
    const container = document.getElementById('classicPlayerTableContainer');
    if (!container) return;
    
    const players = classicPlayers;
    
    if (players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>No Players Loaded</h4>
                <p>Upload a DraftKings CSV to see player pool</p>
            </div>
        `;
        return;
    }
    
    const searchInput = document.getElementById('classicPlayerSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    
    const filtered = players.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.team.toLowerCase().includes(searchTerm)
    );
    
    filtered.sort((a, b) => b.projection - a.projection);
    
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Pos</th>
                        <th>Team</th>
                        <th>Opp</th>
                        <th>Salary</th>
                        <th>Proj</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const player of filtered.slice(0, 50)) {
        html += `
            <tr>
                <td>${player.name}</td>
                <td><span class="position-badge ${player.position.toLowerCase()}">${player.position}</span></td>
                <td class="team-badge">${player.team}</td>
                <td class="team-badge">${player.opponent || '-'}</td>
                <td>$${player.salary.toLocaleString()}</td>
                <td>${player.projection.toFixed(2)}</td>
                <td>${player.value.toFixed(2)}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/**
 * Render exposure summary
 */
function renderExposure() {
    const container = document.getElementById('exposureContainer');
    if (!container) return;
    
    const exposure = calculateExposure(showdownLineups);
    
    if (exposure.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="portfolio-exposure-list">';
    
    for (const item of exposure.slice(0, 15)) {
        const level = parseFloat(item.percentage) > 50 ? 'high' : 
                      parseFloat(item.percentage) > 25 ? 'medium' : 'low';
        
        html += `
            <div class="exposure-item ${level}">
                <span class="exposure-name">${item.name}</span>
                <span class="exposure-pct">${item.percentage}%</span>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Update stats display
 */
function updateStats() {
    // Showdown stats
    const showdownStats = getShowdownStats();
    const playerCountEl = document.getElementById('playerCount');
    const lineupCountEl = document.getElementById('lineupCount');
    const avgProjEl = document.getElementById('avgProjection');
    
    if (playerCountEl) playerCountEl.textContent = showdownStats.playerCount;
    if (lineupCountEl) lineupCountEl.textContent = showdownStats.lineupCount;
    if (avgProjEl) avgProjEl.textContent = showdownStats.avgProjection;
    
    // Entries stats
    const entryCountEl = document.getElementById('entryCount');
    const totalFeesEl = document.getElementById('totalFees');
    
    if (entryCountEl) entryCountEl.textContent = AppState.entries.length;
    if (totalFeesEl) {
        const total = AppState.entries.reduce((s, e) => s + e.fee, 0);
        totalFeesEl.textContent = '$' + total.toFixed(2);
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================

/**
 * Show notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        animation: 'slideIn 0.3s ease',
        backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'
    });
    
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the application
 */
function initApp() {
    // Set up tab navigation
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Set up slate selection
    document.querySelectorAll('.slate-btn').forEach(btn => {
        btn.addEventListener('click', () => selectSlate(parseInt(btn.dataset.slate)));
    });
    
    // Set up file upload drag/drop
    setupDragDrop();
    
    // Set up search debouncing
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', debounce(renderPlayerTable, 300));
    }
    
    const classicSearch = document.getElementById('classicPlayerSearch');
    if (classicSearch) {
        classicSearch.addEventListener('input', debounce(renderClassicPlayerTable, 300));
    }
    
    // Initialize default state
    updateStats();
    
    console.log('Showdown Optimizer initialized!');
}

/**
 * Set up drag and drop for file uploads
 */
function setupDragDrop() {
    document.querySelectorAll('.upload-zone, .pd-upload-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            
            const input = zone.querySelector('input[type="file"]');
            if (input && e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
