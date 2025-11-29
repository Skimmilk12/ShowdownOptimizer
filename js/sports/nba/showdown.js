// ==========================================
// NBA SHOWDOWN OPTIMIZER
// ==========================================

// NBA Showdown Global State
let nbaPlayers = [];
let nbaLineups = [];
let nbaSelectedLineupCount = 100;
let nbaSelectedTimeSeconds = null;
let nbaGenerationMode = 'count';
let nbaCurrentSort = { column: 'points', direction: 'desc' };
let nbaPlayerPoolSort = { column: 'projection', direction: 'desc' };
let nbaPlayerPoolView = 'cpt'; // 'cpt' or 'flex'
let nbaCurrentPage = 1;
const nbaLineupsPerPage = 100;
let nbaMinSalary = 49000;
let nbaMaxSalary = 50000;
let nbaProjectionFloor = 90;
let nbaEntries = [];
let nbaSlates = {};
let nbaCurrentSlate = null;
let nbaOptimizeMode = 'balanced';
let nbaDiversityStrength = 5;

const NBA_SALARY_CAP = 50000;

// NBA slate time mapping
const nbaSlateTimeMap = {
    '19:00': 1, '19:30': 1,
    '20:00': 2, '20:30': 2,
    '21:00': 3, '21:30': 3,
    '22:00': 4, '22:30': 4,
    '23:00': 5, '23:30': 5,
    '0:00': 6
};

// DOM Elements (initialized after DOM ready)
let nbaUploadZone, nbaCsvInput, nbaGenerateBtn, nbaProgressContainer, nbaProgressFill, nbaProgressText;
let nbaPlayerPoolContainer, nbaLineupsCard, nbaLineupOutput, nbaLineupRows;
let nbaOptimizeStatus, nbaPortfolioSummary, nbaPortfolioExposureList;

function initNbaShowdownDOM() {
    nbaUploadZone = document.getElementById('nbaUploadZone');
    nbaCsvInput = document.getElementById('nbaCsvInput');
    nbaGenerateBtn = document.getElementById('nbaGenerateBtn');
    nbaProgressContainer = document.getElementById('nbaProgressContainer');
    nbaProgressFill = document.getElementById('nbaProgressFill');
    nbaProgressText = document.getElementById('nbaProgressText');
    nbaPlayerPoolContainer = document.getElementById('nbaPlayerPoolContainer');
    nbaLineupsCard = document.getElementById('nbaLineupsCard');
    nbaLineupOutput = document.getElementById('nbaLineupOutput');
    nbaLineupRows = document.getElementById('nbaLineupRows');
    nbaOptimizeStatus = document.getElementById('nbaOptimizeStatus');
    nbaPortfolioSummary = document.getElementById('nbaPortfolioSummary');
    nbaPortfolioExposureList = document.getElementById('nbaPortfolioExposureList');
}

function initNbaShowdownEventListeners() {
    // File Upload Handling
    nbaUploadZone.addEventListener('click', () => nbaCsvInput.click());

    nbaUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        nbaUploadZone.classList.add('dragover');
    });

    nbaUploadZone.addEventListener('dragleave', () => {
        nbaUploadZone.classList.remove('dragover');
    });

    nbaUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        nbaUploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleNbaFile(file);
        }
    });

    nbaCsvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleNbaFile(file);
        }
        nbaCsvInput.value = '';
    });

    // Slate button click handlers
    document.querySelectorAll('#nbaSlateSelector .slate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const slateNum = parseInt(btn.dataset.slate);
            selectNbaSlate(slateNum);
        });
    });

    // Generate button
    nbaGenerateBtn.addEventListener('click', generateNbaLineups);

    // Lineup count buttons
    document.querySelectorAll('#nbaTab .settings-row .lineup-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#nbaTab .settings-row .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#nbaTab .settings-row .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            nbaSelectedLineupCount = parseInt(btn.dataset.count);
            nbaSelectedTimeSeconds = null;
            nbaGenerationMode = 'count';
        });
    });

    // Time duration buttons
    document.querySelectorAll('#nbaTab .settings-row .lineup-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#nbaTab .settings-row .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#nbaTab .settings-row .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            nbaSelectedTimeSeconds = parseInt(btn.dataset.seconds);
            nbaGenerationMode = 'time';
        });
    });

    // Salary sliders
    const nbaMinSalarySlider = document.getElementById('nbaMinSalarySlider');
    const nbaMaxSalarySlider = document.getElementById('nbaMaxSalarySlider');

    nbaMinSalarySlider.addEventListener('input', (e) => {
        nbaMinSalary = parseInt(e.target.value);
        if (nbaMinSalary > nbaMaxSalary) {
            nbaMaxSalary = nbaMinSalary;
            nbaMaxSalarySlider.value = nbaMaxSalary;
        }
        updateNbaSalaryDisplay();
    });

    nbaMaxSalarySlider.addEventListener('input', (e) => {
        nbaMaxSalary = parseInt(e.target.value);
        if (nbaMaxSalary < nbaMinSalary) {
            nbaMinSalary = nbaMaxSalary;
            nbaMinSalarySlider.value = nbaMinSalary;
        }
        updateNbaSalaryDisplay();
    });

    // Projection floor slider
    document.getElementById('nbaProjFloorSlider').addEventListener('input', (e) => {
        nbaProjectionFloor = parseFloat(e.target.value);
        document.getElementById('nbaProjFloorValue').textContent = `${nbaProjectionFloor.toFixed(1)}%`;
    });

    // Optimize mode buttons
    document.querySelectorAll('#nbaTab .optimize-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#nbaTab .optimize-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            nbaOptimizeMode = btn.dataset.mode;

            const pawSettings = document.getElementById('nbaPawPatrolSettings');
            pawSettings.style.display = nbaOptimizeMode === 'paw-patrol' ? 'block' : 'none';
        });
    });

    // Diversity slider
    document.getElementById('nbaDiversitySlider').addEventListener('input', (e) => {
        nbaDiversityStrength = parseInt(e.target.value);
        document.getElementById('nbaDiversityValue').textContent = nbaDiversityStrength;
    });

    // Optimize button
    document.getElementById('nbaOptimizeBtn').addEventListener('click', optimizeNbaEntries);

    // Export entries button
    document.getElementById('nbaExportEntriesBtn').addEventListener('click', exportNbaEntriesToCSV);

    // Pool view toggle (CPT/FLEX)
    document.querySelectorAll('#nbaPoolViewToggle .pool-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#nbaPoolViewToggle .pool-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            nbaPlayerPoolView = btn.dataset.view;
            renderNbaPlayerPool();
        });
    });

    // Pagination
    document.getElementById('nbaPrevPageTop').addEventListener('click', () => {
        if (nbaCurrentPage > 1) {
            nbaCurrentPage--;
            renderNbaLineups();
            document.getElementById('nbaLineupOutput').scrollTop = 0;
        }
    });

    document.getElementById('nbaNextPageTop').addEventListener('click', () => {
        const totalPages = Math.ceil(nbaLineups.length / nbaLineupsPerPage);
        if (nbaCurrentPage < totalPages) {
            nbaCurrentPage++;
            renderNbaLineups();
            document.getElementById('nbaLineupOutput').scrollTop = 0;
        }
    });

    // Sortable columns
    document.querySelector('#nbaLineupOutput .lineup-row.header').addEventListener('click', (e) => {
        const sortable = e.target.closest('.sortable');
        if (!sortable) return;

        const column = sortable.dataset.sort;

        if (nbaCurrentSort.column === column) {
            nbaCurrentSort.direction = nbaCurrentSort.direction === 'desc' ? 'asc' : 'desc';
        } else {
            nbaCurrentSort.column = column;
            nbaCurrentSort.direction = 'desc';
        }

        nbaCurrentPage = 1;

        document.querySelectorAll('#nbaLineupOutput .lineup-row.header .sortable').forEach(el => {
            el.classList.remove('sort-asc', 'sort-desc');
        });
        sortable.classList.add(nbaCurrentSort.direction === 'desc' ? 'sort-desc' : 'sort-asc');

        renderNbaLineups();
    });

    // Export CSV button
    document.getElementById('nbaExportBtn').addEventListener('click', () => {
        if (nbaLineups.length === 0) return;

        const headers = ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'Salary', 'Projection', '25th', '75th', '85th', '95th', 'STD'];
        const rows = nbaLineups.map(lineup => {
            const cpt = lineup.players[0];
            const flex = lineup.players.slice(1);
            return [
                cpt.name,
                ...flex.map(p => p.name),
                lineup.totalSalary,
                lineup.totalProjection.toFixed(2),
                (lineup.totalPctl25 || 0).toFixed(2),
                (lineup.totalPctl75 || 0).toFixed(2),
                (lineup.totalPctl85 || 0).toFixed(2),
                (lineup.totalPctl95 || 0).toFixed(2),
                (lineup.totalStd || 0).toFixed(2)
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nba_showdown_lineups_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Clear Lineups
    document.getElementById('nbaClearLineupsBtn').addEventListener('click', () => {
        nbaLineups = [];
        nbaCurrentPage = 1;
        document.getElementById('nbaLineupsGenerated').textContent = '0';
        document.getElementById('nbaTopProjection').textContent = '0.00';
        document.getElementById('nbaAvgProjection').textContent = '0.00';
        document.getElementById('nbaLineupCountDisplay').textContent = '0 lineups';
        document.getElementById('nbaPaginationTop').style.display = 'none';
        nbaLineupRows.innerHTML = `
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
    document.querySelectorAll('#nbaPositionFilters .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#nbaPositionFilters .filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderNbaPlayerPool();
        });
    });

    // Player search
    document.getElementById('nbaPlayerSearch').addEventListener('input', renderNbaPlayerPool);
}

function updateNbaSalaryDisplay() {
    document.getElementById('nbaMinSalaryValue').textContent = nbaMinSalary.toLocaleString();
    document.getElementById('nbaMaxSalaryValue').textContent = nbaMaxSalary.toLocaleString();

    const range = document.getElementById('nbaSalaryRange');
    const min = 40000;
    const max = 50000;
    const leftPercent = ((nbaMinSalary - min) / (max - min)) * 100;
    const rightPercent = ((nbaMaxSalary - min) / (max - min)) * 100;
    range.style.left = leftPercent + '%';
    range.style.width = (rightPercent - leftPercent) + '%';
}

function handleNbaFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvData = e.target.result;
        parseNbaCSV(csvData);

        nbaUploadZone.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent-primary);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 style="color: var(--accent-primary);">✓ ${file.name}</h3>
            <p>${nbaEntries.length} entries, ${nbaPlayers.length} players loaded</p>
            <input type="file" id="nbaCsvInput" accept=".csv">
        `;

        const newInput = document.getElementById('nbaCsvInput');
        newInput.addEventListener('change', (e) => {
            const newFile = e.target.files[0];
            if (newFile) handleNbaFile(newFile);
            newInput.value = '';
        });
    };
    reader.readAsText(file);
}

function parseNbaCSV(csvData) {
    const lines = csvData.split('\n');

    nbaSlates = {};
    nbaEntries = [];
    nbaPlayers = [];

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

            let slateNum = 1;
            const timeMatch = contestName.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3].toUpperCase();

                if (ampm === 'PM' && hour !== 12) hour += 12;
                if (ampm === 'AM' && hour === 12) hour = 0;

                const timeKey = `${hour}:${minutes}`;
                slateNum = nbaSlateTimeMap[timeKey] || nbaSlateTimeMap[`${hour}:00`] || 1;
            }

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

            nbaEntries.push(entry);

            if (!nbaSlates[slateNum]) {
                nbaSlates[slateNum] = { entries: [], players: [], lineups: [], gameInfo: '' };
            }
            nbaSlates[slateNum].entries.push(entry);
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
        // DK percentile columns
        if (upper === '25TH' || upper === 'DK 25TH') colMap.pctl25 = idx;
        if (upper === '75TH' || upper === 'DK 75TH') colMap.pctl75 = idx;
        if (upper === '85TH' || upper === 'DK 85TH') colMap.pctl85 = idx;
        if (upper === '95TH' || upper === 'DK 95TH') colMap.pctl95 = idx;
        if (upper === 'STD' || upper === 'STDEV' || upper === 'DK STD') colMap.std = idx;
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

        // Parse percentile values if available
        const pctl25 = colMap.pctl25 !== undefined ? parseFloat(row[colMap.pctl25] || '0') || 0 : 0;
        const pctl75 = colMap.pctl75 !== undefined ? parseFloat(row[colMap.pctl75] || '0') || 0 : 0;
        const pctl85 = colMap.pctl85 !== undefined ? parseFloat(row[colMap.pctl85] || '0') || 0 : 0;
        const pctl95 = colMap.pctl95 !== undefined ? parseFloat(row[colMap.pctl95] || '0') || 0 : 0;
        const std = colMap.std !== undefined ? parseFloat(row[colMap.std] || '0') || 0 : 0;

        if (!name && nameId) {
            const match = nameId.match(/^(.+?)\s*\(\d+\)$/);
            if (match) name = match[1].trim();
            else name = nameId;
        }

        if (!name || !position || !salary) continue;

        let slateNum = 1;
        const timeMatch = gameInfo.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3].toUpperCase();

            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;

            const timeKey = `${hour}:${minutes}`;
            slateNum = nbaSlateTimeMap[timeKey] || nbaSlateTimeMap[`${hour}:00`] || 1;
        }

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
                    cptPctl25: pctl25,
                    cptPctl75: pctl75,
                    cptPctl85: pctl85,
                    cptPctl95: pctl95,
                    cptStd: std,
                    flexSalary: 0,
                    flexProjection: 0,
                    flexNameId: '',
                    flexPctl25: 0,
                    flexPctl75: 0,
                    flexPctl85: 0,
                    flexPctl95: 0,
                    flexStd: 0
                };
            } else {
                tempPlayers[playerKey].cptSalary = salary;
                tempPlayers[playerKey].cptProjection = projection;
                tempPlayers[playerKey].cptNameId = nameId;
                tempPlayers[playerKey].cptPctl25 = pctl25;
                tempPlayers[playerKey].cptPctl75 = pctl75;
                tempPlayers[playerKey].cptPctl85 = pctl85;
                tempPlayers[playerKey].cptPctl95 = pctl95;
                tempPlayers[playerKey].cptStd = std;
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
                    cptPctl25: 0,
                    cptPctl75: 0,
                    cptPctl85: 0,
                    cptPctl95: 0,
                    cptStd: 0,
                    flexSalary: salary,
                    flexProjection: projection,
                    flexNameId: nameId,
                    flexPctl25: pctl25,
                    flexPctl75: pctl75,
                    flexPctl85: pctl85,
                    flexPctl95: pctl95,
                    flexStd: std
                };
            } else {
                tempPlayers[playerKey].flexSalary = salary;
                tempPlayers[playerKey].flexProjection = projection;
                tempPlayers[playerKey].flexNameId = nameId;
                tempPlayers[playerKey].flexPctl25 = pctl25;
                tempPlayers[playerKey].flexPctl75 = pctl75;
                tempPlayers[playerKey].flexPctl85 = pctl85;
                tempPlayers[playerKey].flexPctl95 = pctl95;
                tempPlayers[playerKey].flexStd = std;
                if (!tempPlayers[playerKey].id) tempPlayers[playerKey].id = id;
            }
        }
    }

    nbaPlayers = Object.values(tempPlayers).filter(p => p.flexSalary > 0);

    nbaPlayers.forEach(player => {
        if (!nbaSlates[player.slateNum]) {
            nbaSlates[player.slateNum] = { entries: [], players: [], lineups: [], gameInfo: player.gameInfo };
        }
        nbaSlates[player.slateNum].players.push(player);
        if (!nbaSlates[player.slateNum].gameInfo && player.gameInfo) {
            nbaSlates[player.slateNum].gameInfo = player.gameInfo;
        }
    });

    document.getElementById('nbaEntriesLoaded').textContent = nbaEntries.length;
    document.getElementById('nbaPlayersLoaded').textContent = nbaPlayers.length;
    document.getElementById('nbaFileStatus').textContent = `${nbaPlayers.length} players loaded`;

    updateNbaSlateButtons();

    for (let i = 1; i <= 6; i++) {
        if (nbaSlates[i] && nbaSlates[i].players.length > 0) {
            selectNbaSlate(i);
            break;
        }
    }
}

function updateNbaSlateButtons() {
    document.querySelectorAll('#nbaSlateSelector .slate-btn').forEach(btn => {
        const slateNum = parseInt(btn.dataset.slate);
        btn.classList.remove('loaded', 'active');

        if (nbaSlates[slateNum] && (nbaSlates[slateNum].entries.length > 0 || nbaSlates[slateNum].players.length > 0)) {
            btn.classList.add('loaded');
        }
    });
}

function selectNbaSlate(slateNum) {
    if (!nbaSlates[slateNum]) return;

    nbaCurrentSlate = slateNum;

    const slate = nbaSlates[slateNum];
    nbaPlayers = slate.players;
    nbaEntries = slate.entries;
    nbaLineups = slate.lineups || [];

    document.querySelectorAll('#nbaSlateSelector .slate-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.slate) === slateNum) {
            btn.classList.add('active');
        }
    });

    updateNbaSlateInfo();
    updateNbaSectionBadges();
    renderNbaPlayerPool();
    renderNbaEntries(new Map());
    renderNbaLineups();

    nbaGenerateBtn.disabled = nbaPlayers.length === 0;

    const hasEntries = nbaEntries.length > 0;
    const hasLineups = nbaLineups.length > 0;

    document.getElementById('nbaEntriesCard').style.display = hasEntries ? 'block' : 'none';
    document.getElementById('nbaOptimizeCard').style.display = hasEntries ? 'block' : 'none';
    document.getElementById('nbaLineupsCard').style.display = hasLineups ? 'block' : 'none';
    document.getElementById('nbaOptimizeBtn').disabled = !hasLineups;
    document.getElementById('nbaExportEntriesBtn').disabled = true;

    if (hasLineups) {
        document.getElementById('nbaOptimizeStatus').textContent = `${nbaLineups.length} lineups ready to assign`;
    }
}

function updateNbaSlateInfo() {
    const slateInfo = document.getElementById('nbaCurrentSlateInfo');

    if (!nbaCurrentSlate || !nbaSlates[nbaCurrentSlate]) {
        slateInfo.classList.remove('visible');
        return;
    }

    const slate = nbaSlates[nbaCurrentSlate];

    slateInfo.classList.add('visible');
    document.getElementById('nbaSlateBadge').textContent = nbaCurrentSlate;
    document.getElementById('nbaSlatePlayerCount').textContent = slate.players.length;
    document.getElementById('nbaSlateEntryCount').textContent = slate.entries.length;

    if (slate.gameInfo) {
        const match = slate.gameInfo.match(/([A-Z]{2,3})@([A-Z]{2,3})/);
        if (match) {
            document.getElementById('nbaSlateTeams').textContent = `${match[1]} @ ${match[2]}`;
        }
        document.getElementById('nbaSlateDateTime').textContent = slate.gameInfo;
    }
}

function updateNbaSectionBadges() {
    const playerPoolBadge = document.getElementById('nbaPlayerPoolSlateBadge');
    const entriesBadge = document.getElementById('nbaEntriesSlateBadge');
    const lineupsBadge = document.getElementById('nbaLineupsSlateBadge');

    if (nbaCurrentSlate) {
        playerPoolBadge.textContent = `Slate ${nbaCurrentSlate}`;
        playerPoolBadge.classList.add('visible');

        entriesBadge.textContent = `Slate ${nbaCurrentSlate}`;
        entriesBadge.classList.add('visible');

        lineupsBadge.textContent = `Slate ${nbaCurrentSlate}`;
        lineupsBadge.classList.add('visible');
    } else {
        playerPoolBadge.classList.remove('visible');
        entriesBadge.classList.remove('visible');
        lineupsBadge.classList.remove('visible');
    }
}

function renderNbaPlayerPool() {
    const container = nbaPlayerPoolContainer;
    const searchTerm = document.getElementById('nbaPlayerSearch').value.toLowerCase();
    const activeFilter = document.querySelector('#nbaPositionFilters .filter-pill.active');
    const posFilter = activeFilter ? activeFilter.dataset.pos : 'all';
    const isCptView = nbaPlayerPoolView === 'cpt';

    let filtered = nbaPlayers.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                              p.team.toLowerCase().includes(searchTerm);
        const matchesPosition = posFilter === 'all' || p.position === posFilter;
        return matchesSearch && matchesPosition;
    });

    // Sort by projection based on view (CPT = 1.5x multiplier)
    filtered.sort((a, b) => {
        const aProj = isCptView ? (a.cptProjection || a.flexProjection * 1.5) : a.flexProjection;
        const bProj = isCptView ? (b.cptProjection || b.flexProjection * 1.5) : b.flexProjection;
        return nbaPlayerPoolSort.direction === 'desc' ? bProj - aProj : aProj - bProj;
    });

    document.getElementById('nbaPlayerCount').textContent = filtered.length;

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
                    <th class="sortable ${nbaPlayerPoolSort.column === 'projection' ? (nbaPlayerPoolSort.direction === 'desc' ? 'sort-desc' : 'sort-asc') : ''}">Proj</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtered.slice(0, 100).forEach(p => {
        const salary = isCptView ? (p.cptSalary || Math.round(p.flexSalary * 1.5)) : p.flexSalary;
        const projection = isCptView ? (p.cptProjection || p.flexProjection * 1.5) : p.flexProjection;
        const projColor = isCptView ? 'var(--accent-tertiary)' : 'var(--accent-primary)';

        html += `
            <tr>
                <td style="font-weight: 500;">${p.name}</td>
                <td><span class="position-badge ${p.position.toLowerCase()}">${p.position}</span></td>
                <td class="team-badge">${p.team}</td>
                <td>$${salary.toLocaleString()}</td>
                <td style="color: ${projColor}; font-weight: 600;">${projection.toFixed(1)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderNbaEntries(contestGroups) {
    const container = document.getElementById('nbaEntriesGroupedContainer');

    if (nbaEntries.length === 0) {
        container.innerHTML = '';
        document.getElementById('nbaEntriesCount').textContent = '0 entries';
        document.getElementById('nbaTotalEntryFees').textContent = '$0.00 total';
        return;
    }

    const grouped = new Map();
    nbaEntries.forEach(entry => {
        const key = entry.contestName;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(entry);
    });

    let totalFees = 0;
    nbaEntries.forEach(e => {
        const fee = parseFloat(e.entryFee.replace(/[$,]/g, '')) || 0;
        totalFees += fee;
    });

    document.getElementById('nbaEntriesCount').textContent = `${nbaEntries.length} entries`;
    document.getElementById('nbaTotalEntryFees').textContent = `$${totalFees.toFixed(2)} total`;

    let html = '';
    grouped.forEach((contestEntries, contestName) => {
        const isGPP = !isNbaCashGame(contestName);
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

function isNbaCashGame(contestName) {
    const lowerName = contestName.toLowerCase();
    return lowerName.includes('double up') ||
           lowerName.includes('50/50') ||
           lowerName.includes('head to head') ||
           lowerName.includes('h2h') ||
           lowerName.includes('cash');
}

async function generateNbaLineups() {
    if (nbaPlayers.length === 0) return;

    nbaGenerateBtn.disabled = true;
    nbaProgressContainer.classList.add('active');
    nbaLineupsCard.style.display = 'block';
    nbaLineups = [];
    nbaCurrentPage = 1;

    const teams = [...new Set(nbaPlayers.map(p => p.team))];
    if (teams.length < 2) {
        alert('Need players from at least 2 teams for Showdown');
        nbaGenerateBtn.disabled = false;
        nbaProgressContainer.classList.remove('active');
        return;
    }

    const isTimeMode = nbaGenerationMode === 'time';
    const targetCount = isTimeMode ? Infinity : nbaSelectedLineupCount;
    const targetTime = isTimeMode ? nbaSelectedTimeSeconds * 1000 : Infinity;
    const startTime = Date.now();

    const lineupSet = new Set();

    const sortedPlayers = [...nbaPlayers].sort((a, b) => b.flexProjection - a.flexProjection);

    nbaProgressText.textContent = 'Finding optimal lineups...';
    nbaProgressFill.style.width = '10%';
    await new Promise(r => setTimeout(r, 0));

    const optimalLineups = [];

    const playersByCptProj = [...nbaPlayers].sort((a, b) => (b.flexProjection * 1.5) - (a.flexProjection * 1.5));

    for (let cptIdx = 0; cptIdx < playersByCptProj.length; cptIdx++) {
        const captain = playersByCptProj[cptIdx];

        if (cptIdx % 5 === 0) {
            const elapsed = Date.now() - startTime;
            if (isTimeMode) {
                const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                nbaProgressFill.style.width = timeProgress + '%';
                nbaProgressText.textContent = `Finding optimal lineups... ${Math.ceil((targetTime - elapsed) / 1000)}s remaining`;
            } else {
                nbaProgressFill.style.width = (10 + (cptIdx / playersByCptProj.length) * 40) + '%';
                nbaProgressText.textContent = `Analyzing captain ${cptIdx + 1}/${playersByCptProj.length}...`;
            }
            await new Promise(r => setTimeout(r, 0));
        }

        const lineup = generateNbaOptimalLineupForCaptain(captain, sortedPlayers, teams);
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
    const projectionThreshold = maxProjection * (nbaProjectionFloor / 100);

    for (const lineup of optimalLineups) {
        if (lineup.totalSalary >= nbaMinSalary &&
            lineup.totalSalary <= nbaMaxSalary &&
            lineup.totalProjection >= projectionThreshold) {
            nbaLineups.push(lineup);
        }
    }

    const needMoreLineups = isTimeMode || nbaLineups.length < targetCount;

    if (needMoreLineups) {
        nbaProgressText.textContent = isTimeMode ? 'Generating lineups...' : 'Generating additional lineups...';
        nbaProgressFill.style.width = '60%';
        await new Promise(r => setTimeout(r, 0));

        let attempts = 0;
        let lastLineupCount = nbaLineups.length;
        let stallCounter = 0;
        const maxStallAttempts = 5000;

        while (true) {
            attempts++;

            const elapsed = Date.now() - startTime;

            if (isTimeMode && elapsed >= targetTime) {
                nbaProgressText.textContent = `Time's up! Generated ${nbaLineups.length} lineups`;
                break;
            }

            if (!isTimeMode && nbaLineups.length >= targetCount) {
                break;
            }

            if (stallCounter >= maxStallAttempts) {
                nbaProgressText.textContent = `Stopped early - found all unique lineups (${nbaLineups.length})`;
                break;
            }

            if (attempts % 500 === 0) {
                if (isTimeMode) {
                    const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                    const remaining = Math.max(0, Math.ceil((targetTime - elapsed) / 1000));
                    nbaProgressFill.style.width = timeProgress + '%';
                    nbaProgressText.textContent = `Generated ${nbaLineups.length} lineups... ${remaining}s remaining`;
                } else {
                    const progress = 60 + Math.min((nbaLineups.length / targetCount) * 40, 39);
                    nbaProgressFill.style.width = progress + '%';
                    nbaProgressText.textContent = `Generated ${nbaLineups.length} of ${targetCount} lineups...`;
                }
                await new Promise(r => setTimeout(r, 0));

                if (nbaLineups.length === lastLineupCount) {
                    stallCounter += 500;
                } else {
                    stallCounter = 0;
                    lastLineupCount = nbaLineups.length;
                }
            }

            const lineup = generateNbaRandomizedLineup(sortedPlayers, teams);
            if (lineup) {
                if (lineup.totalSalary < nbaMinSalary || lineup.totalSalary > nbaMaxSalary) {
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
                    nbaLineups.push(lineup);
                    stallCounter = 0;
                } else {
                    stallCounter++;
                }
            } else {
                stallCounter++;
            }
        }
    }

    nbaLineups.sort((a, b) => b.totalProjection - a.totalProjection);

    nbaProgressFill.style.width = '100%';
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    nbaProgressText.textContent = `Complete! ${nbaLineups.length} lineups in ${finalTime}s`;

    document.getElementById('nbaLineupsGenerated').textContent = nbaLineups.length;
    document.getElementById('nbaTopProjection').textContent = nbaLineups.length > 0 ? nbaLineups[0].totalProjection.toFixed(2) : '0.00';

    const avgProj = nbaLineups.length > 0
        ? (nbaLineups.reduce((sum, l) => sum + l.totalProjection, 0) / nbaLineups.length).toFixed(2)
        : '0.00';
    document.getElementById('nbaAvgProjection').textContent = avgProj;

    renderNbaLineups();

    if (nbaCurrentSlate && nbaSlates[nbaCurrentSlate]) {
        nbaSlates[nbaCurrentSlate].lineups = [...nbaLineups];
    }

    updateNbaSectionBadges();

    if (nbaEntries.length > 0) {
        document.getElementById('nbaOptimizeBtn').disabled = false;
        document.getElementById('nbaOptimizeStatus').textContent = `${nbaLineups.length} lineups ready to assign`;
    }

    setTimeout(() => {
        nbaProgressContainer.classList.remove('active');
        nbaGenerateBtn.disabled = false;
    }, 1500);
}

function generateNbaOptimalLineupForCaptain(captain, sortedPlayers, teams) {
    const cptSalary = Math.round(captain.flexSalary * 1.5);
    const remainingSalary = NBA_SALARY_CAP - cptSalary;

    const available = sortedPlayers.filter(p => p.id !== captain.id);

    const bestCombo = findNbaBestFivePlayers(available, remainingSalary, captain.team, cptSalary);

    if (!bestCombo) return null;

    const totalSalary = cptSalary + bestCombo.reduce((sum, p) => sum + p.flexSalary, 0);
    const totalProjection = (captain.flexProjection * 1.5) + bestCombo.reduce((sum, p) => sum + p.flexProjection, 0);

    // Calculate percentile totals
    const totalPctl25 = (captain.cptPctl25 || captain.flexPctl25 * 1.5 || 0) +
                        bestCombo.reduce((sum, p) => sum + (p.flexPctl25 || 0), 0);
    const totalPctl75 = (captain.cptPctl75 || captain.flexPctl75 * 1.5 || 0) +
                        bestCombo.reduce((sum, p) => sum + (p.flexPctl75 || 0), 0);
    const totalPctl85 = (captain.cptPctl85 || captain.flexPctl85 * 1.5 || 0) +
                        bestCombo.reduce((sum, p) => sum + (p.flexPctl85 || 0), 0);
    const totalPctl95 = (captain.cptPctl95 || captain.flexPctl95 * 1.5 || 0) +
                        bestCombo.reduce((sum, p) => sum + (p.flexPctl95 || 0), 0);
    const totalStd = (captain.cptStd || captain.flexStd * 1.5 || 0) +
                     bestCombo.reduce((sum, p) => sum + (p.flexStd || 0), 0);

    return {
        players: [
            { ...captain, isCpt: true, cptSalary },
            ...bestCombo.map(p => ({ ...p, isCpt: false }))
        ],
        totalSalary,
        totalProjection,
        totalPctl25,
        totalPctl75,
        totalPctl85,
        totalPctl95,
        totalStd
    };
}

function findNbaBestFivePlayers(players, maxSalary, captainTeam) {
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

function generateNbaRandomizedLineup(sortedPlayers, teams) {
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
    let remainingSalary = NBA_SALARY_CAP - cptSalary;
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
    if (totalSalary > NBA_SALARY_CAP) return null;

    const totalProjection = (captain.flexProjection * 1.5) + flexPlayers.reduce((sum, p) => sum + p.flexProjection, 0);

    // Calculate percentile totals
    const totalPctl25 = (captain.cptPctl25 || captain.flexPctl25 * 1.5 || 0) +
                        flexPlayers.reduce((sum, p) => sum + (p.flexPctl25 || 0), 0);
    const totalPctl75 = (captain.cptPctl75 || captain.flexPctl75 * 1.5 || 0) +
                        flexPlayers.reduce((sum, p) => sum + (p.flexPctl75 || 0), 0);
    const totalPctl85 = (captain.cptPctl85 || captain.flexPctl85 * 1.5 || 0) +
                        flexPlayers.reduce((sum, p) => sum + (p.flexPctl85 || 0), 0);
    const totalPctl95 = (captain.cptPctl95 || captain.flexPctl95 * 1.5 || 0) +
                        flexPlayers.reduce((sum, p) => sum + (p.flexPctl95 || 0), 0);
    const totalStd = (captain.cptStd || captain.flexStd * 1.5 || 0) +
                     flexPlayers.reduce((sum, p) => sum + (p.flexStd || 0), 0);

    return {
        players: [
            { ...captain, isCpt: true, cptSalary: cptSalary },
            ...flexPlayers.map(p => ({ ...p, isCpt: false }))
        ],
        totalSalary,
        totalProjection,
        totalPctl25,
        totalPctl75,
        totalPctl85,
        totalPctl95,
        totalStd
    };
}

function renderNbaLineups() {
    document.getElementById('nbaLineupCountDisplay').textContent = `${nbaLineups.length} lineups`;

    // Update all sortable headers
    const sortableHeaders = document.querySelectorAll('#nbaLineupOutput .lineup-row.header .sortable');
    const headerLabels = {
        'rank': 'Rank',
        'salary': 'Salary',
        'points': 'Points',
        'pctl25': '25th',
        'pctl75': '75th',
        'pctl85': '85th',
        'pctl95': '95th',
        'std': 'STD'
    };

    sortableHeaders.forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
        const col = h.dataset.sort;
        const label = headerLabels[col] || col;
        if (nbaCurrentSort.column === col) {
            h.classList.add(nbaCurrentSort.direction === 'desc' ? 'sort-desc' : 'sort-asc');
            h.textContent = label + (nbaCurrentSort.direction === 'desc' ? ' ↓' : ' ↑');
        } else {
            h.textContent = label + ' ⇅';
        }
    });

    const paginationTop = document.getElementById('nbaPaginationTop');

    if (nbaLineups.length === 0) {
        paginationTop.style.display = 'none';
        nbaLineupRows.innerHTML = `
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

    const sortedLineups = [...nbaLineups];
    if (nbaCurrentSort.column === 'points') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? b.totalProjection - a.totalProjection
            : a.totalProjection - b.totalProjection);
    } else if (nbaCurrentSort.column === 'salary') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? b.totalSalary - a.totalSalary
            : a.totalSalary - b.totalSalary);
    } else if (nbaCurrentSort.column === 'pctl25') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? (b.totalPctl25 || 0) - (a.totalPctl25 || 0)
            : (a.totalPctl25 || 0) - (b.totalPctl25 || 0));
    } else if (nbaCurrentSort.column === 'pctl75') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? (b.totalPctl75 || 0) - (a.totalPctl75 || 0)
            : (a.totalPctl75 || 0) - (b.totalPctl75 || 0));
    } else if (nbaCurrentSort.column === 'pctl85') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? (b.totalPctl85 || 0) - (a.totalPctl85 || 0)
            : (a.totalPctl85 || 0) - (b.totalPctl85 || 0));
    } else if (nbaCurrentSort.column === 'pctl95') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? (b.totalPctl95 || 0) - (a.totalPctl95 || 0)
            : (a.totalPctl95 || 0) - (b.totalPctl95 || 0));
    } else if (nbaCurrentSort.column === 'std') {
        sortedLineups.sort((a, b) => nbaCurrentSort.direction === 'desc'
            ? (b.totalStd || 0) - (a.totalStd || 0)
            : (a.totalStd || 0) - (b.totalStd || 0));
    } else if (nbaCurrentSort.column === 'rank') {
        if (nbaCurrentSort.direction === 'asc') {
            sortedLineups.reverse();
        }
    }

    const totalPages = Math.ceil(sortedLineups.length / nbaLineupsPerPage);
    nbaCurrentPage = Math.min(nbaCurrentPage, totalPages);
    nbaCurrentPage = Math.max(nbaCurrentPage, 1);

    const startIdx = (nbaCurrentPage - 1) * nbaLineupsPerPage;
    const endIdx = Math.min(startIdx + nbaLineupsPerPage, sortedLineups.length);
    const pageLineups = sortedLineups.slice(startIdx, endIdx);

    if (sortedLineups.length > nbaLineupsPerPage) {
        paginationTop.style.display = 'flex';
        document.getElementById('nbaPageInfoTop').textContent = `Page ${nbaCurrentPage} of ${totalPages}`;
        document.getElementById('nbaShowingInfoTop').textContent = `Showing ${startIdx + 1}-${endIdx} of ${sortedLineups.length}`;
        document.getElementById('nbaPrevPageTop').disabled = nbaCurrentPage <= 1;
        document.getElementById('nbaNextPageTop').disabled = nbaCurrentPage >= totalPages;
    } else {
        paginationTop.style.display = 'none';
    }

    nbaLineupRows.innerHTML = pageLineups.map((lineup, idx) => {
        const cpt = lineup.players[0];
        const flex = lineup.players.slice(1);
        const actualRank = startIdx + idx + 1;

        // Format percentile values (show '-' if no data)
        const formatPctl = (val) => val ? val.toFixed(1) : '-';

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
                <div class="lineup-pctl pctl-25">${formatPctl(lineup.totalPctl25)}</div>
                <div class="lineup-pctl pctl-75">${formatPctl(lineup.totalPctl75)}</div>
                <div class="lineup-pctl pctl-85">${formatPctl(lineup.totalPctl85)}</div>
                <div class="lineup-pctl pctl-95">${formatPctl(lineup.totalPctl95)}</div>
                <div class="lineup-pctl pctl-std">${formatPctl(lineup.totalStd)}</div>
            </div>
        `;
    }).join('');
}

function optimizeNbaEntries() {
    if (nbaLineups.length === 0 || nbaEntries.length === 0) {
        alert('No entries to optimize!');
        return;
    }

    const sortedLineups = [...nbaLineups].sort((a, b) => b.totalProjection - a.totalProjection);
    const topLineup = sortedLineups[0];

    let gppLineupIndex = 0;
    const usedLineups = new Set();

    const cashEntries = [];
    const gppEntries = [];

    nbaEntries.forEach(entry => {
        if (nbaOptimizeMode === 'cash' || isNbaCashGame(entry.contestName)) {
            cashEntries.push(entry);
        } else {
            gppEntries.push(entry);
        }
    });

    cashEntries.forEach(entry => {
        assignNbaLineupToEntry(entry, topLineup);
    });

    gppEntries.forEach(entry => {
        while (gppLineupIndex < sortedLineups.length && usedLineups.has(gppLineupIndex)) {
            gppLineupIndex++;
        }

        if (gppLineupIndex < sortedLineups.length) {
            assignNbaLineupToEntry(entry, sortedLineups[gppLineupIndex]);
            usedLineups.add(gppLineupIndex);
            gppLineupIndex++;
        } else {
            assignNbaLineupToEntry(entry, sortedLineups[gppLineupIndex % sortedLineups.length]);
            gppLineupIndex++;
        }
    });

    const cashCount = cashEntries.length;
    const gppCount = gppEntries.length;
    nbaOptimizeStatus.textContent = `✓ Optimized! ${cashCount} cash (top lineup), ${gppCount} GPP (unique)`;
    nbaOptimizeStatus.className = 'optimize-status success';

    document.getElementById('nbaExportEntriesBtn').disabled = false;

    if (nbaCurrentSlate && nbaSlates[nbaCurrentSlate]) {
        nbaSlates[nbaCurrentSlate].entries = [...nbaEntries];
    }

    renderNbaEntries(new Map());
}

function assignNbaLineupToEntry(entry, lineup) {
    const captain = lineup.players.find(p => p.isCpt);
    const flexPlayers = lineup.players.filter(p => !p.isCpt);

    const getCptNameId = (player) => {
        const fullPlayer = nbaPlayers.find(p => p.name === player.name);
        if (fullPlayer && fullPlayer.cptNameId) {
            return fullPlayer.cptNameId;
        }
        return `${player.name} (${player.id})`;
    };

    const getFlexNameId = (player) => {
        const fullPlayer = nbaPlayers.find(p => p.name === player.name);
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

function exportNbaEntriesToCSV() {
    if (nbaEntries.length === 0) {
        alert('No entries to export!');
        return;
    }

    const headers = ['Entry ID', 'Contest Name', 'Contest ID', 'Entry Fee', 'CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];

    const rows = nbaEntries.map(entry => {
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
    link.setAttribute('download', `DK_NBA_Optimized_Entries_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    nbaOptimizeStatus.textContent = `✓ Exported ${nbaEntries.length} entries to CSV`;
}

// ==========================================
// NBA SHOWDOWN INITIALIZATION
// ==========================================

let nbaShowdownInitialized = false;

function initNbaShowdown() {
    if (nbaShowdownInitialized) {
        console.log('NBA Showdown already initialized');
        return;
    }

    console.log('Initializing NBA Showdown...');
    initNbaShowdownDOM();
    initNbaShowdownEventListeners();
    nbaShowdownInitialized = true;
    console.log('NBA Showdown initialized successfully');
}

// Auto-initialize when DOM is ready if NBA tab is visible
document.addEventListener('DOMContentLoaded', () => {
    const nbaTab = document.getElementById('nbaTab');
    if (nbaTab && nbaTab.style.display !== 'none') {
        initNbaShowdown();
    }
});
