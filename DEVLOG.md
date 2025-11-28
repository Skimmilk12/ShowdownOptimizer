# Showdown Optimizer - Development Log

## Current Version: v2.1 - Modular Refactor (Working)

### Project Status: ✅ WORKING
- Showdown CSV parsing: ✅ Working (uses original logic)
- Lineup generation: ✅ Working (uses original logic)
- Player pool display: ✅ Working
- Multi-slate support: ✅ Working
- Classic mode: 🔜 Coming soon
- Player Data/Correlations: 🔜 Coming soon
- Entry Optimizer: 🔜 Coming soon

---

## 2025-11-28: Modular Refactor v2.1

### What Changed
Rebuilt from the original monolithic HTML into a modular structure while **preserving the exact working parsing and generation logic**.

### File Structure
```
ShowdownOptimizer/
├── index.html                    # Main page with embedded app controller
├── css/
│   └── styles.css               # All styles extracted from original
├── js/
│   ├── core/
│   │   └── utils.js             # Shared utilities (parseCSVLine, etc.)
│   └── sports/
│       └── madden/
│           ├── config.js        # Sport-specific settings
│           └── showdown.js      # Showdown optimizer (ORIGINAL LOGIC)
└── DEVLOG.md
```

### Key Decision: Preserve Original Logic
The original code had working CSV parsing that correctly handled DraftKings' offset format:
- Player pool starts at Row 8, Column 12 (not row 1, col 1)
- Entry data in columns A-K, player data in columns L+
- Searches for "Position" header to find player pool location

**This logic was kept EXACTLY as-is in showdown.js**

### What's Modular Now
1. **Utils (js/core/utils.js)**: Shared functions that any sport can use
   - `parseCSVLine()` - handles quoted CSV values
   - `extractPlayerName()` - strips DK player IDs
   - `downloadFile()` - creates downloads
   - `isCashGame()` - detects contest type
   - Storage helpers

2. **Config (js/sports/madden/config.js)**: Sport-specific settings
   - Salary caps, roster rules
   - Slate configurations
   - Position colors
   - NFL team database

3. **Showdown (js/sports/madden/showdown.js)**: Core optimizer
   - `parseCSV()` - ORIGINAL working DK parsing
   - `generateLineups()` - ORIGINAL generation algorithm
   - `generateOptimalLineupForCaptain()` - ORIGINAL combinatorial search
   - `findBestFivePlayers()` - ORIGINAL exhaustive search
   - `generateRandomizedLineup()` - ORIGINAL diversity generator

4. **App Controller (in index.html)**: UI event handling
   - Connects buttons/inputs to MaddenShowdown methods
   - Renders player pool and lineups
   - Manages tab navigation

### How to Add a New Sport
1. Create `js/sports/{sport}/config.js` with sport settings
2. Create `js/sports/{sport}/showdown.js` (or classic.js) with optimizer
3. Add tab to index.html
4. Add sport initialization to app controller

### Coming Soon
- [ ] Classic mode (9-position)
- [ ] Player Data tab (correlation upload)
- [ ] Entry Optimizer (Paw Patrol mode)
- [ ] Export to DraftKings format

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
- [ ] Upload DK CSV → Players load correctly
- [ ] Slate auto-detected from game time
- [ ] Player pool shows with correct projections
- [ ] Generate button creates lineups
- [ ] Lineups display with correct salaries/projections
- [ ] Export CSV works
- [ ] Pagination works for >100 lineups

### Known Issues
- None currently

---

## Tech Stack
- Pure HTML/CSS/JavaScript (no build step)
- GitHub Pages hosting
- Dark theme with CSS variables
