/* ==========================================
   SHOWDOWN OPTIMIZER - BASE OPTIMIZER CLASS
   Core optimization logic shared across all sports
   ========================================== */

class BaseOptimizer {
    constructor(config) {
        this.config = config;
        this.players = [];
        this.lineups = [];
        this.settings = {
            lineupCount: 100,
            salaryMin: config.salaryCap - 1000,
            salaryMax: config.salaryCap,
            projectionFloor: 0.8, // 80% of max
            maxExposure: 1.0, // 100% = no limit
            diversityLevel: 0.5
        };
        this.isGenerating = false;
    }
    
    /* ==========================================
       PLAYER MANAGEMENT
       ========================================== */
    
    /**
     * Load players from CSV data
     * @param {Object[]} data - Parsed CSV data
     * @returns {number} - Number of players loaded
     */
    loadPlayers(data) {
        this.players = this.parsePlayerData(data);
        return this.players.length;
    }
    
    /**
     * Parse player data - override in subclass for sport-specific parsing
     * @param {Object[]} data - Raw CSV data
     * @returns {Object[]} - Parsed player objects
     */
    parsePlayerData(data) {
        // Subclass should override this
        return data;
    }
    
    /**
     * Get players filtered by criteria
     * @param {Object} filters - Filter criteria
     * @returns {Object[]} - Filtered players
     */
    getPlayers(filters = {}) {
        let result = [...this.players];
        
        if (filters.position) {
            result = result.filter(p => p.position === filters.position);
        }
        
        if (filters.team) {
            result = result.filter(p => p.team === filters.team);
        }
        
        if (filters.minProjection) {
            result = result.filter(p => p.projection >= filters.minProjection);
        }
        
        if (filters.minSalary) {
            result = result.filter(p => p.salary >= filters.minSalary);
        }
        
        if (filters.maxSalary) {
            result = result.filter(p => p.salary <= filters.maxSalary);
        }
        
        if (filters.excludeLocked === false) {
            result = result.filter(p => !p.excluded);
        }
        
        return result;
    }
    
    /**
     * Get unique teams from player pool
     * @returns {string[]}
     */
    getTeams() {
        return [...new Set(this.players.map(p => p.team))].filter(t => t).sort();
    }
    
    /**
     * Get unique positions from player pool
     * @returns {string[]}
     */
    getPositions() {
        return [...new Set(this.players.map(p => p.position))].filter(p => p);
    }
    
    /* ==========================================
       SETTINGS
       ========================================== */
    
    /**
     * Update optimizer settings
     * @param {Object} newSettings 
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    
    /**
     * Get current settings
     * @returns {Object}
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /* ==========================================
       LINEUP GENERATION
       ========================================== */
    
    /**
     * Generate lineups - override in subclass
     * @param {Function} progressCallback - Progress callback (0-100)
     * @returns {Object[]} - Generated lineups
     */
    async generate(progressCallback = null) {
        throw new Error('generate() must be implemented by subclass');
    }
    
    /**
     * Generate lineups for a specified duration
     * @param {number} seconds - Duration in seconds
     * @param {Function} progressCallback - Progress callback
     * @returns {Object[]} - Generated lineups
     */
    async generateForDuration(seconds, progressCallback = null) {
        const startTime = Date.now();
        const endTime = startTime + (seconds * 1000);
        const allLineups = [];
        const seenKeys = new Set();
        
        this.isGenerating = true;
        
        while (Date.now() < endTime && this.isGenerating) {
            // Generate a batch
            const lineup = this.generateSingleLineup();
            
            if (lineup && this.isValidLineup(lineup)) {
                const key = this.getLineupKey(lineup);
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    allLineups.push(lineup);
                }
            }
            
            // Update progress
            if (progressCallback) {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / (seconds * 1000)) * 100, 99);
                progressCallback(progress, allLineups.length);
            }
            
            // Yield to prevent blocking
            if (allLineups.length % 100 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
        
        this.isGenerating = false;
        
        // Sort by projection
        allLineups.sort((a, b) => b.projection - a.projection);
        
        // Apply diversity if needed
        this.lineups = this.applyDiversity(allLineups, this.settings.lineupCount);
        
        if (progressCallback) progressCallback(100, this.lineups.length);
        
        return this.lineups;
    }
    
    /**
     * Stop ongoing generation
     */
    stopGeneration() {
        this.isGenerating = false;
    }
    
    /**
     * Generate a single lineup - override in subclass
     * @returns {Object|null}
     */
    generateSingleLineup() {
        throw new Error('generateSingleLineup() must be implemented by subclass');
    }
    
    /**
     * Check if lineup is valid
     * @param {Object} lineup 
     * @returns {boolean}
     */
    isValidLineup(lineup) {
        // Check salary constraints
        if (lineup.salary < this.settings.salaryMin) return false;
        if (lineup.salary > this.settings.salaryMax) return false;
        
        // Check projection floor
        if (this.settings.projectionFloor > 0) {
            const maxProjection = this.getMaxProjection();
            const minRequired = maxProjection * this.settings.projectionFloor;
            if (lineup.projection < minRequired) return false;
        }
        
        return true;
    }
    
    /**
     * Get maximum possible projection
     * @returns {number}
     */
    getMaxProjection() {
        const sorted = [...this.players].sort((a, b) => b.projection - a.projection);
        return sorted.slice(0, this.config.rosterSize)
            .reduce((sum, p) => sum + p.projection, 0);
    }
    
    /**
     * Get unique key for lineup (for deduplication)
     * @param {Object} lineup 
     * @returns {string}
     */
    getLineupKey(lineup) {
        // Override in subclass for sport-specific key
        return lineup.players.map(p => p.id || p.name).sort().join('|');
    }
    
    /* ==========================================
       DIVERSITY / EXPOSURE
       ========================================== */
    
    /**
     * Apply diversity constraints to lineup pool
     * @param {Object[]} lineups - All generated lineups
     * @param {number} count - Target count
     * @returns {Object[]} - Selected lineups
     */
    applyDiversity(lineups, count) {
        if (this.settings.maxExposure >= 1.0 && this.settings.diversityLevel <= 0) {
            return lineups.slice(0, count);
        }
        
        const selected = [];
        const exposure = {};
        
        for (const lineup of lineups) {
            if (selected.length >= count) break;
            
            const players = this.getLineupPlayers(lineup);
            
            // Check exposure limits
            let passesExposure = true;
            if (this.settings.maxExposure < 1.0 && selected.length > 0) {
                for (const player of players) {
                    const currentExp = (exposure[player.name] || 0) / selected.length;
                    if (currentExp >= this.settings.maxExposure) {
                        passesExposure = false;
                        break;
                    }
                }
            }
            
            if (passesExposure) {
                selected.push(lineup);
                
                // Update exposure counts
                for (const player of players) {
                    exposure[player.name] = (exposure[player.name] || 0) + 1;
                }
            }
        }
        
        // Fill remaining if needed
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
     * Get all players from a lineup - override in subclass
     * @param {Object} lineup 
     * @returns {Object[]}
     */
    getLineupPlayers(lineup) {
        return lineup.players || [];
    }
    
    /**
     * Calculate player exposure across lineups
     * @param {Object[]} lineups - Optional, uses this.lineups if not provided
     * @returns {Object[]} - Exposure data sorted by count
     */
    calculateExposure(lineups = null) {
        const targetLineups = lineups || this.lineups;
        if (!targetLineups.length) return [];
        
        const counts = {};
        
        for (const lineup of targetLineups) {
            const players = this.getLineupPlayers(lineup);
            for (const player of players) {
                const key = player.name;
                if (!counts[key]) {
                    counts[key] = { name: key, team: player.team, position: player.position, count: 0 };
                }
                counts[key].count++;
            }
        }
        
        return Object.values(counts)
            .map(p => ({
                ...p,
                percentage: ((p.count / targetLineups.length) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
    }
    
    /* ==========================================
       EXPORT
       ========================================== */
    
    /**
     * Export lineups to CSV - override in subclass for sport-specific format
     * @returns {string} - CSV content
     */
    exportCSV() {
        throw new Error('exportCSV() must be implemented by subclass');
    }
    
    /* ==========================================
       STATS
       ========================================== */
    
    /**
     * Get optimizer statistics
     * @returns {Object}
     */
    getStats() {
        const avgProjection = this.lineups.length > 0
            ? this.lineups.reduce((s, l) => s + l.projection, 0) / this.lineups.length
            : 0;
            
        const avgSalary = this.lineups.length > 0
            ? this.lineups.reduce((s, l) => s + l.salary, 0) / this.lineups.length
            : 0;
            
        const topProjection = this.lineups.length > 0
            ? Math.max(...this.lineups.map(l => l.projection))
            : 0;
        
        return {
            playerCount: this.players.length,
            lineupCount: this.lineups.length,
            avgProjection: avgProjection.toFixed(2),
            avgSalary: Math.round(avgSalary),
            topProjection: topProjection.toFixed(2),
            teams: this.getTeams().length
        };
    }
    
    /**
     * Clear all data
     */
    clear() {
        this.players = [];
        this.lineups = [];
    }
}

// Make available globally
window.BaseOptimizer = BaseOptimizer;
