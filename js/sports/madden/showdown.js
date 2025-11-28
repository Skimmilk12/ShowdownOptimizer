/* ==========================================
   MADDEN SHOWDOWN OPTIMIZER
   Core showdown lineup generation logic
   ORIGINAL WORKING CODE - extracted from monolithic HTML
   ========================================== */

const MaddenShowdown = {
    // State
    players: [],
    lineups: [],
    entries: [],
    slates: {},
    currentSlate: null,
    
    // Settings
    selectedLineupCount: 100,
    selectedTimeSeconds: null,
    generationMode: 'count',
    minSalary: 49000,
    maxSalary: 50000,
    projectionFloor: 90,
    optimizeMode: 'balanced',
    diversityStrength: 5,
    
    // Sorting
    currentSort: { column: 'points', direction: 'desc' },
    playerPoolSort: { column: 'flexProjection', direction: 'desc' },
    currentPage: 1,
    lineupsPerPage: 100,
    
    // Constants
    SALARY_CAP: 50000,
    
    /**
     * Parse DraftKings CSV - ORIGINAL WORKING CODE
     */
    parseCSV(csvText, fileName = '') {
        const lines = csvText.trim().split('\n');
        const allRows = lines.map(line => Utils.parseCSVLine(line));
        
        // Row 1 has entry headers
        const entryHeaders = allRows[0].map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        console.log('Entry Headers (row 1):', entryHeaders);
        
        this.players = [];
        this.entries = [];
        
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
                
                this.entries.push({
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
        
        console.log('Entries parsed:', this.entries.length);
        
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
            this.parseCSVOldFormat(lines, entryHeaders);
            return contestsMap;
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
        let rawPlayers = [];
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
                
                rawPlayers.push({
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
        
        console.log('Raw players parsed:', rawPlayers.length);
        
        if (rawPlayers.length === 0) {
            console.log('No players found, trying old format...');
            this.parseCSVOldFormat(lines, entryHeaders);
            return contestsMap;
        }

        // Group players by name to get FLEX and CPT versions
        const playerMap = new Map();
        rawPlayers.forEach(p => {
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
        this.players = Array.from(playerMap.values()).map((p, idx) => {
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
        
        console.log('Final players after grouping:', this.players.length);

        // Calculate entry salaries and projections
        this.entries.forEach(entry => {
            let totalSalary = 0;
            let totalProjection = 0;
            
            const cptName = Utils.extractPlayerName(entry.cpt);
            const cptPlayer = this.players.find(p => p.name === cptName || entry.cpt.includes(p.name));
            if (cptPlayer) {
                totalSalary += cptPlayer.cptSalary;
                totalProjection += cptPlayer.cptProjection;
            }
            
            entry.flex.forEach(flexStr => {
                const flexName = Utils.extractPlayerName(flexStr);
                const flexPlayer = this.players.find(p => p.name === flexName || flexStr.includes(p.name));
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
        if (this.players.length > 0 && this.players[0].game) {
            gameInfo = this.players[0].game;
        }
        const slateNum = this.detectSlateNumber(gameInfo);
        const parsedInfo = this.parseGameInfo(gameInfo);
        
        // Store in slates object
        this.slates[slateNum] = {
            players: [...this.players],
            entries: [...this.entries],
            lineups: [],
            teams: parsedInfo.teams,
            date: parsedInfo.date,
            time: parsedInfo.time,
            dateTime: parsedInfo.dateTime,
            fileName: fileName
        };
        
        // Auto-select this slate
        this.currentSlate = slateNum;
        
        console.log(`Loaded slate ${slateNum}: ${this.players.length} players, ${this.entries.length} entries`);
        
        return contestsMap;
    },
    
    /**
     * Old format parser for backwards compatibility
     */
    parseCSVOldFormat(lines, headers) {
        this.players = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = Utils.parseCSVLine(lines[i]);
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
                
                this.players.push({
                    id: i,
                    name: name,
                    position: position.replace('CPT', '').trim() || this.extractPosition(position),
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
        this.players.forEach(p => {
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

        this.players = Array.from(playerMap.values()).map((p, idx) => {
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
        if (this.players.length > 0 && this.players[0].game) {
            gameInfo = this.players[0].game;
        }
        const slateNum = this.detectSlateNumber(gameInfo);
        const parsedInfo = this.parseGameInfo(gameInfo);
        
        // Store in slates object
        this.slates[slateNum] = {
            players: [...this.players],
            entries: [],
            lineups: [],
            teams: parsedInfo.teams,
            date: parsedInfo.date,
            time: parsedInfo.time,
            dateTime: parsedInfo.dateTime,
            fileName: ''
        };
        
        this.currentSlate = slateNum;
    },
    
    extractPosition(pos) {
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'];
        for (const p of positions) {
            if (pos.toUpperCase().includes(p)) return p;
        }
        return pos;
    },
    
    detectSlateNumber(gameInfo) {
        if (!gameInfo) return 1;
        
        const timeMatch = gameInfo.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) return 1;
        
        let hour = parseInt(timeMatch[1]);
        const isPM = timeMatch[3].toUpperCase() === 'PM';
        
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        if (hour >= 11 && hour < 14) return 1;
        if (hour >= 14 && hour < 16) return 2;
        if (hour >= 16 && hour < 18) return 3;
        if (hour >= 18 && hour < 20) return 4;
        if (hour >= 20 && hour < 22) return 5;
        if (hour >= 22 || hour < 11) return 6;
        
        return 1;
    },
    
    parseGameInfo(gameInfo) {
        if (!gameInfo) return { teams: '', date: '', time: '' };
        
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
    },
    
    /**
     * Generate lineups - ORIGINAL WORKING CODE
     */
    async generateLineups(progressCallback) {
        if (this.players.length === 0) return;

        this.lineups = [];
        this.currentPage = 1;

        const teams = [...new Set(this.players.map(p => p.team))];
        if (teams.length < 2) {
            throw new Error('Need players from at least 2 teams for Showdown');
        }

        const isTimeMode = this.generationMode === 'time';
        const targetCount = isTimeMode ? Infinity : this.selectedLineupCount;
        const targetTime = isTimeMode ? this.selectedTimeSeconds * 1000 : Infinity;
        const startTime = Date.now();
        
        const lineupSet = new Set();

        // Sort players by projection for greedy selection
        const sortedPlayers = [...this.players].sort((a, b) => b.flexProjection - a.flexProjection);
        
        // PHASE 1: Generate ALL optimal lineups deterministically
        if (progressCallback) progressCallback(10, 0, 'Finding optimal lineups...');
        await new Promise(r => setTimeout(r, 0));

        const optimalLineups = [];
        const playersByCptProj = [...this.players].sort((a, b) => (b.flexProjection * 1.5) - (a.flexProjection * 1.5));
        
        for (let cptIdx = 0; cptIdx < playersByCptProj.length; cptIdx++) {
            const captain = playersByCptProj[cptIdx];
            
            if (cptIdx % 5 === 0) {
                const elapsed = Date.now() - startTime;
                if (isTimeMode) {
                    const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                    if (progressCallback) progressCallback(timeProgress, optimalLineups.length, `Finding optimal lineups... ${Math.ceil((targetTime - elapsed) / 1000)}s remaining`);
                } else {
                    if (progressCallback) progressCallback(10 + (cptIdx / playersByCptProj.length) * 40, optimalLineups.length, `Analyzing captain ${cptIdx + 1}/${playersByCptProj.length}...`);
                }
                await new Promise(r => setTimeout(r, 0));
            }
            
            const lineup = this.generateOptimalLineupForCaptain(captain, sortedPlayers, teams);
            if (lineup) {
                const lineupKey = lineup.players.map(p => p.id + (p.isCpt ? 'C' : '')).sort().join('-');
                if (!lineupSet.has(lineupKey)) {
                    lineupSet.add(lineupKey);
                    optimalLineups.push(lineup);
                }
            }
        }

        // Sort optimal lineups by projection to find the max
        optimalLineups.sort((a, b) => b.totalProjection - a.totalProjection);
        
        // Calculate projection threshold based on the top lineup
        const maxProjection = optimalLineups.length > 0 ? optimalLineups[0].totalProjection : 0;
        const projectionThreshold = maxProjection * (this.projectionFloor / 100);
        
        // Filter optimal lineups by salary range and projection floor
        for (const lineup of optimalLineups) {
            if (lineup.totalSalary >= this.minSalary && 
                lineup.totalSalary <= this.maxSalary && 
                lineup.totalProjection >= projectionThreshold) {
                this.lineups.push(lineup);
            }
        }

        // PHASE 2: If we need more lineups, generate additional ones with controlled randomization
        const needMoreLineups = isTimeMode || this.lineups.length < targetCount;
        
        if (needMoreLineups) {
            if (progressCallback) progressCallback(60, this.lineups.length, isTimeMode ? 'Generating lineups...' : 'Generating additional lineups...');
            await new Promise(r => setTimeout(r, 0));

            let attempts = 0;
            let lastLineupCount = this.lineups.length;
            let stallCounter = 0;
            const maxStallAttempts = 5000;
            
            while (true) {
                attempts++;
                
                const elapsed = Date.now() - startTime;
                
                if (isTimeMode && elapsed >= targetTime) {
                    break;
                }
                
                if (!isTimeMode && this.lineups.length >= targetCount) {
                    break;
                }
                
                if (stallCounter >= maxStallAttempts) {
                    break;
                }

                if (attempts % 500 === 0) {
                    if (isTimeMode) {
                        const timeProgress = Math.min((elapsed / targetTime) * 100, 100);
                        const remaining = Math.max(0, Math.ceil((targetTime - elapsed) / 1000));
                        if (progressCallback) progressCallback(timeProgress, this.lineups.length, `Generated ${this.lineups.length} lineups... ${remaining}s remaining`);
                    } else {
                        const progress = 60 + Math.min((this.lineups.length / targetCount) * 40, 39);
                        if (progressCallback) progressCallback(progress, this.lineups.length, `Generated ${this.lineups.length} of ${targetCount} lineups...`);
                    }
                    await new Promise(r => setTimeout(r, 0));
                    
                    if (this.lineups.length === lastLineupCount) {
                        stallCounter += 500;
                    } else {
                        stallCounter = 0;
                        lastLineupCount = this.lineups.length;
                    }
                }

                const lineup = this.generateRandomizedLineup(sortedPlayers, teams);
                if (lineup) {
                    if (lineup.totalSalary < this.minSalary || lineup.totalSalary > this.maxSalary) {
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
                        this.lineups.push(lineup);
                        stallCounter = 0;
                    } else {
                        stallCounter++;
                    }
                } else {
                    stallCounter++;
                }
            }
        }

        // Final sort by total projection
        this.lineups.sort((a, b) => b.totalProjection - a.totalProjection);
        
        // Save lineups to current slate
        if (this.currentSlate && this.slates[this.currentSlate]) {
            this.slates[this.currentSlate].lineups = [...this.lineups];
        }

        const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        if (progressCallback) progressCallback(100, this.lineups.length, `Complete! ${this.lineups.length} lineups in ${finalTime}s`);

        return this.lineups;
    },

    /**
     * Generate the optimal lineup for a given captain
     */
    generateOptimalLineupForCaptain(captain, sortedPlayers, teams) {
        const cptSalary = Math.round(captain.flexSalary * 1.5);
        const remainingSalary = this.SALARY_CAP - cptSalary;
        
        const available = sortedPlayers.filter(p => p.id !== captain.id);
        const bestCombo = this.findBestFivePlayers(available, remainingSalary, captain.team, cptSalary);
        
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
    },

    /**
     * Find the best 5 FLEX players using exhaustive search
     */
    findBestFivePlayers(players, maxSalary, captainTeam) {
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
    },

    /**
     * Generate a randomized lineup for diversity
     */
    generateRandomizedLineup(sortedPlayers, teams) {
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
        let remainingSalary = this.SALARY_CAP - cptSalary;
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
        if (totalSalary > this.SALARY_CAP) return null;

        const totalProjection = (captain.flexProjection * 1.5) + flexPlayers.reduce((sum, p) => sum + p.flexProjection, 0);

        return {
            players: [
                { ...captain, isCpt: true, cptSalary: cptSalary },
                ...flexPlayers.map(p => ({ ...p, isCpt: false }))
            ],
            totalSalary,
            totalProjection
        };
    },
    
    /**
     * Select a slate
     */
    selectSlate(slateNum) {
        if (!this.slates[slateNum]) return false;
        
        this.currentSlate = slateNum;
        const slate = this.slates[slateNum];
        this.players = slate.players;
        this.entries = slate.entries;
        this.lineups = slate.lineups || [];
        
        return true;
    },
    
    /**
     * Export lineups to CSV
     */
    exportCSV() {
        if (this.lineups.length === 0) return '';

        const headers = ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'Salary', 'Projection'];
        const rows = this.lineups.map(lineup => {
            const cpt = lineup.players[0];
            const flex = lineup.players.slice(1);
            return [
                cpt.name,
                ...flex.map(p => p.name),
                lineup.totalSalary,
                lineup.totalProjection.toFixed(2)
            ];
        });

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },
    
    /**
     * Get stats
     */
    getStats() {
        return {
            playerCount: this.players.length,
            lineupCount: this.lineups.length,
            entryCount: this.entries.length,
            topProjection: this.lineups.length > 0 ? this.lineups[0].totalProjection : 0,
            avgProjection: this.lineups.length > 0 
                ? this.lineups.reduce((sum, l) => sum + l.totalProjection, 0) / this.lineups.length 
                : 0
        };
    }
};

// Make available globally
window.MaddenShowdown = MaddenShowdown;
