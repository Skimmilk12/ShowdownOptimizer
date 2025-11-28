/* ==========================================
   MADDEN SHOWDOWN CONFIGURATION
   Sport-specific settings for Madden
   ========================================== */

const MaddenConfig = {
    // Basic info
    id: 'madden',
    name: 'Madden',
    fullName: 'NFL Madden Optimizer',
    platform: 'DraftKings',
    
    // Salary settings
    salaryCap: 50000,
    defaultMinSalary: 49000,
    defaultMaxSalary: 50000,
    
    // Showdown settings
    showdown: {
        rosterSize: 6,
        captainMultiplier: 1.5,
        positions: ['CPT', 'FLEX', 'FLEX', 'FLEX', 'FLEX', 'FLEX']
    },
    
    // Classic settings (9 positions)
    classic: {
        rosterSize: 9,
        positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'DST'],
        flexEligible: ['RB', 'WR', 'TE']
    },
    
    // Slate configuration
    slates: {
        showdown: {
            count: 6,
            times: ['12:00', '2:00', '4:00', '6:00', '8:00', '10:00']
        },
        classic: {
            count: 2,
            times: ['Early (12-4)', 'Late (6-10)']
        }
    },
    
    // Time-to-slate mapping for Showdown
    slateTimeMap: {
        '12:00': 1, '12:30': 1,
        '1:00': 1, '1:30': 1,
        '2:00': 2, '2:30': 2,
        '3:00': 2, '3:30': 2,
        '4:00': 3, '4:30': 3,
        '5:00': 3, '5:30': 3,
        '6:00': 4, '6:30': 4,
        '7:00': 4, '7:30': 4,
        '8:00': 5, '8:30': 5,
        '9:00': 5, '9:30': 5,
        '10:00': 6, '10:30': 6,
        '11:00': 6, '11:30': 6
    },
    
    // Time-to-slate mapping for Classic
    classicSlateTimeMap: {
        '12:00': 1, '12:30': 1,
        '14:00': 1, '14:30': 1, '2:00': 1,
        '16:00': 1, '16:30': 1, '4:00': 1,
        '18:00': 2, '18:30': 2, '6:00': 2,
        '20:00': 2, '20:30': 2, '8:00': 2, '20:15': 2, '20:20': 2,
        '22:00': 2, '22:30': 2, '10:00': 2
    },
    
    // Generation options
    lineupCounts: [100, 500, 2000, 5000],
    timeDurations: [
        { value: 10, label: '10 sec' },
        { value: 20, label: '20 sec' },
        { value: 30, label: '30 sec' },
        { value: 60, label: '1 min' }
    ],
    
    // Default settings
    defaults: {
        lineupCount: 100,
        projectionFloor: 90,
        diversityStrength: 5
    },
    
    // Position display order and colors
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    positionColors: {
        QB: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
        RB: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
        WR: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
        TE: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        K: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
        DST: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
        CPT: { bg: 'rgba(251, 191, 36, 0.25)', color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
        FLEX: { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' }
    },
    
    // NFL Teams database
    nflTeams: {
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
    }
};

// Freeze to prevent accidental modification
Object.freeze(MaddenConfig);
Object.freeze(MaddenConfig.showdown);
Object.freeze(MaddenConfig.classic);
Object.freeze(MaddenConfig.slates);
Object.freeze(MaddenConfig.defaults);

// Make available globally
window.MaddenConfig = MaddenConfig;
