// Global state
let players = [];
let lineups = [];
let selectedLineupCount = 100;
let selectedTimeSeconds = null; // null means use count mode
let generationMode = 'count'; // 'count' or 'time'
let currentSort = { column: 'points', direction: 'desc' };
let playerPoolSort = { column: 'flexProjection', direction: 'desc' };
let currentPage = 1;
const lineupsPerPage = 100;
let minSalary = 49000;
let maxSalary = 50000;
let projectionFloor = 90; // percentage
let entries = []; // DraftKings contest entries
const SALARY_CAP = 50000;

// Multi-slate support
let slates = {};
let currentSlate = null;
const slateTimeMap = {
    '12:00': 1, '12:30': 1,
    '1:00': 1, '1:30': 1,
    '2:00': 2, '2:30': 2,
    '3:00': 2, '3:30': 2,
    '4:00': 3, '4:30': 3,
    '5:00': 3, '5:30': 3,
    '6:00': 4, '6:30': 4,
    '7:00': 4, '7:30': 4,
    '8:00': 5, '8:30': 5,
    '9:00': 5, '9:30': 5,
    '10:00': 6, '10:30': 6,
    '11:00': 6, '11:30': 6
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const csvInput = document.getElementById('csvInput');
const generateBtn = document.getElementById('generateBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const playerPoolContainer = document.getElementById('playerPoolContainer');
const lineupsCard = document.getElementById('lineupsCard');
const lineupOutput = document.getElementById('lineupOutput');
const lineupRows = document.getElementById('lineupRows');

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
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        handleFile(file);
    }
});

csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
    // Reset input so same file can be selected again
    csvInput.value = '';
});

// Slate button click handlers
document.querySelectorAll('.slate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const slateNum = parseInt(btn.dataset.slate);
        selectSlate(slateNum);
    });
});

function selectSlate(slateNum) {
    if (!slates[slateNum]) {
        // No data for this slate
        return;
    }
    
    // Update current slate
    currentSlate = slateNum;
    
    // Load data from slate
    const slate = slates[slateNum];
    players = slate.players;
    entries = slate.entries;
    lineups = slate.lineups || [];
    
    // Update UI
    updateSlateButtons();
    updateSlateInfo();
    updateSectionBadges();
    
    // Update stats
    document.getElementById('playersLoaded').textContent = players.length;
    document.getElementById('playerCount').textContent = players.length;
    document.getElementById('entriesLoaded').textContent = entries.length;
    generateBtn.disabled = players.length === 0;
    
    // Render
    renderPlayerPool();
    if (entries.length > 0) {
        renderEntries(new Map());
    } else {
        document.getElementById('entriesCard').style.display = 'none';
    }
    
    // Update optimize button
    document.getElementById('optimizeBtn').disabled = lineups.length === 0;
    document.getElementById('exportEntriesBtn').disabled = true;
    document.getElementById('optimizeStatus').textContent = lineups.length > 0 ? `${lineups.length} lineups ready` : '';
    
    // Show lineups if we have them
    if (lineups.length > 0) {
        document.getElementById('lineupsCard').style.display = 'block';
        document.getElementById('lineupCountDisplay').textContent = `${lineups.length} lineups`;
        currentPage = 1;
        renderLineups();
    } else {
        document.getElementById('lineupsCard').style.display = 'none';
    }
}

function updateSectionBadges() {
    const slate = currentSlate ? slates[currentSlate] : null;
    const badgeText = slate ? `${currentSlate} - ${slate.teams || 'Slate ' + currentSlate}` : '';
    
    // Update player pool and entries badges
    ['playerPoolSlateBadge', 'entriesSlateBadge'].forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.textContent = badgeText;
            badge.classList.toggle('visible', currentSlate !== null);
        }
    });
    
    // Update lineups badge with count
    const lineupsBadge = document.getElementById('lineupsSlateBadge');
    if (lineupsBadge) {
        const lineupCount = slate ? (slate.lineups || []).length : 0;
        const lineupsText = lineupCount > 0 
            ? `${currentSlate} - ${slate.teams || 'Slate ' + currentSlate} • ${lineupCount} lineups`
            : badgeText;
        lineupsBadge.textContent = lineupsText;
        lineupsBadge.classList.toggle('visible', currentSlate !== null);
    }
}

function updateSlateButtons() {
    document.querySelectorAll('.slate-btn').forEach(btn => {
        const slateNum = parseInt(btn.dataset.slate);
        btn.classList.remove('active', 'loaded');
        
        if (slates[slateNum]) {
            btn.classList.add('loaded');
        }
        if (slateNum === currentSlate) {
            btn.classList.add('active');
        }
    });
}

function updateSlateInfo() {
    const infoEl = document.getElementById('currentSlateInfo');
    if (!currentSlate || !slates[currentSlate]) {
        infoEl.classList.remove('visible');
        return;
    }
    
    const slate = slates[currentSlate];
    infoEl.classList.add('visible');
    document.getElementById('slateBadge').textContent = currentSlate;
    document.getElementById('slateTeams').textContent = slate.teams || 'Unknown';
    document.getElementById('slateDateTime').textContent = slate.dateTime || '';
    document.getElementById('slatePlayerCount').textContent = slate.players.length;
    document.getElementById('slateEntryCount').textContent = slate.entries.length;
}

function detectSlateNumber(gameInfo) {
    if (!gameInfo) return 1;
    
    // Extract time from game info (e.g., "ATL@TB 11/25/2025 12:00PM ET")
    const timeMatch = gameInfo.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return 1;
    
    let hour = parseInt(timeMatch[1]);
    const isPM = timeMatch[3].toUpperCase() === 'PM';
    
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    // Map to slate number based on hour
    if (hour >= 11 && hour < 14) return 1;  // 11 AM - 2 PM -> Slate 1 (12:00)
    if (hour >= 14 && hour < 16) return 2;  // 2 PM - 4 PM -> Slate 2 (2:00)
    if (hour >= 16 && hour < 18) return 3;  // 4 PM - 6 PM -> Slate 3 (4:00)
    if (hour >= 18 && hour < 20) return 4;  // 6 PM - 8 PM -> Slate 4 (6:00)
    if (hour >= 20 && hour < 22) return 5;  // 8 PM - 10 PM -> Slate 5 (8:00)
    if (hour >= 22 || hour < 11) return 6;  // 10 PM+ -> Slate 6 (10:00)
    
    return 1;
}

function parseGameInfo(gameInfo) {
    if (!gameInfo) return { teams: '', date: '', time: '' };
    
    // Parse "ATL@TB 11/25/2025 12:00PM ET"
    const parts = gameInfo.match(/([A-Z]{2,3})@([A-Z]{2,3})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*(AM|PM))/i);
    if (parts) {
        return {
            teams: `${parts[1]} @ ${parts[2]}`,
            date: parts[3],
            time: parts[4],
            dateTime: `${parts[3]} ${parts[4]} ET`
        };
    }
    return { teams: gameInfo, date: '', time: '', dateTime: '' };
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        parseCSV(e.target.result, file.name);
    };
    reader.readAsText(file);
}

function parseCSV(csvText, fileName = '') {
    const lines = csvText.trim().split('\n');
    
    // Parse all rows
    const allRows = lines.map(line => parseCSVLine(line));
    
    // Row 1 has entry headers
    const entryHeaders = allRows[0].map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    console.log('Entry Headers (row 1):', entryHeaders);
    
    players = [];
    entries = [];
    
    // Find entry columns in row 1
    const findEntryCol = (name) => entryHeaders.findIndex(h => h.includes(name));
    
    let entryIdColIndex = findEntryCol('entry id');
    let contestNameColIndex = findEntryCol('contest name');
    let contestIdColIndex = findEntryCol('contest id');
    let entryFeeColIndex = findEntryCol('entry fee');
    let cptColIndex = entryHeaders.indexOf('cpt');
    
    // Find all FLEX columns
    let flexColIndices = [];
    entryHeaders.forEach((h, i) => {
        if (h === 'flex') flexColIndices.push(i);
    });
    
    console.log('Entry columns:', { entryIdColIndex, contestNameColIndex, cptColIndex, flexCount: flexColIndices.length });
    
    // Track contests for summary
    const contestsMap = new Map();
    
    // Parse entries from rows 2+ (left side)
    for (let i = 1; i < allRows.length; i++) {
        const values = allRows[i];
        if (!values || values.length < 2) continue;
        
        const entryId = values[entryIdColIndex]?.trim();
        const contestName = values[contestNameColIndex]?.trim() || '';
        const contestId = values[contestIdColIndex]?.trim() || '';
        const entryFee = values[entryFeeColIndex]?.trim() || '';
        
        if (entryId && contestName && entryId.match(/^\d/)) {
            const cptPlayer = values[cptColIndex]?.trim() || '';
            const flexPlayers = flexColIndices.map(idx => values[idx]?.trim() || '');
            
            entries.push({
                entryId,
                contestName,
                contestId,
                entryFee,
                cpt: cptPlayer,
                flex: flexPlayers,
                salary: 0,
                projection: 0
            });
            
            if (!contestsMap.has(contestId)) {
                contestsMap.set(contestId, { name: contestName, fee: entryFee, count: 0 });
            }
            contestsMap.get(contestId).count++;
        }
    }
    
    console.log('Entries parsed:', entries.length);
    
    // Now find the player pool - it starts at row 8 (index 7) in columns L+
    // Look for "Position" header to find the player pool section
    let playerPoolHeaderRow = -1;
    let playerPoolStartCol = -1;
    
    for (let rowIdx = 0; rowIdx < Math.min(15, allRows.length); rowIdx++) {
        const row = allRows[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = (row[colIdx] || '').trim().toLowerCase();
            if (cell === 'position') {
                playerPoolHeaderRow = rowIdx;
                playerPoolStartCol = colIdx;
                console.log(`Found player pool at row ${rowIdx + 1}, column ${colIdx + 1}`);
                break;
            }
        }
        if (playerPoolHeaderRow !== -1) break;
    }
    
    if (playerPoolHeaderRow === -1) {
        console.log('No player pool found, trying old format...');
        parseCSVOldFormat(lines, entryHeaders);
        return;
    }
    
    // Get player pool headers
    const poolHeaders = allRows[playerPoolHeaderRow].slice(playerPoolStartCol).map(h => 
        (h || '').trim().toLowerCase().replace(/['"]/g, '')
    );
    console.log('Player pool headers:', poolHeaders);
    
    // Find column indices within player pool
    const findPoolCol = (...names) => {
        for (const name of names) {
            const idx = poolHeaders.findIndex(h => h.includes(name));
            if (idx !== -1) return idx;
        }
        return -1;
    };
    
    const posCol = findPoolCol('position');
    const nameIdCol = findPoolCol('name + id', 'name+id');
    const nameCol = poolHeaders.findIndex((h, i) => h === 'name' && i !== nameIdCol);
    const idCol = poolHeaders.findIndex(h => h === 'id');
    const rosterPosCol = findPoolCol('roster pos', 'roster position');
    const salaryCol = findPoolCol('salary');
    const gameInfoCol = findPoolCol('game info', 'gameinfo');
    const teamCol = findPoolCol('teamabbrev', 'team');
    const avgPointsCol = findPoolCol('avgpointspergame', 'avg points', 'avgpoints');
    
    console.log('Player pool column indices:', { posCol, nameCol, nameIdCol, idCol, rosterPosCol, salaryCol, teamCol, avgPointsCol });
    
    // Parse player pool starting from row after headers
    for (let rowIdx = playerPoolHeaderRow + 1; rowIdx < allRows.length; rowIdx++) {
        const row = allRows[rowIdx];
        const poolRow = row.slice(playerPoolStartCol);
        
        if (poolRow.length < 3) continue;
        
        const position = (poolRow[posCol] || '').trim().toUpperCase();
        const name = (poolRow[nameCol] || '').trim();
        const nameId = (poolRow[nameIdCol] || '').trim();
        const playerId = (poolRow[idCol] || '').trim();
        const rosterPos = (poolRow[rosterPosCol] || '').trim().toUpperCase();
        const salary = parseInt((poolRow[salaryCol] || '0').toString().replace(/[,$]/g, '')) || 0;
        const gameInfo = (poolRow[gameInfoCol] || '').trim();
        const team = (poolRow[teamCol] || '').trim();
        const avgPoints = parseFloat(poolRow[avgPointsCol] || '0') || 0;
        
        if (name && salary > 0 && position) {
            const isCaptain = rosterPos.includes('CPT');
            
            players.push({
                id: playerId || rowIdx,
                name,
                nameId,
                position: position.replace('CPT', '').trim(),
                salary,
                projection: avgPoints,
                team,
                game: gameInfo,
                rosterPosition: rosterPos,
                isCaptain,
                value: avgPoints > 0 && salary > 0 ? avgPoints / (salary / 1000) : 0
            });
        }
    }
    
    console.log('Raw players parsed:', players.length);
    
    if (players.length === 0) {
        console.log('No players found, trying old format...');
        parseCSVOldFormat(lines, entryHeaders);
        return;
    }

    // Group players by name to get FLEX and CPT versions
    const playerMap = new Map();
    players.forEach(p => {
        const key = p.name + '_' + p.team;
        if (!playerMap.has(key)) {
            playerMap.set(key, {
                id: p.id,
                name: p.name,
                nameId: p.nameId,
                position: p.position,
                team: p.team,
                game: p.game,
                flexSalary: 0,
                flexProjection: 0,
                cptSalary: 0,
                cptProjection: 0
            });
        }
        const entry = playerMap.get(key);
        if (p.isCaptain) {
            entry.cptSalary = p.salary;
            entry.cptProjection = p.projection;
            entry.cptNameId = p.nameId;
        } else {
            entry.flexSalary = p.salary;
            entry.flexProjection = p.projection;
            entry.flexNameId = p.nameId;
        }
    });

    // Convert to unified player list
    players = Array.from(playerMap.values()).map((p, idx) => {
        if (p.cptSalary === 0 && p.flexSalary > 0) {
            p.cptSalary = Math.round(p.flexSalary * 1.5);
            p.cptProjection = p.flexProjection * 1.5;
        }
        if (p.flexSalary === 0 && p.cptSalary > 0) {
            p.flexSalary = Math.round(p.cptSalary / 1.5);
            p.flexProjection = p.cptProjection / 1.5;
        }
        
        return {
            id: p.id || idx,
            name: p.name,
            nameId: p.nameId,
            flexNameId: p.flexNameId,
            cptNameId: p.cptNameId,
            position: p.position,
            team: p.team,
            game: p.game,
            flexSalary: p.flexSalary,
            flexProjection: p.flexProjection,
            cptSalary: p.cptSalary,
            cptProjection: p.cptProjection,
            value: p.flexProjection > 0 && p.flexSalary > 0 ? p.flexProjection / (p.flexSalary / 1000) : 0
        };
    }).filter(p => p.flexSalary > 0);
    
    console.log('Final players after grouping:', players.length);

    // Calculate entry salaries and projections
    entries.forEach(entry => {
        let totalSalary = 0;
        let totalProjection = 0;
        
        const cptName = extractPlayerName(entry.cpt);
        const cptPlayer = players.find(p => p.name === cptName || entry.cpt.includes(p.name));
        if (cptPlayer) {
            totalSalary += cptPlayer.cptSalary;
            totalProjection += cptPlayer.cptProjection;
        }
        
        entry.flex.forEach(flexStr => {
            const flexName = extractPlayerName(flexStr);
            const flexPlayer = players.find(p => p.name === flexName || flexStr.includes(p.name));
            if (flexPlayer) {
                totalSalary += flexPlayer.flexSalary;
                totalProjection += flexPlayer.flexProjection;
            }
        });
        
        entry.salary = totalSalary;
        entry.projection = totalProjection;
    });

    // Detect slate number from game info
    let gameInfo = '';
    if (players.length > 0 && players[0].game) {
        gameInfo = players[0].game;
    }
    const slateNum = detectSlateNumber(gameInfo);
    const parsedInfo = parseGameInfo(gameInfo);
    
    // Store in slates object
    slates[slateNum] = {
        players: [...players],
        entries: [...entries],
        lineups: [],
        teams: parsedInfo.teams,
        date: parsedInfo.date,
        time: parsedInfo.time,
        dateTime: parsedInfo.dateTime,
        fileName: fileName
    };
    
    // Auto-select this slate
    currentSlate = slateNum;
    
    // Update UI
    updateSlateButtons();
    updateSlateInfo();
    updateSectionBadges();
    
    document.getElementById('playersLoaded').textContent = players.length;
    document.getElementById('playerCount').textContent = players.length;
    document.getElementById('entriesLoaded').textContent = entries.length;
    generateBtn.disabled = players.length === 0;
    
    // Update file status
    document.getElementById('fileStatus').textContent = `Slate ${slateNum} - ${parsedInfo.teams || fileName}`;
    
    if (entries.length > 0) {
        renderEntries(contestsMap);
    }
    
    renderPlayerPool();
    
    console.log(`Loaded slate ${slateNum}: ${players.length} players, ${entries.length} entries`);
}

// Old format parser for backwards compatibility
function parseCSVOldFormat(lines, headers) {
    players = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const player = {};
        headers.forEach((header, index) => {
            player[header] = values[index]?.trim().replace(/['"]/g, '') || '';
        });

        const name = player.name || player.player || player.nickname || '';
        const position = (player.position || player.pos || player['roster position'] || '').toUpperCase();
        const salary = parseInt(player.salary || player.sal || 0);
        const projection = parseFloat(player['avgpointspergame'] || player.avgpointspergame || player.fpts || player.projection || player.points || player.proj || 0);
        const team = player.team || player.teamabbrev || player['team abbrev'] || '';
        const game = player.game || player['game info'] || '';

        if (name && salary > 0) {
            const isCaptain = position.includes('CPT') || (player['roster position'] || '').includes('CPT');
            
            players.push({
                id: i,
                name: name,
                position: position.replace('CPT', '').trim() || extractPosition(position),
                salary: salary,
                projection: projection,
                team: team,
                game: game,
                isCaptain: isCaptain,
                value: projection / (salary / 1000)
            });
        }
    }

    const playerMap = new Map();
    players.forEach(p => {
        const key = p.name + '_' + p.team;
        if (!playerMap.has(key)) {
            playerMap.set(key, {
                name: p.name,
                position: p.position,
                team: p.team,
                game: p.game,
                flexSalary: 0,
                flexProjection: 0,
                cptSalary: 0,
                cptProjection: 0
            });
        }
        const entry = playerMap.get(key);
        if (p.isCaptain) {
            entry.cptSalary = p.salary;
            entry.cptProjection = p.projection;
        } else {
            entry.flexSalary = p.salary;
            entry.flexProjection = p.projection;
        }
    });

    players = Array.from(playerMap.values()).map((p, idx) => {
        if (p.cptSalary === 0 && p.flexSalary > 0) {
            p.cptSalary = Math.round(p.flexSalary * 1.5);
            p.cptProjection = p.flexProjection * 1.5;
        }
        if (p.flexSalary === 0 && p.cptSalary > 0) {
            p.flexSalary = Math.round(p.cptSalary / 1.5);
            p.flexProjection = p.cptProjection / 1.5;
        }
        
        return {
            id: idx,
            name: p.name,
            position: p.position,
            team: p.team,
            game: p.game,
            flexSalary: p.flexSalary,
            flexProjection: p.flexProjection,
            cptSalary: p.cptSalary,
            cptProjection: p.cptProjection,
            value: p.flexProjection / (p.flexSalary / 1000)
        };
    }).filter(p => p.flexSalary > 0);

    // Detect slate number from game info
    let gameInfo = '';
    if (players.length > 0 && players[0].game) {
        gameInfo = players[0].game;
    }
    const slateNum = detectSlateNumber(gameInfo);
    const parsedInfo = parseGameInfo(gameInfo);
    
    // Store in slates object
    slates[slateNum] = {
        players: [...players],
        entries: [],
        lineups: [],
        teams: parsedInfo.teams,
        date: parsedInfo.date,
        time: parsedInfo.time,
        dateTime: parsedInfo.dateTime,
        fileName: ''
    };
    
    // Auto-select this slate
    currentSlate = slateNum;
    
    // Update UI
    updateSlateButtons();
    updateSlateInfo();
    updateSectionBadges();

    document.getElementById('playersLoaded').textContent = players.length;
    document.getElementById('playerCount').textContent = players.length;
    generateBtn.disabled = players.length === 0;
    
    document.getElementById('fileStatus').textContent = `Slate ${slateNum} - ${parsedInfo.teams || 'Loaded'}`;
    
    renderPlayerPool();
}

// Extract player name from DK format (e.g., "Drake Lon" from entry)
function extractPlayerName(str) {
    if (!str) return '';
    // Remove ID in parentheses if present
    return str.replace(/\s*\(\d+\)\s*$/, '').trim();
}

// Check if a contest is a cash game (Double Up, H2H, vs, etc.)
function isCashGame(contestName) {
    const lowerName = contestName.toLowerCase();
    return lowerName.includes('double') || 
           lowerName.includes(' vs') || 
           lowerName.includes(' vs.') ||
           lowerName.includes('roobk19');
}

// Render entries section
function renderEntries(contestsMap) {
    const entriesCard = document.getElementById('entriesCard');
    const container = document.getElementById('entriesGroupedContainer');
    const optimizeCard = document.getElementById('optimizeCard');
    
    entriesCard.style.display = 'block';
    
    // Show optimize card if we have entries
    if (entries.length > 0) {
        optimizeCard.style.display = 'block';
        // Enable optimize button if we have lineups
        document.getElementById('optimizeBtn').disabled = lineups.length === 0;
    }
    
    // Update stats card
    document.getElementById('entriesLoaded').textContent = entries.length;
    
    // Update summary
    document.getElementById('entriesCount').textContent = `${entries.length} entries`;
    const totalFees = entries.reduce((sum, e) => {
        const fee = parseFloat(e.entryFee.replace('$', '')) || 0;
        return sum + fee;
    }, 0);
    document.getElementById('totalEntryFees').textContent = `$${totalFees.toFixed(2)} total`;
    
    // Group entries by contest and calculate totals
    const contestGroups = new Map();
    entries.forEach(entry => {
        if (!contestGroups.has(entry.contestId)) {
            contestGroups.set(entry.contestId, {
                name: entry.contestName,
                fee: entry.entryFee,
                entries: [],
                totalFees: 0
            });
        }
        const group = contestGroups.get(entry.contestId);
        group.entries.push(entry);
        group.totalFees += parseFloat(entry.entryFee.replace('$', '')) || 0;
    });
    
    // Sort: GPPs first (by total fees desc), then Cash games (by total fees desc)
    const sortedGroups = Array.from(contestGroups.entries())
        .sort((a, b) => {
            const aIsCash = isCashGame(a[1].name);
            const bIsCash = isCashGame(b[1].name);
            
            // GPPs come before Cash
            if (aIsCash !== bIsCash) {
                return aIsCash ? 1 : -1;
            }
            // Within same type, sort by total fees (highest first)
            return b[1].totalFees - a[1].totalFees;
        });
    
    // Clean contest name - remove game info like "(ATL @ TB)"
    const cleanContestName = (name) => {
        return name.replace(/\s*\([A-Z]{2,3}\s*@\s*[A-Z]{2,3}\)\s*$/i, '').trim();
    };
    
    // Render grouped entries
    container.innerHTML = sortedGroups.map(([contestId, group]) => {
        const contestName = cleanContestName(group.name);
        const entryFee = group.fee;
        const numEntries = group.entries.length;
        const totalContestFees = group.totalFees.toFixed(2);
        const isCash = isCashGame(group.name);
        const gameTypeBadge = isCash 
            ? '<span class="game-type-badge cash">CASH</span>' 
            : '<span class="game-type-badge gpp">GPP</span>';
        
        // Build table rows for this contest's entries
        const tableRows = group.entries.map((entry, idx) => {
            const cptName = extractPlayerName(entry.cpt);
            const cptPlayer = players.find(p => p.name === cptName || entry.cpt.includes(p.name));
            
            const flexCells = entry.flex.map(flexStr => {
                const flexName = extractPlayerName(flexStr);
                const flexPlayer = players.find(p => p.name === flexName || flexStr.includes(p.name));
                const displayName = flexPlayer ? flexPlayer.name : extractPlayerName(flexStr);
                const pos = flexPlayer ? flexPlayer.position : '';
                return `<td><span class="entry-player">${displayName || '-'}</span>${pos ? `<span class="entry-pos">${pos}</span>` : ''}</td>`;
            }).join('');
            
            const cptDisplayName = cptPlayer ? cptPlayer.name : extractPlayerName(entry.cpt);
            const cptPos = cptPlayer ? cptPlayer.position : '';
            
            return `
                <tr>
                    <td class="entry-fee-cell">${entry.entryFee}</td>
                    <td><span class="entry-player cpt">${cptDisplayName}</span>${cptPos ? `<span class="entry-pos">${cptPos}</span>` : ''}</td>
                    ${flexCells}
                    <td class="entry-salary-cell">$${entry.salary.toLocaleString()}</td>
                    <td class="entry-proj-cell">${entry.projection.toFixed(1)}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <div class="contest-group ${isCash ? 'cash-game' : 'gpp-game'}">
                <div class="contest-group-header">
                    <div class="contest-group-left">
                        <span class="contest-group-name">${contestName}</span>
                        ${gameTypeBadge}
                    </div>
                    <div class="contest-group-stats">
                        <span>${numEntries} ${numEntries === 1 ? 'entry' : 'entries'}</span>
                        <span class="dot">•</span>
                        <span>${entryFee}/ea</span>
                        <span class="dot">•</span>
                        <span class="contest-group-fee">$${totalContestFees}</span>
                    </div>
                </div>
                <table class="contest-entries-table">
                    <thead>
                        <tr>
                            <th style="width: 55px;">Fee</th>
                            <th style="width: 130px;">Captain</th>
                            <th>Flex 1</th>
                            <th>Flex 2</th>
                            <th>Flex 3</th>
                            <th>Flex 4</th>
                            <th>Flex 5</th>
                            <th style="width: 75px; text-align: right;">Salary</th>
                            <th style="width: 60px; text-align: right;">Proj</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');
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
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function extractPosition(pos) {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'];
    for (const p of positions) {
        if (pos.toUpperCase().includes(p)) return p;
    }
    return pos;
}

// Render Player Pool
function renderPlayerPool(filter = 'all', search = '') {
    if (players.length === 0) {
        playerPoolContainer.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <h4>No Players Loaded</h4>
                <p>Upload a CSV file to load player projections</p>
            </div>
        `;
        return;
    }

    let filteredPlayers = [...players];
    
    if (filter !== 'all') {
        filteredPlayers = filteredPlayers.filter(p => 
            p.position.toUpperCase() === filter.toUpperCase() ||
            (filter === 'DST' && (p.position === 'DEF' || p.position === 'DST'))
        );
    }

    if (search) {
        const searchLower = search.toLowerCase();
        filteredPlayers = filteredPlayers.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.team.toLowerCase().includes(searchLower)
        );
    }

    // Sort by current sort column
    filteredPlayers.sort((a, b) => {
        let aVal, bVal;
        if (playerPoolSort.column === 'cptProjection') {
            aVal = a.flexProjection * 1.5;
            bVal = b.flexProjection * 1.5;
        } else if (playerPoolSort.column === 'cptSalary') {
            aVal = a.flexSalary * 1.5;
            bVal = b.flexSalary * 1.5;
        } else {
            aVal = a[playerPoolSort.column];
            bVal = b[playerPoolSort.column];
        }
        return playerPoolSort.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    document.getElementById('playerCount').textContent = filteredPlayers.length;

    // Determine sort classes for headers
    const getSortClass = (col) => {
        if (playerPoolSort.column === col) {
            return playerPoolSort.direction === 'desc' ? 'sortable sort-desc' : 'sortable sort-asc';
        }
        return 'sortable';
    };

    playerPoolContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Team</th>
                    <th class="${getSortClass('flexSalary')}" data-sort="flexSalary">FLEX Salary</th>
                    <th class="${getSortClass('cptSalary')}" data-sort="cptSalary">CPT Salary</th>
                    <th class="${getSortClass('flexProjection')}" data-sort="flexProjection">FLEX Proj</th>
                    <th class="${getSortClass('cptProjection')}" data-sort="cptProjection">CPT Proj</th>
                    <th class="${getSortClass('value')}" data-sort="value">Value</th>
                </tr>
            </thead>
            <tbody>
                ${filteredPlayers.map(p => `
                    <tr>
                        <td style="font-weight: 500;">${p.name}</td>
                        <td><span class="position-badge ${p.position.toLowerCase()}">${p.position}</span></td>
                        <td class="team-badge">${p.team}</td>
                        <td>$${p.flexSalary.toLocaleString()}</td>
                        <td>$${Math.round(p.flexSalary * 1.5).toLocaleString()}</td>
                        <td style="color: var(--accent-primary); font-weight: 600;">${p.flexProjection.toFixed(2)}</td>
                        <td style="color: var(--accent-tertiary); font-weight: 600;">${(p.flexProjection * 1.5).toFixed(2)}</td>
                        <td>${p.value.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Position Filter
document.getElementById('positionFilters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-pill')) {
        document.querySelectorAll('#positionFilters .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        renderPlayerPool(e.target.dataset.pos, document.getElementById('playerSearch').value);
    }
});

// Search
document.getElementById('playerSearch').addEventListener('input', (e) => {
    const activeFilter = document.querySelector('#positionFilters .filter-pill.active').dataset.pos;
    renderPlayerPool(activeFilter, e.target.value);
});

// Player Pool Sortable Columns
playerPoolContainer.addEventListener('click', (e) => {
    const sortable = e.target.closest('.sortable');
    if (!sortable) return;

    const column = sortable.dataset.sort;
    
    // Toggle direction
    if (playerPoolSort.column === column) {
        playerPoolSort.direction = playerPoolSort.direction === 'desc' ? 'asc' : 'desc';
    } else {
        playerPoolSort.column = column;
        playerPoolSort.direction = 'desc';
    }

    const activeFilter = document.querySelector('#positionFilters .filter-pill.active').dataset.pos;
    renderPlayerPool(activeFilter, document.getElementById('playerSearch').value);
});

// Lineup Count Selection
document.querySelectorAll('.lineup-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lineup-count-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.lineup-time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLineupCount = parseInt(btn.dataset.count);
        selectedTimeSeconds = null;
        generationMode = 'count';
    });
});

// Lineup Time Selection
document.querySelectorAll('.lineup-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lineup-time-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.lineup-count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTimeSeconds = parseInt(btn.dataset.seconds);
        selectedLineupCount = null;
        generationMode = 'time';
    });
});

// Salary Range Sliders
const minSalarySlider = document.getElementById('minSalarySlider');
const maxSalarySlider = document.getElementById('maxSalarySlider');
const minSalaryValue = document.getElementById('minSalaryValue');
const maxSalaryValue = document.getElementById('maxSalaryValue');
const salaryRange = document.getElementById('salaryRange');

function updateSalaryRange() {
    const minVal = parseInt(minSalarySlider.value);
    const maxVal = parseInt(maxSalarySlider.value);
    
    // Prevent overlap
    if (minVal > maxVal - 100) {
        if (this === minSalarySlider) {
            minSalarySlider.value = maxVal - 100;
        } else {
            maxSalarySlider.value = minVal + 100;
        }
    }
    
    minSalary = parseInt(minSalarySlider.value);
    maxSalary = parseInt(maxSalarySlider.value);
    
    minSalaryValue.textContent = minSalary.toLocaleString();
    maxSalaryValue.textContent = maxSalary.toLocaleString();
    
    // Update range highlight
    const minPercent = ((minSalary - 40000) / 10000) * 100;
    const maxPercent = ((maxSalary - 40000) / 10000) * 100;
    salaryRange.style.left = minPercent + '%';
    salaryRange.style.width = (maxPercent - minPercent) + '%';
}

minSalarySlider.addEventListener('input', updateSalaryRange);
maxSalarySlider.addEventListener('input', updateSalaryRange);
updateSalaryRange(); // Initialize

// Projection Floor Slider
const projFloorSlider = document.getElementById('projFloorSlider');
const projFloorValue = document.getElementById('projFloorValue');

function updateProjFloor() {
    projectionFloor = parseFloat(projFloorSlider.value);
    projFloorValue.textContent = projectionFloor.toFixed(1) + '%';
    
    // Update slider background gradient
    const percent = ((projectionFloor - 80) / 20) * 100;
    projFloorSlider.style.background = `linear-gradient(to right, var(--accent-tertiary) ${percent}%, var(--bg-input) ${percent}%)`;
}

projFloorSlider.addEventListener('input', updateProjFloor);
updateProjFloor(); // Initialize

// Generate Lineups
generateBtn.addEventListener('click', generateLineups);

// Optimization Mode Selection
let optimizeMode = 'balanced';
let diversityStrength = 5;
const pawPatrolSettings = document.getElementById('pawPatrolSettings');
const diversitySlider = document.getElementById('diversitySlider');
const diversityValue = document.getElementById('diversityValue');
const portfolioSummary = document.getElementById('portfolioSummary');
const portfolioExposureList = document.getElementById('portfolioExposureList');

document.querySelectorAll('.optimize-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.optimize-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        optimizeMode = btn.dataset.mode;
        
        // Show/hide Paw Patrol settings
        if (optimizeMode === 'paw-patrol') {
            pawPatrolSettings.style.display = 'block';
        } else {
            pawPatrolSettings.style.display = 'none';
            portfolioSummary.style.display = 'none';
        }
    });
});

// Diversity slider - real-time updates
diversitySlider.addEventListener('input', () => {
    diversityStrength = parseInt(diversitySlider.value);
    diversityValue.textContent = diversityStrength;
    
    // If we have already optimized entries with Paw Patrol, re-optimize in real-time
    if (optimizeMode === 'paw-patrol' && entries.length > 0 && lineups.length > 0) {
        const hasOptimizedEntries = entries.some(e => e.optimizedLineup);
        if (hasOptimizedEntries) {
            optimizeEntriesPawPatrol();
        }
    }
});

// Optimize Entries Button
const optimizeBtn = document.getElementById('optimizeBtn');
const optimizeCard = document.getElementById('optimizeCard');
const optimizeStatus = document.getElementById('optimizeStatus');

optimizeBtn.addEventListener('click', optimizeEntries);

function optimizeEntries() {
    if (lineups.length === 0) {
        alert('Please generate lineups first!');
        return;
    }
    
    if (entries.length === 0) {
        alert('No entries to optimize!');
        return;
    }
    
    const minUniques = parseInt(document.getElementById('minUniques').value) || 1;
    
    // Sort lineups by projection (highest first)
    const sortedLineups = [...lineups].sort((a, b) => b.totalProjection - a.totalProjection);
    
    // The top lineup for cash games
    const topLineup = sortedLineups[0];
    
    // Track which lineups have been used for GPP
    let gppLineupIndex = 0;
    const usedLineups = new Set();
    
    // Separate entries into cash and GPP
    const cashEntries = [];
    const gppEntries = [];
    
    entries.forEach(entry => {
        if (optimizeMode === 'cash' || isCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });
    
    // Assign top lineup to all cash entries
    cashEntries.forEach(entry => {
        assignLineupToEntry(entry, topLineup);
    });
    
    // Assign unique lineups to GPP entries
    if (optimizeMode === 'paw-patrol') {
        // Paw Patrol mode - portfolio optimization
        optimizeEntriesPawPatrol();
        return; // Paw Patrol handles everything including status update
    } else {
        // Balanced mode - each GPP entry gets a unique lineup
        gppEntries.forEach(entry => {
            // Find the next unused lineup
            while (gppLineupIndex < sortedLineups.length && usedLineups.has(gppLineupIndex)) {
                gppLineupIndex++;
            }
            
            if (gppLineupIndex < sortedLineups.length) {
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex]);
                usedLineups.add(gppLineupIndex);
                gppLineupIndex++;
            } else {
                // Ran out of unique lineups, cycle back
                assignLineupToEntry(entry, sortedLineups[gppLineupIndex % sortedLineups.length]);
                gppLineupIndex++;
            }
        });
    }
    
    // Update status
    const cashCount = cashEntries.length;
    const gppCount = gppEntries.length;
    optimizeStatus.textContent = `✓ Optimized! ${cashCount} cash (top lineup), ${gppCount} GPP (unique)`;
    optimizeStatus.className = 'optimize-status success';
    
    // Enable export button
    document.getElementById('exportEntriesBtn').disabled = false;
    
    // Save updated entries to current slate
    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].entries = [...entries];
    }
    
    // Re-render entries
    renderEntries(new Map());
}

// Paw Patrol Portfolio Optimization Algorithm
function optimizeEntriesPawPatrol() {
    const sortedLineups = [...lineups].sort((a, b) => b.totalProjection - a.totalProjection);
    const topLineup = sortedLineups[0];
    const maxProjection = topLineup.totalProjection;
    
    // Separate entries into cash and GPP
    const cashEntries = [];
    const gppEntries = [];
    
    entries.forEach(entry => {
        if (isCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });
    
    // Assign top lineup to all cash entries
    cashEntries.forEach(entry => {
        assignLineupToEntry(entry, topLineup);
    });
    
    // Sort GPP entries by entry fee (highest first) - big money gets best picks
    gppEntries.sort((a, b) => {
        const feeA = parseFloat(a.entryFee.replace(/[$,]/g, '')) || 0;
        const feeB = parseFloat(b.entryFee.replace(/[$,]/g, '')) || 0;
        return feeB - feeA;
    });
    
    // Calculate total GPP fees for exposure percentages
    const totalGppFees = gppEntries.reduce((sum, e) => {
        return sum + (parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0);
    }, 0);
    
    // Build candidate pool from top lineups
    // Use top 200 or all lineups if fewer available
    const poolSize = Math.min(200, sortedLineups.length);
    const candidatePool = sortedLineups.slice(0, poolSize);
    
    // Analyze the pool to find "chalk" (most common players/stacks)
    const poolAnalysis = analyzeLineupPool(candidatePool);
    
    // Portfolio tracking
    const portfolio = {
        playerExposure: new Map(), // player name -> total $ exposure
        captainExposure: new Map(), // captain name -> total $ exposure  
        stackExposure: new Map(), // team stack -> total $ exposure
        assignedLineups: [] // lineups already assigned
    };
    
    // Assign lineups to GPP entries using portfolio optimization
    gppEntries.forEach(entry => {
        const entryFee = parseFloat(entry.entryFee.replace(/[$,]/g, '')) || 0.01;
        
        // Score each candidate lineup
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
            
            // Update portfolio exposure
            updatePortfolioExposure(portfolio, bestLineup, entryFee);
        }
    });
    
    // Update status with portfolio info
    const cashCount = cashEntries.length;
    const gppCount = gppEntries.length;
    optimizeStatus.textContent = `✓ Portfolio optimized! ${cashCount} cash, ${gppCount} GPP (diversity: ${diversityStrength})`;
    optimizeStatus.className = 'optimize-status success';
    
    // Show portfolio exposure summary
    displayPortfolioSummary(portfolio, totalGppFees);
    
    // Enable export button
    document.getElementById('exportEntriesBtn').disabled = false;
    
    // Save updated entries to current slate
    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].entries = [...entries];
    }
    
    // Re-render entries
    renderEntries(new Map());
}

// Analyze lineup pool to find "chalk" builds
function analyzeLineupPool(pool) {
    const playerCounts = new Map();
    const captainCounts = new Map();
    const stackCounts = new Map();
    
    pool.forEach(lineup => {
        // Count players
        lineup.players.forEach(player => {
            const count = playerCounts.get(player.name) || 0;
            playerCounts.set(player.name, count + 1);
            
            // Count captains separately
            if (player.isCpt) {
                const cptCount = captainCounts.get(player.name) || 0;
                captainCounts.set(player.name, cptCount + 1);
            }
        });
        
        // Count primary stack (team with most players)
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

// Score a lineup for portfolio selection
function scoreLineupForPortfolio(lineup, portfolio, maxProjection, totalGppFees, poolAnalysis, diversity) {
    const diversityFactor = diversity / 10; // 0 to 1
    
    // 1. Projection Score (0.90 to 1.00 for top lineups)
    const projectionScore = lineup.totalProjection / maxProjection;
    
    // 2. Portfolio Correlation Score (how correlated is this with what we already have)
    let correlationScore = 0;
    if (totalGppFees > 0) {
        lineup.players.forEach(player => {
            const exposure = portfolio.playerExposure.get(player.name) || 0;
            const exposurePct = exposure / totalGppFees;
            
            // Captain correlation weighted 2x
            if (player.isCpt) {
                correlationScore += exposurePct * 2;
            } else {
                correlationScore += exposurePct;
            }
        });
        correlationScore /= 8; // Normalize (6 players, captain weighted 2x = 8 max)
    }
    
    // 3. Pool Uniqueness Score (how different from "chalk")
    let uniquenessScore = 0;
    const captain = lineup.players.find(p => p.isCpt);
    
    if (captain && poolAnalysis.captainCounts.size > 0) {
        const cptFrequency = (poolAnalysis.captainCounts.get(captain.name) || 0) / poolAnalysis.poolSize;
        // Bonus for less common captains (but still quality - they're in the pool)
        uniquenessScore += (1 - cptFrequency) * 0.15;
    }
    
    // Primary stack uniqueness
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
    
    // Low-overlap bonus with already assigned lineups
    let overlapPenalty = 0;
    portfolio.assignedLineups.forEach(assignedLineup => {
        const overlap = countPlayerOverlap(lineup, assignedLineup);
        overlapPenalty += overlap / 6; // 0 to 1 per lineup
    });
    if (portfolio.assignedLineups.length > 0) {
        overlapPenalty /= portfolio.assignedLineups.length; // Average overlap
    }
    
    // 4. Final Score Calculation
    // At diversity 0: pure projection
    // At diversity 10: heavily weighted toward uniqueness and anti-correlation
    const projectionWeight = 1.0;
    const correlationPenalty = diversityFactor * 0.5; // Max 0.5 penalty
    const uniquenessBonus = diversityFactor * 0.3; // Max 0.3 bonus
    const overlapBonus = diversityFactor * 0.3; // Max 0.3 bonus for low overlap
    
    const finalScore = (projectionScore * projectionWeight) 
        - (correlationScore * correlationPenalty)
        + (uniquenessScore * uniquenessBonus)
        - (overlapPenalty * overlapBonus);
    
    return finalScore;
}

// Count player overlap between two lineups
function countPlayerOverlap(lineup1, lineup2) {
    const names1 = new Set(lineup1.players.map(p => p.name));
    let overlap = 0;
    lineup2.players.forEach(p => {
        if (names1.has(p.name)) overlap++;
    });
    return overlap;
}

// Update portfolio exposure after assigning a lineup
function updatePortfolioExposure(portfolio, lineup, entryFee) {
    lineup.players.forEach(player => {
        // Player exposure
        const currentExposure = portfolio.playerExposure.get(player.name) || 0;
        portfolio.playerExposure.set(player.name, currentExposure + entryFee);
        
        // Captain exposure
        if (player.isCpt) {
            const currentCptExposure = portfolio.captainExposure.get(player.name) || 0;
            portfolio.captainExposure.set(player.name, currentCptExposure + entryFee);
        }
    });
    
    // Stack exposure
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
    
    // Track assigned lineup
    portfolio.assignedLineups.push(lineup);
}

// Display portfolio exposure summary
function displayPortfolioSummary(portfolio, totalGppFees) {
    if (totalGppFees === 0) {
        portfolioSummary.style.display = 'none';
        return;
    }
    
    portfolioSummary.style.display = 'block';
    portfolioExposureList.innerHTML = '';
    
    // Sort players by exposure
    const exposureArray = Array.from(portfolio.playerExposure.entries())
        .map(([name, dollars]) => ({ name, dollars, pct: (dollars / totalGppFees) * 100 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 12); // Show top 12
    
    exposureArray.forEach(({ name, pct }) => {
        const item = document.createElement('div');
        item.className = 'exposure-item';
        
        // Color code based on exposure level
        if (pct >= 70) {
            item.classList.add('high');
        } else if (pct >= 40) {
            item.classList.add('medium');
        } else {
            item.classList.add('low');
        }
        
        // Get short name (last name or first initial + last)
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
    // Find the captain from the lineup
    const captain = lineup.players.find(p => p.isCpt);
    const flexPlayers = lineup.players.filter(p => !p.isCpt);
    
    // Get the player from the players array to access the correct nameId
    const getCptNameId = (player) => {
        const fullPlayer = players.find(p => p.name === player.name);
        if (fullPlayer && fullPlayer.cptNameId) {
            return fullPlayer.cptNameId;
        }
        // Fallback to name + id format
        return `${player.name} (${player.id})`;
    };
    
    const getFlexNameId = (player) => {
        const fullPlayer = players.find(p => p.name === player.name);
        if (fullPlayer && fullPlayer.flexNameId) {
            return fullPlayer.flexNameId;
        }
        // Fallback to name + id format
        return `${player.name} (${player.id})`;
    };
    
    // Update entry with lineup data using correct DK IDs
    entry.cpt = captain ? getCptNameId(captain) : entry.cpt;
    entry.flex = flexPlayers.map(p => getFlexNameId(p));
    entry.salary = lineup.totalSalary;
    entry.projection = lineup.totalProjection;
    
    // Store the lineup reference
    entry.optimizedLineup = lineup;
}

// Export Entries to DraftKings CSV
const exportEntriesBtn = document.getElementById('exportEntriesBtn');
exportEntriesBtn.addEventListener('click', exportEntriesToCSV);

function exportEntriesToCSV() {
    if (entries.length === 0) {
        alert('No entries to export!');
        return;
    }
    
    // Build CSV content
    const headers = ['Entry ID', 'Contest Name', 'Contest ID', 'Entry Fee', 'CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];
    
    const rows = entries.map(entry => {
        // Ensure we have 5 FLEX slots
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
    
    // Escape CSV fields
    const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };
    
    // Build CSV string
    let csv = headers.map(escapeCSV).join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(escapeCSV).join(',') + '\n';
    });
    
    // Create and download file
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
    
    // Update status
    optimizeStatus.textContent = `✓ Exported ${entries.length} entries to CSV`;
}

// Generate Lineups Function
async function generateLineups() {
    if (players.length === 0) {
        alert('Please upload a CSV file first!');
        return;
    }

    generateBtn.disabled = true;
    progressContainer.style.display = 'block';
    lineupsCard.style.display = 'none';
    lineups = [];

    const startTime = Date.now();
    let targetLineups = selectedLineupCount || 1000;
    let maxTimeMs = selectedTimeSeconds ? selectedTimeSeconds * 1000 : null;
    
    // Calculate projection floor threshold
    const maxProjection = Math.max(...players.map(p => p.flexProjection));
    const minProjectionThreshold = maxProjection * (projectionFloor / 100);

    // Filter players who meet the projection floor
    const eligiblePlayers = players.filter(p => p.flexProjection >= minProjectionThreshold);
    
    if (eligiblePlayers.length < 6) {
        alert(`Only ${eligiblePlayers.length} players meet the ${projectionFloor}% projection floor. Need at least 6.`);
        generateBtn.disabled = false;
        progressContainer.style.display = 'none';
        return;
    }

    const updateProgress = (current, total, rate) => {
        const percent = Math.min((current / total) * 100, 100);
        progressFill.style.width = percent + '%';
        if (generationMode === 'time') {
            const elapsed = (Date.now() - startTime) / 1000;
            progressText.textContent = `Generated ${current.toLocaleString()} lineups (${rate.toLocaleString()}/sec) - ${elapsed.toFixed(1)}s`;
        } else {
            progressText.textContent = `Generated ${current.toLocaleString()} of ${total.toLocaleString()} (${rate.toLocaleString()}/sec)`;
        }
    };

    // Create indexed lookup for faster generation
    const playersByPosition = new Map();
    eligiblePlayers.forEach(p => {
        const pos = p.position;
        if (!playersByPosition.has(pos)) {
            playersByPosition.set(pos, []);
        }
        playersByPosition.get(pos).push(p);
    });

    // Sort players by value for smarter selection
    eligiblePlayers.sort((a, b) => b.value - a.value);

    const uniqueLineups = new Set();
    let attempts = 0;
    const maxAttempts = generationMode === 'time' ? Infinity : targetLineups * 100;
    let lastUpdate = Date.now();
    let lineupsAtLastUpdate = 0;
    let currentRate = 0;

    // Batch processing for responsiveness
    const batchSize = 1000;
    
    while (true) {
        // Check termination conditions
        if (generationMode === 'count' && lineups.length >= targetLineups) break;
        if (generationMode === 'time' && (Date.now() - startTime) >= maxTimeMs) break;
        if (attempts >= maxAttempts) break;

        // Process in batches
        for (let b = 0; b < batchSize && attempts < maxAttempts; b++) {
            attempts++;
            
            const lineup = generateRandomLineup(eligiblePlayers);
            if (!lineup) continue;

            // Create unique key
            const key = lineup.players.map(p => `${p.name}:${p.isCpt}`).sort().join('|');
            
            if (!uniqueLineups.has(key)) {
                uniqueLineups.add(key);
                lineups.push(lineup);
                
                // Early exit for count mode
                if (generationMode === 'count' && lineups.length >= targetLineups) break;
            }
        }

        // Update progress
        const now = Date.now();
        if (now - lastUpdate >= 100) {
            const elapsed = (now - lastUpdate) / 1000;
            currentRate = Math.round((lineups.length - lineupsAtLastUpdate) / elapsed);
            lineupsAtLastUpdate = lineups.length;
            lastUpdate = now;
            
            updateProgress(lineups.length, targetLineups, currentRate);
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // Sort by projection
    lineups.sort((a, b) => b.totalProjection - a.totalProjection);

    // Final progress update
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    progressText.textContent = `✓ Generated ${lineups.length.toLocaleString()} unique lineups in ${totalTime}s`;
    progressFill.style.width = '100%';

    // Show results
    generateBtn.disabled = false;
    lineupsCard.style.display = 'block';
    document.getElementById('lineupCountDisplay').textContent = `${lineups.length} lineups`;
    currentPage = 1;
    
    // Save to current slate
    if (currentSlate && slates[currentSlate]) {
        slates[currentSlate].lineups = [...lineups];
    }
    
    // Update section badges
    updateSectionBadges();
    
    renderLineups();
    
    // Enable optimize button if we have entries
    if (entries.length > 0) {
        document.getElementById('optimizeBtn').disabled = false;
        document.getElementById('optimizeStatus').textContent = `${lineups.length} lineups ready`;
    }
}

function generateRandomLineup(eligiblePlayers) {
    // Showdown format: 1 CPT + 5 FLEX from same pool
    // CPT gets 1.5x salary and 1.5x points
    
    // Pick 6 unique players
    const selected = [];
    const usedIndices = new Set();
    
    // Weighted random selection favoring higher value players
    const totalValue = eligiblePlayers.reduce((sum, p) => sum + p.value, 0);
    
    while (selected.length < 6) {
        let rand = Math.random() * totalValue;
        let cumulative = 0;
        
        for (let i = 0; i < eligiblePlayers.length; i++) {
            if (usedIndices.has(i)) continue;
            cumulative += eligiblePlayers[i].value;
            if (rand <= cumulative) {
                selected.push({ ...eligiblePlayers[i], originalIndex: i });
                usedIndices.add(i);
                break;
            }
        }
        
        // Fallback to random if weighted selection fails
        if (selected.length < usedIndices.size) {
            for (let i = 0; i < eligiblePlayers.length; i++) {
                if (!usedIndices.has(i)) {
                    selected.push({ ...eligiblePlayers[i], originalIndex: i });
                    usedIndices.add(i);
                    break;
                }
            }
        }
    }

    if (selected.length < 6) return null;

    // Randomly assign one as captain (weighted toward highest projecting)
    const projectionSum = selected.reduce((sum, p) => sum + p.flexProjection, 0);
    let rand = Math.random() * projectionSum;
    let cptIndex = 0;
    let cumulative = 0;
    
    for (let i = 0; i < selected.length; i++) {
        cumulative += selected[i].flexProjection;
        if (rand <= cumulative) {
            cptIndex = i;
            break;
        }
    }

    // Build lineup
    const lineupPlayers = selected.map((p, idx) => {
        const isCpt = idx === cptIndex;
        return {
            id: p.id,
            name: p.name,
            nameId: p.nameId,
            position: p.position,
            team: p.team,
            salary: isCpt ? p.cptSalary : p.flexSalary,
            projection: isCpt ? p.cptProjection : p.flexProjection,
            isCpt: isCpt
        };
    });

    // Calculate totals
    const totalSalary = lineupPlayers.reduce((sum, p) => sum + p.salary, 0);
    const totalProjection = lineupPlayers.reduce((sum, p) => sum + p.projection, 0);

    // Check salary constraints
    if (totalSalary < minSalary || totalSalary > maxSalary) {
        return null;
    }

    // Sort: captain first, then by salary
    lineupPlayers.sort((a, b) => {
        if (a.isCpt !== b.isCpt) return a.isCpt ? -1 : 1;
        return b.salary - a.salary;
    });

    return {
        players: lineupPlayers,
        totalSalary,
        totalProjection,
        salaryRemaining: SALARY_CAP - totalSalary
    };
}

// Render Lineups
function renderLineups() {
    if (lineups.length === 0) {
        lineupRows.innerHTML = '<div class="empty-state">No lineups generated yet</div>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(lineups.length / lineupsPerPage);
    const startIdx = (currentPage - 1) * lineupsPerPage;
    const endIdx = Math.min(startIdx + lineupsPerPage, lineups.length);
    const pageLineups = lineups.slice(startIdx, endIdx);

    // Render lineup cards
    lineupRows.innerHTML = pageLineups.map((lineup, idx) => {
        const globalIdx = startIdx + idx + 1;
        const captain = lineup.players.find(p => p.isCpt);
        const flex = lineup.players.filter(p => !p.isCpt);

        return `
            <div class="lineup-card">
                <div class="lineup-header">
                    <span class="lineup-rank">#${globalIdx}</span>
                    <span class="lineup-proj">${lineup.totalProjection.toFixed(2)} pts</span>
                </div>
                <div class="lineup-players">
                    <div class="lineup-player captain">
                        <span class="player-role">CPT</span>
                        <span class="player-name">${captain.name}</span>
                        <span class="player-details">${captain.position} | ${captain.team}</span>
                        <span class="player-salary">$${captain.salary.toLocaleString()}</span>
                        <span class="player-proj">${captain.projection.toFixed(2)}</span>
                    </div>
                    ${flex.map(p => `
                        <div class="lineup-player">
                            <span class="player-role">FLEX</span>
                            <span class="player-name">${p.name}</span>
                            <span class="player-details">${p.position} | ${p.team}</span>
                            <span class="player-salary">$${p.salary.toLocaleString()}</span>
                            <span class="player-proj">${p.projection.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="lineup-footer">
                    <span>$${lineup.totalSalary.toLocaleString()} / $${SALARY_CAP.toLocaleString()}</span>
                    <span>$${lineup.salaryRemaining.toLocaleString()} remaining</span>
                </div>
            </div>
        `;
    }).join('');

    // Update pagination
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    
    // Update lineup count display
    document.getElementById('lineupCountDisplay').textContent = `${lineups.length} lineups`;
}

// Pagination
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderLineups();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(lineups.length / lineupsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderLineups();
    }
});

// Export Lineups
document.getElementById('exportBtn').addEventListener('click', () => {
    if (lineups.length === 0) {
        alert('No lineups to export!');
        return;
    }

    // Build CSV with DraftKings format
    let csv = 'CPT,FLEX,FLEX,FLEX,FLEX,FLEX\n';
    
    lineups.forEach(lineup => {
        const captain = lineup.players.find(p => p.isCpt);
        const flex = lineup.players.filter(p => !p.isCpt);
        
        // Use nameId for DraftKings format, or fallback to name (id)
        const cptStr = captain.nameId || `${captain.name} (${captain.id})`;
        const flexStrs = flex.map(p => p.nameId || `${p.name} (${p.id})`);
        
        csv += `"${cptStr}","${flexStrs.join('","')}"\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `showdown_lineups_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// Generate All Button (generates for each loaded slate)
document.getElementById('generateAllBtn').addEventListener('click', async () => {
    const loadedSlates = Object.keys(slates).map(Number);
    
    if (loadedSlates.length === 0) {
        alert('No slates loaded! Please upload CSV files first.');
        return;
    }
    
    const btn = document.getElementById('generateAllBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-2.93-6.36l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/></svg> Generating...`;
    
    let totalGenerated = 0;
    const startTime = Date.now();
    
    for (const slateNum of loadedSlates) {
        // Switch to slate
        selectSlate(slateNum);
        
        // Generate lineups
        await generateLineups();
        
        totalGenerated += lineups.length;
        
        // Save lineups back to slate
        if (slates[slateNum]) {
            slates[slateNum].lineups = [...lineups];
        }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    
    // Update status
    progressText.textContent = `✓ Generated ${totalGenerated.toLocaleString()} total lineups across ${loadedSlates.length} slates in ${totalTime}s`;
    
    // If we have entries, enable optimize
    if (entries.length > 0) {
        document.getElementById('optimizeBtn').disabled = false;
    }
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderPlayerPool();
    updateSalaryRange();
    updateProjFloor();
});
