/* ==========================================
   SHOWDOWN OPTIMIZER - MADDEN SHOWDOWN OPTIMIZER
   Madden-specific lineup generation logic
   ========================================== */

class MaddenShowdownOptimizer extends BaseOptimizer {
    constructor() {
        super(MaddenConfig);
        
        // Madden-specific settings
        this.settings = {
            ...this.settings,
            lineupCount: MaddenConfig.defaultLineupCount,
            salaryMin: MaddenConfig.defaultSalaryMin,
            salaryMax: MaddenConfig.defaultSalaryMax,
            projectionFloor: MaddenConfig.defaultProjectionFloor
        };
    }
    
    /* ==========================================
       PLAYER PARSING
       ========================================== */
    
    /**
     * Parse DraftKings Madden CSV data
     * @param {Object[]} data - Raw CSV data
     * @returns {Object[]} - Parsed player objects
     */
    parsePlayerData(data) {
        const players = [];
        const cols = MaddenConfig.csvColumns;
        
        for (const row of data) {
            // Find values using column mappings
            const name = this.findValue(row, cols.name);
            const position = this.findValue(row, cols.position);
            const salary = parseInt(this.findValue(row, cols.salary)) || 0;
            const team = this.findValue(row, cols.team);
            const projection = parseFloat(this.findValue(row, cols.projection)) || 0;
            const game = this.findValue(row, cols.game);
            const id = this.findValue(row, cols.id);
            
            if (!name || salary <= 0) continue;
            
            // Normalize position
            const normalizedPos = Utils.normalizePosition(position);
            
            // Skip if this is a CPT row (we'll create CPT versions ourselves)
            if (normalizedPos === 'CPT') continue;
            
            players.push({
                id: id || name,
                name: Utils.extractPlayerName(name),
                position: normalizedPos,
                salary: salary,
                team: team,
                projection: projection,
                game: game,
                value: salary > 0 ? (projection / salary * 1000) : 0,
                locked: false,
                excluded: false
            });
        }
        
        return players;
    }
    
    /**
     * Find value in row using possible column names
     * @param {Object} row - Data row
     * @param {string[]} possibleKeys - Possible column names
     * @returns {string} - Found value or empty string
     */
    findValue(row, possibleKeys) {
        for (const key of possibleKeys) {
            // Try exact match
            if (row[key] !== undefined) return row[key];
            
            // Try lowercase
            const lowerKey = key.toLowerCase();
            for (const rowKey of Object.keys(row)) {
                if (rowKey.toLowerCase() === lowerKey || rowKey.toLowerCase().includes(lowerKey)) {
                    return row[rowKey];
                }
            }
        }
        return '';
    }
    
    /* ==========================================
       LINEUP GENERATION
       ========================================== */
    
    /**
     * Generate lineups using count-based approach
     * @param {Function} progressCallback 
     * @returns {Object[]}
     */
    async generate(progressCallback = null) {
        if (this.players.length < 6) {
            throw new Error('Not enough players to generate lineups');
        }
        
        this.isGenerating = true;
        const allLineups = [];
        const seenKeys = new Set();
        const maxAttempts = this.settings.lineupCount * 50;
        let attempts = 0;
        
        // Get eligible players
        const eligiblePlayers = this.players.filter(p => 
            !p.excluded && p.projection > 0
        );
        
        if (eligiblePlayers.length < 6) {
            throw new Error('Not enough eligible players');
        }
        
        // Sort by projection for weighted selection
        eligiblePlayers.sort((a, b) => b.projection - a.projection);
        
        while (allLineups.length < this.settings.lineupCount && attempts < maxAttempts && this.isGenerating) {
            attempts++;
            
            const lineup = this.generateSingleLineup(eligiblePlayers);
            
            if (lineup && this.isValidLineup(lineup)) {
                const key = this.getLineupKey(lineup);
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    allLineups.push(lineup);
                }
            }
            
            // Progress update
            if (progressCallback && attempts % 100 === 0) {
                const progress = Math.min((allLineups.length / this.settings.lineupCount) * 100, 99);
                progressCallback(progress, allLineups.length);
            }
            
            // Yield occasionally
            if (attempts % 500 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
        
        this.isGenerating = false;
        
        // Sort by projection
        allLineups.sort((a, b) => b.projection - a.projection);
        
        // Apply diversity
        this.lineups = this.applyDiversity(allLineups, this.settings.lineupCount);
        
        if (progressCallback) progressCallback(100, this.lineups.length);
        
        return this.lineups;
    }
    
    /**
     * Generate a single Showdown lineup
     * @param {Object[]} pool - Player pool to use
     * @returns {Object|null}
     */
    generateSingleLineup(pool = null) {
        const players = pool || this.players.filter(p => !p.excluded && p.projection > 0);
        
        if (players.length < 6) return null;
        
        // Select captain using weighted random
        const captain = this.weightedSelect(players, p => Math.pow(p.projection, 2));
        if (!captain) return null;
        
        // Create captain version
        const captainPlayer = {
            ...captain,
            salary: Math.round(captain.salary * 1.5),
            projection: captain.projection * 1.5,
            isCaptain: true
        };
        
        // Select 5 FLEX players (excluding captain)
        const flexPool = players.filter(p => p.name !== captain.name);
        const flexPlayers = [];
        const usedNames = new Set([captain.name]);
        
        // Calculate remaining salary
        let remainingSalary = this.settings.salaryMax - captainPlayer.salary;
        
        for (let i = 0; i < 5; i++) {
            // Filter to affordable players
            const affordable = flexPool.filter(p => 
                !usedNames.has(p.name) && 
                p.salary <= remainingSalary
            );
            
            if (affordable.length === 0) return null;
            
            // Weight selection
            const flex = this.weightedSelect(affordable, p => Math.pow(p.projection, 1.5));
            if (!flex) return null;
            
            flexPlayers.push({ ...flex, isCaptain: false });
            usedNames.add(flex.name);
            remainingSalary -= flex.salary;
        }
        
        // Calculate totals
        const totalSalary = captainPlayer.salary + flexPlayers.reduce((s, p) => s + p.salary, 0);
        const totalProjection = captainPlayer.projection + flexPlayers.reduce((s, p) => s + p.projection, 0);
        
        return {
            captain: captainPlayer,
            flex: flexPlayers,
            salary: totalSalary,
            projection: totalProjection,
            value: totalSalary > 0 ? (totalProjection / totalSalary * 1000) : 0
        };
    }
    
    /**
     * Weighted random selection
     * @param {Object[]} items 
     * @param {Function} weightFn 
     * @returns {Object|null}
     */
    weightedSelect(items, weightFn) {
        if (items.length === 0) return null;
        
        const weights = items.map(weightFn);
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        
        return items[items.length - 1];
    }
    
    /* ==========================================
       LINEUP HELPERS
       ========================================== */
    
    /**
     * Get all players from a lineup
     * @param {Object} lineup 
     * @returns {Object[]}
     */
    getLineupPlayers(lineup) {
        return [lineup.captain, ...lineup.flex];
    }
    
    /**
     * Get unique lineup key
     * @param {Object} lineup 
     * @returns {string}
     */
    getLineupKey(lineup) {
        const captainKey = `CPT:${lineup.captain.name}`;
        const flexKeys = lineup.flex.map(p => p.name).sort();
        return [captainKey, ...flexKeys].join('|');
    }
    
    /**
     * Check if lineup meets projection floor
     * @param {Object} lineup 
     * @returns {boolean}
     */
    isValidLineup(lineup) {
        // Base validation
        if (lineup.salary < this.settings.salaryMin) return false;
        if (lineup.salary > this.settings.salaryMax) return false;
        
        // Projection floor
        if (this.settings.projectionFloor > 0) {
            const maxProj = this.getMaxProjection();
            if (lineup.projection < maxProj * this.settings.projectionFloor) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get maximum possible projection for showdown
     * @returns {number}
     */
    getMaxProjection() {
        const sorted = [...this.players]
            .filter(p => !p.excluded && p.projection > 0)
            .sort((a, b) => b.projection - a.projection);
        
        if (sorted.length < 6) return 0;
        
        // Best captain (1.5x) + best 5 flex
        const captainProj = sorted[0].projection * 1.5;
        const flexProj = sorted.slice(1, 6).reduce((s, p) => s + p.projection, 0);
        
        return captainProj + flexProj;
    }
    
    /* ==========================================
       EXPORT
       ========================================== */
    
    /**
     * Export lineups to DraftKings CSV format
     * @returns {string}
     */
    exportCSV() {
        const headers = ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX'];
        const rows = [headers.join(',')];
        
        for (const lineup of this.lineups) {
            const row = [
                lineup.captain.id || lineup.captain.name,
                ...lineup.flex.map(p => p.id || p.name)
            ];
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }
    
    /**
     * Export lineups with full details
     * @returns {string}
     */
    exportDetailedCSV() {
        const headers = [
            'Rank', 'CPT', 'CPT Team', 'CPT Salary', 'CPT Proj',
            'FLEX1', 'FLEX1 Team', 'FLEX1 Salary', 'FLEX1 Proj',
            'FLEX2', 'FLEX2 Team', 'FLEX2 Salary', 'FLEX2 Proj',
            'FLEX3', 'FLEX3 Team', 'FLEX3 Salary', 'FLEX3 Proj',
            'FLEX4', 'FLEX4 Team', 'FLEX4 Salary', 'FLEX4 Proj',
            'FLEX5', 'FLEX5 Team', 'FLEX5 Salary', 'FLEX5 Proj',
            'Total Salary', 'Total Projection'
        ];
        
        const rows = [headers.join(',')];
        
        this.lineups.forEach((lineup, idx) => {
            const row = [idx + 1];
            
            // Captain
            row.push(lineup.captain.name, lineup.captain.team, lineup.captain.salary, lineup.captain.projection.toFixed(2));
            
            // Flex players
            for (const flex of lineup.flex) {
                row.push(flex.name, flex.team, flex.salary, flex.projection.toFixed(2));
            }
            
            // Totals
            row.push(lineup.salary, lineup.projection.toFixed(2));
            
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
}

// Make available globally
window.MaddenShowdownOptimizer = MaddenShowdownOptimizer;
