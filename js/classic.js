// ==========================================
// SHOWDOWN OPTIMIZER - CLASSIC MODE MODULE
// ==========================================

// Classic mode state
let classicPlayers = [];
let classicLineups = [];
let classicSettings = {
    lineupCount: 20,
    salaryMin: 49000,
    salaryMax: 50000,
    projectionFloor: 0,
    diversityLevel: 50
};

// Position requirements for classic NFL
const CLASSIC_POSITIONS = {
    QB: { min: 1, max: 1 },
    RB: { min: 2, max: 3 },
    WR: { min: 3, max: 4 },
    TE: { min: 1, max: 2 },
    FLEX: { min: 1, max: 1 }, // RB/WR/TE
    DST: { min: 1, max: 1 }
};

// Pagination state
let classicCurrentPage = 1;
const classicLineupsPerPage = 20;

// Sort state
let classicSortColumn = 'rank';
let classicSortDirection = 'asc';

/**
 * Parse DraftKings Classic CSV
 * @param {string} csvText - Raw CSV content
 * @returns {Object[]} - Array of player objects
 */
function parseClassicCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const players = [];
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('roster'));
    const posIdx = headers.findIndex(h => h === 'position' || h === 'pos');
    const salaryIdx = headers.findIndex(h => h === 'salary' || h.includes('salary'));
    const teamIdx = headers.findIndex(h => h === 'team' || h === 'teamabbrev');
    const projIdx = headers.findIndex(h => h.includes('proj') || h.includes('fpts') || h.includes('avgpoints'));
    const gameIdx = headers.findIndex(h => h.includes('game'));
    const idIdx = headers.findIndex(h => h === 'id' || h.includes('playerid'));
    const oppIdx = headers.findIndex(h => h === 'opponent' || h === 'opp');
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 3) continue;
        
        const name = nameIdx >= 0 ? extractPlayerName(values[nameIdx]) : '';
        const position = posIdx >= 0 ? extractPosition(values[posIdx]) : '';
        const salary = salaryIdx >= 0 ? parseInt(values[salaryIdx]) || 0 : 0;
        const team = teamIdx >= 0 ? values[teamIdx].trim() : '';
        const projection = projIdx >= 0 ? parseFloat(values[projIdx]) || 0 : 0;
        const game = gameIdx >= 0 ? values[gameIdx].trim() : '';
        const id = idIdx >= 0 ? values[idIdx].trim() : '';
        const opponent = oppIdx >= 0 ? values[oppIdx].trim() : '';
        
        if (name && salary > 0 && position) {
            players.push({
                id: id,
                name: name,
                position: position,
                salary: salary,
                team: team,
                opponent: opponent,
                projection: projection,
                game: game,
                value: salary > 0 ? (projection / salary * 1000) : 0,
                locked: false,
                excluded: false
            });
        }
    }
    
    return players;
}

/**
 * Load Classic players from file
 * @param {File} file - CSV file
 * @returns {Promise<Object[]>} - Array of players
 */
async function loadClassicPlayers(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const players = parseClassicCSV(e.target.result);
                classicPlayers = players;
                resolve(players);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Get players by position
 * @param {string} position - Position to filter
 * @returns {Object[]} - Filtered players
 */
function getPlayersByPosition(position) {
    if (position === 'FLEX') {
        return classicPlayers.filter(p => 
            !p.excluded && 
            ['RB', 'WR', 'TE'].includes(p.position) &&
            p.projection > 0
        );
    }
    return classicPlayers.filter(p => 
        !p.excluded && 
        p.position === position &&
        p.projection > 0
    );
}

/**
 * Generate Classic lineups
 * @param {number} count - Number of lineups
 * @param {Function} progressCallback - Progress callback
 * @returns {Object[]} - Array of lineups
 */
function generateClassicLineups(count, progressCallback) {
    const qbs = getPlayersByPosition('QB').sort((a, b) => b.projection - a.projection).slice(0, 15);
    const rbs = getPlayersByPosition('RB').sort((a, b) => b.projection - a.projection).slice(0, 25);
    const wrs = getPlayersByPosition('WR').sort((a, b) => b.projection - a.projection).slice(0, 30);
    const tes = getPlayersByPosition('TE').sort((a, b) => b.projection - a.projection).slice(0, 15);
    const dsts = getPlayersByPosition('DST').sort((a, b) => b.projection - a.projection).slice(0, 10);
    
    if (qbs.length < 1 || rbs.length < 2 || wrs.length < 3 || tes.length < 1 || dsts.length < 1) {
        throw new Error('Not enough players at each position');
    }
    
    const allLineups = [];
    const maxIterations = 50000;
    let iterations = 0;
    
    // Randomized generation with optimization
    while (allLineups.length < count * 3 && iterations < maxIterations) {
        iterations++;
        
        const lineup = generateRandomClassicLineup(qbs, rbs, wrs, tes, dsts);
        
        if (lineup && 
            lineup.salary >= classicSettings.salaryMin && 
            lineup.salary <= classicSettings.salaryMax &&
            lineup.projection >= classicSettings.projectionFloor) {
            
            // Check for duplicates
            const lineupKey = getLineupKey(lineup);
            if (!allLineups.some(l => getLineupKey(l) === lineupKey)) {
                allLineups.push(lineup);
            }
        }
        
        if (progressCallback && iterations % 1000 === 0) {
            progressCallback(Math.min(iterations / maxIterations * 100, 99));
        }
    }
    
    // Sort by projection
    allLineups.sort((a, b) => b.projection - a.projection);
    
    // Apply diversity
    if (classicSettings.diversityLevel > 0) {
        return selectDiverseClassicLineups(allLineups, count);
    }
    
    return allLineups.slice(0, count);
}

/**
 * Generate a random classic lineup
 * @param {Object[]} qbs - QB pool
 * @param {Object[]} rbs - RB pool
 * @param {Object[]} wrs - WR pool
 * @param {Object[]} tes - TE pool
 * @param {Object[]} dsts - DST pool
 * @returns {Object|null} - Lineup or null if invalid
 */
function generateRandomClassicLineup(qbs, rbs, wrs, tes, dsts) {
    // Weighted random selection favoring higher projections
    const selectWeighted = (pool, count) => {
        const selected = [];
        const available = [...pool];
        
        for (let i = 0; i < count && available.length > 0; i++) {
            // Weight by projection
            const weights = available.map(p => Math.pow(p.projection, 1.5));
            const totalWeight = weights.reduce((s, w) => s + w, 0);
            let rand = Math.random() * totalWeight;
            
            for (let j = 0; j < available.length; j++) {
                rand -= weights[j];
                if (rand <= 0) {
                    selected.push(available[j]);
                    available.splice(j, 1);
                    break;
                }
            }
        }
        
        return selected;
    };
    
    const qb = selectWeighted(qbs, 1)[0];
    const selectedRBs = selectWeighted(rbs, 2);
    const selectedWRs = selectWeighted(wrs, 3);
    const te = selectWeighted(tes, 1)[0];
    const dst = selectWeighted(dsts, 1)[0];
    
    if (!qb || selectedRBs.length < 2 || selectedWRs.length < 3 || !te || !dst) {
        return null;
    }
    
    // Select FLEX from remaining RB/WR/TE
    const usedNames = new Set([qb.name, ...selectedRBs.map(p => p.name), ...selectedWRs.map(p => p.name), te.name]);
    const flexPool = [...rbs, ...wrs, ...tes].filter(p => !usedNames.has(p.name));
    
    if (flexPool.length === 0) return null;
    
    const flex = selectWeighted(flexPool, 1)[0];
    if (!flex) return null;
    
    const allPlayers = [qb, ...selectedRBs, ...selectedWRs, te, flex, dst];
    const salary = allPlayers.reduce((s, p) => s + p.salary, 0);
    const projection = allPlayers.reduce((s, p) => s + p.projection, 0);
    
    return {
        qb: qb,
        rb1: selectedRBs[0],
        rb2: selectedRBs[1],
        wr1: selectedWRs[0],
        wr2: selectedWRs[1],
        wr3: selectedWRs[2],
        te: te,
        flex: flex,
        dst: dst,
        salary: salary,
        projection: projection,
        value: salary > 0 ? (projection / salary * 1000) : 0
    };
}

/**
 * Get unique key for lineup (for deduplication)
 * @param {Object} lineup - Lineup object
 * @returns {string} - Unique key
 */
function getLineupKey(lineup) {
    const names = [
        lineup.qb.name,
        lineup.rb1.name,
        lineup.rb2.name,
        lineup.wr1.name,
        lineup.wr2.name,
        lineup.wr3.name,
        lineup.te.name,
        lineup.flex.name,
        lineup.dst.name
    ].sort();
    return names.join('|');
}

/**
 * Select diverse lineups from pool
 * @param {Object[]} lineups - All generated lineups
 * @param {number} count - Number to select
 * @returns {Object[]} - Selected lineups
 */
function selectDiverseClassicLineups(lineups, count) {
    const selected = [];
    const playerExposure = {};
    const maxExposure = 1 - (classicSettings.diversityLevel / 100);
    
    for (const lineup of lineups) {
        if (selected.length >= count) break;
        
        const players = [
            lineup.qb.name, lineup.rb1.name, lineup.rb2.name,
            lineup.wr1.name, lineup.wr2.name, lineup.wr3.name,
            lineup.te.name, lineup.flex.name, lineup.dst.name
        ];
        
        const avgExposure = players.reduce((sum, name) => {
            return sum + (playerExposure[name] || 0) / Math.max(selected.length, 1);
        }, 0) / players.length;
        
        if (avgExposure <= maxExposure || selected.length < count * 0.5) {
            selected.push(lineup);
            for (const name of players) {
                playerExposure[name] = (playerExposure[name] || 0) + 1;
            }
        }
    }
    
    // Fill remaining
    if (selected.length < count) {
        for (const lineup of lineups) {
            if (selected.length >= count) break;
            if (!selected.includes(lineup)) {
                selected.push(lineup);
            }
        }
    }
    
    return selected;
}

/**
 * Calculate player exposure for classic lineups
 * @param {Object[]} lineups - Array of lineups
 * @returns {Object[]} - Exposure data
 */
function calculateClassicExposure(lineups) {
    const counts = {};
    
    for (const lineup of lineups) {
        const players = [
            lineup.qb, lineup.rb1, lineup.rb2,
            lineup.wr1, lineup.wr2, lineup.wr3,
            lineup.te, lineup.flex, lineup.dst
        ];
        
        for (const player of players) {
            counts[player.name] = (counts[player.name] || 0) + 1;
        }
    }
    
    return Object.entries(counts)
        .map(([name, count]) => ({
            name: name,
            count: count,
            percentage: (count / lineups.length * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Export classic lineups to DraftKings CSV
 * @param {Object[]} lineups - Array of lineups
 * @returns {string} - CSV content
 */
function exportClassicLineups(lineups) {
    const headers = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'DST'];
    const rows = [headers.join(',')];
    
    for (const lineup of lineups) {
        const row = [
            lineup.qb.id || lineup.qb.name,
            lineup.rb1.id || lineup.rb1.name,
            lineup.rb2.id || lineup.rb2.name,
            lineup.wr1.id || lineup.wr1.name,
            lineup.wr2.id || lineup.wr2.name,
            lineup.wr3.id || lineup.wr3.name,
            lineup.te.id || lineup.te.name,
            lineup.flex.id || lineup.flex.name,
            lineup.dst.id || lineup.dst.name
        ];
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}

/**
 * Render classic lineups to table
 * @param {HTMLElement} container - Container element
 */
function renderClassicLineups(container) {
    if (classicLineups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <h4>No Lineups Generated</h4>
                <p>Upload a DraftKings CSV and click Generate to create lineups</p>
            </div>
        `;
        return;
    }
    
    // Sort and paginate
    const sortedLineups = sortClassicLineups([...classicLineups]);
    const startIdx = (classicCurrentPage - 1) * classicLineupsPerPage;
    const endIdx = startIdx + classicLineupsPerPage;
    const pageLineups = sortedLineups.slice(startIdx, endIdx);
    const totalPages = Math.ceil(sortedLineups.length / classicLineupsPerPage);
    
    let html = `
        <div class="pagination-container">
            <div class="pagination-showing">
                Showing ${startIdx + 1}-${Math.min(endIdx, sortedLineups.length)} of ${sortedLineups.length} lineups
            </div>
            <div class="pagination">
                <button class="pagination-btn" onclick="classicPrevPage()" ${classicCurrentPage <= 1 ? 'disabled' : ''}>
                    ← Prev
                </button>
                <span class="pagination-info">Page ${classicCurrentPage} of ${totalPages}</span>
                <button class="pagination-btn" onclick="classicNextPage()" ${classicCurrentPage >= totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
        <div class="lineup-output" style="overflow-x: auto;">
            <div class="lineup-row header" style="grid-template-columns: 50px repeat(9, 1fr) 90px 90px;">
                <div class="sortable" onclick="sortClassicBy('rank')">#</div>
                <div>QB</div>
                <div>RB</div>
                <div>RB</div>
                <div>WR</div>
                <div>WR</div>
                <div>WR</div>
                <div>TE</div>
                <div>FLEX</div>
                <div>DST</div>
                <div class="sortable" onclick="sortClassicBy('salary')">Salary</div>
                <div class="sortable" onclick="sortClassicBy('projection')">Proj</div>
            </div>
    `;
    
    pageLineups.forEach((lineup, idx) => {
        const rank = startIdx + idx + 1;
        const positions = ['qb', 'rb1', 'rb2', 'wr1', 'wr2', 'wr3', 'te', 'flex', 'dst'];
        
        html += `
            <div class="lineup-row" style="grid-template-columns: 50px repeat(9, 1fr) 90px 90px;">
                <div class="lineup-rank">${rank}</div>
        `;
        
        for (const pos of positions) {
            const player = lineup[pos];
            html += `
                <div class="lineup-player">
                    <span class="lineup-player-name">${player.name}</span>
                    <span class="lineup-player-meta">${player.team} • $${(player.salary / 1000).toFixed(1)}k</span>
                </div>
            `;
        }
        
        html += `
                <div class="lineup-salary">$${lineup.salary.toLocaleString()}</div>
                <div class="lineup-points">${lineup.projection.toFixed(2)}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Sort classic lineups
 * @param {Object[]} lineups - Lineups to sort
 * @returns {Object[]} - Sorted lineups
 */
function sortClassicLineups(lineups) {
    return lineups.sort((a, b) => {
        let comparison = 0;
        switch (classicSortColumn) {
            case 'salary':
                comparison = a.salary - b.salary;
                break;
            case 'projection':
                comparison = a.projection - b.projection;
                break;
            default:
                return 0;
        }
        return classicSortDirection === 'asc' ? comparison : -comparison;
    });
}

/**
 * Sort by column
 * @param {string} column - Column to sort by
 */
function sortClassicBy(column) {
    if (classicSortColumn === column) {
        classicSortDirection = classicSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        classicSortColumn = column;
        classicSortDirection = column === 'projection' ? 'desc' : 'asc';
    }
    
    const container = document.getElementById('classicLineupsOutput');
    if (container) renderClassicLineups(container);
}

/**
 * Previous page
 */
function classicPrevPage() {
    if (classicCurrentPage > 1) {
        classicCurrentPage--;
        const container = document.getElementById('classicLineupsOutput');
        if (container) renderClassicLineups(container);
    }
}

/**
 * Next page
 */
function classicNextPage() {
    const totalPages = Math.ceil(classicLineups.length / classicLineupsPerPage);
    if (classicCurrentPage < totalPages) {
        classicCurrentPage++;
        const container = document.getElementById('classicLineupsOutput');
        if (container) renderClassicLineups(container);
    }
}

/**
 * Update Classic settings
 * @param {Object} settings - New settings
 */
function updateClassicSettings(settings) {
    classicSettings = { ...classicSettings, ...settings };
}

/**
 * Get Classic stats
 * @returns {Object} - Stats object
 */
function getClassicStats() {
    return {
        playerCount: classicPlayers.length,
        lineupCount: classicLineups.length,
        avgProjection: classicLineups.length > 0
            ? (classicLineups.reduce((s, l) => s + l.projection, 0) / classicLineups.length).toFixed(2)
            : 0,
        avgSalary: classicLineups.length > 0
            ? Math.round(classicLineups.reduce((s, l) => s + l.salary, 0) / classicLineups.length)
            : 0
    };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        classicPlayers,
        classicLineups,
        classicSettings,
        parseClassicCSV,
        loadClassicPlayers,
        generateClassicLineups,
        calculateClassicExposure,
        exportClassicLineups,
        renderClassicLineups,
        updateClassicSettings,
        getClassicStats,
        sortClassicBy,
        classicPrevPage,
        classicNextPage
    };
}
