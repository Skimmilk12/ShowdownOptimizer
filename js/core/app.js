// ==========================================
// MAIN APPLICATION - Initialization and shared functionality
// ==========================================

// Current sport
let currentSport = null;

// Sport selector functions
function selectSport(sportId) {
    if (sportId !== 'madden') {
        // Other sports not ready yet
        return;
    }

    currentSport = sportId;

    // Save to localStorage
    try {
        localStorage.setItem('selectedSport', sportId);
    } catch (e) {}

    // Hide sport selector
    document.getElementById('sportSelector').style.display = 'none';

    // Show main tabs and content
    document.getElementById('mainTabs').style.display = 'flex';
    document.getElementById('showdownTab').style.display = 'block';
    document.getElementById('showdownTab').classList.add('active');
    document.getElementById('classicTab').style.display = 'none';
    document.getElementById('playerdataTab').style.display = 'none';
    document.getElementById('converterTab').style.display = 'none';

    // Update header
    document.getElementById('headerTitle').textContent = 'NFL Madden Optimizer';
    document.getElementById('headerBadge').textContent = 'DraftKings';
}

function backToSportSelector() {
    currentSport = null;

    // Clear from localStorage
    try {
        localStorage.removeItem('selectedSport');
    } catch (e) {}

    // Show sport selector
    document.getElementById('sportSelector').style.display = 'block';

    // Hide main tabs and all content
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('showdownTab').style.display = 'none';
    document.getElementById('classicTab').style.display = 'none';
    document.getElementById('playerdataTab').style.display = 'none';
    document.getElementById('converterTab').style.display = 'none';

    // Reset header
    document.getElementById('headerTitle').textContent = 'Showdown Optimizer';
    document.getElementById('headerBadge').textContent = 'Select Sport';
}

function checkSavedSport() {
    try {
        const savedSport = localStorage.getItem('selectedSport');
        if (savedSport === 'madden') {
            selectSport('madden');
        }
    } catch (e) {}
}

// Player Data Global State
const playerGameData = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DST: []
};

let correlationMatrix = [];
let teamCorrelations = {}; // Organized by team
let positionPairCorrelations = {}; // Organized by position pair

// Position list for iteration
const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];

// ==========================================
// TAB NAVIGATION
// ==========================================

function initTabNavigation() {
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide all tab content and show only the selected one
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            const selectedTab = document.getElementById(tabName + 'Tab');
            if (selectedTab) {
                selectedTab.style.display = 'block';
                selectedTab.classList.add('active');
            }
        });
    });
}

// ==========================================
// PLAYER DATA TAB FUNCTIONALITY
// ==========================================

// Detect position from filename
function detectPositionFromFilename(filename) {
    const name = filename.toUpperCase();
    if (name.includes('QB') || name.includes('QUARTERBACK')) return 'QB';
    if (name.includes('RB') || name.includes('RUNNING')) return 'RB';
    if (name.includes('WR') || name.includes('WIDE') || name.includes('RECEIVER')) return 'WR';
    if (name.includes('TE') || name.includes('TIGHT')) return 'TE';
    if (name.includes('DST') || name.includes('DEF') || name.includes('DEFENSE')) return 'DST';
    return null;
}

// Handle ALL files upload
async function handleAllPlayerDataUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let loadedCount = 0;

    for (const file of files) {
        const position = detectPositionFromFilename(file.name);
        if (!position) {
            console.warn(`Could not detect position from filename: ${file.name}`);
            continue;
        }

        try {
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });

            parsePlayerDataCSV(text, position);
            updatePlayerDataUI(position, file.name);
            loadedCount++;

            // Update indicator
            const indicator = document.querySelector(`.file-indicator[data-pos="${position}"]`);
            if (indicator) indicator.classList.add('loaded');
        } catch (err) {
            console.error(`Error loading ${file.name}:`, err);
        }
    }

    // Check if all loaded
    checkAllFilesLoaded();
    updateAllCardStatus();

    if (loadedCount > 0) {
        console.log(`Loaded ${loadedCount} position files`);
    }

    event.target.value = '';
}

// Update the ALL card status
function updateAllCardStatus() {
    const allLoaded = positions.every(pos => playerGameData[pos].length > 0);
    const allCard = document.getElementById('pdAllCard');

    if (allCard) {
        if (allLoaded) {
            allCard.classList.add('all-loaded');
        } else {
            allCard.classList.remove('all-loaded');
        }
    }

    // Update indicators
    positions.forEach(pos => {
        const indicator = document.querySelector(`.file-indicator[data-pos="${pos}"]`);
        if (indicator) {
            if (playerGameData[pos].length > 0) {
                indicator.classList.add('loaded');
            } else {
                indicator.classList.remove('loaded');
            }
        }
    });
}

function initPlayerDataTab() {
    // Setup ALL upload handler
    const allZone = document.getElementById('pdAllZone');
    const allInput = document.getElementById('pdAllInput');

    if (allZone && allInput) {
        allZone.addEventListener('click', () => allInput.click());

        allZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            allZone.classList.add('dragover');
        });

        allZone.addEventListener('dragleave', () => {
            allZone.classList.remove('dragover');
        });

        allZone.addEventListener('drop', (e) => {
            e.preventDefault();
            allZone.classList.remove('dragover');
            // Create a fake event with the files
            handleAllPlayerDataUpload({ target: { files: e.dataTransfer.files } });
        });

        allInput.addEventListener('change', handleAllPlayerDataUpload);
    }

    // Setup upload handlers for each position
    positions.forEach(pos => {
        const zone = document.getElementById(`pd${pos}Zone`);
        const input = document.getElementById(`pd${pos}Input`);

        if (!zone || !input) return;

        // Click to upload
        zone.addEventListener('click', () => input.click());

        // Drag and drop
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
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                handlePlayerDataFile(file, pos);
            }
        });

        // File input change
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePlayerDataFile(file, pos);
            }
            input.value = '';
        });
    });

    // Compute Correlations Button
    const computeBtn = document.getElementById('computeCorrelationsBtn');
    if (computeBtn) {
        computeBtn.addEventListener('click', computeCorrelations);
    }

    // Position Pair Tab clicks
    document.querySelectorAll('.position-pair-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.position-pair-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderPositionPairTable(tab.dataset.pair);
        });
    });

    // Team Detail Modal close handlers
    const teamDetailClose = document.getElementById('teamDetailClose');
    if (teamDetailClose) {
        teamDetailClose.addEventListener('click', () => {
            document.getElementById('teamDetailOverlay').classList.remove('active');
        });
    }

    const teamDetailOverlay = document.getElementById('teamDetailOverlay');
    if (teamDetailOverlay) {
        teamDetailOverlay.addEventListener('click', (e) => {
            if (e.target === teamDetailOverlay) {
                teamDetailOverlay.classList.remove('active');
            }
        });
    }
}

function handlePlayerDataFile(file, position) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvData = e.target.result;
        parsePlayerDataCSV(csvData, position);
        updatePlayerDataUI(position, file.name);
        checkAllFilesLoaded();
    };
    reader.readAsText(file);
}

function parsePlayerDataCSV(csvData, position) {
    const lines = csvData.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

    // Find column indices
    const playerIdx = headers.findIndex(h => h === 'PLAYER');
    const teamIdx = headers.findIndex(h => h === 'TEAM');
    const weekIdx = headers.findIndex(h => h === 'WEEK');
    const oppIdx = headers.findIndex(h => h === 'OPPONENT');
    const fptsIdx = headers.findIndex(h => h === 'FPTS');

    if (fptsIdx === -1) {
        console.error(`No FPTS column found for ${position}`);
        return;
    }

    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV properly (commas in quoted strings)
        const row = parseCSVLine(line);

        if (row.length <= fptsIdx) continue;

        const playerName = row[playerIdx]?.trim();
        const team = row[teamIdx]?.trim();
        const week = parseInt(row[weekIdx]?.trim());
        const opponent = row[oppIdx]?.trim();
        const fpts = parseFloat(row[fptsIdx]?.trim());

        if (playerName && !isNaN(week) && !isNaN(fpts)) {
            records.push({
                name: playerName,
                position: position,
                team: team,
                week: week,
                opponent: opponent,
                fpts: fpts
            });
        }
    }

    playerGameData[position] = records;
    console.log(`Loaded ${records.length} ${position} records`);
}

function updatePlayerDataUI(position, filename) {
    const card = document.getElementById(`pd${position}Card`);
    const status = document.getElementById(`pd${position}Status`);
    const recordCount = playerGameData[position].length;

    card.classList.add('loaded');
    status.innerHTML = `
        <div class="pd-file-info">
            <span class="pd-status-text">✓ ${recordCount} records loaded</span>
            <span class="remove-btn" onclick="removePlayerData('${position}')">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </span>
        </div>
    `;

    updatePlayerDataStats();
}

function removePlayerData(position) {
    playerGameData[position] = [];
    const card = document.getElementById(`pd${position}Card`);
    const status = document.getElementById(`pd${position}Status`);

    card.classList.remove('loaded');
    status.innerHTML = '<span class="pd-status-text">No file loaded</span>';

    updatePlayerDataStats();
    checkAllFilesLoaded();
}

function updatePlayerDataStats() {
    let totalRecords = 0;
    const uniquePlayers = new Set();
    const teams = new Set();

    positions.forEach(pos => {
        totalRecords += playerGameData[pos].length;
        playerGameData[pos].forEach(record => {
            uniquePlayers.add(`${record.name}-${record.team}`);
            if (record.team) teams.add(record.team);
        });
    });

    document.getElementById('pdTotalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('pdUniquePlayers').textContent = uniquePlayers.size;
    document.getElementById('pdTeams').textContent = teams.size;
}

function checkAllFilesLoaded() {
    const allLoaded = positions.every(pos => playerGameData[pos].length > 0);
    const computeBtn = document.getElementById('computeCorrelationsBtn');
    computeBtn.disabled = !allLoaded;

    const statusEl = document.getElementById('pdStatus');
    if (allLoaded) {
        statusEl.textContent = 'Ready!';
        statusEl.style.color = 'var(--accent-primary)';
    } else {
        const loadedCount = positions.filter(pos => playerGameData[pos].length > 0).length;
        statusEl.textContent = `${loadedCount}/5 Files`;
        statusEl.style.color = '';
    }
}

function computeCorrelations() {
    console.log('Computing correlations...');

    // Combine all player data
    const allRecords = [];
    positions.forEach(pos => {
        allRecords.push(...playerGameData[pos]);
    });

    // Group by player
    const playerGames = {};
    allRecords.forEach(record => {
        const key = `${record.name}|${record.team}|${record.position}`;
        if (!playerGames[key]) {
            playerGames[key] = [];
        }
        playerGames[key].push(record);
    });

    // Calculate correlations between teammates
    const correlations = [];
    const playerKeys = Object.keys(playerGames);

    for (let i = 0; i < playerKeys.length; i++) {
        const key1 = playerKeys[i];
        const [name1, team1, pos1] = key1.split('|');
        const records1 = playerGames[key1];

        for (let j = i + 1; j < playerKeys.length; j++) {
            const key2 = playerKeys[j];
            const [name2, team2, pos2] = key2.split('|');
            const records2 = playerGames[key2];

            // Only correlate teammates
            if (team1 !== team2) continue;

            // Find common weeks
            const weeks1 = {};
            records1.forEach(r => { weeks1[r.week] = r.fpts; });

            const weeks2 = {};
            records2.forEach(r => { weeks2[r.week] = r.fpts; });

            const commonWeeks = Object.keys(weeks1).filter(w => weeks2[w] !== undefined);

            if (commonWeeks.length >= 5) {
                const x = commonWeeks.map(w => weeks1[w]);
                const y = commonWeeks.map(w => weeks2[w]);

                const corr = pearsonCorrelation(x, y);

                if (corr !== null) {
                    correlations.push({
                        player1: name1,
                        pos1: pos1,
                        player2: name2,
                        pos2: pos2,
                        team: team1,
                        correlation: corr,
                        games: commonWeeks.length
                    });
                }
            }
        }
    }

    // Sort by absolute correlation
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    correlationMatrix = correlations;

    // Organize by team
    organizeByTeam(correlations);

    // Organize by position pair
    organizeByPositionPair(correlations);

    // Save correlations to localStorage
    saveCorrelationsToStorage();

    // Update UI
    document.getElementById('pdCorrelations').textContent = correlations.length;
    document.getElementById('correlationResultsCard').style.display = 'block';
    document.getElementById('teamCardsContainer').style.display = 'block';
    document.getElementById('positionPairCard').style.display = 'block';

    // Render all sections
    renderPositionMatrix(correlations);
    renderTeamCards();
    renderPositionPairTable('QB-WR');

    console.log(`Computed ${correlations.length} correlations`);
}

// Save correlations to localStorage
function saveCorrelationsToStorage() {
    try {
        localStorage.setItem('maddenCorrelationMatrix', JSON.stringify(correlationMatrix));
        localStorage.setItem('maddenTeamCorrelations', JSON.stringify(teamCorrelations));
        localStorage.setItem('maddenPositionPairCorrelations', JSON.stringify(positionPairCorrelations));
        console.log('Correlations saved to localStorage');
    } catch (e) {
        console.error('Failed to save correlations:', e);
    }
}

// Load correlations from localStorage
function loadCorrelationsFromStorage() {
    try {
        const matrix = localStorage.getItem('maddenCorrelationMatrix');
        const teams = localStorage.getItem('maddenTeamCorrelations');
        const pairs = localStorage.getItem('maddenPositionPairCorrelations');

        if (matrix && teams && pairs) {
            correlationMatrix = JSON.parse(matrix);
            teamCorrelations = JSON.parse(teams);
            positionPairCorrelations = JSON.parse(pairs);

            // Update UI
            document.getElementById('pdCorrelations').textContent = correlationMatrix.length;
            document.getElementById('correlationResultsCard').style.display = 'block';
            document.getElementById('teamCardsContainer').style.display = 'block';
            document.getElementById('positionPairCard').style.display = 'block';

            // Render all sections
            renderPositionMatrix(correlationMatrix);
            renderTeamCards();
            renderPositionPairTable('QB-WR');

            console.log('Correlations restored from localStorage');
            return true;
        }
    } catch (e) {
        console.error('Failed to load correlations:', e);
    }
    return false;
}

function organizeByTeam(correlations) {
    teamCorrelations = {};

    correlations.forEach(corr => {
        if (!teamCorrelations[corr.team]) {
            teamCorrelations[corr.team] = [];
        }
        teamCorrelations[corr.team].push(corr);
    });

    // Sort each team's correlations
    Object.keys(teamCorrelations).forEach(team => {
        teamCorrelations[team].sort((a, b) => b.correlation - a.correlation);
    });
}

function organizeByPositionPair(correlations) {
    positionPairCorrelations = {};

    correlations.forEach(corr => {
        // Create normalized pair key (alphabetical order)
        const pair = [corr.pos1, corr.pos2].sort().join('-');

        if (!positionPairCorrelations[pair]) {
            positionPairCorrelations[pair] = [];
        }
        positionPairCorrelations[pair].push(corr);
    });

    // Sort each pair's correlations
    Object.keys(positionPairCorrelations).forEach(pair => {
        positionPairCorrelations[pair].sort((a, b) => b.correlation - a.correlation);
    });
}

function renderPositionMatrix(correlations) {
    // Calculate average correlation for each position pair
    const pairAverages = {};
    const pairCounts = {};

    correlations.forEach(corr => {
        const pair = [corr.pos1, corr.pos2].sort().join('-');
        if (!pairAverages[pair]) {
            pairAverages[pair] = 0;
            pairCounts[pair] = 0;
        }
        pairAverages[pair] += corr.correlation;
        pairCounts[pair]++;
    });

    Object.keys(pairAverages).forEach(pair => {
        pairAverages[pair] = pairAverages[pair] / pairCounts[pair];
    });

    const posOrder = ['QB', 'RB', 'WR', 'TE', 'DST'];
    const matrix = document.getElementById('positionMatrix');

    let html = `
        <div class="matrix-cell header"></div>
        <div class="matrix-cell header">QB</div>
        <div class="matrix-cell header">RB</div>
        <div class="matrix-cell header">WR</div>
        <div class="matrix-cell header">TE</div>
        <div class="matrix-cell header">DST</div>
    `;

    posOrder.forEach(pos1 => {
        html += `<div class="matrix-cell row-header">${pos1}</div>`;

        posOrder.forEach(pos2 => {
            if (pos1 === pos2) {
                html += `<div class="matrix-cell empty">—</div>`;
            } else {
                const pair = [pos1, pos2].sort().join('-');
                const avg = pairAverages[pair];

                if (avg !== undefined) {
                    let cellClass = 'neutral';
                    if (avg > 0.15) cellClass = 'positive';
                    else if (avg < -0.08) cellClass = 'negative';

                    html += `<div class="matrix-cell ${cellClass}">${avg >= 0 ? '+' : ''}${avg.toFixed(2)}</div>`;
                } else {
                    html += `<div class="matrix-cell empty">—</div>`;
                }
            }
        });
    });

    matrix.innerHTML = html;
}

function renderTeamCards() {
    const grid = document.getElementById('teamCardsGrid');
    const teams = Object.keys(teamCorrelations).sort();

    let html = '';

    teams.forEach(teamAbbr => {
        const teamInfo = NFL_TEAMS[teamAbbr] || { name: teamAbbr, primary: '#666666', logo: '' };
        const corrs = teamCorrelations[teamAbbr];

        // Get top QB stacks (positive correlations with QB)
        const qbStacks = corrs.filter(c =>
            (c.pos1 === 'QB' || c.pos2 === 'QB') && c.correlation > 0.2
        ).slice(0, 3);

        // Get correlations to avoid (negative)
        const avoidPairs = corrs.filter(c => c.correlation < -0.15).slice(0, 2);

        html += `
            <div class="team-card" data-team="${teamAbbr}" onclick="showTeamDetail('${teamAbbr}')">
                <div class="team-card-header" style="border-bottom-color: ${teamInfo.primary};">
                    <img class="team-logo" src="${teamInfo.logo}" alt="${teamInfo.name}" onerror="this.style.display='none'">
                    <div class="team-info">
                        <h4>${teamInfo.city || ''} ${teamInfo.name}</h4>
                        <span>${corrs.length} correlations</span>
                    </div>
                </div>
                <div class="team-card-body">
                    <div class="team-corr-section">
                        <div class="team-corr-label">
                            <span style="color: var(--accent-primary);">●</span> Best QB Stacks
                        </div>
                        ${qbStacks.length > 0 ? qbStacks.map(c => {
                            const nonQB = c.pos1 === 'QB' ? c.player2 : c.player1;
                            const nonQBPos = c.pos1 === 'QB' ? c.pos2 : c.pos1;
                            return `
                                <div class="team-corr-item">
                                    <span class="player-name">${nonQB} (${nonQBPos})</span>
                                    <span class="corr-value positive">+${c.correlation.toFixed(2)}</span>
                                </div>
                            `;
                        }).join('') : '<div class="team-corr-item"><span class="player-name" style="color:var(--text-muted);">No strong stacks</span></div>'}
                    </div>
                    ${avoidPairs.length > 0 ? `
                        <div class="team-corr-section">
                            <div class="team-corr-label">
                                <span style="color: var(--accent-danger);">●</span> Avoid Pairing
                            </div>
                            ${avoidPairs.map(c => `
                                <div class="team-corr-item">
                                    <span class="player-name">${c.player1.split(' ').pop()} / ${c.player2.split(' ').pop()}</span>
                                    <span class="corr-value negative">${c.correlation.toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function showTeamDetail(teamAbbr) {
    const teamInfo = NFL_TEAMS[teamAbbr] || { name: teamAbbr, primary: '#666666', logo: '' };
    const corrs = teamCorrelations[teamAbbr];

    // Update header
    document.getElementById('teamDetailLogo').src = teamInfo.logo;
    document.getElementById('teamDetailName').textContent = `${teamInfo.city || ''} ${teamInfo.name}`;
    document.getElementById('teamDetailHeader').style.borderBottomColor = teamInfo.primary;

    // Group correlations by type
    const qbCorrs = corrs.filter(c => c.pos1 === 'QB' || c.pos2 === 'QB');
    const wrwrCorrs = corrs.filter(c => c.pos1 === 'WR' && c.pos2 === 'WR');
    const rbCorrs = corrs.filter(c => (c.pos1 === 'RB' || c.pos2 === 'RB') && c.pos1 !== 'QB' && c.pos2 !== 'QB');
    const teCorrs = corrs.filter(c => (c.pos1 === 'TE' || c.pos2 === 'TE') && c.pos1 !== 'QB' && c.pos2 !== 'QB');

    let html = '';

    // QB Correlations Section
    if (qbCorrs.length > 0) {
        html += `
            <div class="team-detail-section">
                <h3>
                    <span class="pd-position-badge qb" style="font-size:0.7rem;padding:3px 8px;">QB</span>
                    Quarterback Correlations
                </h3>
                <div class="detail-corr-list">
                    ${qbCorrs.map(c => {
                        const qb = c.pos1 === 'QB' ? c.player1 : c.player2;
                        const other = c.pos1 === 'QB' ? c.player2 : c.player1;
                        const otherPos = c.pos1 === 'QB' ? c.pos2 : c.pos1;
                        const corrClass = c.correlation >= 0 ? 'positive' : 'negative';
                        const barWidth = Math.abs(c.correlation) * 100;
                        return `
                            <div class="detail-corr-row">
                                <div>${qb}</div>
                                <div>
                                    <span class="pd-position-badge ${otherPos.toLowerCase()}" style="font-size:0.6rem;padding:2px 5px;margin-right:4px;">${otherPos}</span>
                                    ${other}
                                </div>
                                <div>
                                    <div class="corr-bar-container">
                                        <div class="corr-bar ${corrClass}" style="width: ${barWidth}%;"></div>
                                    </div>
                                </div>
                                <div><span class="correlation-value ${corrClass}">${c.correlation >= 0 ? '+' : ''}${c.correlation.toFixed(3)}</span></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // WR-WR Section
    if (wrwrCorrs.length > 0) {
        html += `
            <div class="team-detail-section">
                <h3>
                    <span class="pd-position-badge wr" style="font-size:0.7rem;padding:3px 8px;">WR</span>
                    WR vs WR (Same Team Competition)
                </h3>
                <div class="detail-corr-list">
                    ${wrwrCorrs.map(c => {
                        const corrClass = c.correlation >= 0 ? 'positive' : 'negative';
                        const barWidth = Math.abs(c.correlation) * 100;
                        return `
                            <div class="detail-corr-row">
                                <div>${c.player1}</div>
                                <div>${c.player2}</div>
                                <div>
                                    <div class="corr-bar-container">
                                        <div class="corr-bar ${corrClass}" style="width: ${barWidth}%;"></div>
                                    </div>
                                </div>
                                <div><span class="correlation-value ${corrClass}">${c.correlation >= 0 ? '+' : ''}${c.correlation.toFixed(3)}</span></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // RB Correlations Section
    if (rbCorrs.length > 0) {
        html += `
            <div class="team-detail-section">
                <h3>
                    <span class="pd-position-badge rb" style="font-size:0.7rem;padding:3px 8px;">RB</span>
                    Running Back Correlations
                </h3>
                <div class="detail-corr-list">
                    ${rbCorrs.slice(0, 10).map(c => {
                        const corrClass = c.correlation >= 0 ? 'positive' : 'negative';
                        const barWidth = Math.abs(c.correlation) * 100;
                        return `
                            <div class="detail-corr-row">
                                <div>
                                    <span class="pd-position-badge ${c.pos1.toLowerCase()}" style="font-size:0.6rem;padding:2px 5px;margin-right:4px;">${c.pos1}</span>
                                    ${c.player1}
                                </div>
                                <div>
                                    <span class="pd-position-badge ${c.pos2.toLowerCase()}" style="font-size:0.6rem;padding:2px 5px;margin-right:4px;">${c.pos2}</span>
                                    ${c.player2}
                                </div>
                                <div>
                                    <div class="corr-bar-container">
                                        <div class="corr-bar ${corrClass}" style="width: ${barWidth}%;"></div>
                                    </div>
                                </div>
                                <div><span class="correlation-value ${corrClass}">${c.correlation >= 0 ? '+' : ''}${c.correlation.toFixed(3)}</span></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    document.getElementById('teamDetailBody').innerHTML = html;
    document.getElementById('teamDetailOverlay').classList.add('active');
}

function renderPositionPairTable(pair) {
    const table = document.getElementById('positionPairTable');

    // Normalize pair for lookup
    const normalizedPair = pair.split('-').sort().join('-');
    const corrs = positionPairCorrelations[normalizedPair] || [];

    const top50 = corrs.slice(0, 50);

    let html = `
        <div class="correlation-row header">
            <div>Player 1</div>
            <div>Player 2</div>
            <div>Team</div>
            <div>Correlation</div>
        </div>
    `;

    top50.forEach(corr => {
        const corrClass = corr.correlation >= 0 ? 'positive' : 'negative';
        const teamInfo = NFL_TEAMS[corr.team] || { name: corr.team, primary: '#666666' };
        html += `
            <div class="correlation-row">
                <div>
                    <span class="pd-position-badge ${corr.pos1.toLowerCase()}" style="font-size:0.65rem;padding:2px 6px;margin-right:6px;">${corr.pos1}</span>
                    ${corr.player1}
                </div>
                <div>
                    <span class="pd-position-badge ${corr.pos2.toLowerCase()}" style="font-size:0.65rem;padding:2px 6px;margin-right:6px;">${corr.pos2}</span>
                    ${corr.player2}
                </div>
                <div style="color: ${teamInfo.primary}; font-weight: 600;">${corr.team}</div>
                <div><span class="correlation-value ${corrClass}">${corr.correlation >= 0 ? '+' : ''}${corr.correlation.toFixed(3)}</span></div>
            </div>
        `;
    });

    if (top50.length === 0) {
        html += `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No correlations found for this position pair</div>`;
    }

    table.innerHTML = html;
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab navigation
    initTabNavigation();

    // Initialize Player Data tab
    initPlayerDataTab();

    // Initialize Converter tab
    if (typeof initConverterTab === 'function') {
        initConverterTab();
    }

    // Initialize Showdown optimizer
    if (typeof initShowdownDOM === 'function') {
        initShowdownDOM();
        initShowdownEventListeners();
        renderPlayerPool();
    }

    // Initialize Classic optimizer
    if (typeof initClassicDOM === 'function') {
        initClassicDOM();
    }

    // Load stored correlations on page load
    loadCorrelationsFromStorage();

    // Check if a sport was previously selected
    checkSavedSport();
});
