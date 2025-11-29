// ==========================================
// UTILITIES - Shared helper functions
// ==========================================

// Parse a single CSV line handling quoted fields
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

// Check if a contest is a cash game (not GPP)
function isCashGame(contestName) {
    const lower = contestName.toLowerCase();
    return lower.includes('double up') ||
           lower.includes('50/50') ||
           lower.includes('head-to-head') ||
           lower.includes('h2h') ||
           lower.includes('heads up');
}

// Calculate Pearson correlation coefficient
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
