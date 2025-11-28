/* ==========================================
   SHOWDOWN OPTIMIZER - CORE UTILITIES
   Shared utility functions used across all sports
   ========================================== */

const Utils = {
    
    /* ==========================================
       CSV PARSING
       ========================================== */
    
    /**
     * Parse a CSV line handling quoted values
     * @param {string} line - CSV line to parse
     * @returns {string[]} - Array of values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    },
    
    /**
     * Parse entire CSV text into array of objects
     * @param {string} csvText - Raw CSV content
     * @returns {Object[]} - Array of row objects with header keys
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });
            rows.push(row);
        }
        
        return rows;
    },
    
    /**
     * Find column index by possible names
     * @param {string[]} headers - Array of header names
     * @param {string[]} possibleNames - Possible column names to match
     * @returns {number} - Column index or -1 if not found
     */
    findColumn(headers, possibleNames) {
        const lowerHeaders = headers.map(h => h.toLowerCase());
        for (const name of possibleNames) {
            const idx = lowerHeaders.findIndex(h => h.includes(name.toLowerCase()));
            if (idx !== -1) return idx;
        }
        return -1;
    },
    
    /* ==========================================
       STRING / NAME HELPERS
       ========================================== */
    
    /**
     * Extract player name from DK format (removes ID suffix)
     * @param {string} str - Player string
     * @returns {string} - Clean player name
     */
    extractPlayerName(str) {
        if (!str) return '';
        return str.replace(/\s*\(\d+\)\s*$/, '').trim();
    },
    
    /**
     * Normalize position string
     * @param {string} pos - Position string
     * @returns {string} - Normalized position
     */
    normalizePosition(pos) {
        if (!pos) return '';
        const upper = pos.toUpperCase();
        if (upper.includes('DEF')) return 'DST';
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'CPT', 'FLEX'];
        for (const p of positions) {
            if (upper.includes(p)) return p;
        }
        return upper;
    },
    
    /**
     * Detect position from filename
     * @param {string} filename - Name of the file
     * @returns {string|null} - Position or null
     */
    detectPositionFromFilename(filename) {
        const upper = filename.toUpperCase();
        if (upper.includes('QB')) return 'QB';
        if (upper.includes('RB')) return 'RB';
        if (upper.includes('WR')) return 'WR';
        if (upper.includes('TE')) return 'TE';
        if (upper.includes('DST') || upper.includes('DEF')) return 'DST';
        if (upper.includes('K') && !upper.includes('DK')) return 'K';
        return null;
    },
    
    /* ==========================================
       FORMATTING
       ========================================== */
    
    /**
     * Format number as currency
     * @param {number} num - Number to format
     * @returns {string} - Formatted currency
     */
    formatCurrency(num) {
        return '$' + num.toLocaleString();
    },
    
    /**
     * Format salary in K notation
     * @param {number} salary - Salary value
     * @returns {string} - Formatted salary
     */
    formatSalaryK(salary) {
        return '$' + (salary / 1000).toFixed(1) + 'k';
    },
    
    /**
     * Format number with decimals
     * @param {number} num - Number to format
     * @param {number} decimals - Decimal places
     * @returns {string} - Formatted number
     */
    formatNumber(num, decimals = 2) {
        return num.toFixed(decimals);
    },
    
    /**
     * Format percentage
     * @param {number} value - Value (0-100 or 0-1)
     * @param {number} decimals - Decimal places
     * @returns {string} - Formatted percentage
     */
    formatPercent(value, decimals = 1) {
        const pct = value > 1 ? value : value * 100;
        return pct.toFixed(decimals) + '%';
    },
    
    /**
     * Get today's date as YYYY-MM-DD
     * @returns {string} - Date string
     */
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    },
    
    /* ==========================================
       MATH / STATISTICS
       ========================================== */
    
    /**
     * Calculate Pearson correlation coefficient
     * @param {number[]} x - First array
     * @param {number[]} y - Second array
     * @returns {number|null} - Correlation or null
     */
    pearsonCorrelation(x, y) {
        const n = x.length;
        if (n < 3 || n !== y.length) return null;
        
        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let sumSqX = 0;
        let sumSqY = 0;
        
        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            sumSqX += dx * dx;
            sumSqY += dy * dy;
        }
        
        if (sumSqX === 0 || sumSqY === 0) return null;
        return numerator / Math.sqrt(sumSqX * sumSqY);
    },
    
    /**
     * Generate combinations of k elements from array
     * @param {Array} arr - Source array
     * @param {number} k - Number of elements
     * @returns {Array[]} - Array of combinations
     */
    combinations(arr, k) {
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
    },
    
    /**
     * Weighted random selection
     * @param {Array} items - Array of items with 'weight' property or use weightFn
     * @param {Function} weightFn - Optional function to get weight from item
     * @returns {*} - Selected item
     */
    weightedRandom(items, weightFn = null) {
        const getWeight = weightFn || (item => item.weight || 1);
        const weights = items.map(getWeight);
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        
        return items[items.length - 1];
    },
    
    /**
     * Shuffle array (Fisher-Yates)
     * @param {Array} arr - Array to shuffle
     * @returns {Array} - Shuffled array (mutates original)
     */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    
    /* ==========================================
       DOM HELPERS
       ========================================== */
    
    /**
     * Create element with classes and attributes
     * @param {string} tag - HTML tag
     * @param {Object} options - Options (classes, attrs, text, html)
     * @returns {HTMLElement}
     */
    createElement(tag, options = {}) {
        const el = document.createElement(tag);
        
        if (options.classes) {
            el.className = Array.isArray(options.classes) 
                ? options.classes.join(' ') 
                : options.classes;
        }
        
        if (options.attrs) {
            for (const [key, value] of Object.entries(options.attrs)) {
                el.setAttribute(key, value);
            }
        }
        
        if (options.text) el.textContent = options.text;
        if (options.html) el.innerHTML = options.html;
        
        return el;
    },
    
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /* ==========================================
       FILE HELPERS
       ========================================== */
    
    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} - File content
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },
    
    /**
     * Download content as file
     * @param {string} content - File content
     * @param {string} filename - Name of file
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/csv') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    /* ==========================================
       STORAGE HELPERS
       ========================================== */
    
    /**
     * Save to localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    },
    
    /**
     * Load from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default if not found
     * @returns {*} - Stored value or default
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    },
    
    /**
     * Remove from localStorage
     * @param {string} key - Storage key
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
        }
    },
    
    /* ==========================================
       CONTEST HELPERS
       ========================================== */
    
    /**
     * Determine if contest is cash game
     * @param {string} contestName - Name of contest
     * @returns {boolean}
     */
    isCashGame(contestName) {
        const lower = contestName.toLowerCase();
        return lower.includes('double') || 
               lower.includes(' vs') || 
               lower.includes('50/50') ||
               lower.includes('head-to-head') ||
               lower.includes('h2h');
    }
};

// Make available globally
window.Utils = Utils;
