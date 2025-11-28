# Showdown Optimizer - Development Log

## Current Status: v2.0 - Foundation Complete
**Last Updated:** November 28, 2024

---

## What's Built

### Core Architecture ✅
- Sport selector homepage (cards for each sport)
- Modular file structure supporting multiple sports
- Base optimizer class that all sports extend
- Shared utilities (CSV parsing, formatting, storage)
- Shared UI components (notifications, modals, sliders, tables)
- Dark theme with CSS variables

### Madden Showdown ✅
- 6 slates with times (12:00, 2:00, 4:00, 6:00, 8:00, 10:00)
- Salary range dual slider ($40K-$50K)
- Projection Floor slider (80%-100%)
- Lineup count options: 100, 500, 2,000, 5,000
- Time-based generation: 10s, 20s, 30s, 1min
- Generate Lineups + ALL buttons
- Player Pool table with position filters
- Player search
- CSV export (DraftKings format)
- Tabs: "Madden SD" | "Madden Classic" | "Player Data"

### Player Data Tab ✅
- Individual position upload cards (QB, RB, WR, TE, DST)
- ALL upload card with multi-file select (Ctrl+Click)
- Auto-detection of position from filename
- Visual status indicators (dots turn green when loaded)

---

## What's In Progress

### Madden Classic Mode 🔲
- Placeholder UI exists
- Needs 9-position lineup generation logic

### Correlations 🔲
- Upload UI complete
- Correlation computation not yet implemented
- Integration into lineup generation not started

---

## Known Issues

1. None currently - fresh build

---

## Next Priorities

1. Test the v2 build on live site
2. Fix any bugs found during testing
3. Implement correlation computation
4. Add NBA Showdown support

---

## Version History

### v2.0 (Nov 28, 2024)
- Complete rebuild with scalable architecture
- Sport selector homepage
- Modular file structure (js/core/, js/sports/{sport}/)
- Madden Showdown fully functional
- Player Data tab with ALL upload card

### v1.0 (Nov 28, 2024)
- Initial monolithic build
- Basic Showdown/Classic/Correlations/Entries tabs
- Different UI than intended

---

## File Reference

```
ShowdownOptimizer/
├── index.html
├── css/
│   ├── core.css
│   └── components.css
├── js/
│   ├── core/
│   │   ├── app.js
│   │   ├── utils.js
│   │   ├── ui.js
│   │   └── optimizer.js
│   └── sports/
│       └── madden/
│           ├── config.js
│           ├── optimizer.js
│           └── ui.js
├── README.md
└── DEVLOG.md
```

---

## Notes for Claude

When starting a new chat:
1. User may just say "let's continue" or describe what they want to work on
2. Fetch this DEVLOG.md first to understand current state
3. Fetch specific code files as needed from the repo
4. Update this DEVLOG.md when significant progress is made
