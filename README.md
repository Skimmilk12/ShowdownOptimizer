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
├── index.html              # Main entry point
├── css/
│   ├── core.css           # Base styles, theme, layout
│   └── components.css     # Specialized components
├── js/
│   ├── core/
│   │   ├── app.js         # Main controller, sport selection
│   │   ├── utils.js       # Shared utilities (CSV, formatting)
│   │   ├── ui.js          # UI helpers (notifications, modals)
│   │   └── optimizer.js   # Base optimizer class
│   ├── sports/
│   │   └── madden/
│   │       ├── config.js  # Madden settings & rules
│   │       ├── optimizer.js # Madden lineup generation
│   │       └── ui.js      # Madden UI rendering
│   └── features/          # (Future: correlations, entries)
├── config/                # (Future: sport definitions)
└── README.md
```

## Architecture

### Adding a New Sport

1. Create config file: `js/sports/{sport}/config.js`
```javascript
const NBAConfig = {
    id: 'nba',
    name: 'NBA',
    salaryCap: 50000,
    rosterSize: 6,
    showdown: {
        positions: {
            CPT: { count: 1, multiplier: 1.5 },
            UTIL: { count: 5, multiplier: 1.0 }
        }
    },
    // ... sport-specific settings
};
```

2. Create optimizer: `js/sports/{sport}/optimizer.js`
```javascript
class NBAShowdownOptimizer extends BaseOptimizer {
    // Override parsePlayerData() for NBA CSV format
    // Override generateSingleLineup() for NBA rules
}
```

3. Create UI: `js/sports/{sport}/ui.js`
```javascript
const NBAUI = {
    init(optimizer) { /* ... */ },
    renderUI() { /* ... */ }
};
```

4. Register in `app.js`:
```javascript
sports: {
    nba: {
        config: () => window.NBAConfig,
        optimizer: () => new NBAShowdownOptimizer(),
        ui: () => window.NBAUI,
        ready: true
    }
}
```

### Key Classes

- **`BaseOptimizer`** - Core optimization logic (salary, diversity, exposure)
- **`MaddenShowdownOptimizer`** - Extends base with Madden-specific rules
- **`Utils`** - CSV parsing, formatting, storage helpers
- **`UI`** - Notifications, modals, progress bars, tables
- **`App`** - Main controller, sport selection, routing

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
