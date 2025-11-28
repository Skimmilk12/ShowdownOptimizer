// ==========================================
// SHOWDOWN OPTIMIZER - SHOWDOWN MODE MODULE
// ==========================================

// Showdown state
let showdownPlayers = [];
let showdownLineups = [];
let showdownSettings = {
    lineupCount: 20,
    salaryMin: 49000,
    salaryMax: 50000,
    projectionFloor: 0,
    diversityLevel: 50
};

// Pagination state
let showdownCurrentPage = 1;
const showdownLineupsPerPage = 20;

// Sort state
let showdownSortColumn = 'rank';
let showdownSortDirection = 'asc';

/**
 * Parse DraftKings Showdown CSV
 * @param {string} csvText - Raw CSV content
 * @returns {Object[]} - Array of player objects
 */
function parseShowdownCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const players = [];
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('roster'));
    const posIdx = headers.findIndex(h => h === 'position' || h === 'pos' || h.includes('roster position'));
    const salaryIdx = headers.findIndex(h => h === 'salary' || h.includes('salary'));
    const teamIdx = headers.findIndex(h => h === 'team' || h === 'teamabbrev');
    const projIdx = headers.findIndex(h => h.includes('proj') || h.includes('fpts') || h.includes('avgpoints'));
    const gameIdx = headers.findIndex(h => h.includes('game'));
    const idIdx = headers.findIndex(h => h === 'id' || h.includes('playerid'));
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 3) continue;
        
        const name = nameIdx >= 0 ? extractPlayerName(values[nameIdx]) : '';
        const position = posIdx >= 0 ? values[posIdx].trim() : '';
        const salary = salaryIdx >= 0 ? parseInt(values[salaryIdx]) || 0 : 0;
        const team = teamIdx >= 0 ? values[teamIdx].trim() : '';
        const projection = projIdx >= 0 ? parseFloat(values[projIdx]) || 0 : 0;
        const game = gameIdx >= 0 ? values[gameIdx].trim() : '';
        const id = idIdx >= 0 ? values[idIdx].trim() : '';
        
        if (name && salary > 0) {
            // Check if this is a CPT row (1.5x salary)
            const isCaptain = position.toUpperCase().includes('CPT') || position.toUpperCase().includes('CAPT');
            
            players.push({
                id: id,
                name: name,
                position: isCaptain ? 'CPT' : extractPosition(position),
                rosterPosition: position,
                salary: salary,
                team: team,
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
 * Load Showdown players from file
 * @param {File} file - CSV file
 * @returns {Promise<Object[]>} - Array of players
 */
async function loadShowdownPlayers(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const players = parseShowdownCSV(e.target.result);
                showdownPlayers = players;
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
 * Get unique teams from players
 * @returns {string[]} - Array of team abbreviations
 */
function getShowdownTeams() {
    return [...new Set(showdownPlayers.map(p => p.team))].filter(t => t);
}

/**
 * Get players eligible for captain
 * @returns {Object[]} - Array of captain-eligible players
 */
function getCaptainEligiblePlayers() {
    // In Showdown, any player can be captain
    // Filter to non-excluded players with valid projections
    return showdownPlayers
        .filter(p => !p.excluded && p.projection > 0)
        .map(p => ({
            ...p,
            // Captain gets 1.5x points and 1.5x salary
            captainSalary: Math.round(p.salary * 1.5),
            captainProjection: p.projection * 1.5
        }));
}

/**
 * Get flex-eligible players (excluding a captain)
 * @param {string} captainName - Name of selected captain
 * @returns {Object[]} - Array of flex players
 */
function getFlexPlayers(captainName) {
    return showdownPlayers.filter(p => 
        !p.excluded && 
        p.name !== captainName && 
        p.projection > 0
    );
}

/**
 * Generate optimal lineups using combinatorial search
 * @param {number} count - Number of lineups to generate
 * @param {Function} progressCallback - Progress callback
 * @returns {Object[]} - Array of lineups
 */
function generateShowdownLineups(count, progressCallback) {
    const captainPlayers = getCaptainEligiblePlayers();
    
    if (captainPlayers.length < 6) {
        throw new Error('Not enough players to generate lineups');
    }
    
    const allLineups = [];
    const totalCaptains = captainPlayers.length;
    
    // Sort by projection for optimal search
    captainPlayers.sort((a, b) => b.captainProjection - a.captainProjection);
    
    // Generate lineups for each captain
    for (let c = 0; c < Math.min(totalCaptains, 25); c++) {
        const captain = captainPlayers[c];
        const flexPool = getFlexPlayers(captain.name);
        
        if (flexPool.length < 5) continue;
        
        // Sort flex by projection
        flexPool.sort((a, b) => b.projection - a.projection);
        
        // Take top 25 flex players for combinatorial search
        const topFlex = flexPool.slice(0, 25);
        
        // Generate combinations of 5 flex from top 25
        const flexCombos = generateCombinations(topFlex, 5);
        
        for (const flex of flexCombos) {
            const lineup = createShowdownLineup(captain, flex);
            
            // Check salary constraints
            if (lineup.salary >= showdownSettings.salaryMin && 
                lineup.salary <= showdownSettings.salaryMax &&
                lineup.projection >= showdownSettings.projectionFloor) {
                allLineups.push(lineup);
            }
        }
        
        if (progressCallback) {
            progressCallback((c + 1) / Math.min(totalCaptains, 25) * 100);
        }
    }
    
    // Sort by projection
    allLineups.sort((a, b) => b.projection - a.projection);
    
    // Apply diversity if needed
    if (showdownSettings.diversityLevel > 0 && count < allLineups.length) {
        return selectDiverseLineups(allLineups, count);
    }
    
    return allLineups.slice(0, count);
}

/**
 * Generate combinations of k elements from array
 * @param {Array} arr - Source array
 * @param {number} k - Number of elements
 * @returns {Array[]} - Array of combinations
 */
function generateCombinations(arr, k) {
    const result = [];
    
    function combine(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    
    combine(0, []);
    return result;
}

/**
 * Create a Showdown lineup from captain and flex players
 * @param {Object} captain - Captain player
 * @param {Object[]} flex - Array of 5 flex players
 * @returns {Object} - Lineup object
 */
function createShowdownLineup(captain, flex) {
    const salary = captain.captainSalary + flex.reduce((s, p) => s + p.salary, 0);
    const projection = captain.captainProjection + flex.reduce((s, p) => s + p.projection, 0);
    
    return {
        captain: {
            ...captain,
            salary: captain.captainSalary,
            projection: captain.captainProjection,
            isCaptain: true
        },
        flex: flex.map(p => ({ ...p, isCaptain: false })),
        salary: salary,
        projection: projection,
        value: salary > 0 ? (projection / salary * 1000) : 0
    };
}

/**
 * Select diverse lineups from pool
 * @param {Object[]} lineups - All generated lineups
 * @param {number} count - Number to select
 * @returns {Object[]} - Selected lineups
 */
function selectDiverseLineups(lineups, count) {
    const selected = [];
    const playerExposure = {};
    const maxExposure = 1 - (showdownSettings.diversityLevel / 100);
    
    for (const lineup of lineups) {
        if (selected.length >= count) break;
        
        // Calculate current exposure
        const players = [lineup.captain.name, ...lineup.flex.map(p => p.name)];
        const avgExposure = players.reduce((sum, name) => {
            return sum + (playerExposure[name] || 0) / Math.max(selected.length, 1);
        }, 0) / players.length;
        
        // Accept if exposure is below threshold or we don't have enough lineups
        if (avgExposure <= maxExposure || selected.length < count * 0.5) {
            selected.push(lineup);
            
            // Update exposure counts
            for (const name of players) {
                playerExposure[name] = (playerExposure[name] || 0) + 1;
            }
        }
    }
    
    // Fill remaining slots if needed
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
 * Calculate player exposure across lineups
 * @param {Object[]} lineups - Array of lineups
 * @returns {Object[]} - Array of exposure objects
 */
function calculateExposure(lineups) {
    const counts = {};
    
    for (const lineup of lineups) {
        const players = [lineup.captain.name, ...lineup.flex.map(p => p.name)];
        for (const name of players) {
            counts[name] = (counts[name] || 0) + 1;
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
 * Export lineups to DraftKings CSV format
 * @param {Object[]} lineups - Array of lineups
 * @returns {string} - CSV content
 */
function exportShowdownLineups(lineups) {
    const headers = ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];
    const rows = [headers.join(',')];
    
    for (const lineup of lineups) {
        const row = [
            lineup.captain.id || lineup.captain.name,
            ...lineup.flex.map(p => p.id || p.name)
        ];
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}

/**
 * Render Showdown lineups to table
 * @param {HTMLElement} container - Container element
 */
function renderShowdownLineups(container) {
    if (showdownLineups.length === 0) {
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
    
    // Sort lineups
    const sortedLineups = sortShowdownLineups([...showdownLineups]);
    
    // Paginate
    const startIdx = (showdownCurrentPage - 1) * showdownLineupsPerPage;
    const endIdx = startIdx + showdownLineupsPerPage;
    const pageLineups = sortedLineups.slice(startIdx, endIdx);
    const totalPages = Math.ceil(sortedLineups.length / showdownLineupsPerPage);
    
    let html = `
        <div class="pagination-container">
            <div class="pagination-showing">
                Showing ${startIdx + 1}-${Math.min(endIdx, sortedLineups.length)} of ${sortedLineups.length} lineups
            </div>
            <div class="pagination">
                <button class="pagination-btn" onclick="showdownPrevPage()" ${showdownCurrentPage <= 1 ? 'disabled' : ''}>
                    ← Prev
                </button>
                <span class="pagination-info">Page ${showdownCurrentPage} of ${totalPages}</span>
                <button class="pagination-btn" onclick="showdownNextPage()" ${showdownCurrentPage >= totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
        <div class="lineup-output">
            <div class="lineup-row header">
                <div class="sortable ${showdownSortColumn === 'rank' ? 'sort-' + showdownSortDirection : ''}" onclick="sortShowdownBy('rank')">#</div>
                <div>CPT</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div class="sortable ${showdownSortColumn === 'salary' ? 'sort-' + showdownSortDirection : ''}" onclick="sortShowdownBy('salary')">Salary</div>
                <div class="sortable ${showdownSortColumn === 'projection' ? 'sort-' + showdownSortDirection : ''}" onclick="sortShowdownBy('projection')">Proj</div>
            </div>
    `;
    
    pageLineups.forEach((lineup, idx) => {
        const rank = startIdx + idx + 1;
        html += `
            <div class="lineup-row">
                <div class="lineup-rank">${rank}</div>
                <div class="lineup-player">
                    <span class="lineup-player-name">${lineup.captain.name}</span>
                    <span class="lineup-player-meta">${lineup.captain.team} • $${lineup.captain.salary.toLocaleString()}</span>
                </div>
        `;
        
        for (const flex of lineup.flex) {
            html += `
                <div class="lineup-player">
                    <span class="lineup-player-name">${flex.name}</span>
                    <span class="lineup-player-meta">${flex.team} • $${flex.salary.toLocaleString()}</span>
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
 * Sort showdown lineups
 * @param {Object[]} lineups - Lineups to sort
 * @returns {Object[]} - Sorted lineups
 */
function sortShowdownLineups(lineups) {
    return lineups.sort((a, b) => {
        let comparison = 0;
        switch (showdownSortColumn) {
            case 'salary':
                comparison = a.salary - b.salary;
                break;
            case 'projection':
                comparison = a.projection - b.projection;
                break;
            default:
                return 0; // Keep original order for rank
        }
        return showdownSortDirection === 'asc' ? comparison : -comparison;
    });
}

/**
 * Sort by column
 * @param {string} column - Column to sort by
 */
function sortShowdownBy(column) {
    if (showdownSortColumn === column) {
        showdownSortDirection = showdownSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        showdownSortColumn = column;
        showdownSortDirection = column === 'projection' ? 'desc' : 'asc';
    }
    
    const container = document.getElementById('showdownLineupsOutput');
    if (container) {
        renderShowdownLineups(container);
    }
}

/**
 * Go to previous page
 */
function showdownPrevPage() {
    if (showdownCurrentPage > 1) {
        showdownCurrentPage--;
        const container = document.getElementById('showdownLineupsOutput');
        if (container) renderShowdownLineups(container);
    }
}

/**
 * Go to next page
 */
function showdownNextPage() {
    const totalPages = Math.ceil(showdownLineups.length / showdownLineupsPerPage);
    if (showdownCurrentPage < totalPages) {
        showdownCurrentPage++;
        const container = document.getElementById('showdownLineupsOutput');
        if (container) renderShowdownLineups(container);
    }
}

/**
 * Update Showdown settings
 * @param {Object} settings - New settings
 */
function updateShowdownSettings(settings) {
    showdownSettings = { ...showdownSettings, ...settings };
}

/**
 * Get current Showdown stats
 * @returns {Object} - Stats object
 */
function getShowdownStats() {
    return {
        playerCount: showdownPlayers.length,
        lineupCount: showdownLineups.length,
        avgProjection: showdownLineups.length > 0 
            ? (showdownLineups.reduce((s, l) => s + l.projection, 0) / showdownLineups.length).toFixed(2)
            : 0,
        avgSalary: showdownLineups.length > 0
            ? Math.round(showdownLineups.reduce((s, l) => s + l.salary, 0) / showdownLineups.length)
            : 0
    };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showdownPlayers,
        showdownLineups,
        showdownSettings,
        parseShowdownCSV,
        loadShowdownPlayers,
        getShowdownTeams,
        generateShowdownLineups,
        calculateExposure,
        exportShowdownLineups,
        renderShowdownLineups,
        updateShowdownSettings,
        getShowdownStats,
        sortShowdownBy,
        showdownPrevPage,
        showdownNextPage
    };
}
