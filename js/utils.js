// ==========================================
// SHOWDOWN OPTIMIZER - UTILITY FUNCTIONS
// ==========================================

/**
 * Parse a CSV line handling quoted values
 * @param {string} line - CSV line to parse
 * @returns {string[]} - Array of values
 */
function parseCSVLine(line) {
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
}

/**
 * Extract position from a string
 * @param {string} pos - Position string
 * @returns {string} - Normalized position
 */
function extractPosition(pos) {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'];
    for (const p of positions) {
        if (pos.toUpperCase().includes(p)) return p === 'DEF' ? 'DST' : p;
    }
    return pos;
}

/**
 * Extract player name from DK format
 * @param {string} str - Player string (may include ID)
 * @returns {string} - Clean player name
 */
function extractPlayerName(str) {
    if (!str) return '';
    return str.replace(/\s*\(\d+\)\s*$/, '').trim();
}

/**
 * Check if a contest is a cash game
 * @param {string} contestName - Name of the contest
 * @returns {boolean} - True if cash game
 */
function isCashGame(contestName) {
    const lowerName = contestName.toLowerCase();
    return lowerName.includes('double') || 
           lowerName.includes(' vs') || 
           lowerName.includes(' vs.') ||
           lowerName.includes('50/50') ||
           lowerName.includes('head-to-head') ||
           lowerName.includes('h2h');
}

/**
 * Calculate Pearson correlation coefficient
 * @param {number[]} x - First array of values
 * @param {number[]} y - Second array of values
 * @returns {number|null} - Correlation coefficient or null if insufficient data
 */
function pearsonCorrelation(x, y) {
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
}

/**
 * Format number as currency
 * @param {number} num - Number to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(num) {
    return '$' + num.toLocaleString();
}

/**
 * Format number with specified decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted number
 */
function formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
}

/**
 * Detect position from filename
 * @param {string} filename - Name of the file
 * @returns {string|null} - Position or null if not detected
 */
function detectPositionFromFilename(filename) {
    const upperName = filename.toUpperCase();
    if (upperName.includes('QB')) return 'QB';
    if (upperName.includes('RB')) return 'RB';
    if (upperName.includes('WR')) return 'WR';
    if (upperName.includes('TE')) return 'TE';
    if (upperName.includes('DST') || upperName.includes('DEF')) return 'DST';
    return null;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Download content as a file
 * @param {string} content - File content
 * @param {string} filename - Name of file
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType = 'text/csv') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Get today's date as YYYY-MM-DD
 * @returns {string} - Date string
 */
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// NFL Teams Database
const NFL_TEAMS = {
    'ARI': { name: 'Cardinals', city: 'Arizona', primary: '#97233F', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png' },
    'ATL': { name: 'Falcons', city: 'Atlanta', primary: '#A71930', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png' },
    'BAL': { name: 'Ravens', city: 'Baltimore', primary: '#241773', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
    'BUF': { name: 'Bills', city: 'Buffalo', primary: '#00338D', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
    'CAR': { name: 'Panthers', city: 'Carolina', primary: '#0085CA', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png' },
    'CHI': { name: 'Bears', city: 'Chicago', primary: '#0B162A', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png' },
    'CIN': { name: 'Bengals', city: 'Cincinnati', primary: '#FB4F14', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png' },
    'CLE': { name: 'Browns', city: 'Cleveland', primary: '#311D00', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png' },
    'DAL': { name: 'Cowboys', city: 'Dallas', primary: '#003594', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
    'DEN': { name: 'Broncos', city: 'Denver', primary: '#FB4F14', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
    'DET': { name: 'Lions', city: 'Detroit', primary: '#0076B6', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
    'GB': { name: 'Packers', city: 'Green Bay', primary: '#203731', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
    'HOU': { name: 'Texans', city: 'Houston', primary: '#03202F', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
    'IND': { name: 'Colts', city: 'Indianapolis', primary: '#002C5F', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png' },
    'JAX': { name: 'Jaguars', city: 'Jacksonville', primary: '#006778', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png' },
    'KC': { name: 'Chiefs', city: 'Kansas City', primary: '#E31837', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
    'LV': { name: 'Raiders', city: 'Las Vegas', primary: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
    'LAC': { name: 'Chargers', city: 'Los Angeles', primary: '#0080C6', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png' },
    'LAR': { name: 'Rams', city: 'Los Angeles', primary: '#003594', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png' },
    'MIA': { name: 'Dolphins', city: 'Miami', primary: '#008E97', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png' },
    'MIN': { name: 'Vikings', city: 'Minnesota', primary: '#4F2683', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
    'NE': { name: 'Patriots', city: 'New England', primary: '#002244', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
    'NO': { name: 'Saints', city: 'New Orleans', primary: '#D3BC8D', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png' },
    'NYG': { name: 'Giants', city: 'New York', primary: '#0B2265', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png' },
    'NYJ': { name: 'Jets', city: 'New York', primary: '#125740', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
    'PHI': { name: 'Eagles', city: 'Philadelphia', primary: '#004C54', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png' },
    'PIT': { name: 'Steelers', city: 'Pittsburgh', primary: '#FFB612', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
    'SF': { name: '49ers', city: 'San Francisco', primary: '#AA0000', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
    'SEA': { name: 'Seahawks', city: 'Seattle', primary: '#002244', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png' },
    'TB': { name: 'Buccaneers', city: 'Tampa Bay', primary: '#D50A0A', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png' },
    'TEN': { name: 'Titans', city: 'Tennessee', primary: '#0C2340', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png' },
    'WAS': { name: 'Commanders', city: 'Washington', primary: '#5A1414', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/was.png' }
};

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCSVLine,
        extractPosition,
        extractPlayerName,
        isCashGame,
        pearsonCorrelation,
        formatCurrency,
        formatNumber,
        detectPositionFromFilename,
        debounce,
        downloadFile,
        getTodayString,
        NFL_TEAMS
    };
}
