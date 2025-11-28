/* ==========================================
   SHOWDOWN OPTIMIZER - MADDEN CONFIGURATION
   Sport-specific settings for Madden NFL
   ========================================== */

const MaddenConfig = {
    // Basic info
    id: 'madden',
    name: 'Madden',
    fullName: 'NFL Madden Optimizer',
    platform: 'DraftKings',
    icon: '🎮',
    
    // Salary settings
    salaryCap: 50000,
    salaryMin: 40000,
    salaryMax: 50000,
    salaryStep: 100,
    
    // Roster settings
    rosterSize: 6,
    
    // Showdown mode positions
    showdown: {
        positions: {
            CPT: { 
                count: 1, 
                multiplier: 1.5,
                salaryMultiplier: 1.5,
                label: 'Captain'
            },
            FLEX: { 
                count: 5, 
                multiplier: 1.0,
                salaryMultiplier: 1.0,
                label: 'FLEX'
            }
        },
        // All positions eligible for any slot
        eligiblePositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
    },
    
    // Classic mode positions (for future use)
    classic: {
        positions: {
            QB: { count: 1 },
            RB: { count: 2 },
            WR: { count: 3 },
            TE: { count: 1 },
            FLEX: { count: 1, eligible: ['RB', 'WR', 'TE'] },
            DST: { count: 1 }
        },
        rosterSize: 9
    },
    
    // Slate configuration
    slates: {
        count: 6,
        labels: ['1', '2', '3', '4', '5', '6'],
        times: ['12:00', '2:00', '4:00', '6:00', '8:00', '10:00']
    },
    
    // Generation options
    lineupCounts: [100, 500, 2000, 5000],
    timeDurations: [
        { value: 10, label: '10 sec' },
        { value: 20, label: '20 sec' },
        { value: 30, label: '30 sec' },
        { value: 60, label: '1 min' }
    ],
    
    // UI settings
    defaultLineupCount: 100,
    defaultTimeDuration: 10,
    defaultSalaryMin: 49000,
    defaultSalaryMax: 50000,
    defaultProjectionFloor: 0.9, // 90%
    
    // Position display order
    positionOrder: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    
    // Position colors for badges
    positionColors: {
        QB: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
        RB: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
        WR: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
        TE: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        K: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
        DST: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }
    },
    
    // CSV column mappings for DraftKings export
    csvColumns: {
        name: ['name', 'player', 'playername'],
        position: ['position', 'pos', 'roster position', 'rosterposition'],
        salary: ['salary', 'sal'],
        team: ['team', 'teamabbrev', 'tm'],
        projection: ['projection', 'proj', 'fpts', 'avgpointspergame', 'avgpts', 'points', 'fantasypoints'],
        game: ['game', 'gameid', 'game info', 'gameinfo'],
        id: ['id', 'playerid', 'player id']
    },
    
    // Correlation positions (for player data analysis)
    correlationPositions: ['QB', 'RB', 'WR', 'TE', 'DST'],
    
    // Features enabled
    features: {
        showdown: true,
        classic: true,
        correlations: true,
        entries: true,
        timeBasedGeneration: true,
        projectionFloor: true,
        multiSlate: true
    },
    
    // Tabs configuration
    tabs: [
        { id: 'showdown', label: 'Madden SD', icon: 'zap' },
        { id: 'classic', label: 'Madden Classic', icon: 'grid' },
        { id: 'playerdata', label: 'Player Data', icon: 'database' }
    ]
};

// Freeze to prevent accidental modification
Object.freeze(MaddenConfig);
Object.freeze(MaddenConfig.showdown);
Object.freeze(MaddenConfig.showdown.positions);
Object.freeze(MaddenConfig.classic);
Object.freeze(MaddenConfig.slates);
Object.freeze(MaddenConfig.features);

// Make available globally
window.MaddenConfig = MaddenConfig;
