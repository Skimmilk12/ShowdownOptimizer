# 🏆 Showdown Optimizer

A scalable DFS lineup optimizer for DraftKings Showdown contests across multiple sports.

## Current Sports

| Sport | Status | Features |
|-------|--------|----------|
| 🎮 Madden | ✅ Ready | Showdown, Classic, Correlations |
| 🏈 NFL | 🔜 Coming Soon | - |
| 🏀 NBA | 🔜 Coming Soon | - |
| ⚾ MLB | 🔜 Coming Soon | - |
| 🏒 NHL | 🔜 Coming Soon | - |
| 🏎️ NASCAR | 🔜 Coming Soon | - |
| ⛳ Golf | 🔜 Coming Soon | - |
| 🎾 Tennis | 🔜 Coming Soon | - |

## Features

### Madden Showdown Mode
- **6-slate support** with time labels (12:00, 2:00, 4:00, 6:00, 8:00, 10:00)
- **Captain/FLEX lineup generation** - 1 CPT (1.5x) + 5 FLEX
- **Salary constraints** - Adjustable $40K-$50K range
- **Projection floor** - Only include lineups within X% of max projection
- **Lineup count options** - 100, 500, 2,000, 5,000
- **Time-based generation** - 10s, 20s, 30s, 1min
- **Player pool filtering** - By position, search
- **CSV export** - DraftKings-ready format

### Player Data & Correlations
- Upload historical game logs by position
- Multi-file upload with auto-detection
- Position correlation matrix
- Team-level correlation analysis

## Live Demo

Access at: **https://skimmilk12.github.io/ShowdownOptimizer/**

## Project Structure

```
ShowdownOptimizer/
├── index.html              # Main entry point (HTML markup only)
├── css/
│   └── styles.css         # All styles (dark theme, Inter font)
├── js/
│   ├── core/
│   │   ├── app.js         # Main init, tab navigation, Player Data
│   │   ├── constants.js   # NFL teams, salary caps, slate mappings
│   │   └── utils.js       # Shared utilities (CSV parsing, correlations)
│   └── sports/
│       └── madden/
│           ├── showdown.js # Showdown optimizer (1 CPT + 5 FLEX)
│           └── classic.js  # Classic optimizer (9-position roster)
├── README.md
└── DEVLOG.md
```

## Architecture

### Adding a New Sport

1. Create sport folder: `js/sports/{sport}/`

2. Create showdown optimizer: `js/sports/{sport}/showdown.js`
```javascript
// Global state for this sport
let players = [];
let lineups = [];

function initShowdownDOM() {
    // Initialize DOM elements and event listeners
}

function parseCSV(csvText) {
    // Parse DraftKings CSV format for this sport
}

function generateLineups() {
    // Generate optimal lineups based on sport rules
}
```

3. Create classic optimizer (if applicable): `js/sports/{sport}/classic.js`

4. Add constants if needed: `js/core/constants.js`
   - Team database, slate mappings, salary caps

5. Add tab to `index.html` and initialize in `js/core/app.js`

### Key Modules

- **`constants.js`** - Shared configuration (teams, slates, salary caps)
- **`utils.js`** - CSV parsing, correlation calculations
- **`app.js`** - Main initialization, tab navigation, Player Data
- **`showdown.js`** - Showdown optimizer (Captain + FLEX format)
- **`classic.js`** - Classic optimizer (position-based roster)

## CSV Format

### DraftKings Player Pool
Standard DraftKings export with columns:
- Name, Position, Salary, Team, AvgPointsPerGame

### Player Game Logs (Correlations)
CSV with columns:
- Player/Name, Team, Week, Points/FPTS

File naming for auto-detection:
- `QB_gamelog.csv`, `RB_data.csv`, `WR_stats.csv`, etc.

## Development

### Local Setup
```bash
git clone https://github.com/Skimmilk12/ShowdownOptimizer.git
cd ShowdownOptimizer
# Open index.html in browser - no build step needed!
```

### Making Changes
1. Edit relevant files in `js/` or `css/`
2. Refresh browser to test
3. Commit and push to GitHub
4. GitHub Pages auto-deploys

## Roadmap

- [ ] NBA Showdown support
- [ ] Integrate correlations into lineup generation
- [ ] Player lock/exclude functionality
- [ ] Ownership projections
- [ ] Late swap support
- [ ] Entry management & contest tracking

## Tech Stack

- **Pure JavaScript** - No frameworks, no build step
- **CSS Variables** - Easy theming
- **LocalStorage** - Settings persistence
- **Modular Architecture** - Easy to extend

## License

MIT License

## Author

Built for the DFS community 🎰
