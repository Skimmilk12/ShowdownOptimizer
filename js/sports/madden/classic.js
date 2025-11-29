// ==========================================
// CLASSIC OPTIMIZER FUNCTIONALITY
// ==========================================

// Classic State
let classicPlayers = [];
let classicEntries = [];
let classicSlates = {};
let classicCurrentSlate = null;
let classicSelectedLineupCount = 100;
let classicSelectedTimeSeconds = null;
let classicMinSalary = 45000;
let classicMaxSalary = 50000;
let classicProjFloor = 90;
let classicOptimizerMode = 'paw-patrol';
let classicDiversity = 5;

// Initialize Classic DOM elements and event listeners
function initClassicDOM() {
    const classicUploadZone = document.getElementById('classicUploadZone');
    const classicCsvInput = document.getElementById('classicCsvInput');

    if (classicUploadZone && classicCsvInput) {
        classicUploadZone.addEventListener('click', () => classicCsvInput.click());
        classicUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            classicUploadZone.classList.add('dragover');
        });
        classicUploadZone.addEventListener('dragleave', () => {
            classicUploadZone.classList.remove('dragover');
        });
        classicUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            classicUploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                handleClassicCSV(file);
            }
        });
        classicCsvInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleClassicCSV(file);
            classicCsvInput.value = '';
        });
    }

    // Slate selector
    document.querySelectorAll('#classicSlateSelector .slate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectClassicSlate(parseInt(btn.dataset.slate));
        });
    });

    // Position filters
    document.querySelectorAll('#classicPositionFilters .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#classicPositionFilters .filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderClassicPlayerPool();
        });
    });

    // Search
    document.getElementById('classicPlayerSearch')?.addEventListener('input', renderClassicPlayerPool);

    // Salary sliders
    document.getElementById('classicMinSalarySlider')?.addEventListener('input', (e) => {
        classicMinSalary = parseInt(e.target.value);
        if (classicMinSalary > classicMaxSalary) {
            classicMaxSalary = classicMinSalary;
            document.getElementById('classicMaxSalarySlider').value = classicMaxSalary;
        }
        document.getElementById('classicMinSalaryValue').textContent = classicMinSalary.toLocaleString();
        document.getElementById('classicMaxSalaryValue').textContent = classicMaxSalary.toLocaleString();
    });

    document.getElementById('classicMaxSalarySlider')?.addEventListener('input', (e) => {
        classicMaxSalary = parseInt(e.target.value);
        if (classicMaxSalary < classicMinSalary) {
            classicMinSalary = classicMaxSalary;
            document.getElementById('classicMinSalarySlider').value = classicMinSalary;
        }
        document.getElementById('classicMinSalaryValue').textContent = classicMinSalary.toLocaleString();
        document.getElementById('classicMaxSalaryValue').textContent = classicMaxSalary.toLocaleString();
    });

    document.getElementById('classicProjFloorSlider')?.addEventListener('input', (e) => {
        classicProjFloor = parseFloat(e.target.value);
        document.getElementById('classicProjFloorValue').textContent = `${classicProjFloor.toFixed(1)}%`;
    });

    // Lineup count buttons
    document.querySelectorAll('#classicLineupCountBtns .lineup-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#classicLineupCountBtns .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#classicTimeBtns .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            classicSelectedLineupCount = parseInt(btn.dataset.count);
            classicSelectedTimeSeconds = null;
        });
    });

    document.querySelectorAll('#classicTimeBtns .lineup-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#classicLineupCountBtns .lineup-count-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#classicTimeBtns .lineup-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            classicSelectedTimeSeconds = parseInt(btn.dataset.seconds);
        });
    });

    // Optimizer modes
    document.querySelectorAll('#classicOptimizeModes .optimize-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#classicOptimizeModes .optimize-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            classicOptimizerMode = btn.dataset.mode;
            const pawSettings = document.getElementById('classicPawPatrolSettings');
            if (pawSettings) pawSettings.style.display = classicOptimizerMode === 'paw-patrol' ? 'block' : 'none';
        });
    });

    document.getElementById('classicDiversitySlider')?.addEventListener('input', (e) => {
        classicDiversity = parseInt(e.target.value);
        document.getElementById('classicDiversityValue').textContent = classicDiversity;
    });

    // Action buttons
    document.getElementById('classicGenerateBtn')?.addEventListener('click', () => {
        generateClassicLineups(classicCurrentSlate);
    });

    document.getElementById('classicProcessAllBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('classicProcessAllBtn');
        btn.disabled = true;

        for (const slateNum of Object.keys(classicSlates)) {
            if (classicSlates[slateNum].players.length > 0) {
                selectClassicSlate(parseInt(slateNum));
                await generateClassicLineups(parseInt(slateNum));
                await new Promise(r => setTimeout(r, 100));
            }
        }

        btn.disabled = false;
    });

    document.getElementById('classicOptimizeBtn')?.addEventListener('click', () => {
        if (!classicCurrentSlate || !classicSlates[classicCurrentSlate]) return;
        const slate = classicSlates[classicCurrentSlate];
        if (slate.lineups.length === 0 || slate.entries.length === 0) return;

        const entries = slate.entries.sort((a, b) => b.entryFee - a.entryFee);
        const lineups = [...slate.lineups];

        if (classicOptimizerMode === 'cash') {
            entries.forEach(e => e.lineup = lineups[0]);
        } else {
            entries.forEach((entry, idx) => {
                if (lineups.length === 0) return;
                const pickIndex = Math.min(
                    Math.floor(idx * (10 - classicDiversity) / entries.length * lineups.length / 10),
                    lineups.length - 1
                );
                entry.lineup = lineups[pickIndex];
                if (classicOptimizerMode === 'paw-patrol') {
                    lineups.splice(pickIndex, 1);
                }
            });
        }

        const statusEl = document.getElementById('classicOptimizeStatus');
        if (statusEl) statusEl.innerHTML = `<span style="color: var(--accent-primary);">✓ ${entries.filter(e => e.lineup).length} entries optimized</span>`;
        const exportBtn = document.getElementById('classicExportEntriesBtn');
        if (exportBtn) exportBtn.disabled = false;
    });

    document.getElementById('classicExportEntriesBtn')?.addEventListener('click', () => {
        if (!classicCurrentSlate || !classicSlates[classicCurrentSlate]) return;
        const slate = classicSlates[classicCurrentSlate];

        let csv = 'Entry ID,Contest Name,Contest ID,Entry Fee,QB,RB,RB,WR,WR,WR,TE,FLEX,DST\n';

        slate.entries.forEach(entry => {
            if (!entry.lineup) return;

            const qb = entry.lineup.players.find(p => p.slot === 'QB');
            const rbs = entry.lineup.players.filter(p => p.slot === 'RB');
            const wrs = entry.lineup.players.filter(p => p.slot === 'WR');
            const te = entry.lineup.players.find(p => p.slot === 'TE');
            const flex = entry.lineup.players.find(p => p.slot === 'FLEX');
            const dst = entry.lineup.players.find(p => p.position === 'DST');

            csv += `${entry.entryId},"${entry.contestName}",${entry.contestId},$${entry.entryFee},`;
            csv += `${qb?.nameWithId || ''},${rbs[0]?.nameWithId || ''},${rbs[1]?.nameWithId || ''},`;
            csv += `${wrs[0]?.nameWithId || ''},${wrs[1]?.nameWithId || ''},${wrs[2]?.nameWithId || ''},`;
            csv += `${te?.nameWithId || ''},${flex?.nameWithId || ''},${dst?.nameWithId || ''}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `classic_entries_slate${classicCurrentSlate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('classicExportBtn')?.addEventListener('click', () => {
        if (!classicCurrentSlate || !classicSlates[classicCurrentSlate]?.lineups.length) return;
        const slate = classicSlates[classicCurrentSlate];

        let csv = 'Rank,QB,RB1,RB2,WR1,WR2,WR3,TE,FLEX,DST,Salary,Score,CorrBonus\n';

        slate.lineups.forEach((lineup, idx) => {
            const qb = lineup.players.find(p => p.slot === 'QB');
            const rbs = lineup.players.filter(p => p.slot === 'RB');
            const wrs = lineup.players.filter(p => p.slot === 'WR');
            const te = lineup.players.find(p => p.slot === 'TE');
            const flex = lineup.players.find(p => p.slot === 'FLEX');
            const dst = lineup.players.find(p => p.position === 'DST');

            csv += `${idx + 1},${qb?.name || ''},${rbs[0]?.name || ''},${rbs[1]?.name || ''},`;
            csv += `${wrs[0]?.name || ''},${wrs[1]?.name || ''},${wrs[2]?.name || ''},`;
            csv += `${te?.name || ''},${flex?.name || ''},${dst?.name || ''},`;
            csv += `${lineup.totalSalary},${lineup.score.total.toFixed(2)},${lineup.score.correlation.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `classic_lineups_slate${classicCurrentSlate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('classicClearLineupsBtn')?.addEventListener('click', () => {
        if (classicCurrentSlate && classicSlates[classicCurrentSlate]) {
            classicSlates[classicCurrentSlate].lineups = [];
            classicSlates[classicCurrentSlate].entries.forEach(e => e.lineup = null);
            const card = document.getElementById('classicLineupsCard');
            if (card) card.style.display = 'none';
            document.getElementById('classicLineupsGenerated').textContent = '0';
            const optimizeBtn = document.getElementById('classicOptimizeBtn');
            const exportBtn = document.getElementById('classicExportEntriesBtn');
            if (optimizeBtn) optimizeBtn.disabled = true;
            if (exportBtn) exportBtn.disabled = true;
        }
    });
}

function handleClassicCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        parseClassicCSV(e.target.result);
        const classicUploadZone = document.getElementById('classicUploadZone');
        classicUploadZone.innerHTML = `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--accent-primary);">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 style="color: var(--accent-primary);">✓ ${file.name}</h3>
            <p>${classicEntries.length} entries, ${classicPlayers.length} players</p>
        `;
    };
    reader.readAsText(file);
}

function parseClassicCSV(csvData) {
    const lines = csvData.split('\n');
    classicEntries = [];
    classicPlayers = [];
    classicSlates = {};

    let inPlayerSection = false;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = parseCSVLine(line);

        // Detect player section (columns 14+ have position data)
        if (row.length > 14 && row[14] && ['QB', 'RB', 'WR', 'TE', 'DST', 'K'].includes(row[14].toUpperCase())) {
            inPlayerSection = true;
        }

        if (inPlayerSection) {
            // Player row: cols 14-22 contain player data
            const position = row[14]?.trim().toUpperCase();
            const nameWithId = row[15]?.trim();
            const name = row[16]?.trim();
            const playerId = row[17]?.trim();
            const rosterPos = row[18]?.trim();
            const salary = parseInt(row[19]) || 0;
            const game = row[20]?.trim() || '';
            const team = row[21]?.trim().toUpperCase() || '';
            const projection = parseFloat(row[22]) || 0;

            if (!name || !position || !salary) continue;

            // Determine slate from game time
            let slateNum = 1;
            const timeMatch = game.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3].toUpperCase();
                if (ampm === 'PM' && hour !== 12) hour += 12;
                if (ampm === 'AM' && hour === 12) hour = 0;
                const timeKey = `${hour}:${minutes}`;
                slateNum = classicSlateTimeMap[timeKey] || classicSlateTimeMap[`${hour}:00`] || 1;
            }

            const player = {
                id: playerId,
                name,
                nameWithId,
                position: position === 'D' || position === 'DEF' ? 'DST' : position,
                salary,
                projection,
                team,
                game,
                slateNum,
                value: salary > 0 ? projection / (salary / 1000) : 0
            };

            classicPlayers.push(player);

            if (!classicSlates[slateNum]) {
                classicSlates[slateNum] = { entries: [], players: [], lineups: [], gameInfo: game };
            }
            classicSlates[slateNum].players.push(player);

        } else if (row[0] && row[0].match(/^\d+$/)) {
            // Entry row
            const entry = {
                entryId: row[0],
                contestName: row[1] || '',
                contestId: row[2] || '',
                entryFee: parseFloat(row[3]?.replace('$', '')) || 0,
                slots: row.slice(4, 13),
                lineup: null,
                slateNum: 1
            };

            // Determine slate from contest name
            const timeMatch = entry.contestName.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[3].toUpperCase();
                if (ampm === 'PM' && hour !== 12) hour += 12;
                if (ampm === 'AM' && hour === 12) hour = 0;
                const timeKey = `${hour}:${minutes}`;
                entry.slateNum = classicSlateTimeMap[timeKey] || classicSlateTimeMap[`${hour}:00`] || 1;
            }

            classicEntries.push(entry);

            if (!classicSlates[entry.slateNum]) {
                classicSlates[entry.slateNum] = { entries: [], players: [], lineups: [], gameInfo: '' };
            }
            classicSlates[entry.slateNum].entries.push(entry);
        }
    }

    document.getElementById('classicEntriesLoaded').textContent = classicEntries.length;
    document.getElementById('classicPlayersLoaded').textContent = classicPlayers.length;

    // Log parsing summary
    console.log('=== CLASSIC CSV PARSING COMPLETE ===');
    console.log('Total entries:', classicEntries.length);
    console.log('Total players:', classicPlayers.length);
    Object.keys(classicSlates).forEach(slateNum => {
        const slate = classicSlates[slateNum];
        console.log(`Slate ${slateNum}: ${slate.entries.length} entries, ${slate.players.length} players`);
        const positions = {};
        slate.players.forEach(p => {
            positions[p.position] = (positions[p.position] || 0) + 1;
        });
        console.log('  Positions:', positions);
    });

    updateClassicSlateButtons();

    // Auto-select first slate with data (Classic has 2 slates)
    for (let i = 1; i <= 2; i++) {
        if (classicSlates[i] && classicSlates[i].players.length > 0) {
            selectClassicSlate(i);
            break;
        }
    }
}

function updateClassicSlateButtons() {
    const container = document.getElementById('classicSlateSelector');
    if (!container) return;
    const buttons = container.querySelectorAll('.slate-btn');

    buttons.forEach(btn => {
        const slateNum = parseInt(btn.dataset.slate);
        const slate = classicSlates[slateNum];

        if (slate && (slate.entries.length > 0 || slate.players.length > 0)) {
            btn.classList.add('has-data');
        } else {
            btn.classList.remove('has-data');
        }
    });
}

function selectClassicSlate(slateNum) {
    classicCurrentSlate = slateNum;

    document.querySelectorAll('#classicSlateSelector .slate-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.slate) === slateNum);
    });

    const slate = classicSlates[slateNum];
    if (slate) {
        document.getElementById('classicSlateBadge').textContent = slateNum;
        document.getElementById('classicSlatePlayerCount').textContent = slate.players.length;
        document.getElementById('classicSlateEntryCount').textContent = slate.entries.length;

        // Extract all unique games from players
        const uniqueGames = [...new Set(slate.players.map(p => p.game).filter(g => g))];
        const teams = new Set();
        uniqueGames.forEach(game => {
            const match = game.match(/([A-Z]{2,3})@([A-Z]{2,3})/);
            if (match) {
                teams.add(match[1]);
                teams.add(match[2]);
            }
        });

        const teamsArray = [...teams];
        document.getElementById('classicSlateTeams').textContent = teamsArray.length > 0
            ? `${teamsArray.length} teams (${uniqueGames.length} games)`
            : 'No games';
        document.getElementById('classicSlateDateTime').textContent = slateNum === 1 ? 'Early Slate' : 'Late Slate';

        const poolBadge = document.getElementById('classicPlayerPoolSlateBadge');
        const entriesBadge = document.getElementById('classicEntriesSlateBadge');
        if (poolBadge) poolBadge.textContent = `Slate ${slateNum}`;
        if (entriesBadge) entriesBadge.textContent = `Slate ${slateNum}`;
    }

    renderClassicPlayerPool();
    renderClassicEntries();
    updateClassicUI();
}

function updateClassicUI() {
    const hasPlayers = classicCurrentSlate && classicSlates[classicCurrentSlate]?.players.length > 0;
    const generateBtn = document.getElementById('classicGenerateBtn');
    if (generateBtn) generateBtn.disabled = !hasPlayers;

    const hasEntries = classicCurrentSlate && classicSlates[classicCurrentSlate]?.entries.length > 0;
    const entriesCard = document.getElementById('classicEntriesCard');
    const optimizeCard = document.getElementById('classicOptimizeCard');
    if (entriesCard) entriesCard.style.display = hasEntries ? 'block' : 'none';
    if (optimizeCard) optimizeCard.style.display = hasPlayers ? 'block' : 'none';
}

function renderClassicPlayerPool() {
    const container = document.getElementById('classicPlayerPoolContainer');
    if (!container) return;

    if (!classicCurrentSlate || !classicSlates[classicCurrentSlate]) {
        container.innerHTML = `<div class="empty-state"><h4>No Players Loaded</h4><p>Upload a CSV file</p></div>`;
        return;
    }

    const players = classicSlates[classicCurrentSlate].players;
    const searchInput = document.getElementById('classicPlayerSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    const activeFilter = document.querySelector('#classicPositionFilters .filter-pill.active')?.dataset.pos || 'all';

    let filtered = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                              p.team.toLowerCase().includes(searchTerm);
        const matchesPosition = activeFilter === 'all' || p.position === activeFilter;
        return matchesSearch && matchesPosition;
    });

    filtered.sort((a, b) => b.projection - a.projection);
    const playerCountEl = document.getElementById('classicPlayerCount');
    if (playerCountEl) playerCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h4>No players match filters</h4></div>`;
        return;
    }

    let html = `<table class="player-table"><thead><tr>
        <th>Player</th><th>Pos</th><th>Team</th><th>Salary</th><th>Proj</th><th>Value</th>
    </tr></thead><tbody>`;

    filtered.slice(0, 100).forEach(p => {
        html += `<tr>
            <td>${p.name}</td>
            <td><span class="position-badge ${p.position.toLowerCase()}">${p.position}</span></td>
            <td>${p.team}</td>
            <td>$${p.salary.toLocaleString()}</td>
            <td style="color: var(--accent-primary); font-weight: 600;">${p.projection.toFixed(1)}</td>
            <td style="color: var(--text-muted);">${p.value.toFixed(2)}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderClassicEntries() {
    const container = document.getElementById('classicEntriesGroupedContainer');
    if (!container || !classicCurrentSlate || !classicSlates[classicCurrentSlate]) return;

    const entries = classicSlates[classicCurrentSlate].entries;
    if (entries.length === 0) {
        container.innerHTML = '';
        return;
    }

    const grouped = {};
    entries.forEach(e => {
        const key = e.contestName;
        if (!grouped[key]) grouped[key] = { entries: [], totalFee: 0 };
        grouped[key].entries.push(e);
        grouped[key].totalFee += e.entryFee;
    });

    let html = '';
    Object.keys(grouped).forEach(contestName => {
        const group = grouped[contestName];
        html += `<div class="entries-group">
            <div class="entries-group-header">
                <span class="contest-name">${contestName}</span>
                <span class="contest-meta">${group.entries.length} entries • $${group.totalFee.toFixed(2)}</span>
            </div>
        </div>`;
    });

    container.innerHTML = html;

    const totalFees = entries.reduce((sum, e) => sum + e.entryFee, 0);
    const countEl = document.getElementById('classicEntriesCount');
    const feesEl = document.getElementById('classicTotalEntryFees');
    if (countEl) countEl.textContent = `${entries.length} entries`;
    if (feesEl) feesEl.textContent = `$${totalFees.toFixed(2)} total`;
}

async function generateClassicLineups(slateNum) {
    const slate = classicSlates[slateNum];
    if (!slate || slate.players.length === 0) return;

    const progressContainer = document.getElementById('classicProgressContainer');
    const progressFill = document.getElementById('classicProgressFill');
    const progressText = document.getElementById('classicProgressText');

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    document.getElementById('classicGenerateBtn').disabled = true;

    const players = slate.players;

    // Add value metric to each player
    players.forEach(p => {
        p.value = p.salary > 0 ? (p.projection / p.salary) * 1000 : 0;
    });

    // Organize by position
    const byPosition = {
        QB: players.filter(p => p.position === 'QB').sort((a,b) => b.projection - a.projection),
        RB: players.filter(p => p.position === 'RB').sort((a,b) => b.projection - a.projection),
        WR: players.filter(p => p.position === 'WR').sort((a,b) => b.projection - a.projection),
        TE: players.filter(p => p.position === 'TE').sort((a,b) => b.projection - a.projection),
        DST: players.filter(p => p.position === 'DST').sort((a,b) => b.projection - a.projection),
        FLEX: players.filter(p => ['RB', 'WR', 'TE'].includes(p.position)).sort((a,b) => b.projection - a.projection)
    };

    console.log('=== CLASSIC LINEUP GENERATION ===');
    console.log('Position counts:', {
        QB: byPosition.QB.length,
        RB: byPosition.RB.length,
        WR: byPosition.WR.length,
        TE: byPosition.TE.length,
        DST: byPosition.DST.length,
        FLEX: byPosition.FLEX.length
    });

    const generated = [];
    const lineupSet = new Set();
    const startTime = Date.now();
    const targetCount = classicSelectedTimeSeconds ? 50000 : classicSelectedLineupCount;
    const maxTime = classicSelectedTimeSeconds ? classicSelectedTimeSeconds * 1000 : 30000;

    // Strategies to rotate through
    const strategies = ['high_value', 'high_projection', 'high_value', 'high_ceiling', 'balanced', 'high_value', 'stacking'];

    // Discovery phase - find max projection
    progressText.textContent = 'Discovery: Finding max projection...';
    let discoveredMax = 0;

    for (let i = 0; i < 500; i++) {
        const lineup = buildClassicLineupByStrategy(byPosition, 'high_projection');
        if (lineup && lineup.totalProjection > discoveredMax) {
            discoveredMax = lineup.totalProjection;
        }
    }

    // Set projection floor as percentage of discovered max
    const projectionFloor = discoveredMax * (classicProjFloor / 100);
    // Salary floor is 96% of cap
    const salaryFloor = CLASSIC_SALARY_CAP * 0.96;

    console.log('Discovery complete:', {
        maxProjection: discoveredMax.toFixed(2),
        projectionFloor: projectionFloor.toFixed(2),
        salaryFloor: salaryFloor
    });

    let strategyIndex = 0;
    let buildStats = { attempts: 0, duplicates: 0, belowProjFloor: 0, belowSalaryFloor: 0, success: 0 };

    // Phase 1: Pure projection lineups (first 5 seconds or 40% of lineups)
    const phase1End = Math.min(startTime + 5000, startTime + maxTime * 0.4);
    progressText.textContent = 'Phase 1: Building high projection lineups...';

    while (Date.now() < phase1End && generated.length < targetCount) {
        buildStats.attempts++;
        const strategy = strategies[strategyIndex % strategies.length];
        if (buildStats.attempts % 30 === 0) strategyIndex++;

        const lineup = buildClassicLineupByStrategy(byPosition, strategy);

        if (lineup) {
            const key = lineup.players.map(p => p.id).sort().join('|');

            if (lineupSet.has(key)) {
                buildStats.duplicates++;
            } else if (lineup.totalProjection < projectionFloor) {
                buildStats.belowProjFloor++;
            } else if (lineup.totalSalary < salaryFloor) {
                buildStats.belowSalaryFloor++;
            } else {
                lineupSet.add(key);
                lineup.phase = 1;
                lineup.strategy = strategy;
                generated.push(lineup);
                buildStats.success++;
            }
        }

        if (buildStats.attempts % 200 === 0) {
            const progress = Math.min((Date.now() - startTime) / maxTime * 100, 100);
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Phase 1: ${generated.length} lineups...`;
            await new Promise(r => setTimeout(r, 0));
        }
    }

    console.log('Phase 1 complete:', generated.length, 'lineups');

    // Phase 2: Correlation-aware stacking (remaining time)
    progressText.textContent = 'Phase 2: Building correlated stacks...';

    while (Date.now() - startTime < maxTime && generated.length < targetCount) {
        buildStats.attempts++;

        // Emphasize stacking in phase 2
        const phase2Strategies = ['stacking', 'stacking', 'high_value', 'balanced', 'stacking'];
        const strategy = phase2Strategies[strategyIndex % phase2Strategies.length];
        if (buildStats.attempts % 25 === 0) strategyIndex++;

        const lineup = buildClassicLineupByStrategy(byPosition, strategy);

        if (lineup) {
            const key = lineup.players.map(p => p.id).sort().join('|');

            if (lineupSet.has(key)) {
                buildStats.duplicates++;
            } else if (lineup.totalProjection < projectionFloor) {
                buildStats.belowProjFloor++;
            } else if (lineup.totalSalary < salaryFloor) {
                buildStats.belowSalaryFloor++;
            } else {
                lineupSet.add(key);
                lineup.phase = 2;
                lineup.strategy = strategy;
                generated.push(lineup);
                buildStats.success++;
            }
        }

        if (buildStats.attempts % 200 === 0) {
            const progress = Math.min((Date.now() - startTime) / maxTime * 100, 100);
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Phase 2: ${generated.length} lineups (${strategy})...`;
            await new Promise(r => setTimeout(r, 0));
        }
    }

    console.log('Build complete:', buildStats);

    // Score and sort lineups
    generated.forEach(lineup => {
        lineup.score = calculateClassicLineupScore(lineup);
    });
    generated.sort((a, b) => b.score.total - a.score.total);

    const finalCount = classicSelectedTimeSeconds ? Math.min(generated.length, 5000) : classicSelectedLineupCount;
    slate.lineups = generated.slice(0, finalCount);

    progressFill.style.width = '100%';
    progressText.textContent = `Generated ${slate.lineups.length} lineups!`;

    setTimeout(() => {
        progressContainer.style.display = 'none';
        document.getElementById('classicGenerateBtn').disabled = false;
    }, 1000);

    if (slate.lineups.length > 0) {
        document.getElementById('classicLineupsGenerated').textContent = slate.lineups.length;
        document.getElementById('classicTopProjection').textContent = slate.lineups[0].totalProjection.toFixed(2);
        const avgScore = slate.lineups.reduce((sum, l) => sum + l.score.total, 0) / slate.lineups.length;
        document.getElementById('classicAvgScore').textContent = avgScore.toFixed(2);
    }

    renderClassicLineups(slateNum);
    const optimizeBtn = document.getElementById('classicOptimizeBtn');
    if (optimizeBtn) optimizeBtn.disabled = false;
}

// Sort players by strategy
function sortClassicByStrategy(players, strategy) {
    const sorted = [...players];
    switch (strategy) {
        case 'high_projection':
            return sorted.sort((a, b) => b.projection - a.projection);
        case 'high_value':
            return sorted.sort((a, b) => (b.value || 0) - (a.value || 0));
        case 'high_ceiling':
            // Estimate ceiling as projection * 1.5
            return sorted.sort((a, b) => (b.projection * 1.5) - (a.projection * 1.5));
        case 'stacking':
        case 'balanced':
        default:
            // Balanced: 50% projection, 50% value
            return sorted.sort((a, b) => {
                const scoreA = (a.projection / 30 * 50) + ((a.value || 0) / 5 * 50);
                const scoreB = (b.projection / 30 * 50) + ((b.value || 0) / 5 * 50);
                return scoreB - scoreA;
            });
    }
}

// Build lineup using specific strategy (MaddenOptimizerV2 approach)
function buildClassicLineupByStrategy(byPosition, strategy) {
    const lineup = { players: [], totalSalary: 0, totalProjection: 0 };
    const usedPlayers = new Set();
    const teamCounts = {};
    let remainingSalary = CLASSIC_SALARY_CAP;

    // Pick QB first - rotate through top QBs for diversity
    const qbs = byPosition.QB || [];
    if (qbs.length === 0) return null;

    const qbPoolSize = Math.min(8, qbs.length);
    const qbIndex = Math.floor(Math.random() * qbPoolSize);
    const qb = qbs[qbIndex];

    lineup.players.push({ ...qb, slot: 'QB' });
    usedPlayers.add(qb.id);
    remainingSalary -= qb.salary;
    lineup.totalSalary += qb.salary;
    lineup.totalProjection += qb.projection;
    teamCounts[qb.team] = 1;

    // Determine stacking targets for correlation strategies
    let stackTargets = [];
    const isStackingStrategy = strategy === 'stacking' || Math.random() < 0.6; // 60% chance to stack

    if (isStackingStrategy) {
        // Find pass catchers on QB's team
        const teamCatchers = [...(byPosition.WR || []), ...(byPosition.TE || [])]
            .filter(p => p.team === qb.team)
            .sort((a, b) => b.projection - a.projection);

        // Decide stack count: 1 or 2 targets
        const stackCount = strategy === 'stacking' ? (Math.random() < 0.5 ? 2 : 1) :
                           (Math.random() < 0.3 ? 2 : Math.random() < 0.7 ? 1 : 0);

        for (let i = 0; i < Math.min(stackCount, teamCatchers.length); i++) {
            if (teamCatchers[i].salary <= remainingSalary * 0.18) {
                stackTargets.push(teamCatchers[i]);
            }
        }
    }

    // Fill positions (shuffle order for diversity)
    const positions = ['DST', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE'];
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (const pos of positions) {
        // Check if any stack target matches this position
        let usedStackTarget = false;
        for (let i = 0; i < stackTargets.length; i++) {
            const target = stackTargets[i];
            if (target && !usedPlayers.has(target.id) && target.position === pos) {
                // Check salary constraint
                const positionsLeft = 8 - lineup.players.length;
                const minReserve = positionsLeft * 3000;
                if (target.salary <= remainingSalary - minReserve) {
                    lineup.players.push({ ...target, slot: pos });
                    usedPlayers.add(target.id);
                    remainingSalary -= target.salary;
                    lineup.totalSalary += target.salary;
                    lineup.totalProjection += target.projection;
                    teamCounts[target.team] = (teamCounts[target.team] || 0) + 1;
                    stackTargets[i] = null; // Mark as used
                    usedStackTarget = true;
                    break;
                }
            }
        }

        if (usedStackTarget) continue;

        // Get candidates for this position
        const pool = byPosition[pos] || [];
        const positionsLeft = 8 - lineup.players.length;
        const minReserve = positionsLeft * 3000;
        const maxPlayerSalary = remainingSalary - minReserve;

        const candidates = pool.filter(p => {
            if (usedPlayers.has(p.id)) return false;
            if (p.salary > maxPlayerSalary) return false;
            if (teamCounts[p.team] >= 4) return false; // Max 4 per team
            return true;
        });

        if (candidates.length === 0) return null;

        // Sort by strategy and pick from top candidates
        const sorted = sortClassicByStrategy(candidates, strategy);
        const selectionSize = strategy === 'high_value' ? 12 : 8;
        const randomRange = strategy === 'high_value' ? 6 : 4;
        const topCandidates = sorted.slice(0, selectionSize);
        const pickIndex = Math.floor(Math.random() * Math.min(randomRange, topCandidates.length));
        const player = topCandidates[pickIndex];

        if (!player) return null;

        lineup.players.push({ ...player, slot: pos });
        usedPlayers.add(player.id);
        remainingSalary -= player.salary;
        lineup.totalSalary += player.salary;
        lineup.totalProjection += player.projection;
        teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
    }

    // Fill FLEX - check for unused stack targets first
    let flex = null;

    for (const target of stackTargets) {
        if (target && !usedPlayers.has(target.id)) {
            if (['RB', 'WR', 'TE'].includes(target.position) && target.salary <= remainingSalary) {
                flex = target;
                break;
            }
        }
    }

    if (!flex) {
        const flexCandidates = (byPosition.FLEX || []).filter(p => {
            if (usedPlayers.has(p.id)) return false;
            if (p.salary > remainingSalary) return false;
            if (teamCounts[p.team] >= 4) return false;
            return true;
        });

        if (flexCandidates.length === 0) return null;

        const sortedFlex = sortClassicByStrategy(flexCandidates, strategy);
        const flexRange = strategy === 'high_value' ? 8 : 5;
        flex = sortedFlex[Math.floor(Math.random() * Math.min(flexRange, sortedFlex.length))];
    }

    if (!flex) return null;

    lineup.players.push({ ...flex, slot: 'FLEX' });
    lineup.totalSalary += flex.salary;
    lineup.totalProjection += flex.projection;

    return lineup;
}

function calculateClassicLineupScore(lineup) {
    let projScore = lineup.totalProjection;
    let corrBonus = 0;

    const qb = lineup.players.find(p => p.slot === 'QB');
    if (qb && teamCorrelations[qb.team]) {
        const corrs = teamCorrelations[qb.team];
        lineup.players.forEach(p => {
            if (p.team === qb.team && p.slot !== 'QB') {
                const corr = corrs.find(c =>
                    (c.player1 === qb.name && c.player2 === p.name) ||
                    (c.player2 === qb.name && c.player1 === p.name)
                );
                if (corr && corr.correlation > 0.2) {
                    corrBonus += corr.correlation * 2;
                }
            }
        });
    }

    return { projection: projScore, correlation: corrBonus, total: projScore + corrBonus };
}

function renderClassicLineups(slateNum) {
    const slate = classicSlates[slateNum];
    const card = document.getElementById('classicLineupsCard');
    const rows = document.getElementById('classicLineupRows');

    if (!slate || slate.lineups.length === 0) {
        if (card) card.style.display = 'none';
        return;
    }

    if (card) card.style.display = 'block';
    const slateBadge = document.getElementById('classicLineupsSlateBadge');
    const countDisplay = document.getElementById('classicLineupCountDisplay');
    if (slateBadge) slateBadge.textContent = `Slate ${slateNum}`;
    if (countDisplay) countDisplay.textContent = `${slate.lineups.length} lineups`;

    let html = '';
    slate.lineups.slice(0, 100).forEach((lineup, idx) => {
        const qb = lineup.players.find(p => p.slot === 'QB');
        const rbs = lineup.players.filter(p => p.slot === 'RB');
        const wrs = lineup.players.filter(p => p.slot === 'WR');
        const te = lineup.players.find(p => p.slot === 'TE');
        const flex = lineup.players.find(p => p.slot === 'FLEX');
        const dst = lineup.players.find(p => p.position === 'DST');

        const corrClass = lineup.score.correlation >= 0 ? 'positive' : 'negative';

        html += `<div class="classic-lineup-row">
            <div class="classic-lineup-rank">${idx + 1}</div>
            <div class="classic-player"><span class="classic-player-name">${qb?.name || '-'}</span><span class="classic-player-info">$${(qb?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${rbs[0]?.name || '-'}</span><span class="classic-player-info">$${(rbs[0]?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${rbs[1]?.name || '-'}</span><span class="classic-player-info">$${(rbs[1]?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${wrs[0]?.name || '-'}</span><span class="classic-player-info">$${(wrs[0]?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${wrs[1]?.name || '-'}</span><span class="classic-player-info">$${(wrs[1]?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${wrs[2]?.name || '-'}</span><span class="classic-player-info">$${(wrs[2]?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${te?.name || '-'}</span><span class="classic-player-info">$${(te?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${flex?.name || '-'}</span><span class="classic-player-info">$${(flex?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-player"><span class="classic-player-name">${dst?.name || '-'}</span><span class="classic-player-info">$${(dst?.salary || 0).toLocaleString()}</span></div>
            <div class="classic-lineup-salary">$${lineup.totalSalary.toLocaleString()}</div>
            <div class="score-breakdown"><span class="score-proj">${lineup.score.total.toFixed(1)}</span><span class="score-corr ${corrClass}">${lineup.score.correlation >= 0 ? '+' : ''}${lineup.score.correlation.toFixed(1)} corr</span></div>
        </div>`;
    });

    if (rows) rows.innerHTML = html;
}
