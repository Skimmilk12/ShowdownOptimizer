// ==========================================
// CONVERTER TAB - Parse DraftKings Player Data
// ==========================================

// Converter state
const converterState = {
    parsedRecords: [],
    currentPlayer: null,
    currentPosition: null,
    playersParsed: 0,
    recordsAdded: 0,
    sheetId: null,
    sheetConnected: false
};

// Position-specific stat columns (based on DFS God converter)
const POSITION_STATS = {
    QB: ['Pass Yds', 'Pass TD', 'INT', 'Rush Yds', 'Rush TD', 'Fum Lost', 'Pass Att', 'Pass Cmp', 'Pass Cmp %', 'Rush Att', '2-PT', 'Sacks', '300+ Yd Bonus', 'Plays', 'Own %'],
    RB: ['Rush Yds', 'Rush TD', 'Rec', 'Rec Yds', 'Rec TD', 'Fum Lost', 'Rush Att', 'Targets', '100+ Yd Rush Bonus', '100+ Yd Rec Bonus', 'Plays', 'Own %'],
    WR: ['Rec', 'Rec Yds', 'Rec TD', 'Rush Yds', 'Rush TD', 'Fum Lost', 'Targets', 'Rush Att', '100+ Yd Rec Bonus', '100+ Yd Rush Bonus', 'Plays', 'Own %'],
    TE: ['Rec', 'Rec Yds', 'Rec TD', 'Rush Yds', 'Rush TD', 'Fum Lost', 'Targets', 'Rush Att', '100+ Yd Rec Bonus', '100+ Yd Rush Bonus', 'Plays', 'Own %'],
    DST: ['Sacks', 'INT', 'Fum Rec', 'TD', 'Safety', 'Pts Allowed', 'Blocked Kick', '0 Pts Allowed', '1-6 Pts Allowed']
};

// Keywords to detect position from pasted data
const POSITION_KEYWORDS = {
    QB: ['Pass Yds', 'Pass TD', 'Pass Att', 'Pass Cmp', 'INT', 'Sacks'],
    RB: ['Rush Yds', 'Rush TD', 'Rush Att', 'Rec', 'Targets'],
    WR: ['Rec', 'Rec Yds', 'Rec TD', 'Targets'],
    TE: ['Rec', 'Rec Yds', 'Rec TD', 'Targets'],
    DST: ['Sacks', 'Fum Rec', 'Safety', 'Pts Allowed', 'Blocked Kick']
};

// ==========================================
// INITIALIZATION
// ==========================================

function initConverterTab() {
    // Populate team dropdown
    populateTeamDropdown();

    // Parse button
    const parseBtn = document.getElementById('cvParseBtn');
    if (parseBtn) {
        parseBtn.addEventListener('click', parseConverterData);
    }

    // Clear button
    const clearBtn = document.getElementById('cvClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearConverterData);
    }

    // Add to Player Data button
    const addBtn = document.getElementById('cvAddToDataBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addToPlayerData);
    }

    // Export preview button
    const exportPreviewBtn = document.getElementById('cvExportPreviewBtn');
    if (exportPreviewBtn) {
        exportPreviewBtn.addEventListener('click', exportPreviewCSV);
    }

    // Export all button
    const exportAllBtn = document.getElementById('cvExportAllBtn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllCSVs);
    }

    // Google Sheets connect button
    const connectBtn = document.getElementById('cvConnectSheetBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectGoogleSheet);
    }

    // Google Sheets disconnect button
    const disconnectBtn = document.getElementById('cvDisconnectSheetBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectGoogleSheet);
    }

    // Push to sheet button
    const pushBtn = document.getElementById('cvSyncToSheetBtn');
    if (pushBtn) {
        pushBtn.addEventListener('click', pushToGoogleSheet);
    }

    // Pull from sheet button
    const pullBtn = document.getElementById('cvPullFromSheetBtn');
    if (pullBtn) {
        pullBtn.addEventListener('click', pullFromGoogleSheet);
    }

    // Load saved sheet ID
    loadSheetConnection();

    // Update position summary counts
    updatePositionSummary();
}

function populateTeamDropdown() {
    const teamSelect = document.getElementById('cvPlayerTeam');
    if (!teamSelect || typeof NFL_TEAMS === 'undefined') return;

    // Keep the default option
    teamSelect.innerHTML = '<option value="">Select Team</option>';

    // Add all teams sorted alphabetically
    const teams = Object.keys(NFL_TEAMS).sort();
    teams.forEach(abbr => {
        const team = NFL_TEAMS[abbr];
        const option = document.createElement('option');
        option.value = abbr;
        option.textContent = `${abbr} - ${team.city || ''} ${team.name}`;
        teamSelect.appendChild(option);
    });
}

// ==========================================
// PARSING LOGIC
// ==========================================

function parseConverterData() {
    const textarea = document.getElementById('cvPasteArea');
    const rawData = textarea.value.trim();

    if (!rawData) {
        updateStatus('No data to parse', 'error');
        return;
    }

    // Split into lines and filter empty
    const lines = rawData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        updateStatus('Need at least 2 lines (header + data)', 'error');
        return;
    }

    // Parse header to detect position and column indices
    const headerLine = lines[0];
    const headers = parseTabOrSpaceLine(headerLine);

    // Detect position from headers
    const detectedPosition = detectPositionFromHeaders(headers);

    // Get player info from manual override or prompt
    const playerName = document.getElementById('cvPlayerName').value.trim();
    const playerTeam = document.getElementById('cvPlayerTeam').value;
    const manualPosition = document.getElementById('cvPlayerPosition').value;

    const position = manualPosition || detectedPosition;

    if (!position) {
        updateStatus('Could not detect position. Please select manually.', 'error');
        document.getElementById('cvManualOverride').style.display = 'block';
        return;
    }

    if (!playerName) {
        updateStatus('Please enter the player name', 'error');
        document.getElementById('cvManualOverride').style.display = 'block';
        document.getElementById('cvPlayerName').focus();
        return;
    }

    // Find column indices
    const columnIndices = findColumnIndices(headers);

    // Parse data rows
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseTabOrSpaceLine(lines[i]);
        if (row.length < 3) continue;

        const record = parseGameRow(row, columnIndices, playerName, playerTeam, position);
        if (record) {
            records.push(record);
        }
    }

    if (records.length === 0) {
        updateStatus('No valid game records found', 'error');
        return;
    }

    // Update state
    converterState.parsedRecords = records;
    converterState.currentPlayer = playerName;
    converterState.currentPosition = position;
    converterState.playersParsed++;

    // Update UI
    updateStatus(`Parsed ${records.length} games`, 'success');
    updatePlayerInfo(playerName, playerTeam, position, records);
    renderPreviewTable(records);

    // Enable add button
    document.getElementById('cvAddToDataBtn').disabled = false;

    // Update stats
    document.getElementById('cvPlayersParsed').textContent = converterState.playersParsed;
    document.getElementById('cvCurrentPosition').textContent = position;
    document.getElementById('cvCurrentPlayer').textContent = playerName.length > 12 ? playerName.substring(0, 12) + '...' : playerName;
}

function parseTabOrSpaceLine(line) {
    // Try tab-separated first
    if (line.includes('\t')) {
        return line.split('\t').map(s => s.trim());
    }

    // Otherwise split by multiple spaces (preserving single-space text)
    return line.split(/\s{2,}/).map(s => s.trim()).filter(s => s);
}

function detectPositionFromHeaders(headers) {
    const headerStr = headers.join(' ').toUpperCase();

    // Check for position-specific keywords
    // QB has unique columns
    if (headerStr.includes('PASS YDS') && headerStr.includes('PASS TD')) {
        return 'QB';
    }

    // DST has unique columns
    if (headerStr.includes('PTS ALLOWED') || headerStr.includes('BLOCKED KICK') || headerStr.includes('SAFETY')) {
        return 'DST';
    }

    // RB focuses on rushing
    if (headerStr.includes('RUSH YDS') && headerStr.includes('RUSH TD') && !headerStr.includes('PASS YDS')) {
        // Check if RB or skill position
        if (headerStr.includes('RUSH ATT') && headers.indexOf('Rush Att') < headers.indexOf('Rec')) {
            return 'RB';
        }
    }

    // WR/TE - check for receiving focus
    if (headerStr.includes('REC') && headerStr.includes('REC YDS')) {
        // TE usually has fewer targets/receptions on average
        return 'WR'; // Default to WR, user can override for TE
    }

    return null;
}

function findColumnIndices(headers) {
    const indices = {};
    const headerUpper = headers.map(h => h.toUpperCase().trim());

    // Find common columns
    indices.week = headerUpper.findIndex(h => h === 'WEEK' || h === 'WK');
    indices.fpts = headerUpper.findIndex(h => h === 'FPTS' || h === 'FANTASY POINTS' || h === 'PTS');
    indices.salary = headerUpper.findIndex(h => h === 'SALARY' || h === 'SAL' || h.includes('$'));
    indices.matchup = headerUpper.findIndex(h => h === 'MATCHUP' || h === 'OPP' || h === 'OPPONENT');

    // Stats columns (everything after the core columns)
    indices.statsStart = Math.max(indices.fpts, indices.salary, indices.matchup) + 1;

    return indices;
}

function parseGameRow(row, indices, playerName, team, position) {
    // Get week number
    let week = parseInt(row[indices.week]);
    if (isNaN(week) || week < 1 || week > 22) {
        // Try first column
        week = parseInt(row[0]);
        if (isNaN(week) || week < 1 || week > 22) return null;
    }

    // Get FPTS
    let fpts = parseFloat(row[indices.fpts]);
    if (isNaN(fpts)) {
        // Try second column
        fpts = parseFloat(row[1]);
        if (isNaN(fpts)) return null;
    }

    // Get salary
    let salary = row[indices.salary] || '';
    salary = salary.replace(/[$,]/g, '');
    const salaryNum = parseFloat(salary) || 0;

    // Get opponent/matchup
    let opponent = row[indices.matchup] || '';
    opponent = opponent.replace(/^(vs\.?|@)\s*/i, '').trim();

    // Determine result (W/L) from matchup string
    let result = '';
    if (opponent.includes('W') || opponent.includes('L')) {
        const resultMatch = opponent.match(/([WL])\s*[\d-]+/);
        if (resultMatch) {
            result = resultMatch[0];
            opponent = opponent.replace(result, '').trim();
        }
    }

    // Build record
    const record = {
        player: playerName,
        position: position,
        team: team,
        week: week,
        opponent: opponent,
        result: result,
        fpts: fpts,
        salary: salaryNum,
        stats: {}
    };

    // Parse remaining stats based on position
    const positionCols = POSITION_STATS[position] || [];
    for (let i = indices.statsStart; i < row.length && i - indices.statsStart < positionCols.length; i++) {
        const statName = positionCols[i - indices.statsStart];
        if (statName) {
            let value = row[i] || '';
            // Clean percentage values
            value = value.replace('%', '');
            record.stats[statName] = parseFloat(value) || 0;
        }
    }

    return record;
}

// ==========================================
// UI UPDATES
// ==========================================

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('cvStatus');
    if (!statusEl) return;

    statusEl.textContent = message;

    if (type === 'success') {
        statusEl.style.color = 'var(--accent-primary)';
    } else if (type === 'error') {
        statusEl.style.color = 'var(--accent-danger)';
    } else {
        statusEl.style.color = '';
    }
}

function updatePlayerInfo(name, team, position, records) {
    const container = document.getElementById('cvPlayerInfo');
    if (!container) return;

    // Calculate stats
    const totalGames = records.length;
    const avgFpts = (records.reduce((sum, r) => sum + r.fpts, 0) / totalGames).toFixed(1);
    const avgSalary = Math.round(records.reduce((sum, r) => sum + r.salary, 0) / totalGames);
    const maxFpts = Math.max(...records.map(r => r.fpts)).toFixed(1);

    const teamInfo = (typeof NFL_TEAMS !== 'undefined' && team) ? NFL_TEAMS[team] : null;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    container.innerHTML = `
        <div class="cv-player-card">
            <div class="cv-player-avatar" style="background: ${teamInfo ? teamInfo.primary : 'var(--bg-secondary)'}; color: white;">
                ${initials}
            </div>
            <div class="cv-player-details">
                <div class="cv-player-name">${name}</div>
                <div class="cv-player-meta">
                    <span class="pd-position-badge ${position.toLowerCase()}" style="padding: 2px 8px; font-size: 0.7rem;">${position}</span>
                    <span>${team || 'Unknown Team'}</span>
                    <span>${totalGames} games</span>
                </div>
                <div class="cv-player-stats">
                    <div class="cv-stat">
                        <div class="cv-stat-value">${avgFpts}</div>
                        <div class="cv-stat-label">Avg FPTS</div>
                    </div>
                    <div class="cv-stat">
                        <div class="cv-stat-value">${maxFpts}</div>
                        <div class="cv-stat-label">Max FPTS</div>
                    </div>
                    <div class="cv-stat">
                        <div class="cv-stat-value">$${avgSalary.toLocaleString()}</div>
                        <div class="cv-stat-label">Avg Salary</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Show manual override for adjustments
    document.getElementById('cvManualOverride').style.display = 'block';
    document.getElementById('cvPlayerName').value = name;
    if (team) document.getElementById('cvPlayerTeam').value = team;
    document.getElementById('cvPlayerPosition').value = position;
}

function renderPreviewTable(records) {
    const container = document.getElementById('cvPreviewTable');
    const card = document.getElementById('cvPreviewCard');
    if (!container || !card) return;

    card.style.display = 'block';
    document.getElementById('cvPreviewCount').textContent = `${records.length} records`;

    // Build header based on first record
    const position = records[0]?.position || 'QB';
    const statCols = Object.keys(records[0]?.stats || {}).slice(0, 4); // Show first 4 stats

    let html = `
        <div class="cv-preview-row header">
            <div>Week</div>
            <div>FPTS</div>
            <div>Salary</div>
            <div>Opponent</div>
            <div>Result</div>
            ${statCols.map(col => `<div>${col}</div>`).join('')}
        </div>
    `;

    records.forEach(record => {
        html += `
            <div class="cv-preview-row">
                <div>${record.week}</div>
                <div style="color: var(--accent-primary); font-weight: 600;">${record.fpts.toFixed(1)}</div>
                <div>$${record.salary.toLocaleString()}</div>
                <div>${record.opponent}</div>
                <div>${record.result}</div>
                ${statCols.map(col => `<div>${record.stats[col] || 0}</div>`).join('')}
            </div>
        `;
    });

    container.innerHTML = html;
}

function updatePositionSummary() {
    // Use the playerGameData from app.js
    if (typeof playerGameData === 'undefined') return;

    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    positions.forEach(pos => {
        const count = playerGameData[pos]?.length || 0;
        const countEl = document.getElementById(`cv${pos}Count`);
        const cardEl = document.querySelector(`.cv-pos-card[data-pos="${pos}"]`);

        if (countEl) countEl.textContent = count;
        if (cardEl) {
            if (count > 0) {
                cardEl.classList.add('has-data');
            } else {
                cardEl.classList.remove('has-data');
            }
        }
    });
}

// ==========================================
// DATA MANAGEMENT
// ==========================================

function clearConverterData() {
    document.getElementById('cvPasteArea').value = '';
    document.getElementById('cvPreviewCard').style.display = 'none';
    document.getElementById('cvAddToDataBtn').disabled = true;

    // Reset player info
    document.getElementById('cvPlayerInfo').innerHTML = `
        <div class="cv-info-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <p>Paste and parse player data to see info</p>
        </div>
    `;

    // Hide manual override
    document.getElementById('cvManualOverride').style.display = 'none';
    document.getElementById('cvPlayerName').value = '';
    document.getElementById('cvPlayerTeam').value = '';
    document.getElementById('cvPlayerPosition').value = '';

    // Reset state
    converterState.parsedRecords = [];
    converterState.currentPlayer = null;
    converterState.currentPosition = null;

    updateStatus('Ready', 'info');
    document.getElementById('cvCurrentPosition').textContent = '—';
    document.getElementById('cvCurrentPlayer').textContent = '—';
}

function addToPlayerData() {
    if (converterState.parsedRecords.length === 0) {
        updateStatus('No data to add', 'error');
        return;
    }

    const position = converterState.currentPosition;
    if (!position || typeof playerGameData === 'undefined') {
        updateStatus('Error: Invalid position or data store', 'error');
        return;
    }

    // Convert to the format used by playerGameData
    const newRecords = converterState.parsedRecords.map(r => ({
        name: r.player,
        position: r.position,
        team: r.team,
        week: r.week,
        opponent: r.opponent,
        fpts: r.fpts
    }));

    // Add to playerGameData (avoiding duplicates)
    const existingKeys = new Set(
        playerGameData[position].map(r => `${r.name}|${r.week}`)
    );

    let addedCount = 0;
    newRecords.forEach(record => {
        const key = `${record.name}|${record.week}`;
        if (!existingKeys.has(key)) {
            playerGameData[position].push(record);
            existingKeys.add(key);
            addedCount++;
        }
    });

    converterState.recordsAdded += addedCount;

    // Update UI
    document.getElementById('cvRecordsAdded').textContent = converterState.recordsAdded;
    updatePositionSummary();

    if (addedCount > 0) {
        updateStatus(`Added ${addedCount} new records to ${position}`, 'success');

        // Enable Google Sheets sync if connected
        if (converterState.sheetConnected) {
            document.getElementById('cvSyncToSheetBtn').disabled = false;
        }
    } else {
        updateStatus('All records already exist', 'info');
    }

    // Update Player Data tab stats
    if (typeof updatePlayerDataStats === 'function') {
        updatePlayerDataStats();
    }
    if (typeof checkAllFilesLoaded === 'function') {
        checkAllFilesLoaded();
    }
    if (typeof updateAllCardStatus === 'function') {
        updateAllCardStatus();
    }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

function exportPreviewCSV() {
    if (converterState.parsedRecords.length === 0) {
        updateStatus('No data to export', 'error');
        return;
    }

    const records = converterState.parsedRecords;
    const position = converterState.currentPosition;
    const playerName = converterState.currentPlayer;

    // Build CSV content
    const headers = ['Player', 'Position', 'Team', 'Week', 'Opponent', 'Result', 'FPTS', 'Salary'];
    const statCols = POSITION_STATS[position] || [];
    headers.push(...statCols);

    let csv = headers.join(',') + '\n';

    records.forEach(record => {
        const row = [
            `"${record.player}"`,
            record.position,
            record.team || '',
            record.week,
            record.opponent,
            record.result,
            record.fpts,
            record.salary
        ];

        statCols.forEach(col => {
            row.push(record.stats[col] || 0);
        });

        csv += row.join(',') + '\n';
    });

    // Download
    downloadCSV(csv, `${playerName.replace(/\s+/g, '_')}_gamelog.csv`);
    updateStatus('CSV exported', 'success');
}

function exportAllCSVs() {
    if (typeof playerGameData === 'undefined') {
        updateStatus('No player data available', 'error');
        return;
    }

    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    let exportedCount = 0;

    positions.forEach(pos => {
        const records = playerGameData[pos];
        if (!records || records.length === 0) return;

        // Build CSV
        const headers = ['Player', 'Position', 'Team', 'Week', 'Opponent', 'FPTS'];
        let csv = headers.join(',') + '\n';

        records.forEach(record => {
            const row = [
                `"${record.name}"`,
                record.position,
                record.team || '',
                record.week,
                record.opponent || '',
                record.fpts
            ];
            csv += row.join(',') + '\n';
        });

        downloadCSV(csv, `${pos}_gamelog.csv`);
        exportedCount++;
    });

    if (exportedCount > 0) {
        updateStatus(`Exported ${exportedCount} CSV files`, 'success');
    } else {
        updateStatus('No data to export', 'error');
    }
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ==========================================
// GOOGLE SHEETS INTEGRATION
// ==========================================

function loadSheetConnection() {
    try {
        const savedSheetId = localStorage.getItem('converterSheetId');
        if (savedSheetId) {
            converterState.sheetId = savedSheetId;
            converterState.sheetConnected = true;
            showConnectedSheet();
        }
    } catch (e) {
        console.error('Failed to load sheet connection:', e);
    }
}

function connectGoogleSheet() {
    const sheetIdInput = document.getElementById('cvSheetId');
    const sheetId = sheetIdInput.value.trim();

    if (!sheetId) {
        updateStatus('Please enter a Sheet ID', 'error');
        return;
    }

    // Validate sheet ID format (44 characters, alphanumeric + dashes/underscores)
    if (!/^[a-zA-Z0-9_-]{30,50}$/.test(sheetId)) {
        updateStatus('Invalid Sheet ID format', 'error');
        return;
    }

    // Save to localStorage
    try {
        localStorage.setItem('converterSheetId', sheetId);
        converterState.sheetId = sheetId;
        converterState.sheetConnected = true;
        showConnectedSheet();
        updateStatus('Sheet connected!', 'success');
    } catch (e) {
        updateStatus('Failed to save connection', 'error');
    }
}

function disconnectGoogleSheet() {
    try {
        localStorage.removeItem('converterSheetId');
    } catch (e) {}

    converterState.sheetId = null;
    converterState.sheetConnected = false;

    // Show setup UI
    document.getElementById('cvSheetsSetup').style.display = 'block';
    document.getElementById('cvSheetsConnected').style.display = 'none';
    document.getElementById('cvSheetsStatus').textContent = 'Not Connected';
    document.getElementById('cvSheetsStatus').classList.remove('connected');
    document.getElementById('cvSheetId').value = '';

    updateStatus('Sheet disconnected', 'info');
}

function showConnectedSheet() {
    document.getElementById('cvSheetsSetup').style.display = 'none';
    document.getElementById('cvSheetsConnected').style.display = 'block';
    document.getElementById('cvSheetsStatus').textContent = 'Connected';
    document.getElementById('cvSheetsStatus').classList.add('connected');
    document.getElementById('cvSheetName').textContent = `Sheet ID: ${converterState.sheetId.substring(0, 12)}...`;
}

async function pushToGoogleSheet() {
    if (!converterState.sheetConnected || !converterState.sheetId) {
        updateStatus('No sheet connected', 'error');
        return;
    }

    const position = converterState.currentPosition;
    if (!position || typeof playerGameData === 'undefined') {
        updateStatus('No data to push', 'error');
        return;
    }

    const records = playerGameData[position];
    if (!records || records.length === 0) {
        updateStatus(`No ${position} data to push`, 'error');
        return;
    }

    updateStatus('Pushing to Google Sheets...', 'info');

    try {
        // Build data for Google Sheets API
        const values = [
            ['Player', 'Position', 'Team', 'Week', 'Opponent', 'FPTS']
        ];

        records.forEach(record => {
            values.push([
                record.name,
                record.position,
                record.team || '',
                record.week,
                record.opponent || '',
                record.fpts
            ]);
        });

        // Use Google Sheets API (public edit)
        // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
        // For writing, we use a different approach - append via form

        // Note: Direct writing to Google Sheets requires OAuth or using Google Apps Script
        // For a public sheet with "Anyone can edit", we can use the Sheets API v4
        const sheetName = position;
        const range = `${sheetName}!A1`;

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${converterState.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=YOUR_API_KEY`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: values.slice(1) }) // Skip header for append
            }
        );

        if (response.ok) {
            updateStatus(`Pushed ${records.length} records to ${position} sheet`, 'success');
        } else {
            // Fallback: offer CSV download
            updateStatus('API unavailable. Use Export instead.', 'error');
        }
    } catch (error) {
        console.error('Push to sheet failed:', error);
        updateStatus('Push failed. Try exporting CSV instead.', 'error');
    }
}

async function pullFromGoogleSheet() {
    if (!converterState.sheetConnected || !converterState.sheetId) {
        updateStatus('No sheet connected', 'error');
        return;
    }

    updateStatus('Pulling from Google Sheets...', 'info');

    try {
        // Try to fetch each position tab
        const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
        let totalPulled = 0;

        for (const pos of positions) {
            try {
                // Use public CSV export URL
                const url = `https://docs.google.com/spreadsheets/d/${converterState.sheetId}/gviz/tq?tqx=out:csv&sheet=${pos}`;
                const response = await fetch(url);

                if (response.ok) {
                    const csvText = await response.text();
                    const records = parseGoogleSheetCSV(csvText, pos);

                    if (records.length > 0) {
                        // Merge with existing data
                        const existingKeys = new Set(
                            playerGameData[pos].map(r => `${r.name}|${r.week}`)
                        );

                        records.forEach(record => {
                            const key = `${record.name}|${record.week}`;
                            if (!existingKeys.has(key)) {
                                playerGameData[pos].push(record);
                                existingKeys.add(key);
                                totalPulled++;
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn(`Failed to pull ${pos}:`, e);
            }
        }

        if (totalPulled > 0) {
            updateStatus(`Pulled ${totalPulled} new records`, 'success');
            updatePositionSummary();

            // Update Player Data tab
            if (typeof updatePlayerDataStats === 'function') {
                updatePlayerDataStats();
            }
        } else {
            updateStatus('No new records found', 'info');
        }
    } catch (error) {
        console.error('Pull from sheet failed:', error);
        updateStatus('Pull failed. Check sheet permissions.', 'error');
    }
}

function parseGoogleSheetCSV(csvText, position) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toUpperCase().trim());

    // Find column indices
    const playerIdx = headers.findIndex(h => h === 'PLAYER' || h === 'NAME');
    const teamIdx = headers.findIndex(h => h === 'TEAM');
    const weekIdx = headers.findIndex(h => h === 'WEEK');
    const oppIdx = headers.findIndex(h => h === 'OPPONENT' || h === 'OPP');
    const fptsIdx = headers.findIndex(h => h === 'FPTS' || h === 'POINTS');

    if (playerIdx === -1 || fptsIdx === -1) return [];

    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length <= fptsIdx) continue;

        const name = row[playerIdx]?.trim();
        const week = parseInt(row[weekIdx]?.trim()) || 0;
        const fpts = parseFloat(row[fptsIdx]?.trim()) || 0;

        if (name && week > 0) {
            records.push({
                name: name,
                position: position,
                team: row[teamIdx]?.trim() || '',
                week: week,
                opponent: row[oppIdx]?.trim() || '',
                fpts: fpts
            });
        }
    }

    return records;
}
