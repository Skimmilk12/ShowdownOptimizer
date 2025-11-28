// ==========================================
// SHOWDOWN OPTIMIZER - CORRELATIONS MODULE
// ==========================================

// Player data storage by position
const playerDataByPosition = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DST: []
};

// Computed correlations storage
let computedCorrelations = {
    positionMatrix: {},
    playerPairs: [],
    teamCorrelations: {}
};

/**
 * Parse player game log CSV
 * @param {string} csvText - Raw CSV text
 * @param {string} position - Position type
 * @returns {Object[]} - Array of game log entries
 */
function parsePlayerDataCSV(csvText, position) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] ? values[idx].trim() : '';
        });
        
        // Normalize common field names
        row.player = row.player || row.name || row.playername || '';
        row.team = row.team || row.tm || '';
        row.opponent = row.opponent || row.opp || '';
        row.points = parseFloat(row.points || row.fpts || row.dkpts || row.fantasypoints || 0);
        row.week = row.week || row.wk || '';
        row.position = position;
        
        if (row.player && !isNaN(row.points)) {
            data.push(row);
        }
    }
    
    return data;
}

/**
 * Load player data for a position
 * @param {File} file - CSV file
 * @param {string} position - Position type
 * @returns {Promise<number>} - Number of records loaded
 */
async function loadPlayerData(file, position) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = parsePlayerDataCSV(e.target.result, position);
                playerDataByPosition[position] = data;
                resolve(data.length);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Check if all position data is loaded
 * @returns {boolean}
 */
function isAllPlayerDataLoaded() {
    return ['QB', 'RB', 'WR', 'TE', 'DST'].every(pos => playerDataByPosition[pos].length > 0);
}

/**
 * Get loaded positions count
 * @returns {Object} - Count info
 */
function getLoadedPositionsInfo() {
    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    const loaded = positions.filter(pos => playerDataByPosition[pos].length > 0);
    return {
        loaded: loaded,
        count: loaded.length,
        total: positions.length,
        isComplete: loaded.length === positions.length
    };
}

/**
 * Compute all correlations from loaded data
 * @returns {Object} - Computed correlations
 */
function computeCorrelations() {
    if (!isAllPlayerDataLoaded()) {
        console.warn('Not all player data loaded');
        return null;
    }
    
    // Reset
    computedCorrelations = {
        positionMatrix: {},
        playerPairs: [],
        teamCorrelations: {}
    };
    
    // Compute position-to-position matrix
    computePositionMatrix();
    
    // Compute player pair correlations
    computePlayerPairCorrelations();
    
    // Compute team-level correlations
    computeTeamCorrelations();
    
    return computedCorrelations;
}

/**
 * Compute position-to-position correlation matrix
 */
function computePositionMatrix() {
    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    
    for (const pos1 of positions) {
        computedCorrelations.positionMatrix[pos1] = {};
        for (const pos2 of positions) {
            if (pos1 === pos2) {
                computedCorrelations.positionMatrix[pos1][pos2] = 1.0;
            } else {
                const corr = computePositionCorrelation(pos1, pos2);
                computedCorrelations.positionMatrix[pos1][pos2] = corr;
            }
        }
    }
}

/**
 * Compute correlation between two positions
 * @param {string} pos1 - First position
 * @param {string} pos2 - Second position
 * @returns {number|null} - Correlation coefficient
 */
function computePositionCorrelation(pos1, pos2) {
    const data1 = playerDataByPosition[pos1];
    const data2 = playerDataByPosition[pos2];
    
    // Group by game (team + week)
    const gameMap1 = groupByGame(data1);
    const gameMap2 = groupByGame(data2);
    
    const points1 = [];
    const points2 = [];
    
    // Find matching games
    for (const gameKey of Object.keys(gameMap1)) {
        if (gameMap2[gameKey]) {
            // Sum points for each position in that game
            const sum1 = gameMap1[gameKey].reduce((s, p) => s + p.points, 0);
            const sum2 = gameMap2[gameKey].reduce((s, p) => s + p.points, 0);
            points1.push(sum1);
            points2.push(sum2);
        }
    }
    
    return pearsonCorrelation(points1, points2);
}

/**
 * Group player data by game (team + week)
 * @param {Object[]} data - Player data array
 * @returns {Object} - Grouped data
 */
function groupByGame(data) {
    const groups = {};
    for (const row of data) {
        const key = `${row.team}-${row.week}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    }
    return groups;
}

/**
 * Compute player-to-player pair correlations
 */
function computePlayerPairCorrelations() {
    const allData = [
        ...playerDataByPosition.QB,
        ...playerDataByPosition.RB,
        ...playerDataByPosition.WR,
        ...playerDataByPosition.TE,
        ...playerDataByPosition.DST
    ];
    
    // Group by player
    const playerMap = {};
    for (const row of allData) {
        if (!playerMap[row.player]) {
            playerMap[row.player] = {
                name: row.player,
                team: row.team,
                position: row.position,
                games: {}
            };
        }
        playerMap[row.player].games[row.week] = row.points;
    }
    
    const players = Object.values(playerMap);
    const pairs = [];
    
    // Compare same-team players
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const p1 = players[i];
            const p2 = players[j];
            
            // Only correlate same team or opponents
            if (p1.team !== p2.team) continue;
            
            // Find common weeks
            const weeks1 = Object.keys(p1.games);
            const weeks2 = Object.keys(p2.games);
            const commonWeeks = weeks1.filter(w => weeks2.includes(w));
            
            if (commonWeeks.length >= 3) {
                const pts1 = commonWeeks.map(w => p1.games[w]);
                const pts2 = commonWeeks.map(w => p2.games[w]);
                const corr = pearsonCorrelation(pts1, pts2);
                
                if (corr !== null) {
                    pairs.push({
                        player1: p1.name,
                        player2: p2.name,
                        position1: p1.position,
                        position2: p2.position,
                        team: p1.team,
                        correlation: corr,
                        sampleSize: commonWeeks.length
                    });
                }
            }
        }
    }
    
    // Sort by absolute correlation
    pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    computedCorrelations.playerPairs = pairs;
}

/**
 * Compute team-level correlations
 */
function computeTeamCorrelations() {
    const teams = new Set();
    
    // Collect all teams
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST']) {
        for (const row of playerDataByPosition[pos]) {
            if (row.team) teams.add(row.team);
        }
    }
    
    for (const team of teams) {
        computedCorrelations.teamCorrelations[team] = computeTeamPlayerCorrelations(team);
    }
}

/**
 * Compute correlations for players on a specific team
 * @param {string} team - Team abbreviation
 * @returns {Object[]} - Array of correlation pairs
 */
function computeTeamPlayerCorrelations(team) {
    const teamPairs = computedCorrelations.playerPairs.filter(p => p.team === team);
    return teamPairs.sort((a, b) => b.correlation - a.correlation);
}

/**
 * Get correlation between two specific players
 * @param {string} player1 - First player name
 * @param {string} player2 - Second player name
 * @returns {number|null} - Correlation or null
 */
function getPlayerCorrelation(player1, player2) {
    const pair = computedCorrelations.playerPairs.find(p => 
        (p.player1 === player1 && p.player2 === player2) ||
        (p.player1 === player2 && p.player2 === player1)
    );
    return pair ? pair.correlation : null;
}

/**
 * Get position matrix correlation
 * @param {string} pos1 - First position
 * @param {string} pos2 - Second position
 * @returns {number|null} - Correlation or null
 */
function getPositionCorrelation(pos1, pos2) {
    if (!computedCorrelations.positionMatrix[pos1]) return null;
    return computedCorrelations.positionMatrix[pos1][pos2] || null;
}

/**
 * Get all correlations for a team
 * @param {string} team - Team abbreviation
 * @returns {Object[]} - Array of correlation pairs
 */
function getTeamCorrelations(team) {
    return computedCorrelations.teamCorrelations[team] || [];
}

/**
 * Render the position correlation matrix to UI
 * @param {HTMLElement} container - Container element
 */
function renderPositionMatrix(container) {
    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    const matrix = computedCorrelations.positionMatrix;
    
    let html = '<div class="position-matrix">';
    
    // Header row
    html += '<div class="matrix-cell header"></div>';
    for (const pos of positions) {
        html += `<div class="matrix-cell header">${pos}</div>`;
    }
    
    // Data rows
    for (const pos1 of positions) {
        html += `<div class="matrix-cell row-header">${pos1}</div>`;
        for (const pos2 of positions) {
            const corr = matrix[pos1] ? matrix[pos1][pos2] : null;
            let cellClass = 'matrix-cell';
            let displayValue = '-';
            
            if (corr !== null) {
                displayValue = corr.toFixed(2);
                if (pos1 === pos2) {
                    cellClass += ' empty';
                } else if (corr > 0.1) {
                    cellClass += ' positive';
                } else if (corr < -0.1) {
                    cellClass += ' negative';
                } else {
                    cellClass += ' neutral';
                }
            }
            
            html += `<div class="${cellClass}">${displayValue}</div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Render team correlation cards
 * @param {HTMLElement} container - Container element
 */
function renderTeamCards(container) {
    const teams = Object.keys(computedCorrelations.teamCorrelations);
    
    if (teams.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No team data available</p></div>';
        return;
    }
    
    let html = '<div class="team-cards-grid">';
    
    for (const team of teams.sort()) {
        const teamInfo = NFL_TEAMS[team] || { name: team, primary: '#666', logo: '' };
        const correlations = computedCorrelations.teamCorrelations[team];
        
        html += `
            <div class="team-card" onclick="showTeamDetail('${team}')">
                <div class="team-card-header" style="border-color: ${teamInfo.primary}">
                    ${teamInfo.logo ? `<img src="${teamInfo.logo}" alt="${team}" class="team-logo">` : ''}
                    <div class="team-info">
                        <h4>${teamInfo.city} ${teamInfo.name}</h4>
                        <span>${correlations.length} correlations</span>
                    </div>
                </div>
                <div class="team-card-body">
                    ${renderTopCorrelations(correlations.slice(0, 3))}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Render top correlations for a team card
 * @param {Object[]} correlations - Array of correlation pairs
 * @returns {string} - HTML string
 */
function renderTopCorrelations(correlations) {
    if (correlations.length === 0) {
        return '<div class="team-corr-section"><span class="team-corr-label">No data</span></div>';
    }
    
    let html = '<div class="team-corr-section"><span class="team-corr-label">Top Pairs</span>';
    
    for (const corr of correlations) {
        const corrClass = corr.correlation > 0 ? 'positive' : 'negative';
        html += `
            <div class="team-corr-item">
                <span class="player-name">${corr.player1} / ${corr.player2}</span>
                <span class="corr-value ${corrClass}">${corr.correlation.toFixed(2)}</span>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

/**
 * Show team detail modal
 * @param {string} team - Team abbreviation
 */
function showTeamDetail(team) {
    const overlay = document.getElementById('teamDetailOverlay');
    const modal = document.getElementById('teamDetailModal');
    
    if (!overlay || !modal) return;
    
    const teamInfo = NFL_TEAMS[team] || { name: team, city: '', primary: '#666', logo: '' };
    const correlations = computedCorrelations.teamCorrelations[team] || [];
    
    // Update header
    const header = modal.querySelector('.team-detail-header');
    header.style.borderColor = teamInfo.primary;
    header.querySelector('h2').textContent = `${teamInfo.city} ${teamInfo.name}`;
    if (teamInfo.logo) {
        header.querySelector('.team-logo').src = teamInfo.logo;
    }
    
    // Update body
    const body = modal.querySelector('.team-detail-body');
    let html = '';
    
    // Positive correlations
    const positive = correlations.filter(c => c.correlation > 0);
    if (positive.length > 0) {
        html += `
            <div class="team-detail-section">
                <h3>📈 Positive Correlations</h3>
                <div class="detail-corr-list">
                    ${positive.map(c => renderDetailCorrRow(c)).join('')}
                </div>
            </div>
        `;
    }
    
    // Negative correlations
    const negative = correlations.filter(c => c.correlation < 0);
    if (negative.length > 0) {
        html += `
            <div class="team-detail-section">
                <h3>📉 Negative Correlations</h3>
                <div class="detail-corr-list">
                    ${negative.map(c => renderDetailCorrRow(c)).join('')}
                </div>
            </div>
        `;
    }
    
    if (correlations.length === 0) {
        html = '<div class="empty-state"><p>No correlation data for this team</p></div>';
    }
    
    body.innerHTML = html;
    
    // Show modal
    overlay.classList.add('active');
}

/**
 * Render a detail correlation row
 * @param {Object} corr - Correlation object
 * @returns {string} - HTML string
 */
function renderDetailCorrRow(corr) {
    const barWidth = Math.min(Math.abs(corr.correlation) * 100, 100);
    const barClass = corr.correlation > 0 ? 'positive' : 'negative';
    
    return `
        <div class="detail-corr-row">
            <div>${corr.player1} (${corr.position1})</div>
            <div>${corr.player2} (${corr.position2})</div>
            <div class="corr-bar-container">
                <div class="corr-bar ${barClass}" style="width: ${barWidth}%"></div>
            </div>
            <div class="corr-value ${barClass}">${corr.correlation.toFixed(2)}</div>
        </div>
    `;
}

/**
 * Close team detail modal
 */
function closeTeamDetail() {
    const overlay = document.getElementById('teamDetailOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Clear all player data
 */
function clearPlayerData() {
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST']) {
        playerDataByPosition[pos] = [];
    }
    computedCorrelations = {
        positionMatrix: {},
        playerPairs: [],
        teamCorrelations: {}
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        playerDataByPosition,
        computedCorrelations,
        parsePlayerDataCSV,
        loadPlayerData,
        isAllPlayerDataLoaded,
        getLoadedPositionsInfo,
        computeCorrelations,
        getPlayerCorrelation,
        getPositionCorrelation,
        getTeamCorrelations,
        renderPositionMatrix,
        renderTeamCards,
        showTeamDetail,
        closeTeamDetail,
        clearPlayerData
    };
}
