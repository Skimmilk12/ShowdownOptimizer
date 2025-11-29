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
    sheetConnected: false
};

// Track NEW records added this session (separate from pulled data)
const newRecordsThisSession = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DST: []
};

// Google Sheet IDs per position (user's sheets)
const POSITION_SHEET_IDS = {
    QB: '1nmPFQ1P1y8N0WPxHOq_FUEuBhSAW6ddLecsuRjyOqHo',
    RB: '1C8UDTi_jXMRE4MHy5Zt4nNkCxKR22QVoXGCWiTAAuaM',
    WR: '1MXTV7mLSLywoslITmHrbjcIKBK2c99RVdteDHxA9dv8',
    TE: '1hRlW5XhqKeSzWE1-E0RHKwUdt99fnUM2zzwk3QDborQ',
    DST: '1RNKJDGegnWt7G7Pmxo6kwHZGTIvvDIyOaTp9racjol8'
};

// Google Apps Script Web App URL - SET THIS AFTER DEPLOYING THE SCRIPT
// See google-apps-script.js for setup instructions
let GOOGLE_APPS_SCRIPT_URL = localStorage.getItem('googleAppsScriptUrl') || '';

// NFL Team abbreviations for detection
const NFL_TEAM_ABBRS = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];

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

    // Make position cards clickable to push data
    document.querySelectorAll('.cv-pos-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const pos = card.dataset.pos;
            if (pos) {
                pushToGoogleSheet(pos);
            }
        });
    });

    // Reset session button
    const resetBtn = document.getElementById('cvResetSessionBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetConverterSession);
    }

    // Setup Auto-Push button
    const setupAutoPushBtn = document.getElementById('cvSetupAutoPushBtn');
    if (setupAutoPushBtn) {
        setupAutoPushBtn.addEventListener('click', setAppsScriptUrl);
    }

    // Save Apps Script URL button
    const saveAppsScriptBtn = document.getElementById('cvSaveAppsScriptBtn');
    if (saveAppsScriptBtn) {
        saveAppsScriptBtn.addEventListener('click', saveAppsScriptUrl);
    }

    // Cancel Apps Script setup button
    const cancelAppsScriptBtn = document.getElementById('cvCancelAppsScriptBtn');
    if (cancelAppsScriptBtn) {
        cancelAppsScriptBtn.addEventListener('click', cancelAppsScriptSetup);
    }

    // Show API status
    updateApiStatus();
}

function updateApiStatus() {
    const statusEl = document.getElementById('cvApiStatus');
    if (statusEl) {
        if (GOOGLE_APPS_SCRIPT_URL) {
            statusEl.textContent = '(Auto-push enabled)';
            statusEl.style.color = 'var(--accent-primary)';
        } else {
            statusEl.textContent = '(Manual paste mode)';
            statusEl.style.color = 'var(--text-secondary)';
        }
    }
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
// PARSING LOGIC (DraftKings line-by-line format)
// ==========================================

// Team name to abbreviation mapping
const TEAM_NAME_MAP = {
    'Steelers': 'PIT', 'Cardinals': 'ARI', 'Bears': 'CHI', 'Bengals': 'CIN',
    'Browns': 'CLE', 'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET',
    'Packers': 'GB', 'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAX',
    'Chiefs': 'KC', 'Raiders': 'LV', 'Chargers': 'LAC', 'Rams': 'LAR',
    'Dolphins': 'MIA', 'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO',
    'Giants': 'NYG', 'Jets': 'NYJ', 'Eagles': 'PHI', 'Ravens': 'BAL',
    'Bills': 'BUF', 'Panthers': 'CAR', 'Falcons': 'ATL', 'Seahawks': 'SEA',
    '49ers': 'SF', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WAS'
};

// Number of stat columns per position (for parsing game log lines)
const POSITION_STAT_COUNT = {
    QB: 16,   // COMP,ATT,PCT,YDS,AVG,LNG,TD,INT,RATE,ATT,YDS,AVG,LNG,TD,FUM,LOST
    RB: 13,   // ATT,YDS,AVG,LNG,TD,REC,TAR,YDS,AVG,LNG,TD,FUM,LOST
    WR: 13,   // REC,TAR,YDS,AVG,LNG,TD,ATT,YDS,AVG,LNG,TD,FUM,LOST
    TE: 13,   // REC,TAR,YDS,AVG,LNG,TD,ATT,YDS,AVG,LNG,TD,FUM,LOST
    DST: 9    // INT,DFR,SACK,STY,DTD,PA,PaYDA,RuYDA,TYDA
};

function parseConverterData() {
    const textarea = document.getElementById('cvPasteArea');
    const rawData = textarea.value.trim();

    if (!rawData) {
        updateStatus('No data to parse', 'error');
        return;
    }

    // Split into lines and clean
    const lines = rawData.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 10) {
        updateStatus('Not enough data to parse', 'error');
        return;
    }

    // Get manual overrides if provided
    const manualName = document.getElementById('cvPlayerName').value.trim();
    const manualTeam = document.getElementById('cvPlayerTeam').value;
    const manualPosition = document.getElementById('cvPlayerPosition').value;

    // ========================================
    // Step 1: Extract player info from header
    // ========================================
    let playerName = manualName;
    let teamAbbr = manualTeam;
    let position = manualPosition;

    // Look for "Team" label, then player name, team name, position
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i];
        const lineUpper = line.toUpperCase();

        // "Team" label indicates player info section
        if (line === 'Team' && i + 3 < lines.length) {
            if (!playerName) playerName = lines[i + 1]; // Player name
            const teamName = lines[i + 2]; // Team name (e.g., "Bills")
            if (!teamAbbr && TEAM_NAME_MAP[teamName]) {
                teamAbbr = TEAM_NAME_MAP[teamName];
            }
            // Position follows team name
            if (!position && i + 3 < lines.length) {
                const possiblePos = lines[i + 3].toUpperCase();
                if (['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'].includes(possiblePos)) {
                    position = possiblePos === 'DEF' ? 'DST' : possiblePos;
                }
            }
            continue;
        }

        // Also check for standalone position markers
        if (!position && ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'].includes(lineUpper)) {
            position = lineUpper === 'DEF' ? 'DST' : lineUpper;
        }

        // Check for team abbreviation directly
        if (!teamAbbr && NFL_TEAM_ABBRS.includes(lineUpper)) {
            teamAbbr = lineUpper;
        }
    }

    if (!playerName) {
        updateStatus('Could not detect player name. Please enter manually.', 'error');
        document.getElementById('cvPlayerName').focus();
        return;
    }

    if (!position) {
        updateStatus('Could not detect position. Please select manually.', 'error');
        return;
    }

    // ========================================
    // Step 2: Find game log start (look for "Week" then a number)
    // ========================================
    let gameLogStart = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toUpperCase() === 'WEEK') {
            // Find first numeric week number after headers
            for (let j = i + 1; j < lines.length; j++) {
                const weekNum = parseInt(lines[j]);
                if (!isNaN(weekNum) && weekNum >= 1 && weekNum <= 25) {
                    // Validate: next line should be FPTS (decimal number)
                    if (j + 1 < lines.length) {
                        const fpts = parseFloat(lines[j + 1]);
                        if (!isNaN(fpts)) {
                            // And line after should be salary ($X,XXX)
                            if (j + 2 < lines.length && lines[j + 2].startsWith('$')) {
                                gameLogStart = j;
                                break;
                            }
                        }
                    }
                }
            }
            if (gameLogStart !== -1) break;
        }
    }

    if (gameLogStart === -1) {
        updateStatus('Could not find game log data', 'error');
        return;
    }

    // ========================================
    // Step 3: Parse game entries (line by line)
    // ========================================
    const statCount = POSITION_STAT_COUNT[position] || 13;
    // Each game entry consists of: Week, FPTS, Salary, Team1, @, Team2, Result, ...stats
    // Minimum lines per game: 7 (week, fpts, salary, team1, @, team2, result) + stats
    const minLinesPerGame = 7 + statCount;

    const records = [];
    let i = gameLogStart;

    while (i < lines.length) {
        // Try to parse a game entry
        const week = parseInt(lines[i]);
        if (isNaN(week) || week < 1 || week > 25) {
            i++;
            continue;
        }

        // Check if we have enough lines for a full game entry
        if (i + 6 >= lines.length) break;

        const fpts = parseFloat(lines[i + 1]);
        if (isNaN(fpts)) {
            i++;
            continue;
        }

        const salaryStr = lines[i + 2];
        if (!salaryStr.startsWith('$')) {
            i++;
            continue;
        }
        const salary = parseInt(salaryStr.replace(/[$,]/g, '')) || 0;

        // Parse matchup: team1, @, team2, result
        // Format varies: could be "BUF @ SEA" or separate lines
        let opponent = '';
        let result = '';
        let nextIndex = i + 3;

        // Read matchup components
        const team1 = lines[nextIndex] || '';
        nextIndex++;
        const atSymbol = lines[nextIndex] || '';
        nextIndex++;
        const team2 = lines[nextIndex] || '';
        nextIndex++;

        // Determine opponent (with @ prefix if away)
        if (atSymbol === '@') {
            // Away game: team1 is player's team, team2 is opponent
            opponent = '@' + team2;
        } else if (team1 === '@' || atSymbol.includes('@')) {
            // Different format
            opponent = '@' + team2;
        } else {
            // Home game: team2 is opponent
            opponent = team2;
        }

        // Result line (e.g., "W 31-28" or "L 24-28" or "0-0")
        if (nextIndex < lines.length) {
            result = lines[nextIndex];
            nextIndex++;
        }

        // Capture stat columns (don't skip them!)
        const stats = [];
        for (let s = 0; s < statCount && nextIndex < lines.length; s++) {
            stats.push(lines[nextIndex] || '0');
            nextIndex++;
        }

        records.push({
            player: playerName,
            position: position,
            team: teamAbbr || '',
            week: week,
            opponent: opponent,
            result: result,
            stats: stats,  // Array of stat values
            fpts: fpts,
            salary: salary,
            salaryFormatted: salaryStr  // Keep original format like "$6,700"
        });

        // Move to next game entry
        i = nextIndex;
    }

    if (records.length === 0) {
        updateStatus('No valid game records found', 'error');
        return;
    }

    // ========================================
    // Step 4: Add to player data and update UI
    // ========================================
    converterState.parsedRecords = records;
    converterState.currentPlayer = playerName;
    converterState.currentPosition = position;
    converterState.playersParsed++;

    // AUTO-ADD to player data immediately
    const existingKeys = new Set(
        playerGameData[position].map(r => `${r.name}|${r.week}`)
    );

    console.log(`[Converter] Parsing ${playerName} (${position})`);
    console.log(`[Converter] Found ${records.length} game records in pasted data`);
    console.log(`[Converter] Existing ${position} records in memory: ${playerGameData[position].length}`);

    let addedCount = 0;
    let duplicateCount = 0;
    records.forEach(record => {
        const key = `${record.player}|${record.week}`;
        if (!existingKeys.has(key)) {
            // Keep ALL data for the record
            const newRecord = {
                name: record.player,
                position: record.position,
                team: record.team,
                week: record.week,
                opponent: record.opponent,
                result: record.result,
                stats: record.stats,  // All stat columns
                fpts: record.fpts,
                salary: record.salary,
                salaryFormatted: record.salaryFormatted
            };
            playerGameData[position].push(newRecord);
            // Also track as NEW for this session (so we only push new ones)
            newRecordsThisSession[position].push(newRecord);
            existingKeys.add(key);
            addedCount++;
        } else {
            duplicateCount++;
            console.log(`[Converter] Skipped duplicate: ${record.player} Week ${record.week}`);
        }
    });

    console.log(`[Converter] Added ${addedCount} new, skipped ${duplicateCount} duplicates`);
    console.log(`[Converter] newRecordsThisSession[${position}] now has ${newRecordsThisSession[position].length} records`);

    converterState.recordsAdded += addedCount;

    // Update UI - show what's pending
    const pendingTotal = Object.values(newRecordsThisSession).reduce((sum, arr) => sum + arr.length, 0);
    if (addedCount > 0) {
        updateStatus(`✓ Added ${addedCount} games for ${playerName}. Total pending: ${pendingTotal}`, 'success');
    } else if (duplicateCount > 0) {
        updateStatus(`⚠ ${playerName} already parsed this session (${duplicateCount} duplicates skipped)`, 'error');
    } else {
        updateStatus(`No game records found for ${playerName}`, 'error');
    }
    updatePlayerInfo(playerName, teamAbbr, position, records);
    updatePositionSummary();

    // Update stats
    document.getElementById('cvPlayersParsed').textContent = converterState.playersParsed;
    document.getElementById('cvRecordsAdded').textContent = converterState.recordsAdded;
    document.getElementById('cvCurrentPosition').textContent = position;
    document.getElementById('cvCurrentPlayer').textContent = playerName.length > 12 ? playerName.substring(0, 12) + '...' : playerName;

    // Clear the paste area for next player
    document.getElementById('cvPasteArea').value = '';
    document.getElementById('cvPlayerName').value = '';

    // Focus back on paste area for quick next paste
    document.getElementById('cvPasteArea').focus();
}

// Extract player name, team, and position from pasted DraftKings data
function extractPlayerInfo(lines) {
    const result = { name: null, team: null, position: null };

    // Look at the first few lines before the game log header
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const line = lines[i].trim();
        const lineUpper = line.toUpperCase();

        // Skip if this looks like a header row
        if (lineUpper.includes('WEEK') && (lineUpper.includes('FPTS') || lineUpper.includes('SALARY'))) {
            break;
        }

        // Skip if this looks like a data row (starts with a number)
        if (/^\d+\s/.test(line)) {
            continue;
        }

        // Look for team abbreviation and position pattern: "BUF · QB" or "BUF - QB" or "BUF QB"
        const teamPosMatch = line.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAX|KC|LAC|LAR|LV|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SEA|SF|TB|TEN|WAS)\b\s*[·\-\s]\s*(QB|RB|WR|TE|K|DEF|DST)/i);
        if (teamPosMatch) {
            result.team = teamPosMatch[1].toUpperCase();
            let pos = teamPosMatch[2].toUpperCase();
            if (pos === 'DEF') pos = 'DST';
            result.position = pos;
            continue;
        }

        // Look for just team abbreviation
        const teamMatch = line.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAX|KC|LAC|LAR|LV|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SEA|SF|TB|TEN|WAS)\b/i);
        if (teamMatch && !result.team) {
            result.team = teamMatch[1].toUpperCase();
        }

        // Look for position abbreviation
        const posMatch = line.match(/\b(QB|RB|WR|TE|K|DEF|DST)\b/i);
        if (posMatch && !result.position) {
            let pos = posMatch[1].toUpperCase();
            if (pos === 'DEF') pos = 'DST';
            result.position = pos;
        }

        // If line looks like a player name (2-4 words, no numbers, not a header)
        // and doesn't contain position/team indicators we already found
        if (!result.name && line.length > 3 && line.length < 50) {
            const words = line.split(/\s+/);
            // Player name is typically 2-4 words
            if (words.length >= 2 && words.length <= 4) {
                // Check it's not a header or contains stats keywords
                const isNotHeader = !lineUpper.includes('WEEK') &&
                                   !lineUpper.includes('FPTS') &&
                                   !lineUpper.includes('SALARY') &&
                                   !lineUpper.includes('MATCHUP') &&
                                   !lineUpper.includes('PASS') &&
                                   !lineUpper.includes('RUSH') &&
                                   !lineUpper.includes('REC');
                // Check words look like names (start with capital, mostly letters)
                const looksLikeName = words.every(w => /^[A-Z][a-zA-Z'-]+$/.test(w) || /^[A-Z]+$/.test(w));

                if (isNotHeader && looksLikeName) {
                    // Remove team/position if they're part of this line
                    let namePart = line;
                    if (result.team) {
                        namePart = namePart.replace(new RegExp('\\b' + result.team + '\\b', 'gi'), '');
                    }
                    if (result.position) {
                        namePart = namePart.replace(new RegExp('\\b' + result.position + '\\b', 'gi'), '');
                    }
                    namePart = namePart.replace(/[·\-]/g, '').trim();

                    if (namePart.length > 3) {
                        result.name = namePart;
                    }
                }
            }
        }
    }

    return result;
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

    // Show player info card
    container.style.display = 'block';
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
        // Show NEW records count (what will be pushed), not total
        const newCount = newRecordsThisSession[pos]?.length || 0;
        const countEl = document.getElementById(`cv${pos}Count`);
        const cardEl = document.querySelector(`.cv-pos-card[data-pos="${pos}"]`);

        if (countEl) countEl.textContent = newCount;
        if (cardEl) {
            if (newCount > 0) {
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

    // Hide player info display
    document.getElementById('cvPlayerInfo').style.display = 'none';
    document.getElementById('cvPlayerInfo').innerHTML = '';

    // Clear input fields but keep them visible
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
    // Check if we have pre-configured sheets
    if (POSITION_SHEET_IDS.QB) {
        converterState.sheetConnected = true;
        showConnectedSheet();
    }
}

function connectGoogleSheet() {
    // Sheets are pre-configured, just show connected state
    converterState.sheetConnected = true;
    showConnectedSheet();
    updateStatus('Sheets connected!', 'success');
}

function disconnectGoogleSheet() {
    converterState.sheetConnected = false;

    // Show setup UI
    document.getElementById('cvSheetsSetup').style.display = 'block';
    document.getElementById('cvSheetsConnected').style.display = 'none';
    document.getElementById('cvSheetsStatus').textContent = 'Not Connected';
    document.getElementById('cvSheetsStatus').classList.remove('connected');

    updateStatus('Sheets disconnected', 'info');
}

function showConnectedSheet() {
    document.getElementById('cvSheetsSetup').style.display = 'none';
    document.getElementById('cvSheetsConnected').style.display = 'block';
    document.getElementById('cvSheetsStatus').textContent = 'Connected';
    document.getElementById('cvSheetsStatus').classList.add('connected');
    document.getElementById('cvSheetName').textContent = 'All position sheets configured';
}

async function pushToGoogleSheet(positionOverride = null) {
    // Allow specifying position, or use current position
    const position = positionOverride || converterState.currentPosition;
    console.log(`[Converter] Push requested for position: ${position}`);

    if (!position) {
        updateStatus('Select a position first', 'error');
        return;
    }

    const sheetId = POSITION_SHEET_IDS[position];
    if (!sheetId) {
        updateStatus(`No sheet configured for ${position}`, 'error');
        return;
    }

    // ONLY push NEW records added this session (not ones already in sheet)
    const records = newRecordsThisSession[position] || [];
    console.log(`[Converter] newRecordsThisSession[${position}] has ${records.length} records`);
    console.log(`[Converter] playerGameData[${position}] has ${playerGameData[position].length} records`);

    if (records.length === 0) {
        updateStatus(`No NEW ${position} records to push. Parse players first, then push.`, 'info');
        return;
    }

    // Check if Apps Script URL is configured
    if (!GOOGLE_APPS_SCRIPT_URL) {
        updateStatus('Apps Script URL not set. Click "Setup Auto-Push" first.', 'error');
        showAppsScriptSetup();
        return;
    }

    updateStatus(`Pushing ${records.length} ${position} records to Google Sheets...`, 'info');

    // Use iframe/form submission approach - most reliable for Apps Script
    try {
        const payload = {
            position: position,
            records: records
        };

        // Create a hidden form and submit it
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_APPS_SCRIPT_URL;
        form.target = 'hidden_iframe';
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(payload);
        form.appendChild(input);

        // Create hidden iframe to receive response
        let iframe = document.getElementById('hidden_iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'hidden_iframe';
            iframe.name = 'hidden_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        // Since we can't read the iframe response (CORS), assume success after a short delay
        setTimeout(() => {
            console.log(`[Converter] Push submitted for ${records.length} ${position} records`);
            newRecordsThisSession[position] = [];
            updatePositionSummary();
            updateStatus(`✓ ${records.length} ${position} records pushed to Google Sheets!`, 'success');
        }, 1000);

    } catch (error) {
        console.error('[Converter] Push failed:', error);
        updateStatus(`Push failed: ${error.message}. Using clipboard fallback.`, 'error');

        // Fallback to clipboard method
        fallbackToClipboard(position, records);
    }
}

// Fallback to clipboard if Apps Script fails
async function fallbackToClipboard(position, records) {
    const sheetId = POSITION_SHEET_IDS[position];
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    window.open(sheetUrl, '_blank');

    let csvData = '';
    records.forEach(record => {
        csvData += `${record.name}\t${record.position}\t${record.team || ''}\t${record.week}\t${record.opponent || ''}\t${record.fpts}\n`;
    });

    try {
        await navigator.clipboard.writeText(csvData);
        updateStatus(`${records.length} ${position} records copied to clipboard. Paste in sheet (Ctrl+V).`, 'info');
        showMarkPushedButton(position, records.length);
    } catch (e) {
        updateStatus('Sheet opened. Manually copy data.', 'info');
    }
}

// Toggle the Apps Script URL setup panel
function showAppsScriptSetup() {
    const setupPanel = document.getElementById('cvAppsScriptSetup');
    const urlInput = document.getElementById('cvAppsScriptUrlInput');

    if (setupPanel.style.display === 'none') {
        setupPanel.style.display = 'block';
        // Pre-fill with current URL if exists
        if (GOOGLE_APPS_SCRIPT_URL) {
            urlInput.value = GOOGLE_APPS_SCRIPT_URL;
        }
        urlInput.focus();
    } else {
        setupPanel.style.display = 'none';
    }
}

// Save the Apps Script URL
function saveAppsScriptUrl() {
    const urlInput = document.getElementById('cvAppsScriptUrlInput');
    const url = urlInput.value.trim();

    if (url && url.includes('script.google.com')) {
        GOOGLE_APPS_SCRIPT_URL = url;
        localStorage.setItem('googleAppsScriptUrl', url);
        updateApiStatus();
        updateStatus('Auto-push enabled! Click position cards to push directly to sheets.', 'success');
        document.getElementById('cvAppsScriptSetup').style.display = 'none';
    } else if (url === '') {
        // User cleared the URL - disable auto-push
        GOOGLE_APPS_SCRIPT_URL = '';
        localStorage.removeItem('googleAppsScriptUrl');
        updateApiStatus();
        updateStatus('Auto-push disabled. Will use clipboard mode.', 'info');
        document.getElementById('cvAppsScriptSetup').style.display = 'none';
    } else {
        updateStatus('Invalid URL. Must be a script.google.com URL.', 'error');
    }
}

// Cancel Apps Script setup
function cancelAppsScriptSetup() {
    document.getElementById('cvAppsScriptSetup').style.display = 'none';
}

// Function to manually set/update the Apps Script URL
function setAppsScriptUrl() {
    showAppsScriptSetup();
}

// Show a button to confirm the push was completed
function showMarkPushedButton(position, count) {
    // Create or update the mark pushed button
    let btn = document.getElementById('cvMarkPushedBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'cvMarkPushedBtn';
        btn.className = 'btn btn-primary';
        btn.style.marginTop = '10px';
        document.getElementById('cvStatus').parentElement.appendChild(btn);
    }
    btn.textContent = `✓ Mark ${count} ${position} records as pushed`;
    btn.style.display = 'inline-block';
    btn.onclick = () => markAsPushed(position);
}

// Confirm records were pasted and clear them
function markAsPushed(position) {
    const count = newRecordsThisSession[position]?.length || 0;
    newRecordsThisSession[position] = [];
    updatePositionSummary();
    updateStatus(`✓ ${count} ${position} records marked as pushed`, 'success');

    // Hide the button
    const btn = document.getElementById('cvMarkPushedBtn');
    if (btn) btn.style.display = 'none';

    console.log(`[Converter] Cleared newRecordsThisSession[${position}]`);
}

// Reset the entire session (clear all parsed data)
function resetConverterSession() {
    // Clear all new records
    Object.keys(newRecordsThisSession).forEach(pos => {
        newRecordsThisSession[pos] = [];
    });

    // Clear playerGameData too (so duplicates aren't blocked)
    Object.keys(playerGameData).forEach(pos => {
        playerGameData[pos] = [];
    });

    // Reset counters
    converterState.parsedRecords = [];
    converterState.currentPlayer = null;
    converterState.currentPosition = null;
    converterState.playersParsed = 0;
    converterState.recordsAdded = 0;

    // Update UI
    document.getElementById('cvPlayersParsed').textContent = '0';
    document.getElementById('cvRecordsAdded').textContent = '0';
    document.getElementById('cvCurrentPosition').textContent = '—';
    document.getElementById('cvCurrentPlayer').textContent = '—';
    document.getElementById('cvPasteArea').value = '';
    document.getElementById('cvPlayerInfo').style.display = 'none';

    // Hide mark pushed button
    const btn = document.getElementById('cvMarkPushedBtn');
    if (btn) btn.style.display = 'none';

    updatePositionSummary();
    updateStatus('Session reset. Ready for fresh data.', 'success');
    console.log('[Converter] Session reset - all data cleared');
}

async function pullFromGoogleSheet() {
    updateStatus('Pulling from all Google Sheets...', 'info');

    let totalPulled = 0;
    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];

    for (const pos of positions) {
        const sheetId = POSITION_SHEET_IDS[pos];
        if (!sheetId) continue;

        try {
            // Use public CSV export URL
            const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
            const response = await fetch(url);

            if (response.ok) {
                const csvText = await response.text();
                const records = parseGoogleSheetCSV(csvText, pos);

                if (records.length > 0) {
                    // Merge with existing data
                    const existingKeys = new Set(
                        playerGameData[pos].map(r => `${r.name}|${r.week}`)
                    );

                    let posAdded = 0;
                    records.forEach(record => {
                        const key = `${record.name}|${record.week}`;
                        if (!existingKeys.has(key)) {
                            playerGameData[pos].push(record);
                            existingKeys.add(key);
                            posAdded++;
                        }
                    });

                    if (posAdded > 0) {
                        console.log(`Pulled ${posAdded} new ${pos} records`);
                        totalPulled += posAdded;
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to pull ${pos}:`, e);
        }
    }

    if (totalPulled > 0) {
        updateStatus(`Pulled ${totalPulled} new records from sheets`, 'success');
        updatePositionSummary();

        // Update Player Data tab
        if (typeof updatePlayerDataStats === 'function') {
            updatePlayerDataStats();
        }
        if (typeof checkAllFilesLoaded === 'function') {
            checkAllFilesLoaded();
        }
    } else {
        updateStatus('No new records found in sheets', 'info');
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
