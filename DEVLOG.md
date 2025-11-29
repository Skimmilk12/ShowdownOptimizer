# Showdown Optimizer - Development Log

## Current Version: v2.2 - Full Modular Refactor (Working)

### Project Status: ✅ FULLY WORKING
- Showdown CSV parsing: ✅ Working (original logic preserved)
- Classic CSV parsing: ✅ Working (original logic preserved)
- Lineup generation: ✅ Working (both Showdown & Classic)
- Player pool display: ✅ Working
- Multi-slate support: ✅ Working (6 Showdown + 2 Classic slates)
- Classic mode: ✅ Working (9-position NFL roster)
- Player Data/Correlations: ✅ Working
- Entry Optimizer: ✅ Working (Paw Patrol mode)

---

## 2025-11-29: Full Modular Refactor v2.2

### What Changed
Refactored the original 7665-line monolithic HTML file into a clean modular structure while **preserving 100% of the original functionality**.

### File Structure
```
ShowdownOptimizer/
├── index.html                    # HTML markup only (1056 lines, down from 7665)
├── css/
│   └── styles.css               # All styles extracted (2359 lines)
├── js/
│   ├── core/
│   │   ├── app.js               # Main init, tab navigation, Player Data tab (734 lines)
│   │   ├── constants.js         # NFL teams, salary caps, slate mappings (69 lines)
│   │   └── utils.js             # Shared utilities (61 lines)
│   └── sports/
│       └── madden/
│           ├── showdown.js      # Showdown optimizer - ORIGINAL LOGIC (1901 lines)
│           └── classic.js       # Classic optimizer - ORIGINAL LOGIC (969 lines)
├── README.md
└── DEVLOG.md
```

### Key Decision: Preserve Original Logic
The original code had working CSV parsing that correctly handled DraftKings' offset format:
- Player pool starts at Row 8, Column 12 (not row 1, col 1)
- Entry data in columns A-K, player data in columns L+
- Searches for "Position" header to find player pool location

**This logic was kept EXACTLY as-is in showdown.js**

### What's Modular Now

1. **Constants (js/core/constants.js)**: Shared configuration
   - `NFL_TEAMS` - team database with colors and logos
   - `SALARY_CAP`, `CLASSIC_SALARY_CAP` - salary constraints
   - `slateTimeMap`, `classicSlateTimeMap` - game time to slate mapping

2. **Utils (js/core/utils.js)**: Shared functions any sport can use
   - `parseCSVLine()` - handles quoted CSV values
   - `isCashGame()` - detects contest type from name
   - `pearsonCorrelation()` - correlation coefficient calculation

3. **App (js/core/app.js)**: Main application controller
   - Tab navigation initialization
   - Player Data tab functionality (correlations)
   - Main init that bootstraps Showdown and Classic

4. **Showdown (js/sports/madden/showdown.js)**: Showdown optimizer
   - `parseCSV()` - ORIGINAL DK parsing with offset handling
   - `generateLineups()` - ORIGINAL generation algorithm
   - `generateOptimalLineupForCaptain()` - ORIGINAL combinatorial search
   - `findBestFivePlayers()` - ORIGINAL exhaustive search
   - Portfolio analysis and Paw Patrol optimization

5. **Classic (js/sports/madden/classic.js)**: Classic optimizer
   - 9-position roster: QB, 2RB, 3WR, TE, FLEX, DST
   - `parseClassicCSV()` - DK Classic format parsing
   - `generateClassicLineups()` - position-based generation
   - `buildClassicLineupByStrategy()` - cash/balanced/GPP strategies

### How to Add a New Sport
1. Create `js/sports/{sport}/constants.js` with sport settings (teams, slates)
2. Create `js/sports/{sport}/showdown.js` and/or `classic.js` with optimizer logic
3. Add tab to index.html
4. Add sport initialization to js/core/app.js

### Completed Features
- [x] Classic mode (9-position NFL roster)
- [x] Player Data tab (correlation upload & analysis)
- [x] Entry Optimizer (Paw Patrol portfolio mode)
- [x] Export to DraftKings format
- [x] Multi-slate support (6 Showdown + 2 Classic)

---

## Previous History

### 2025-11-28: Initial v2 Rebuild (BROKEN)
- Attempted to rewrite parsing logic from scratch
- **Broke DraftKings CSV parsing** - didn't handle offset format
- Lesson learned: Don't rewrite working code, just reorganize it

### 2025-11-28: Original v1
- Single monolithic HTML file (~4000 lines)
- All features working
- Difficult to maintain and extend

---

## Testing Checklist

### Showdown Tab
- [x] Upload DK CSV → Players load correctly
- [x] Slate auto-detected from game time
- [x] Player pool shows with correct projections
- [x] Generate button creates lineups
- [x] Lineups display with correct salaries/projections
- [x] Export CSV works
- [x] Pagination works for >100 lineups

### Classic Tab
- [x] Upload DK Classic CSV → Players load correctly
- [x] 9-position roster generation works
- [x] Position filtering works
- [x] Export CSV works

### Player Data Tab
- [x] Multi-file correlation upload works
- [x] Position correlation matrix displays
- [x] Team correlation analysis works

### Known Issues
- None currently

---

## Tech Stack
- Pure HTML/CSS/JavaScript (no build step)
- GitHub Pages hosting
- Dark theme with CSS variables
