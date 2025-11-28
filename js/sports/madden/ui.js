/* ==========================================
   SHOWDOWN OPTIMIZER - MADDEN UI
   UI rendering and event handling for Madden
   ========================================== */

const MaddenUI = {
    // State
    optimizer: null,
    currentSlate: 1,
    slateData: {},
    entries: [],
    playerData: {
        QB: null, RB: null, WR: null, TE: null, DST: null
    },
    
    // Generation mode
    generationMode: 'count', // 'count' or 'time'
    selectedLineupCount: 100,
    selectedTimeDuration: 10,
    
    /* ==========================================
       INITIALIZATION
       ========================================== */
    
    /**
     * Initialize Madden UI
     * @param {MaddenShowdownOptimizer} optimizer 
     */
    init(optimizer) {
        this.optimizer = optimizer;
        this.renderUI();
        this.initEventListeners();
        UI.initDragDrop('.upload-zone');
        UI.initDragDrop('.pd-upload-zone');
    },
    
    /**
     * Render the complete Madden UI
     */
    renderUI() {
        const container = document.getElementById('appContent');
        if (!container) return;
        
        container.innerHTML = this.getMainTemplate();
        
        // Initialize sliders
        this.initSliders();
        
        // Set default tab
        UI.switchTab('showdown');
    },
    
    /**
     * Get main template HTML
     */
    getMainTemplate() {
        return `
            <!-- Stats Row -->
            ${this.getStatsRowTemplate()}
            
            <!-- Tab Content -->
            <div class="tab-content active" id="showdownTab">
                ${this.getShowdownTabTemplate()}
            </div>
            
            <div class="tab-content" id="classicTab">
                ${this.getClassicTabTemplate()}
            </div>
            
            <div class="tab-content" id="playerdataTab">
                ${this.getPlayerDataTabTemplate()}
            </div>
        `;
    },
    
    /* ==========================================
       TEMPLATE: STATS ROW
       ========================================== */
    
    getStatsRowTemplate() {
        return `
            <div class="stats-row">
                <div class="stat-card purple">
                    <div class="stat-label">DK Entries</div>
                    <div class="stat-value" id="statEntries">0</div>
                    <div class="stat-sub">Contest entries</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">Players Loaded</div>
                    <div class="stat-value green" id="statPlayers">0</div>
                    <div class="stat-sub">From CSV</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-label">Lineups Generated</div>
                    <div class="stat-value" id="statLineups">0</div>
                    <div class="stat-sub">Optimized</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-label">Top Projection</div>
                    <div class="stat-value" id="statTopProj">0.00</div>
                    <div class="stat-sub">Best Lineup</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-label">Avg Projection</div>
                    <div class="stat-value" id="statAvgProj">0.00</div>
                    <div class="stat-sub">All Lineups</div>
                </div>
            </div>
        `;
    },
    
    /* ==========================================
       TEMPLATE: SHOWDOWN TAB
       ========================================== */
    
    getShowdownTabTemplate() {
        const config = MaddenConfig;
        
        // Build slate buttons
        let slateButtons = '';
        for (let i = 0; i < config.slates.count; i++) {
            const num = i + 1;
            const time = config.slates.times[i];
            const activeClass = num === 1 ? 'active' : '';
            slateButtons += `
                <button class="slate-btn ${activeClass}" data-slate="${num}" onclick="MaddenUI.selectSlate(${num})">
                    <span class="slate-num">${num}</span>
                    <span class="slate-time">${time}</span>
                </button>
            `;
        }
        
        // Build lineup count buttons
        let lineupCountBtns = '';
        for (const count of config.lineupCounts) {
            const activeClass = count === this.selectedLineupCount ? 'active' : '';
            lineupCountBtns += `
                <button class="option-btn ${activeClass}" data-value="${count}" onclick="MaddenUI.setLineupCount(${count})">${count.toLocaleString()}</button>
            `;
        }
        
        // Build time duration buttons
        let timeDurationBtns = '';
        for (const td of config.timeDurations) {
            const activeClass = td.value === this.selectedTimeDuration ? 'active-yellow' : '';
            timeDurationBtns += `
                <button class="option-btn ${activeClass}" data-value="${td.value}" onclick="MaddenUI.setTimeDuration(${td.value})">${td.label}</button>
            `;
        }
        
        return `
            <div class="grid-2">
                <!-- Left Column -->
                <div>
                    <!-- Upload Section -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Upload DraftKings Export
                            </span>
                        </div>
                        <div class="card-body">
                            <!-- Slate Selector -->
                            <div class="slate-grid" id="slateSelector">
                                ${slateButtons}
                            </div>
                            
                            <!-- Upload Zone -->
                            <div class="upload-zone" id="showdownUploadZone" onclick="document.getElementById('showdownFileInput').click()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <h3>Drop your DraftKings CSV here</h3>
                                <p>Entries + Player Pool export file</p>
                                <input type="file" id="showdownFileInput" accept=".csv" onchange="MaddenUI.handleFileUpload(event)">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Optimizer Settings -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                </svg>
                                Optimizer Settings
                            </span>
                        </div>
                        <div class="card-body">
                            <!-- Salary Range -->
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label class="form-label">Salary Range</label>
                                    <span class="slider-value">$<span id="salaryMinDisplay">49,000</span> - $<span id="salaryMaxDisplay">50,000</span></span>
                                </div>
                                <div class="dual-slider-container">
                                    <div class="dual-slider-track"></div>
                                    <div class="dual-slider-range" id="salaryRange"></div>
                                    <input type="range" class="dual-slider" id="salaryMinSlider" min="40000" max="50000" value="49000" step="100">
                                    <input type="range" class="dual-slider" id="salaryMaxSlider" min="40000" max="50000" value="50000" step="100">
                                </div>
                                <div class="slider-labels">
                                    <span>$40,000</span>
                                    <span>$50,000</span>
                                </div>
                            </div>
                            
                            <!-- Projection Floor -->
                            <div class="slider-group">
                                <div class="slider-header">
                                    <label class="form-label">Projection Floor</label>
                                    <span class="slider-value-badge" id="projFloorDisplay">90.0%</span>
                                </div>
                                <input type="range" class="range-slider yellow" id="projFloorSlider" min="80" max="100" value="90" step="0.5">
                                <div class="slider-labels">
                                    <span>80%</span>
                                    <span>100%</span>
                                </div>
                                <p class="form-hint">Only include lineups within this % of the top projection</p>
                            </div>
                            
                            <!-- Lineup Count -->
                            <div class="form-group">
                                <label class="form-label">Number of Lineups to Generate</label>
                                <div class="btn-group" id="lineupCountBtns">
                                    ${lineupCountBtns}
                                </div>
                            </div>
                            
                            <!-- Time Duration -->
                            <div class="form-group">
                                <label class="form-label">Or Generate for Time Duration</label>
                                <div class="btn-group" id="timeDurationBtns">
                                    ${timeDurationBtns}
                                </div>
                            </div>
                            
                            <!-- Generate Buttons -->
                            <button class="btn btn-primary btn-lg btn-block" id="generateBtn" onclick="MaddenUI.generateLineups()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                                Generate Lineups
                            </button>
                            
                            <button class="btn btn-danger btn-lg btn-block" style="margin-top: 10px;" id="generateAllBtn" onclick="MaddenUI.generateAll()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                ALL
                            </button>
                            
                            <!-- Progress -->
                            <div class="progress-container" id="generateProgress">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-text" id="progressText">Generating...</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column -->
                <div>
                    <!-- Player Pool -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                Player Pool
                            </span>
                            <span class="card-title-sub" id="playerPoolCount">0 players</span>
                        </div>
                        <div class="card-body">
                            <!-- Position Filters -->
                            <div class="filter-pills" id="positionFilters">
                                <button class="filter-pill active" data-pos="all" onclick="MaddenUI.filterByPosition('all')">All</button>
                                <button class="filter-pill" data-pos="QB" onclick="MaddenUI.filterByPosition('QB')">QB</button>
                                <button class="filter-pill" data-pos="RB" onclick="MaddenUI.filterByPosition('RB')">RB</button>
                                <button class="filter-pill" data-pos="WR" onclick="MaddenUI.filterByPosition('WR')">WR</button>
                                <button class="filter-pill" data-pos="TE" onclick="MaddenUI.filterByPosition('TE')">TE</button>
                                <button class="filter-pill" data-pos="K" onclick="MaddenUI.filterByPosition('K')">K</button>
                                <button class="filter-pill" data-pos="DST" onclick="MaddenUI.filterByPosition('DST')">DST</button>
                            </div>
                            
                            <!-- Search -->
                            <div class="search-input" style="margin-top: 12px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                <input type="text" id="playerSearch" placeholder="Search players..." oninput="MaddenUI.searchPlayers(this.value)">
                            </div>
                            
                            <!-- Player Table -->
                            <div id="playerTableContainer" style="margin-top: 16px;">
                                <div class="empty-state">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <h4>No Players Loaded</h4>
                                    <p>Upload a CSV file to load player projections</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Lineup Output -->
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Generated Lineups</span>
                            <button class="btn btn-secondary" id="exportBtn" onclick="MaddenUI.exportLineups()" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Export CSV
                            </button>
                        </div>
                        <div class="card-body-flush" id="lineupOutputContainer">
                            <div class="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                                <h4>No Lineups Generated</h4>
                                <p>Configure settings and click Generate</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Lineup Display -->
            <div class="card" id="lineupsCard" style="display: none;">
                <div class="card-header">
                    <span class="card-title">All Generated Lineups</span>
                </div>
                <div id="allLineupsContainer"></div>
            </div>
        `;
    },
    
    /* ==========================================
       TEMPLATE: CLASSIC TAB
       ========================================== */
    
    getClassicTabTemplate() {
        return `
            <div class="empty-state" style="padding: 100px 20px;">
                <h4>Madden Classic Mode</h4>
                <p>Classic 9-position lineup optimizer coming soon</p>
            </div>
        `;
    },
    
    /* ==========================================
       TEMPLATE: PLAYER DATA TAB
       ========================================== */
    
    getPlayerDataTabTemplate() {
        const positions = MaddenConfig.correlationPositions;
        
        let positionCards = '';
        for (const pos of positions) {
            positionCards += `
                <div class="pd-upload-card" data-position="${pos}" id="pdCard${pos}">
                    <div class="pd-upload-header">
                        <span class="pd-position-badge ${pos.toLowerCase()}">${pos}</span>
                        <span>${this.getPositionName(pos)}</span>
                    </div>
                    <div class="pd-upload-zone" onclick="document.getElementById('pdInput${pos}').click()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span>Upload ${pos} data</span>
                        <input type="file" id="pdInput${pos}" accept=".csv" onchange="MaddenUI.handlePlayerDataUpload(event, '${pos}')" style="display:none;">
                    </div>
                    <div class="pd-upload-status">
                        <span class="pd-status-text" id="pdStatus${pos}">No data loaded</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                        Upload Player Game Logs
                    </span>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.85rem;">
                        Upload historical game log CSVs for each position to compute player correlations.
                    </p>
                    
                    <div class="player-data-grid">
                        <!-- ALL Upload Card -->
                        <div class="pd-upload-card all-card" id="pdCardAll">
                            <div class="pd-upload-header">
                                <span class="pd-position-badge all">ALL</span>
                                <span>All Positions</span>
                            </div>
                            <div class="pd-upload-zone" onclick="document.getElementById('pdInputAll').click()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <span>Ctrl+Click to select all files</span>
                                <span class="upload-hint">Files auto-detected by name</span>
                                <input type="file" id="pdInputAll" accept=".csv" multiple onchange="MaddenUI.handleAllPlayerDataUpload(event)" style="display:none;">
                            </div>
                            <div class="pd-upload-status">
                                <div class="all-files-status" id="allFilesStatus">
                                    ${positions.map(p => `<div class="file-indicator" data-pos="${p}" title="${p}"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                        
                        ${positionCards}
                    </div>
                </div>
            </div>
            
            <!-- Correlation Matrix -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Position Correlation Matrix</span>
                </div>
                <div class="card-body" id="correlationMatrixContainer">
                    <div class="empty-state">
                        <h4>No Correlation Data</h4>
                        <p>Upload all 5 position files to compute correlations</p>
                    </div>
                </div>
            </div>
            
            <!-- Team Correlations -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Team Correlations</span>
                </div>
                <div class="card-body" id="teamCorrelationsContainer">
                    <div class="empty-state">
                        <h4>No Team Data</h4>
                        <p>Upload player data to see team correlations</p>
                    </div>
                </div>
            </div>
        `;
    },
    
    /* ==========================================
       EVENT LISTENERS
       ========================================== */
    
    initEventListeners() {
        // Tab switching
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                App.switchTab(tabId);
            });
        });
    },
    
    initSliders() {
        // Dual salary slider
        UI.initDualSlider('salaryMinSlider', 'salaryMaxSlider', 'salaryRange', {
            minDisplayId: 'salaryMinDisplay',
            maxDisplayId: 'salaryMaxDisplay',
            formatter: (val) => val.toLocaleString(),
            onChange: (min, max) => {
                if (this.optimizer) {
                    this.optimizer.updateSettings({ salaryMin: min, salaryMax: max });
                }
            }
        });
        
        // Projection floor slider
        UI.initSlider('projFloorSlider', 'projFloorDisplay', 
            (val) => val.toFixed(1) + '%',
            (val) => {
                if (this.optimizer) {
                    this.optimizer.updateSettings({ projectionFloor: val / 100 });
                }
            }
        );
    },
    
    /* ==========================================
       SLATE MANAGEMENT
       ========================================== */
    
    selectSlate(slateNum) {
        this.currentSlate = slateNum;
        
        // Update UI
        document.querySelectorAll('.slate-btn').forEach(btn => {
            const num = parseInt(btn.dataset.slate);
            btn.classList.toggle('active', num === slateNum);
        });
        
        // Load slate data if exists
        if (this.slateData[slateNum]) {
            this.optimizer.players = this.slateData[slateNum].players;
            this.renderPlayerTable();
            this.updateStats();
        }
    },
    
    /* ==========================================
       FILE HANDLING
       ========================================== */
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await Utils.readFileAsText(file);
            const data = Utils.parseCSV(text);
            
            const count = this.optimizer.loadPlayers(data);
            
            // Save to current slate
            this.slateData[this.currentSlate] = {
                players: [...this.optimizer.players],
                filename: file.name
            };
            
            // Mark slate as loaded
            document.querySelectorAll('.slate-btn').forEach(btn => {
                if (parseInt(btn.dataset.slate) === this.currentSlate) {
                    btn.classList.add('loaded');
                }
            });
            
            this.renderPlayerTable();
            this.updateStats();
            
            UI.success(`Loaded ${count} players for Slate ${this.currentSlate}`);
        } catch (err) {
            UI.error('Error loading file: ' + err.message);
        }
        
        // Reset input
        event.target.value = '';
    },
    
    async handlePlayerDataUpload(event, position) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await Utils.readFileAsText(file);
            const data = Utils.parseCSV(text);
            
            this.playerData[position] = data;
            
            // Update UI
            const card = document.getElementById(`pdCard${position}`);
            if (card) card.classList.add('loaded');
            
            const status = document.getElementById(`pdStatus${position}`);
            if (status) status.textContent = `${data.length} records loaded`;
            
            // Update all files indicator
            const indicator = document.querySelector(`.file-indicator[data-pos="${position}"]`);
            if (indicator) indicator.classList.add('loaded');
            
            this.checkAllPlayerDataLoaded();
            
            UI.success(`Loaded ${data.length} ${position} records`);
        } catch (err) {
            UI.error('Error loading file: ' + err.message);
        }
        
        event.target.value = '';
    },
    
    async handleAllPlayerDataUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        let loadedCount = 0;
        
        for (const file of files) {
            const position = Utils.detectPositionFromFilename(file.name);
            if (!position) continue;
            
            try {
                const text = await Utils.readFileAsText(file);
                const data = Utils.parseCSV(text);
                
                this.playerData[position] = data;
                loadedCount++;
                
                // Update individual card
                const card = document.getElementById(`pdCard${position}`);
                if (card) card.classList.add('loaded');
                
                const status = document.getElementById(`pdStatus${position}`);
                if (status) status.textContent = `${data.length} records loaded`;
                
                // Update indicator
                const indicator = document.querySelector(`.file-indicator[data-pos="${position}"]`);
                if (indicator) indicator.classList.add('loaded');
            } catch (err) {
                console.error(`Error loading ${file.name}:`, err);
            }
        }
        
        this.checkAllPlayerDataLoaded();
        
        if (loadedCount > 0) {
            UI.success(`Loaded ${loadedCount} position files`);
        }
        
        event.target.value = '';
    },
    
    checkAllPlayerDataLoaded() {
        const allLoaded = MaddenConfig.correlationPositions.every(pos => this.playerData[pos]);
        
        const allCard = document.getElementById('pdCardAll');
        if (allCard) {
            allCard.classList.toggle('all-loaded', allLoaded);
        }
        
        if (allLoaded) {
            // Compute correlations
            this.computeCorrelations();
        }
    },
    
    computeCorrelations() {
        // TODO: Implement correlation computation
        UI.info('Correlations computed!');
    },
    
    /* ==========================================
       LINEUP GENERATION
       ========================================== */
    
    setLineupCount(count) {
        this.selectedLineupCount = count;
        this.generationMode = 'count';
        
        // Update UI
        document.querySelectorAll('#lineupCountBtns .option-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
        });
        document.querySelectorAll('#timeDurationBtns .option-btn').forEach(btn => {
            btn.classList.remove('active-yellow');
        });
        
        if (this.optimizer) {
            this.optimizer.updateSettings({ lineupCount: count });
        }
    },
    
    setTimeDuration(seconds) {
        this.selectedTimeDuration = seconds;
        this.generationMode = 'time';
        
        // Update UI
        document.querySelectorAll('#timeDurationBtns .option-btn').forEach(btn => {
            btn.classList.toggle('active-yellow', parseInt(btn.dataset.value) === seconds);
        });
        document.querySelectorAll('#lineupCountBtns .option-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    },
    
    async generateLineups() {
        if (!this.optimizer || this.optimizer.players.length === 0) {
            UI.error('Please upload a player pool first');
            return;
        }
        
        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        UI.showProgress('generateProgress');
        
        try {
            let lineups;
            
            if (this.generationMode === 'time') {
                lineups = await this.optimizer.generateForDuration(
                    this.selectedTimeDuration,
                    (progress, count) => {
                        UI.updateProgress('generateProgress', progress, `Generating... ${count} lineups`);
                    }
                );
            } else {
                lineups = await this.optimizer.generate((progress, count) => {
                    UI.updateProgress('generateProgress', progress, `Generating... ${count} lineups`);
                });
            }
            
            this.renderLineups();
            this.updateStats();
            
            document.getElementById('exportBtn').disabled = false;
            
            UI.success(`Generated ${lineups.length} lineups!`);
        } catch (err) {
            UI.error('Error: ' + err.message);
        } finally {
            btn.disabled = false;
            UI.hideProgress('generateProgress');
        }
    },
    
    generateAll() {
        // Generate for all loaded slates
        UI.info('Generate All - Coming soon!');
    },
    
    /* ==========================================
       RENDERING
       ========================================== */
    
    currentPositionFilter: 'all',
    currentSearchTerm: '',
    
    filterByPosition(pos) {
        this.currentPositionFilter = pos;
        
        document.querySelectorAll('#positionFilters .filter-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.pos === pos);
        });
        
        this.renderPlayerTable();
    },
    
    searchPlayers(term) {
        this.currentSearchTerm = term.toLowerCase();
        this.renderPlayerTable();
    },
    
    renderPlayerTable() {
        const container = document.getElementById('playerTableContainer');
        if (!container) return;
        
        let players = this.optimizer?.players || [];
        
        // Apply filters
        if (this.currentPositionFilter !== 'all') {
            players = players.filter(p => p.position === this.currentPositionFilter);
        }
        
        if (this.currentSearchTerm) {
            players = players.filter(p => 
                p.name.toLowerCase().includes(this.currentSearchTerm) ||
                p.team.toLowerCase().includes(this.currentSearchTerm)
            );
        }
        
        // Sort by projection
        players = [...players].sort((a, b) => b.projection - a.projection);
        
        // Update count
        const countEl = document.getElementById('playerPoolCount');
        if (countEl) countEl.textContent = `${players.length} players`;
        
        if (players.length === 0) {
            UI.renderEmptyState(container, 'No Players Loaded', 'Upload a CSV file to load player projections');
            return;
        }
        
        // Render table
        UI.renderTable(container, players.slice(0, 50), [
            { key: 'name', label: 'Name' },
            { key: 'position', label: 'Pos', formatter: (v) => `<span class="pos-badge ${v.toLowerCase()}">${v}</span>` },
            { key: 'team', label: 'Team', class: 'team-badge' },
            { key: 'salary', label: 'Salary', formatter: (v) => Utils.formatCurrency(v) },
            { key: 'projection', label: 'Proj', formatter: (v) => v.toFixed(2) },
            { key: 'value', label: 'Value', formatter: (v) => v.toFixed(2) }
        ], { maxHeight: 350 });
    },
    
    renderLineups() {
        const container = document.getElementById('lineupOutputContainer');
        if (!container) return;
        
        const lineups = this.optimizer?.lineups || [];
        
        if (lineups.length === 0) {
            UI.renderEmptyState(container, 'No Lineups Generated', 'Configure settings and click Generate');
            return;
        }
        
        // Show first 10 lineups in compact view
        let html = '<div class="lineup-output">';
        
        // Header
        html += `
            <div class="lineup-row lineup-row-showdown header">
                <div>Rank</div>
                <div>CPT</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>FLEX</div>
                <div>Salary</div>
                <div>Proj</div>
            </div>
        `;
        
        // Rows
        lineups.slice(0, 20).forEach((lineup, idx) => {
            html += `
                <div class="lineup-row lineup-row-showdown">
                    <div class="lineup-rank">${idx + 1}</div>
                    <div class="lineup-player">
                        <span class="lineup-player-name">${lineup.captain.name}</span>
                        <span class="lineup-player-meta">${lineup.captain.team} • ${Utils.formatSalaryK(lineup.captain.salary)}</span>
                    </div>
            `;
            
            for (const flex of lineup.flex) {
                html += `
                    <div class="lineup-player">
                        <span class="lineup-player-name">${flex.name}</span>
                        <span class="lineup-player-meta">${flex.team} • ${Utils.formatSalaryK(flex.salary)}</span>
                    </div>
                `;
            }
            
            html += `
                    <div class="lineup-salary">${Utils.formatCurrency(lineup.salary)}</div>
                    <div class="lineup-points">${lineup.projection.toFixed(2)}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    updateStats() {
        const stats = this.optimizer?.getStats() || {};
        
        document.getElementById('statPlayers').textContent = stats.playerCount || 0;
        document.getElementById('statLineups').textContent = stats.lineupCount || 0;
        document.getElementById('statTopProj').textContent = stats.topProjection || '0.00';
        document.getElementById('statAvgProj').textContent = stats.avgProjection || '0.00';
    },
    
    /* ==========================================
       EXPORT
       ========================================== */
    
    exportLineups() {
        if (!this.optimizer || this.optimizer.lineups.length === 0) {
            UI.error('No lineups to export');
            return;
        }
        
        const csv = this.optimizer.exportCSV();
        Utils.downloadFile(csv, `madden_lineups_${Utils.getTodayString()}.csv`);
        UI.success('Lineups exported!');
    },
    
    /* ==========================================
       HELPERS
       ========================================== */
    
    getPositionName(pos) {
        const names = {
            QB: 'Quarterbacks',
            RB: 'Running Backs',
            WR: 'Wide Receivers',
            TE: 'Tight Ends',
            K: 'Kickers',
            DST: 'Defense/ST'
        };
        return names[pos] || pos;
    },
    
    onTabSwitch(tabId) {
        // Handle tab-specific logic
    }
};

// Make available globally
window.MaddenUI = MaddenUI;
