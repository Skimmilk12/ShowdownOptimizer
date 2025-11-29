// ==========================================
// MADDEN SHOWDOWN OPTIMIZER
// ==========================================

// Extract game matchup from game info (e.g., "ATL@TB" from "ATL@TB 11/25/2025 12:00PM ET")
function extractGameMatchup(gameInfo) {
    if (!gameInfo) return null;
    const match = gameInfo.match(/([A-Z]{2,3})@([A-Z]{2,3})/i);
    if (match) {
        return `${match[1].toUpperCase()}@${match[2].toUpperCase()}`;
    }
    return null;
}

// Map of game matchups to slate numbers (dynamically assigned)
let gameToSlateMap = {};
let nextAvailableSlate = 1;

// Get or assign a slate number for a game matchup
function getSlateForGame(gameMatchup) {
    if (!gameMatchup) return 1;

    if (!gameToSlateMap[gameMatchup]) {
        gameToSlateMap[gameMatchup] = nextAvailableSlate;
        nextAvailableSlate++;
    }
    return gameToSlateMap[gameMatchup];
}

// Detect slate number from game info - based on GAME MATCHUP, not time
// Each unique game (e.g., ATL@TB) gets its own slate
function detectSlateNumberFromGameInfo(gameInfo) {
    const matchup = extractGameMatchup(gameInfo);
    return getSlateForGame(matchup);
}

// Showdown Global State
let players = [];
let lineups = [];
let selectedLineupCount = 100;
let selectedTimeSeconds = null;
let generationMode = 'count';
let currentSort = { column: 'points', direction: 'desc' };
let playerPoolSort = { column: 'flexProjection', direction: 'desc' };
let currentPage = 1;
const lineupsPerPage = 100;
let minSalary = 49000;
let maxSalary = 50000;
let projectionFloor = 90;
let entries = [];
let slates = {};
let currentSlate = null;
let optimizeMode = 'balanced';
let diversityStrength = 5;

// DOM Elements (initialized after DOM ready)
let uploadZone, csvInput, generateBtn, progressContainer, progressFill, progressText;
let playerPoolContainer, lineupsCard, lineupOutput, lineupRows;
let optimizeStatus, portfolioSummary, portfolioExposureList;

function initShowdownDOM() {
    uploadZone = document.getElementById('uploadZone');
    csvInput = document.getElementById('csvInput');
    generateBtn = document.getElementById('generateBtn');
    progressContainer = document.getElementById('progressContainer');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    playerPoolContainer = document.getElementById('playerPoolContainer');
    lineupsCard = document.getElementById('lineupsCard');
    lineupOutput = document.getElementById('lineupOutput');
    lineupRows = document.getElementById('lineupRows');
    optimizeStatus = document.getElementById('optimizeStatus');
    portfolioSummary = document.getElementById('portfolioSummary');
    portfolioExposureList = document.getElementById('portfolioExposureList');
}

function initShowdownEventListeners() {
    // File Upload Handling
    uploadZone.addEventListener('click', () => csvInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
        if (files.length > 0) {
            handleMultipleFiles(files);
        }
    });

    csvInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
        if (files.length > 0) {
            handleMultipleFiles(files);
        }
        csvInput.value = '';
    });

    // Slate button click handlers
    document.querySelectorAll('#slateSelector .slate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slateNum = parseInt(btn.dataset.slate);
            selectSlate(slateNum);
        });
    });

    // Generate button
    generateBtn.addEventListener('click', generateLineups);

    // Lineup count buttons
    document.querySelectorAll('.settings-row .lineup-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-row .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-row .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLineupCount = parseInt(btn.dataset.count);
            selectedTimeSeconds = null;
            generationMode = 'count';
        });
    });

    // Time duration buttons
    document.querySelectorAll('.settings-row .lineup-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-row .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-row .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTimeSeconds = parseInt(btn.dataset.seconds);
            generationMode = 'time';
        });
    });

    // Salary sliders
    const minSalarySlider = document.getElementById('minSalarySlider');
    const maxSalarySlider = document.getElementById('maxSalarySlider');

    minSalarySlider.addEventListener('input', (e) => {
        minSalary = parseInt(e.target.value);
        if (minSalary > maxSalary) {
            maxSalary = minSalary;
            maxSalarySlider.value = maxSalary;
        }
        updateSalaryDisplay();
    });

    maxSalarySlider.addEventListener('input', (e) => {
        maxSalary = parseInt(e.target.value);
        if (maxSalary < minSalary) {
            minSalary = maxSalary;
            minSalarySlider.value = minSalary;
        }
        updateSalaryDisplay();
    });

    // Projection floor slider
    document.getElementById('projFloorSlider').addEventListener('input', (e) => {
        projectionFloor = parseFloat(e.target.value);
        document.getElementById('projFloorValue').textContent = `${projectionFloor.toFixed(1)}%`;
    });

    // Optimize mode buttons
    document.querySelectorAll('.optimize-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.optimize-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            optimizeMode = btn.dataset.mode;

            const pawSettings = document.getElementById('pawPatrolSettings');
            pawSettings.style.display = optimizeMode === 'paw-patrol' ? 'block' : 'none';
        });
    });

    // Diversity slider
    document.getElementById('diversitySlider').addEventListener('input', (e) => {
        diversityStrength = parseInt(e.target.value);
        document.getElementById('diversityValue').textContent = diversityStrength;
    });

    // Optimize button
    document.getElementById('optimizeBtn').addEventListener('click', optimizeEntries);

    // Export entries button
    document.getElementById('exportEntriesBtn').addEventListener('click', exportEntriesToCSV);

    // Process ALL button
    document.getElementById('processAllBtn').addEventListener('click', processAllSlates);

    // Pagination
    document.getElementById('prevPageTop').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderLineups();
            document.getElementById('lineupOutput').scrollTop = 0;
        }
    });

    document.getElementById('nextPageTop').addEventListener('click', () => {
        const totalPages = Math.ceil(lineups.length / lineupsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderLineups();
            document.getElementById('lineupOutput').scrollTop = 0;
        }
    });

    // Sortable columns
    document.querySelector('.lineup-row.header').addEventListener('click', (e) => {
        const sortable = e.target.closest('.sortable');
        if (!sortable) return;

        const column = sortable.dataset.sort;

        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'desc';
        }

        currentPage = 1;

        document.querySelectorAll('.lineup-row.header .sortable').forEach(el => {
            el.classList.remove('sort-asc', 'sort-desc');
        });
        sortable.classList.add(currentSort.direction === 'desc' ? 'sort-desc' : 'sort-asc');

        renderLineups();
    });

    // Export CSV button
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (lineups.length === 0) return;

        const headers = ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'Salary', 'Projection'];
        const rows = lineups.map(lineup => {
            const cpt = lineup.players[0];
            const flex = lineup.players.slice(1);
            return [
                cpt.name,
                ...flex.map(p => p.name),
                lineup.totalSalary,
                lineup.totalProjection.toFixed(2)
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `showdown_lineups_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Clear Lineups
    document.getElementById('clearLineupsBtn').addEventListener('click', () => {
        lineups = [];
        currentPage = 1;
        document.getElementById('lineupsGenerated').textContent = '0';
        document.getElementById('topProjection').textContent = '0.00';
        document.getElementById('avgProjection').textContent = '0.00';
        document.getElementById('lineupCountDisplay').textContent = '0 lineups';
        document.getElementById('paginationTop').style.display = 'none';
        lineupRows.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <h4>No Lineups Generated</h4>
                <p>Click "Generate Lineups" to create optimized lineups</p>
            </div>
        `;
    });

    // Position filters
    document.querySelectorAll('#positionFilters .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#positionFilters .filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderPlayerPool();
        });
    });

    // Player search
    document.getElementById('playerSearch').addEventListener('input', renderPlayerPool);
}

function updateSalaryDisplay() {
    document.getElementById('minSalaryValue').textContent = minSalary.toLocaleString();
    document.getElementById('maxSalaryValue').textContent = maxSalary.toLocaleString();

    const range = document.getElementById('salaryRange');
    const min = 40000;
    const max = 50000;
    const leftPercent = ((minSalary - min) / (max - min)) * 100;
    const rightPercent = ((maxSalary - min) / (max - min)) * 100;
    range.style.left = leftPercent + '%';
    range.style.width = (rightPercent - leftPercent) + '%';
}

// Track loaded files for display
let loadedFiles = [];

function handleMultipleFiles(files) {
    let filesProcessed = 0;
    const totalFiles = files.length;

    // Reset slates only if this is a fresh upload (no files loaded yet)
    if (loadedFiles.length === 0) {
        slates = {};
        entries = [];
        players = [];
        gameToSlateMap = {};
        nextAvailableSlate = 1;
    }

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvData = e.target.result;
            parseCSVMerge(csvData, file.name);
            loadedFiles.push(file.name);
            filesProcessed++;

            if (filesProcessed === totalFiles) {
                // All files processed, update UI
                updateUploadZoneUI();

                // Select first available slate
                for (let i = 1; i <= 6; i++) {
                    if (slates[i] && slates[i].players.length > 0) {
                        selectSlate(i);
                        break;
                    }
                }
            }
        };
        reader.readAsText(file);
    });
}

function handleFile(file) {
    handleMultipleFiles([file]);
}

function updateUploadZoneUI() {
    // Calculate totals across all slates
    let totalEntries = 0;
    let totalPlayers = 0;
    Object.values(slates).forEach(slate => {
        totalEntries += slate.entries.length;
        totalPlayers += slate.players.length;
    });

    const loadedSlateCount = Object.keys(slates).filter(k => slates[k].players.length > 0).length;

    uploadZone.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent-primary);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 style="color: var(--accent-primary);">✓ ${loadedFiles[loadedFiles.length - 1]}</h3>
        <p>${totalEntries} entries, ${totalPlayers} players loaded</p>
        <p style="font-size: 0.8em; opacity: 0.7;">${loadedSlateCount} game slot${loadedSlateCount !== 1 ? 's' : ''} • Drop more CSVs to add</p>
        <p style="font-size: 0.75em; margin-top: 8px;"><a href="#" id="resetUploadsLink" style="color: var(--accent-secondary);">Reset & Start Fresh</a></p>
        <input type="file" id="csvInput" accept=".csv" multiple>
    `;

    const newInput = document.getElementById('csvInput');
    newInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
        if (files.length > 0) handleMultipleFiles(files);
        newInput.value = '';
    });

    // Reset link handler
    document.getElementById('resetUploadsLink').addEventListener('click', (e) => {
        e.preventDefault();
        resetAllUploads();
    });

    document.getElementById('entriesLoaded').textContent = totalEntries;
    document.getElementById('playersLoaded').textContent = totalPlayers;
    document.getElementById('fileStatus').textContent = `${totalPlayers} players loaded`;

    updateSlateButtons();
}

function resetAllUploads() {
    // Clear all data
    slates = {};
    entries = [];
    players = [];
    lineups = [];
    loadedFiles = [];
    currentSlate = null;
    gameToSlateMap = {};
    nextAvailableSlate = 1;

    // Reset upload zone to initial state
    uploadZone.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <h3>Drop your DraftKings CSV(s) here</h3>
        <p>Drop multiple game files at once</p>
        <input type="file" id="csvInput" accept=".csv" multiple>
    `;

    // Re-attach event listener
    const newInput = document.getElementById('csvInput');
    newInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
        if (files.length > 0) handleMultipleFiles(files);
        newInput.value = '';
    });

    // Reset UI elements
    document.getElementById('entriesLoaded').textContent = '0';
    document.getElementById('playersLoaded').textContent = '0';
    document.getElementById('fileStatus').textContent = 'No file loaded';
    document.getElementById('lineupsGenerated').textContent = '0';
    document.getElementById('topProjection').textContent = '0.00';
    document.getElementById('avgProjection').textContent = '0.00';

    // Reset slate buttons
    updateSlateButtons();

    // Hide cards that need data
    document.getElementById('entriesCard').style.display = 'none';
    document.getElementById('optimizeCard').style.display = 'none';
    document.getElementById('lineupsCard').style.display = 'none';

    // Clear player pool
    renderPlayerPool();

    generateBtn.disabled = true;
}

// Parse CSV and merge into existing slates (for multi-file support)
function parseCSVMerge(csvData, fileName) {
    const lines = csvData.split('\n');

    // Don't reset slates - merge into existing data

    let positionColIdx = -1;
    let playerPoolStartRow = -1;

    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const row = parseCSVLine(lines[i]);
        const posIdx = row.findIndex(cell => cell && cell.trim().toUpperCase() === 'POSITION');
        if (posIdx !== -1) {
            positionColIdx = posIdx;
            playerPoolStartRow = i + 1;
            break;
        }
    }

    if (playerPoolStartRow === -1) {
        console.error('Could not find player pool in CSV:', fileName);
        return;
    }

    // Parse entries from this file
    for (let i = 1; i < playerPoolStartRow - 1; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        const row = parseCSVLine(line);

        if (row[0] && row[0].match(/^\d+$/) && row[1]) {
            const entryId = row[0].trim();
            const contestName = row[1] || '';
            const contestId = row[2] || '';
            const entryFee = row[3] || '$0';

            // Detect slate from contest name using hour-range based detection
            let slateNum = detectSlateNumberFromGameInfo(contestName);

            const entry = {
                entryId,
                contestName,
                contestId,
                entryFee,
                cpt: row[4] || '',
                flex: [row[5] || '', row[6] || '', row[7] || '', row[8] || '', row[9] || ''],
                slateNum,
                optimizedLineup: null
            };

            entries.push(entry);

            if (!slates[slateNum]) {
                slates[slateNum] = { entries: [], players: [], lineups: [], gameInfo: '' };
            }
            slates[slateNum].entries.push(entry);
        }
    }

    // Parse player pool header
    const headerRow = parseCSVLine(lines[playerPoolStartRow - 1]);
    const colMap = {};
    headerRow.forEach((col, idx) => {
        const upper = (col || '').trim().toUpperCase();
        if (upper === 'POSITION') colMap.position = idx;
        if (upper === 'NAME + ID') colMap.nameId = idx;
        if (upper === 'NAME') colMap.name = idx;
        if (upper === 'ID') colMap.id = idx;
        if (upper === 'ROSTER POSITION') colMap.rosterPos = idx;
        if (upper === 'SALARY') colMap.salary = idx;
        if (upper === 'GAME INFO') colMap.gameInfo = idx;
        if (upper === 'TEAMABBREV' || upper === 'TEAM') colMap.team = idx;
        if (upper === 'AVGPOINTSPERGAME') colMap.projection = idx;
    });

    const tempPlayers = {};

    for (let i = playerPoolStartRow; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        const row = parseCSVLine(line);

        const position = (row[colMap.position] || '').trim().toUpperCase();
        const nameId = (row[colMap.nameId] || '').trim();
        let name = (row[colMap.name] || '').trim();
        const id = (row[colMap.id] || '').trim();
        const rosterPos = (row[colMap.rosterPos] || '').trim().toUpperCase();
        const salary = parseInt((row[colMap.salary] || '0').replace(/[$,]/g, '')) || 0;
        const gameInfo = (row[colMap.gameInfo] || '').trim();
        const team = (row[colMap.team] || '').trim().toUpperCase();
        const projection = parseFloat(row[colMap.projection] || '0') || 0;

        if (!name && nameId) {
            const match = nameId.match(/^(.+?)\s*\(\d+\)$/);
            if (match) name = match[1].trim();
            else name = nameId;
        }

        if (!name || !position || !salary) continue;

        let slateNum = detectSlateNumberFromGameInfo(gameInfo);

        const playerKey = `${name}-${team}-${slateNum}`;

        if (rosterPos === 'CPT') {
            if (!tempPlayers[playerKey]) {
                tempPlayers[playerKey] = {
                    id,
                    name,
                    team,
                    position,
                    gameInfo,
                    slateNum,
                    cptSalary: salary,
                    cptProjection: projection,
                    cptNameId: nameId,
                    flexSalary: 0,
                    flexProjection: 0,
                    flexNameId: ''
                };
            } else {
                tempPlayers[playerKey].cptSalary = salary;
                tempPlayers[playerKey].cptProjection = projection;
                tempPlayers[playerKey].cptNameId = nameId;
            }
        } else {
            if (!tempPlayers[playerKey]) {
                tempPlayers[playerKey] = {
                    id,
                    name,
                    team,
                    position,
                    gameInfo,
                    slateNum,
                    cptSalary: 0,
                    cptProjection: 0,
                    cptNameId: '',
                    flexSalary: salary,
                    flexProjection: projection,
                    flexNameId: nameId
                };
            } else {
                tempPlayers[playerKey].flexSalary = salary;
                tempPlayers[playerKey].flexProjection = projection;
                tempPlayers[playerKey].flexNameId = nameId;
                if (!tempPlayers[playerKey].id) tempPlayers[playerKey].id = id;
            }
        }
    }

    const newPlayers = Object.values(tempPlayers).filter(p => p.flexSalary > 0);

    // Add new players to global players array (avoid duplicates)
    const existingPlayerKeys = new Set(players.map(p => `${p.name}-${p.team}-${p.slateNum}`));
    newPlayers.forEach(player => {
        const playerKey = `${player.name}-${player.team}-${player.slateNum}`;
        if (!existingPlayerKeys.has(playerKey)) {
            players.push(player);
            existingPlayerKeys.add(playerKey);
        }

        // Add to slate
        if (!slates[player.slateNum]) {
            slates[player.slateNum] = { entries: [], players: [], lineups: [], gameInfo: player.gameInfo };
        }

        // Check if player already exists in slate
        const slatePlayerKeys = new Set(slates[player.slateNum].players.map(p => `${p.name}-${p.team}`));
        if (!slatePlayerKeys.has(`${player.name}-${player.team}`)) {
            slates[player.slateNum].players.push(player);
        }

        if (!slates[player.slateNum].gameInfo && player.gameInfo) {
            slates[player.slateNum].gameInfo = player.gameInfo;
        }
    });

    console.log(`Parsed ${fileName}: ${newPlayers.length} players, ${Object.keys(slates).length} slates`);
}

function parseCSV(csvData) {
    const lines = csvData.split('\n');

    slates = {};
    entries = [];
    players = [];
    loadedFiles = [];
    gameToSlateMap = {};
    nextAvailableSlate = 1;

    let positionColIdx = -1;
    let playerPoolStartRow = -1;

    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const row = parseCSVLine(lines[i]);
        const posIdx = row.findIndex(cell => cell && cell.trim().toUpperCase() === 'POSITION');
        if (posIdx !== -1) {
            positionColIdx = posIdx;
            playerPoolStartRow = i + 1;
            break;
        }
    }

    if (playerPoolStartRow === -1) {
        console.error('Could not find player pool in CSV');
        return;
    }

    for (let i = 1; i < playerPoolStartRow - 1; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        const row = parseCSVLine(line);

        if (row[0] && row[0].match(/^\d+$/) && row[1]) {
            const entryId = row[0].trim();
            const contestName = row[1] || '';
            const contestId = row[2] || '';
            const entryFee = row[3] || '$0';

            // Detect slate from contest name using hour-range based detection
            let slateNum = detectSlateNumberFromGameInfo(contestName);

            const entry = {
                entryId,
                contestName,
                contestId,
                entryFee,
                cpt: row[4] || '',
                flex: [row[5] || '', row[6] || '', row[7] || '', row[8] || '', row[9] || ''],
                slateNum,
                optimizedLineup: null
            };

            entries.push(entry);

            if (!slates[slateNum]) {
                slates[slateNum] = { entries: [], players: [], lineups: [], gameInfo: '' };
            }
            slates[slateNum].entries.push(entry);
        }
    }

    const headerRow = parseCSVLine(lines[playerPoolStartRow - 1]);
    const colMap = {};
    headerRow.forEach((col, idx) => {
        const upper = (col || '').trim().toUpperCase();
        if (upper === 'POSITION') colMap.position = idx;
        if (upper === 'NAME + ID') colMap.nameId = idx;
        if (upper === 'NAME') colMap.name = idx;
        if (upper === 'ID') colMap.id = idx;
        if (upper === 'ROSTER POSITION') colMap.rosterPos = idx;
        if (upper === 'SALARY') colMap.salary = idx;
        if (upper === 'GAME INFO') colMap.gameInfo = idx;
        if (upper === 'TEAMABBREV' || upper === 'TEAM') colMap.team = idx;
        if (upper === 'AVGPOINTSPERGAME') colMap.projection = idx;
    });

    const tempPlayers = {};

    for (let i = playerPoolStartRow; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        const row = parseCSVLine(line);

        const position = (row[colMap.position] || '').trim().toUpperCase();
        const nameId = (row[colMap.nameId] || '').trim();
        let name = (row[colMap.name] || '').trim();
        const id = (row[colMap.id] || '').trim();
        const rosterPos = (row[colMap.rosterPos] || '').trim().toUpperCase();
        const salary = parseInt((row[colMap.salary] || '0').replace(/[$,]/g, '')) || 0;
        const gameInfo = (row[colMap.gameInfo] || '').trim();
        const team = (row[colMap.team] || '').trim().toUpperCase();
        const projection = parseFloat(row[colMap.projection] || '0') || 0;

        if (!name && nameId) {
            const match = nameId.match(/^(.+?)\s*\(\d+\)$/);
            if (match) name = match[1].trim();
            else name = nameId;
        }

        if (!name || !position || !salary) continue;

        let slateNum = detectSlateNumberFromGameInfo(gameInfo);

        const playerKey = `${name}-${team}-${slateNum}`;

        if (rosterPos === 'CPT') {
            if (!tempPlayers[playerKey]) {
                tempPlayers[playerKey] = {
                    id,
                    name,
                    team,
                    position,
                    gameInfo,
                    slateNum,
                    cptSalary: salary,
                    cptProjection: projection,
                    cptNameId: nameId,
                    flexSalary: 0,
                    flexProjection: 0,
                    flexNameId: ''
                };
            } else {
                tempPlayers[playerKey].cptSalary = salary;
                tempPlayers[playerKey].cptProjection = projection;
                tempPlayers[playerKey].cptNameId = nameId;
            }
        } else {
            if (!tempPlayers[playerKey]) {
                tempPlayers[playerKey] = {
                    id,
                    name,
                    team,
                    position,
                    gameInfo,
                    slateNum,
                    cptSalary: 0,
                    cptProjection: 0,
                    cptNameId: '',
                    flexSalary: salary,
                    flexProjection: projection,
                    flexNameId: nameId
                };
            } else {
                tempPlayers[playerKey].flexSalary = salary;
                tempPlayers[playerKey].flexProjection = projection;
                tempPlayers[playerKey].flexNameId = nameId;
                if (!tempPlayers[playerKey].id) tempPlayers[playerKey].id = id;
            }
        }
    }

    players = Object.values(tempPlayers).filter(p => p.flexSalary > 0);

    players.forEach(player => {
        if (!slates[player.slateNum]) {
            slates[player.slateNum] = { entries: [], players: [], lineups: [], gameInfo: player.gameInfo };
        }
        slates[player.slateNum].players.push(player);
        if (!slates[player.slateNum].gameInfo && player.gameInfo) {
            slates[player.slateNum].gameInfo = player.gameInfo;
        }
    });

    document.getElementById('entriesLoaded').textContent = entries.length;
    document.getElementById('playersLoaded').textContent = players.length;
    document.getElementById('fileStatus').textContent = `${players.length} players loaded`;

    updateSlateButtons();

    for (let i = 1; i <= 6; i++) {
        if (slates[i] && slates[i].players.length > 0) {
            selectSlate(i);
            break;
        }
    }
}

function updateSlateButtons() {
    document.querySelectorAll('#slateSelector .slate-btn').forEach(btn => {
        const slateNum = parseInt(btn.dataset.slate);
        btn.classList.remove('loaded', 'active');

        if (slates[slateNum] && (slates[slateNum].entries.length > 0 || slates[slateNum].players.length > 0)) {
            btn.classList.add('loaded');
        }
    });
}

function selectSlate(slateNum) {
    if (!slates[slateNum]) return;

    currentSlate = slateNum;

    const slate = slates[slateNum];
    players = slate.players;
    entries = slate.entries;
    lineups = slate.lineups || [];

    document.querySelectorAll('#slateSelector .slate-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.slate) === slateNum) {
            btn.classList.add('active');
        }
    });

    updateSlateInfo();
    updateSectionBadges();
    renderPlayerPool();
    renderEntries(new Map());
    renderLineups();

    generateBtn.disabled = players.length === 0;

    const hasEntries = entries.length > 0;
    const hasLineups = lineups.length > 0;

    document.getElementById('entriesCard').style.display = hasEntries ? 'block' : 'none';
    document.getElementById('optimizeCard').style.display = hasEntries ? 'block' : 'none';
    document.getElementById('lineupsCard').style.display = hasLineups ? 'block' : 'none';
    document.getElementById('optimizeBtn').disabled = !hasLineups;
    document.getElementById('exportEntriesBtn').disabled = true;

    if (hasLineups) {
        document.getElementById('optimizeStatus').textContent = `${lineups.length} lineups ready to assign`;
    }
}

function updateSlateInfo() {
    const slateInfo = document.getElementById('currentSlateInfo');

    if (!currentSlate || !slates[currentSlate]) {
        slateInfo.classList.remove('visible');
        return;
    }

    const slate = slates[currentSlate];

    slateInfo.classList.add('visible');
    document.getElementById('slateBadge').textContent = currentSlate;
    document.getElementById('slatePlayerCount').textContent = slate.players.length;
    document.getElementById('slateEntryCount').textContent = slate.entries.length;

    if (slate.gameInfo) {
        const match = slate.gameInfo.match(/([A-Z]{2,3})@([A-Z]{2,3})/);
        if (match) {
            document.getElementById('slateTeams').textContent = `${match[1]} @ ${match[2]}`;
        }
        document.getElementById('slateDateTime').textContent = slate.gameInfo;
    }
}

function updateSectionBadges() {
    const playerPoolBadge = document.getElementById('playerPoolSlateBadge');
    const entriesBadge = document.getElementById('entriesSlateBadge');
    const lineupsBadge = document.getElementById('lineupsSlateBadge');

    if (currentSlate) {
        playerPoolBadge.textContent = `Slate ${currentSlate}`;
        playerPoolBadge.classList.add('visible');

        entriesBadge.textContent = `Slate ${currentSlate}`;
        entriesBadge.classList.add('visible');

        lineupsBadge.textContent = `Slate ${currentSlate}`;
        lineupsBadge.classList.add('visible');
    } else {
        playerPoolBadge.classList.remove('visible');
        entriesBadge.classList.remove('visible');
        lineupsBadge.classList.remove('visible');
    }
}

function renderPlayerPool() {
    const container = playerPoolContainer;
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const activeFilter = document.querySelector('#positionFilters .filter-pill.active');
    const posFilter = activeFilter ? activeFilter.dataset.pos : 'all';

    let filtered = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                              p.team.toLowerCase().includes(searchTerm);
        const matchesPosition = posFilter === 'all' || p.position === posFilter;
        return matchesSearch && matchesPosition;
    });

    filtered.sort((a, b) => {
        if (playerPoolSort.column === 'flexProjection') {
            return playerPoolSort.direction === 'desc'
                ? b.flexProjection - a.flexProjection
                : a.flexProjection - b.flexProjection;
        }
        return 0;
    });

    document.getElementById('playerCount').textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <h4>No Players Found</h4>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>Salary</th>
                    <th class="sortable ${playerPoolSort.column === 'flexProjection' ? (playerPoolSort.direction === 'desc' ? 'sort-desc' : 'sort-asc') : ''}">Proj</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtered.slice(0, 100).forEach(p => {
        html += `
            <tr>
                <td style="font-weight: 500;">${p.name}</td>
                <td><span class="position-badge ${p.position.toLowerCase()}">${p.position}</span></td>
                <td class="team-badge">${p.team}</td>
                <td>$${p.flexSalary.toLocaleString()}</td>
                <td style="color: var(--accent-primary); font-weight: 600;">${p.flexProjection.toFixed(1)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderEntries(contestGroups) {
    const container = document.getElementById('entriesGroupedContainer');

    if (entries.length === 0) {
        container.innerHTML = '';
        document.getElementById('entriesCount').textContent = '0 entries';
        document.getElementById('totalEntryFees').textContent = '$0.00 total';
        return;
    }

    const grouped = new Map();
    entries.forEach(entry => {
        const key = entry.contestName;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(entry);
    });

    let totalFees = 0;
    entries.forEach(e => {
        const fee = parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0;
        totalFees += fee;
    });

    document.getElementById('entriesCount').textContent = `${entries.length} entries`;
    document.getElementById('totalEntryFees').textContent = `$${totalFees.toFixed(2)} total`;

    let html = '';
    grouped.forEach((contestEntries, contestName) => {
        const isGPP = !isCashGame(contestName);
        const totalContestFees = contestEntries.reduce((sum, e) => sum + (parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0), 0);

        html += `
            <div class="contest-group">
                <div class="contest-group-header">
                    <div class="contest-group-left">
                        <div class="contest-group-icon ${isGPP ? '' : 'cash'}">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${isGPP ?
                                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>' :
                                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                                }
                            </svg>
                        </div>
                        <span class="contest-group-name">${contestName}</span>
                        <span class="game-type-badge ${isGPP ? 'gpp' : 'cash'}">${isGPP ? 'GPP' : 'Cash'}</span>
                    </div>
                    <div class="contest-group-stats">
                        <span>${contestEntries.length} entries</span>
                        <span class="dot">•</span>
                        <span class="contest-group-fee">$${totalContestFees.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function generateLineups() {
    if (players.length === 0) return;

    generateBtn.disabled = true;
    progressContainer.classList.add('active');
    lineupsCard.style.display = 'block';
    lineups = [];
    currentPage = 1;

    const teams = [...new Set(players.map(p => p.team))];
    if (teams.length < 2) {
        alert('Need players from at least 2 teams for Showdown');
        generateBtn.disabled = false;
        progressContainer.classList.remove('active');
        return;
    }

    const isTimeMode = generationMode === 'time';
    const targetCount = isTimeMode ? Infinity : selectedLineupCount;
    const targetTime = isTimeMode ? selectedTimeSeconds * 1000 : Infinity;
    const startTime = Date.now();

    const lineupSet = new Set();

    const sortedPlayers = [...players].sort((a, b) => b.flexProjection - a.flexProjection);

    progressText.textContent = 'Finding optimal lineups...';
    progressFill.style.width = '10%';
    await new Promise(r => setTimeout(r, 0));

    const optimalLineups = [];

    const playersByCptProj = [...players].sort((a, b) => (b.flexProjection * 1.5) - (a.flexProjection * 1.5));

    for (let cptIdx = 0; cptIdx < playersByCptProj.length; cptIdx++) {
        const captain = playersByCptProj[cptIdx];

        if (cptIdx % 5 === 0) {
            const elapsed = Date.now() - startTime;
            if (isTimeMode) {
                const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                progressFill.style.width = timeProgress + '%';
                progressText.textContent = `Finding optimal lineups... ${Math.ceil((targetTime - elapsed) / 1000)}s remaining`;
            } else {
                progressFill.style.width = (10 + (cptIdx / playersByCptProj.length) * 40) + '%';
                progressText.textContent = `Analyzing captain ${cptIdx + 1}/${playersByCptProj.length}...`;
            }
            await new Promise(r => setTimeout(r, 0));
        }

        const lineup = generateOptimalLineupForCaptain(captain, sortedPlayers, teams);
        if (lineup) {
            const lineupKey = lineup.players.map(p => p.id + (p.isCpt ? 'C' : '')).sort().join('-');
            if (!lineupSet.has(lineupKey)) {
                lineupSet.add(lineupKey);
                optimalLineups.push(lineup);
            }
        }
    }

    optimalLineups.sort((a, b) => b.totalProjection - a.totalProjection);

    const maxProjection = optimalLineups.length > 0 ? optimalLineups[0].totalProjection : 0;
    const projectionThreshold = maxProjection * (projectionFloor / 100);

    for (const lineup of optimalLineups) {
        if (lineup.totalSalary >= minSalary &&
            lineup.totalSalary <= maxSalary &&
            lineup.totalProjection >= projectionThreshold) {
            lineups.push(lineup);
        }
    }

    const needMoreLineups = isTimeMode || lineups.length < targetCount;

    if (needMoreLineups) {
        progressText.textContent = isTimeMode ? 'Generating lineups...' : 'Generating additional lineups...';
        progressFill.style.width = '60%';
        await new Promise(r => setTimeout(r, 0));

        let attempts = 0;
        let lastLineupCount = lineups.length;
        let stallCounter = 0;
        const maxStallAttempts = 5000;

        while (true) {
            attempts++;

            const elapsed = Date.now() - startTime;

            if (isTimeMode && elapsed >= targetTime) {
                progressText.textContent = `Time's up! Generated ${lineups.length} lineups`;
                break;
            }

            if (!isTimeMode && lineups.length >= targetCount) {
                break;
            }

            if (stallCounter >= maxStallAttempts) {
                progressText.textContent = `Stopped early - found all unique lineups (${lineups.length})`;
                break;
            }

            if (attempts % 500 === 0) {
                if (isTimeMode) {
                    const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                    const remaining = Math.max(0, Math.ceil((targetTime - elapsed) / 1000));
                    progressFill.style.width = timeProgress + '%';
                    progressText.textContent = `Generated ${lineups.length} lineups... ${remaining}s remaining`;
                } else {
                    const progress = 60 + Math.min((lineups.length / targetCount) * 40, 39);
                    progressFill.style.width = progress + '%';
                    progressText.textContent = `Generated ${lineups.length} of ${targetCount} lineups...`;
                }
                await new Promise(r => setTimeout(r, 0));

                if (lineups.length === lastLineupCount) {
                    stallCounter += 500;
                } else {
                    stallCounter = 0;
                    lastLineupCount = lineups.length;
                }
            }

            const lineup = generateRandomizedLineup(sortedPlayers, teams);
            if (lineup) {
                if (lineup.totalSalary < minSalary || lineup.totalSalary > maxSalary) {
                    stallCounter++;
                    continue;
                }
                if (lineup.totalProjection < projectionThreshold) {
                    stallCounter++;
                    continue;
                }

                const lineupKey = lineup.players.map(p => p.id + (p.isCpt ? 'C' : '')).sort().join('-');
                if (!lineupSet.has(lineupKey)) {
                    lineupSet.add(lineupKey);
                    lineups.push(lineup);
                    stallCounter = 0;
                } else {
                    stallCounter++;
                }
            } else {
                stallCounter++;
            }
        }
    }

    lineups.sort((a, b) => b.totalProjection - a.totalProjection);

    progressFill.style.width = '100%';
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    progressText.textContent = `Complete! ${lineups.length} lineups in ${finalTime}s`;

    document.getElementById('lineupsGenerated').textContent = lineups.length;
    document.getElementById('topProjection').textContent = lineups.length > 0 ? lineups[0].totalProjection.toFixed(2) : '0.00';

    const avgProj = lineups.length > 0
        ? (lineups.reduce((sum, l) => sum + l.totalProjection, 0) / lineups.length).toFixed(2)
        : '0.00';
    document.getElementById('avgProjection').textContent = avgProj;

    renderLineups();

    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].lineups = [...lineups];
    }

    updateSectionBadges();

    if (entries.length > 0) {
        document.getElementById('optimizeBtn').disabled = false;
        document.getElementById('optimizeStatus').textContent = `${lineups.length} lineups ready to assign`;
    }

    setTimeout(() => {
        progressContainer.classList.remove('active');
        generateBtn.disabled = false;
    }, 1500);
}

function generateOptimalLineupForCaptain(captain, sortedPlayers, teams) {
    const cptSalary = Math.round(captain.flexSalary * 1.5);
    const remainingSalary = SALARY_CAP - cptSalary;

    const available = sortedPlayers.filter(p => p.id !== captain.id);

    const bestCombo = findBestFivePlayers(available, remainingSalary, captain.team, cptSalary);

    if (!bestCombo) return null;

    const totalSalary = cptSalary + bestCombo.reduce((sum, p) => sum + p.flexSalary, 0);
    const totalProjection = (captain.flexProjection * 1.5) + bestCombo.reduce((sum, p) => sum + p.flexProjection, 0);

    return {
        players: [
            { ...captain, isCpt: true, cptSalary },
            ...bestCombo.map(p => ({ ...p, isCpt: false }))
        ],
        totalSalary,
        totalProjection
    };
}

function findBestFivePlayers(players, maxSalary, captainTeam) {
    let bestCombo = null;
    let bestProjection = -1;

    const candidates = players.slice(0, 25);
    const n = candidates.length;

    if (n < 5) return null;

    for (let i = 0; i < n - 4; i++) {
        const p1 = candidates[i];
        const sal1 = p1.flexSalary;
        if (sal1 > maxSalary) continue;

        for (let j = i + 1; j < n - 3; j++) {
            const p2 = candidates[j];
            const sal2 = sal1 + p2.flexSalary;
            if (sal2 > maxSalary) continue;

            for (let k = j + 1; k < n - 2; k++) {
                const p3 = candidates[k];
                const sal3 = sal2 + p3.flexSalary;
                if (sal3 > maxSalary) continue;

                for (let l = k + 1; l < n - 1; l++) {
                    const p4 = candidates[l];
                    const sal4 = sal3 + p4.flexSalary;
                    if (sal4 > maxSalary) continue;

                    for (let m = l + 1; m < n; m++) {
                        const p5 = candidates[m];
                        const totalSalary = sal4 + p5.flexSalary;

                        if (totalSalary > maxSalary) continue;

                        const teamsUsed = new Set([captainTeam, p1.team, p2.team, p3.team, p4.team, p5.team]);
                        if (teamsUsed.size < 2) continue;

                        const totalProjection = p1.flexProjection + p2.flexProjection + p3.flexProjection + p4.flexProjection + p5.flexProjection;

                        if (totalProjection > bestProjection) {
                            bestProjection = totalProjection;
                            bestCombo = [p1, p2, p3, p4, p5];
                        }
                    }
                }
            }
        }
    }

    return bestCombo;
}

function generateRandomizedLineup(sortedPlayers, teams) {
    const captainPool = sortedPlayers.slice(0, Math.min(25, sortedPlayers.length));
    const weights = captainPool.map((_, i) => Math.pow(0.9, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let captainIdx = 0;
    for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
            captainIdx = i;
            break;
        }
    }

    const captain = captainPool[captainIdx];
    const cptSalary = Math.round(captain.flexSalary * 1.5);
    let remainingSalary = SALARY_CAP - cptSalary;
    const usedIds = new Set([captain.id]);
    const usedTeams = new Set([captain.team]);
    const flexPlayers = [];

    const available = sortedPlayers.filter(p => p.id !== captain.id);

    const shuffled = [...available];
    for (let i = Math.min(15, shuffled.length - 1); i > 0; i--) {
        if (Math.random() < 0.6) continue;
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const player of shuffled) {
        if (flexPlayers.length >= 5) break;
        if (usedIds.has(player.id)) continue;
        if (player.flexSalary > remainingSalary) continue;

        const spotsLeft = 5 - flexPlayers.length;
        const needOtherTeam = usedTeams.size === 1 && spotsLeft === 1;

        if (needOtherTeam && player.team === captain.team) continue;

        flexPlayers.push(player);
        usedIds.add(player.id);
        usedTeams.add(player.team);
        remainingSalary -= player.flexSalary;
    }

    if (flexPlayers.length !== 5) return null;
    if (usedTeams.size < 2) return null;

    const totalSalary = cptSalary + flexPlayers.reduce((sum, p) => sum + p.flexSalary, 0);
    if (totalSalary > SALARY_CAP) return null;

    const totalProjection = (captain.flexProjection * 1.5) + flexPlayers.reduce((sum, p) => sum + p.flexProjection, 0);

    return {
        players: [
            { ...captain, isCpt: true, cptSalary: cptSalary },
            ...flexPlayers.map(p => ({ ...p, isCpt: false }))
        ],
        totalSalary,
        totalProjection
    };
}

function renderLineups() {
    document.getElementById('lineupCountDisplay').textContent = `${lineups.length} lineups`;

    const salaryHeader = document.querySelector('.lineup-row.header [data-sort="salary"]');
    const pointsHeader = document.querySelector('.lineup-row.header [data-sort="points"]');
    const rankHeader = document.querySelector('.lineup-row.header [data-sort="rank"]');

    [salaryHeader, pointsHeader, rankHeader].forEach(h => {
        if (h) {
            h.classList.remove('sort-asc', 'sort-desc');
            const col = h.dataset.sort;
            const sortCol = currentSort.column === 'rank' ? 'rank' : currentSort.column;
            if (col === sortCol || (col === 'points' && currentSort.column === 'points') || (col === 'salary' && currentSort.column === 'salary')) {
                if (currentSort.column === col) {
                    h.classList.add(currentSort.direction === 'desc' ? 'sort-desc' : 'sort-asc');
                    h.textContent = h.dataset.sort.charAt(0).toUpperCase() + h.dataset.sort.slice(1) + (currentSort.direction === 'desc' ? ' ↓' : ' ↑');
                } else {
                    h.textContent = h.dataset.sort.charAt(0).toUpperCase() + h.dataset.sort.slice(1) + ' ⇅';
                }
            } else {
                h.textContent = h.dataset.sort.charAt(0).toUpperCase() + h.dataset.sort.slice(1) + ' ⇅';
            }
        }
    });

    const paginationTop = document.getElementById('paginationTop');

    if (lineups.length === 0) {
        paginationTop.style.display = 'none';
        lineupRows.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <h4>No Lineups Generated</h4>
                <p>Click "Generate Lineups" to create optimized lineups</p>
            </div>
        `;
        return;
    }

    const sortedLineups = [...lineups];
    if (currentSort.column === 'points') {
        sortedLineups.sort((a, b) => currentSort.direction === 'desc'
            ? b.totalProjection - a.totalProjection
            : a.totalProjection - b.totalProjection);
    } else if (currentSort.column === 'salary') {
        sortedLineups.sort((a, b) => currentSort.direction === 'desc'
            ? b.totalSalary - a.totalSalary
            : a.totalSalary - b.totalSalary);
    } else if (currentSort.column === 'rank') {
        if (currentSort.direction === 'asc') {
            sortedLineups.reverse();
        }
    }

    const totalPages = Math.ceil(sortedLineups.length / lineupsPerPage);
    currentPage = Math.min(currentPage, totalPages);
    currentPage = Math.max(currentPage, 1);

    const startIdx = (currentPage - 1) * lineupsPerPage;
    const endIdx = Math.min(startIdx + lineupsPerPage, sortedLineups.length);
    const pageLineups = sortedLineups.slice(startIdx, endIdx);

    if (sortedLineups.length > lineupsPerPage) {
        paginationTop.style.display = 'flex';
        document.getElementById('pageInfoTop').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('showingInfoTop').textContent = `Showing ${startIdx + 1}-${endIdx} of ${sortedLineups.length}`;
        document.getElementById('prevPageTop').disabled = currentPage <= 1;
        document.getElementById('nextPageTop').disabled = currentPage >= totalPages;
    } else {
        paginationTop.style.display = 'none';
    }

    lineupRows.innerHTML = pageLineups.map((lineup, idx) => {
        const cpt = lineup.players[0];
        const flex = lineup.players.slice(1);
        const actualRank = startIdx + idx + 1;

        return `
            <div class="lineup-row">
                <div class="lineup-rank">#${actualRank}</div>
                <div class="lineup-player">
                    <span class="lineup-player-name">${cpt.name}</span>
                    <span class="lineup-player-meta">
                        <span class="position-badge cpt">CPT</span>
                        ${cpt.team} • $${(cpt.cptSalary || Math.round(cpt.flexSalary * 1.5)).toLocaleString()} • <span style="color: var(--accent-tertiary); font-weight: 600;">${(cpt.flexProjection * 1.5).toFixed(1)}</span>
                    </span>
                </div>
                ${flex.map(p => `
                    <div class="lineup-player">
                        <span class="lineup-player-name">${p.name}</span>
                        <span class="lineup-player-meta">
                            <span class="position-badge flex">FLEX</span>
                            ${p.team} • $${p.flexSalary.toLocaleString()} • <span style="color: var(--accent-primary); font-weight: 600;">${p.flexProjection.toFixed(1)}</span>
                        </span>
                    </div>
                `).join('')}
                <div class="lineup-salary">$${lineup.totalSalary.toLocaleString()}</div>
                <div class="lineup-points">${lineup.totalProjection.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

function optimizeEntries() {
    if (lineups.length === 0 || entries.length === 0) {
        alert('No entries to optimize!');
        return;
    }

    const minUniques = parseInt(document.getElementById('minUniques').value) || 1;

    const sortedLineups = [...lineups].sort((a, b) => b.totalProjection - a.totalProjection);

    const topLineup = sortedLineups[0];

    let gppLineupIndex = 0;
    const usedLineups = new Set();

    const cashEntries = [];
    const gppEntries = [];

    entries.forEach(entry => {
        if (optimizeMode === 'cash' || isCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });

    cashEntries.forEach(entry => {
        assignLineupToEntry(entry, topLineup);
    });

    if (optimizeMode === 'paw-patrol') {
        optimizeEntriesPawPatrol();
        return;
    } else {
        gppEntries.forEach(entry => {
            while (gppLineupIndex < sortedLineups.length && usedLineups.has(gppLineupIndex)) {
                gppLineupIndex++;
            }

            if (gppLineupIndex < sortedLineups.length) {
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex]);
                usedLineups.add(gppLineupIndex);
                gppLineupIndex++;
            } else {
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex % sortedLineups.length]);
                gppLineupIndex++;
            }
        });
    }

    const cashCount = cashEntries.length;
    const gppCount = gppEntries.length;
    optimizeStatus.textContent = `✓ Optimized! ${cashCount} cash (top lineup), ${gppCount} GPP (unique)`;
    optimizeStatus.className = 'optimize-status success';

    document.getElementById('exportEntriesBtn').disabled = false;

    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].entries = [...entries];
    }

    renderEntries(new Map());
}

function optimizeEntriesPawPatrol() {
    const sortedLineups = [...lineups].sort((a, b) => b.totalProjection - a.totalProjection);
    const topLineup = sortedLineups[0];
    const maxProjection = topLineup.totalProjection;

    const cashEntries = [];
    const gppEntries = [];

    entries.forEach(entry => {
        if (isCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });

    cashEntries.forEach(entry => {
        assignLineupToEntry(entry, topLineup);
    });

    gppEntries.sort((a, b) => {
        const feeA = parseFloat(a.entryFee.replace(/[$,]/g, '')) || 0;
        const feeB = parseFloat(b.entryFee.replace(/[$,]/g, '')) || 0;
        return feeB - feeA;
    });

    const totalGppFees = gppEntries.reduce((sum, e) => {
        return sum + (parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0);
    }, 0);

    const poolSize = Math.min(200, sortedLineups.length);
    const candidatePool = sortedLineups.slice(0, poolSize);

    const poolAnalysis = analyzeLineupPool(candidatePool);

    const portfolio = {
        playerExposure: new Map(),
        captainExposure: new Map(),
        stackExposure: new Map(),
        assignedLineups: []
    };

    gppEntries.forEach(entry => {
        const entryFee = parseFloat(entry.entryFee.replace(/[$,]/g, '')) || 0.01;

        let bestLineup = null;
        let bestScore = -Infinity;

        candidatePool.forEach(lineup => {
            const score = scoreLineupForPortfolio(
                lineup,
                portfolio,
                maxProjection,
                totalGppFees,
                poolAnalysis,
                diversityStrength
            );

            if (score > bestScore) {
                bestScore = score;
                bestLineup = lineup;
            }
        });

        if (bestLineup) {
            assignLineupToEntry(entry, bestLineup);
            updatePortfolioExposure(portfolio, bestLineup, entryFee);
        }
    });

    const cashCount = cashEntries.length;
    const gppCount = gppEntries.length;
    optimizeStatus.textContent = `✓ Portfolio optimized! ${cashCount} cash, ${gppCount} GPP (diversity: ${diversityStrength})`;
    optimizeStatus.className = 'optimize-status success';

    displayPortfolioSummary(portfolio, totalGppFees);

    document.getElementById('exportEntriesBtn').disabled = false;

    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].entries = [...entries];
    }

    renderEntries(new Map());
}

function analyzeLineupPool(pool) {
    const playerCounts = new Map();
    const captainCounts = new Map();
    const stackCounts = new Map();

    pool.forEach(lineup => {
        lineup.players.forEach(player => {
            const count = playerCounts.get(player.name) || 0;
            playerCounts.set(player.name, count + 1);

            if (player.isCpt) {
                const cptCount = captainCounts.get(player.name) || 0;
                captainCounts.set(player.name, cptCount + 1);
            }
        });

        const teamCounts = new Map();
        lineup.players.forEach(player => {
            const tc = teamCounts.get(player.team) || 0;
            teamCounts.set(player.team, tc + 1);
        });

        let primaryStack = '';
        let maxCount = 0;
        teamCounts.forEach((count, team) => {
            if (count > maxCount) {
                maxCount = count;
                primaryStack = `${team} ${count}`;
            }
        });

        if (primaryStack) {
            const sc = stackCounts.get(primaryStack) || 0;
            stackCounts.set(primaryStack, sc + 1);
        }
    });

    return { playerCounts, captainCounts, stackCounts, poolSize: pool.length };
}

function scoreLineupForPortfolio(lineup, portfolio, maxProjection, totalGppFees, poolAnalysis, diversity) {
    const diversityFactor = diversity / 10;

    const projectionScore = lineup.totalProjection / maxProjection;

    let correlationScore = 0;
    if (totalGppFees > 0) {
        lineup.players.forEach(player => {
            const exposure = portfolio.playerExposure.get(player.name) || 0;
            const exposurePct = exposure / totalGppFees;

            if (player.isCpt) {
                correlationScore += exposurePct * 2;
            } else {
                correlationScore += exposurePct;
            }
        });
        correlationScore /= 8;
    }

    let uniquenessScore = 0;
    const captain = lineup.players.find(p => p.isCpt);

    if (captain && poolAnalysis.captainCounts.size > 0) {
        const cptFrequency = (poolAnalysis.captainCounts.get(captain.name) || 0) / poolAnalysis.poolSize;
        uniquenessScore += (1 - cptFrequency) * 0.15;
    }

    const teamCounts = new Map();
    lineup.players.forEach(player => {
        const tc = teamCounts.get(player.team) || 0;
        teamCounts.set(player.team, tc + 1);
    });

    let primaryStack = '';
    let maxCount = 0;
    teamCounts.forEach((count, team) => {
        if (count > maxCount) {
            maxCount = count;
            primaryStack = `${team} ${count}`;
        }
    });

    if (primaryStack && poolAnalysis.stackCounts.size > 0) {
        const stackFrequency = (poolAnalysis.stackCounts.get(primaryStack) || 0) / poolAnalysis.poolSize;
        uniquenessScore += (1 - stackFrequency) * 0.15;
    }

    let overlapPenalty = 0;
    portfolio.assignedLineups.forEach(assignedLineup => {
        const overlap = countPlayerOverlap(lineup, assignedLineup);
        overlapPenalty += overlap / 6;
    });
    if (portfolio.assignedLineups.length > 0) {
        overlapPenalty /= portfolio.assignedLineups.length;
    }

    const projectionWeight = 1.0;
    const correlationPenalty = diversityFactor * 0.5;
    const uniquenessBonus = diversityFactor * 0.3;
    const overlapBonus = diversityFactor * 0.3;

    const finalScore = (projectionScore * projectionWeight)
        - (correlationScore * correlationPenalty)
        + (uniquenessScore * uniquenessBonus)
        - (overlapPenalty * overlapBonus);

    return finalScore;
}

function countPlayerOverlap(lineup1, lineup2) {
    const names1 = new Set(lineup1.players.map(p => p.name));
    let overlap = 0;
    lineup2.players.forEach(p => {
        if (names1.has(p.name)) overlap++;
    });
    return overlap;
}

function updatePortfolioExposure(portfolio, lineup, entryFee) {
    lineup.players.forEach(player => {
        const currentExposure = portfolio.playerExposure.get(player.name) || 0;
        portfolio.playerExposure.set(player.name, currentExposure + entryFee);

        if (player.isCpt) {
            const currentCptExposure = portfolio.captainExposure.get(player.name) || 0;
            portfolio.captainExposure.set(player.name, currentCptExposure + entryFee);
        }
    });

    const teamCounts = new Map();
    lineup.players.forEach(player => {
        const tc = teamCounts.get(player.team) || 0;
        teamCounts.set(player.team, tc + 1);
    });

    let primaryStack = '';
    let maxCount = 0;
    teamCounts.forEach((count, team) => {
        if (count > maxCount) {
            maxCount = count;
            primaryStack = `${team} ${count}`;
        }
    });

    if (primaryStack) {
        const currentStackExposure = portfolio.stackExposure.get(primaryStack) || 0;
        portfolio.stackExposure.set(primaryStack, currentStackExposure + entryFee);
    }

    portfolio.assignedLineups.push(lineup);
}

function displayPortfolioSummary(portfolio, totalGppFees) {
    if (totalGppFees === 0) {
        portfolioSummary.style.display = 'none';
        return;
    }

    portfolioSummary.style.display = 'block';
    portfolioExposureList.innerHTML = '';

    const exposureArray = Array.from(portfolio.playerExposure.entries())
        .map(([name, dollars]) => ({ name, dollars, pct: (dollars / totalGppFees) * 100 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 12);

    exposureArray.forEach(({ name, pct }) => {
        const item = document.createElement('div');
        item.className = 'exposure-item';

        if (pct >= 70) {
            item.classList.add('high');
        } else if (pct >= 40) {
            item.classList.add('medium');
        } else {
            item.classList.add('low');
        }

        const nameParts = name.split(' ');
        const shortName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : name;

        item.innerHTML = `
            <span class="exposure-name" title="${name}">${shortName}</span>
            <span class="exposure-pct">${pct.toFixed(0)}%</span>
        `;

        portfolioExposureList.appendChild(item);
    });
}

function assignLineupToEntry(entry, lineup) {
    const captain = lineup.players.find(p => p.isCpt);
    const flexPlayers = lineup.players.filter(p => !p.isCpt);

    const getCptNameId = (player) => {
        const fullPlayer = players.find(p => p.name === player.name);
        if (fullPlayer && fullPlayer.cptNameId) {
            return fullPlayer.cptNameId;
        }
        return `${player.name} (${player.id})`;
    };

    const getFlexNameId = (player) => {
        const fullPlayer = players.find(p => p.name === player.name);
        if (fullPlayer && fullPlayer.flexNameId) {
            return fullPlayer.flexNameId;
        }
        return `${player.name} (${player.id})`;
    };

    entry.cpt = captain ? getCptNameId(captain) : entry.cpt;
    entry.flex = flexPlayers.map(p => getFlexNameId(p));
    entry.salary = lineup.totalSalary;
    entry.projection = lineup.totalProjection;

    entry.optimizedLineup = lineup;
}

function exportEntriesToCSV() {
    if (entries.length === 0) {
        alert('No entries to export!');
        return;
    }

    const headers = ['Entry ID', 'Contest Name', 'Contest ID', 'Entry Fee', 'CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];

    const rows = entries.map(entry => {
        const flexSlots = [...entry.flex];
        while (flexSlots.length < 5) {
            flexSlots.push('');
        }

        return [
            entry.entryId,
            entry.contestName,
            entry.contestId,
            entry.entryFee,
            entry.cpt,
            ...flexSlots.slice(0, 5)
        ];
    });

    const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    let csv = headers.map(escapeCSV).join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(escapeCSV).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DK_Optimized_Entries_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    optimizeStatus.textContent = `✓ Exported ${entries.length} entries to CSV`;
}

async function processAllSlates() {
    const processAllBtn = document.getElementById('processAllBtn');
    const loadedSlateNums = Object.keys(slates).map(Number).sort((a, b) => a - b);

    if (loadedSlateNums.length === 0) {
        alert('No slates loaded! Please upload at least one DraftKings CSV file.');
        return;
    }

    processAllBtn.disabled = true;
    processAllBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="spin">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Processing...
    `;

    const allOptimizedEntries = [];
    let totalSlatesProcessed = 0;

    for (const slateNum of loadedSlateNums) {
        const slate = slates[slateNum];

        if (!slate.entries || slate.entries.length === 0) {
            console.log(`Slate ${slateNum}: No entries, skipping`);
            continue;
        }

        currentSlate = slateNum;
        players = slate.players;
        entries = slate.entries;
        lineups = [];

        updateSlateButtons();
        updateSlateInfo();
        updateSectionBadges();

        processAllBtn.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="spin">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Slate ${slateNum}: Generating...
        `;

        await generateLineupsForSlate();

        slate.lineups = [...lineups];

        processAllBtn.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="spin">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Slate ${slateNum}: Optimizing...
        `;

        optimizeEntriesForSlate();

        slate.entries = [...entries];

        allOptimizedEntries.push(...entries);

        totalSlatesProcessed++;
        console.log(`Slate ${slateNum}: Processed ${entries.length} entries`);
    }

    processAllBtn.disabled = false;
    processAllBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        ALL
    `;

    if (allOptimizedEntries.length === 0) {
        alert('No entries found in any slate!');
        return;
    }

    exportAllEntriesToCSV(allOptimizedEntries, totalSlatesProcessed);
}

async function generateLineupsForSlate() {
    if (players.length === 0) return;

    lineups = [];

    const teams = [...new Set(players.map(p => p.team))];
    if (teams.length < 2) {
        console.log('Need players from at least 2 teams for Showdown');
        return;
    }

    const isTimeMode = generationMode === 'time';
    const targetCount = isTimeMode ? Infinity : selectedLineupCount;
    const targetTime = isTimeMode ? selectedTimeSeconds * 1000 : Infinity;
    const startTime = Date.now();

    const lineupSet = new Set();
    const sortedPlayers = [...players].sort((a, b) => b.flexProjection - a.flexProjection);
    const playersByCptProj = [...players].sort((a, b) => (b.flexProjection * 1.5) - (a.flexProjection * 1.5));

    const optimalLineups = [];

    for (let cptIdx = 0; cptIdx < playersByCptProj.length; cptIdx++) {
        const captain = playersByCptProj[cptIdx];

        const lineup = generateOptimalLineupForCaptain(captain, sortedPlayers, teams);
        if (lineup) {
            const lineupKey = lineup.players.map(p => p.id + (p.isCpt ? 'C' : '')).sort().join('-');
            if (!lineupSet.has(lineupKey)) {
                lineupSet.add(lineupKey);
                optimalLineups.push(lineup);
            }
        }

        if (cptIdx % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }

    optimalLineups.sort((a, b) => b.totalProjection - a.totalProjection);

    const maxProjection = optimalLineups.length > 0 ? optimalLineups[0].totalProjection : 0;
    const projectionThreshold = maxProjection * (projectionFloor / 100);

    for (const lineup of optimalLineups) {
        if (lineup.totalSalary >= minSalary &&
            lineup.totalSalary <= maxSalary &&
            lineup.totalProjection >= projectionThreshold) {
            lineups.push(lineup);
        }
    }

    const needMoreLineups = isTimeMode || lineups.length < targetCount;

    if (needMoreLineups) {
        let attempts = 0;
        let lastLineupCount = lineups.length;
        let stallCounter = 0;
        const maxStallAttempts = 5000;

        while (true) {
            attempts++;

            const elapsed = Date.now() - startTime;

            if (isTimeMode && elapsed >= targetTime) break;

            if (!isTimeMode && lineups.length >= targetCount) break;

            if (stallCounter >= maxStallAttempts) break;

            if (attempts % 500 === 0) {
                await new Promise(r => setTimeout(r, 0));

                if (lineups.length === lastLineupCount) {
                    stallCounter += 500;
                } else {
                    stallCounter = 0;
                    lastLineupCount = lineups.length;
                }
            }

            const lineup = generateRandomizedLineup(sortedPlayers, teams);
            if (lineup) {
                if (lineup.totalSalary < minSalary || lineup.totalSalary > maxSalary) {
                    stallCounter++;
                    continue;
                }
                if (lineup.totalProjection < projectionThreshold) {
                    stallCounter++;
                    continue;
                }

                const lineupKey = lineup.players.map(p => p.id + (p.isCpt ? 'C' : '')).sort().join('-');
                if (!lineupSet.has(lineupKey)) {
                    lineupSet.add(lineupKey);
                    lineups.push(lineup);
                    stallCounter = 0;
                } else {
                    stallCounter++;
                }
            } else {
                stallCounter++;
            }
        }
    }

    lineups.sort((a, b) => b.totalProjection - a.totalProjection);
}

function optimizeEntriesForSlate() {
    if (lineups.length === 0 || entries.length === 0) return;

    const sortedLineups = [...lineups].sort((a, b) => b.totalProjection - a.totalProjection);
    const topLineup = sortedLineups[0];
    const maxProjection = topLineup.totalProjection;

    const cashEntries = [];
    const gppEntries = [];

    entries.forEach(entry => {
        if (optimizeMode === 'cash' || isCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });

    cashEntries.forEach(entry => {
        assignLineupToEntry(entry, topLineup);
    });

    if (optimizeMode === 'paw-patrol') {
        gppEntries.sort((a, b) => {
            const feeA = parseFloat(a.entryFee.replace(/[$,]/g, '')) || 0;
            const feeB = parseFloat(b.entryFee.replace(/[$,]/g, '')) || 0;
            return feeB - feeA;
        });

        const totalGppFees = gppEntries.reduce((sum, e) => {
            return sum + (parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0);
        }, 0);

        const poolSize = Math.min(200, sortedLineups.length);
        const candidatePool = sortedLineups.slice(0, poolSize);
        const poolAnalysis = analyzeLineupPool(candidatePool);

        const portfolio = {
            playerExposure: new Map(),
            captainExposure: new Map(),
            stackExposure: new Map(),
            assignedLineups: []
        };

        gppEntries.forEach(entry => {
            const entryFee = parseFloat(entry.entryFee.replace(/[$,]/g, '')) || 0.01;

            let bestLineup = null;
            let bestScore = -Infinity;

            candidatePool.forEach(lineup => {
                const score = scoreLineupForPortfolio(
                    lineup, portfolio, maxProjection, totalGppFees,
                    poolAnalysis, diversityStrength
                );

                if (score > bestScore) {
                    bestScore = score;
                    bestLineup = lineup;
                }
            });

            if (bestLineup) {
                assignLineupToEntry(entry, bestLineup);
                updatePortfolioExposure(portfolio, bestLineup, entryFee);
            }
        });

        displayPortfolioSummary(portfolio, totalGppFees);
    } else {
        let gppLineupIndex = 0;
        const usedLineups = new Set();

        gppEntries.forEach(entry => {
            while (gppLineupIndex < sortedLineups.length && usedLineups.has(gppLineupIndex)) {
                gppLineupIndex++;
            }

            if (gppLineupIndex < sortedLineups.length) {
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex]);
                usedLineups.add(gppLineupIndex);
                gppLineupIndex++;
            } else {
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex % sortedLineups.length]);
                gppLineupIndex++;
            }
        });
    }
}

function exportAllEntriesToCSV(allEntries, slatesProcessed) {
    const headers = ['Entry ID', 'Contest Name', 'Contest ID', 'Entry Fee', 'CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];

    const rows = allEntries.map(entry => {
        const flexSlots = [...entry.flex];
        while (flexSlots.length < 5) {
            flexSlots.push('');
        }

        return [
            entry.entryId,
            entry.contestName,
            entry.contestId,
            entry.entryFee,
            entry.cpt,
            ...flexSlots.slice(0, 5)
        ];
    });

    const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    let csv = headers.map(escapeCSV).join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(escapeCSV).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DK_All_Entries_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`✓ Exported ${allEntries.length} entries from ${slatesProcessed} slates!`);
}
