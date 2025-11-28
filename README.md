# 🏈 Showdown Optimizer

A DraftKings NFL DFS lineup optimizer for Showdown and Classic contests.

## Features

### Showdown Mode
- **Captain/FLEX lineup generation** - Optimizes 6-player Showdown lineups
- **Multi-slate support** - Manage up to 4 slates simultaneously
- **Salary constraints** - Set custom salary floor and ceiling ($45K-$50K)
- **Lineup diversity** - Control player exposure across your portfolio
- **Paw Patrol Mode** - Portfolio optimization with max exposure limits

### Classic Mode  
- **9-position lineups** - QB, RB, RB, WR, WR, WR, TE, FLEX, DST
- **Weighted randomization** - Favors high-projection players while maintaining diversity
- **Same constraints** - Salary range, diversity, and exposure controls

### Correlations
- **Player game log analysis** - Upload historical CSVs for correlation computation
- **Position correlation matrix** - See how positions correlate (QB-WR, RB-DST, etc.)
- **Team correlation cards** - View player-to-player correlations by team
- **Multi-file upload** - Ctrl+Click to upload all 5 position files at once

### Entries Management
- **Contest tracking** - Upload DraftKings entries CSV
- **GPP vs Cash detection** - Automatically categorizes contests
- **Fee totals** - See your total entry fees at a glance

## Getting Started

### Live Demo
Access the optimizer at: `https://skimmilk12.github.io/ShowdownOptimizer/`

### Local Development
1. Clone the repository
2. Open `index.html` in a browser
3. No build step required - pure HTML/CSS/JS

## Usage

### 1. Upload Player Pool
- Go to **Showdown** or **Classic** tab
- Click the upload zone or drag a DraftKings CSV
- Player pool will populate automatically

### 2. Configure Settings
- **Lineup Count**: 20, 50, 100, or 150 lineups
- **Salary Range**: Adjust min/max salary constraints
- **Diversity**: 0% = max optimal, 100% = max diverse
- **Max Exposure**: Limit any single player's appearance %

### 3. Generate & Export
- Click **Generate Lineups**
- Review generated lineups with sorting/pagination
- Click **Export CSV** to download DraftKings-ready file

### 4. Correlations (Optional)
- Go to **Correlations** tab
- Upload game log CSVs for each position
- View computed correlations by position and team

## File Structure

```
ShowdownOptimizer/
├── index.html          # Main application
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── app.js          # Main application controller
│   ├── showdown.js     # Showdown optimizer logic
│   ├── classic.js      # Classic optimizer logic
│   ├── correlations.js # Correlation computation
│   └── utils.js        # Shared utilities
├── data/               # (optional) Sample data
└── README.md
```

## CSV Format Requirements

### DraftKings Player Pool
Standard DraftKings export with columns:
- Name, Position, Salary, Team, AvgPointsPerGame (or projection column)

### Player Game Logs (for correlations)
CSV with columns:
- Player/Name, Team, Week, Points/FPTS/DKPts

File naming convention for auto-detection:
- `QB_gamelog.csv`, `RB_data.csv`, `WR_stats.csv`, etc.

## Technical Notes

- **Pure client-side** - No server required, runs entirely in browser
- **No dependencies** - Vanilla JavaScript, no frameworks
- **LocalStorage** - Settings persist across sessions
- **Responsive** - Works on desktop and mobile

## Roadmap

- [ ] Integrate correlations into lineup generation
- [ ] Player lock/exclude functionality
- [ ] Game stacking rules
- [ ] Late swap support
- [ ] Ownership projections

## License

MIT License - feel free to use and modify.

## Author

Built for the DFS community. Good luck! 🎰
