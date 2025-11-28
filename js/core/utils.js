/* ==========================================
   SHOWDOWN OPTIMIZER - CORE UTILITIES
   Shared utility functions across all sports
   ========================================== */

const Utils = {
    
    /**
     * Parse a single CSV line handling quoted values
     * ORIGINAL WORKING CODE - DO NOT MODIFY
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
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    },
    
    /**
     * Extract player name from DK format (e.g., "Drake Lon (12345)" -> "Drake Lon")
     */
    extractPlayerName(str) {
        if (!str) return '';
        return str.replace(/\s*\(\d+\)\s*$/, '').trim();
    },
    
    /**
     * Format currency
     */
    formatCurrency(amount) {
        return '$' + amount.toLocaleString();
    },
    
    /**
     * Format salary in K format
     */
    formatSalaryK(salary) {
        return '$' + (salary / 1000).toFixed(0) + 'K';
    },
    
    /**
     * Download a file
     */
    downloadFile(content, filename, type = 'text/csv') {
        const blob = new Blob([content], { type: type + ';charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Check if contest is a cash game
     */
    isCashGame(contestName) {
        const lowerName = contestName.toLowerCase();
        return lowerName.includes('double') || 
               lowerName.includes(' vs') || 
               lowerName.includes(' vs.') ||
               lowerName.includes('50/50') ||
               lowerName.includes('head to head') ||
               lowerName.includes('h2h');
    },
    
    /**
     * Pearson correlation coefficient
     */
    pearsonCorrelation(x, y) {
        const n = x.length;
        if (n < 3) return null;
        
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
     * Get today's date string
     */
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    },
    
    /**
     * Local storage helpers
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to storage:', e);
            return false;
        }
    },
    
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load from storage:', e);
            return null;
        }
    },
    
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Make available globally
window.Utils = Utils;
