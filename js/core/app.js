/* ==========================================
   SHOWDOWN OPTIMIZER - MAIN APPLICATION
   Application controller, sport selection, global state
   ========================================== */

const App = {
    // Current state
    currentSport: null,
    currentTab: 'showdown',
    optimizer: null,
    
    // Available sports
    sports: {
        madden: {
            config: () => window.MaddenConfig,
            optimizer: () => new MaddenShowdownOptimizer(),
            ui: () => window.MaddenUI,
            ready: true
        },
        nfl: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        nba: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        mlb: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        nhl: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        nascar: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        golf: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        },
        tennis: {
            config: null,
            optimizer: null,
            ui: null,
            ready: false
        }
    },
    
    // Sport display info
    sportInfo: {
        madden: { name: 'Madden', icon: '🎮', status: 'Ready' },
        nfl: { name: 'NFL', icon: '🏈', status: 'Coming Soon' },
        nba: { name: 'NBA', icon: '🏀', status: 'Coming Soon' },
        mlb: { name: 'MLB', icon: '⚾', status: 'Coming Soon' },
        nhl: { name: 'NHL', icon: '🏒', status: 'Coming Soon' },
        nascar: { name: 'NASCAR', icon: '🏎️', status: 'Coming Soon' },
        golf: { name: 'Golf', icon: '⛳', status: 'Coming Soon' },
        tennis: { name: 'Tennis', icon: '🎾', status: 'Coming Soon' }
    },
    
    /* ==========================================
       INITIALIZATION
       ========================================== */
    
    /**
     * Initialize the application
     */
    init() {
        console.log('Showdown Optimizer initializing...');
        
        // Check for saved sport preference
        const savedSport = Utils.loadFromStorage('selectedSport');
        
        if (savedSport && this.sports[savedSport]?.ready) {
            this.selectSport(savedSport);
        } else {
            this.showSportSelector();
        }
        
        // Initialize global event listeners
        this.initGlobalListeners();
    },
    
    /**
     * Initialize global event listeners
     */
    initGlobalListeners() {
        // Handle escape key for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    },
    
    /* ==========================================
       SPORT SELECTION
       ========================================== */
    
    /**
     * Show sport selector screen
     */
    showSportSelector() {
        const container = document.getElementById('appContent');
        if (!container) return;
        
        let cardsHtml = '';
        
        for (const [sportId, info] of Object.entries(this.sportInfo)) {
            const sport = this.sports[sportId];
            const isReady = sport?.ready;
            const statusClass = isReady ? 'ready' : '';
            const disabledClass = isReady ? '' : 'disabled';
            
            cardsHtml += `
                <div class="sport-card ${disabledClass}" data-sport="${sportId}" ${isReady ? `onclick="App.selectSport('${sportId}')"` : ''}>
                    <div class="sport-card-icon">${info.icon}</div>
                    <div class="sport-card-name">${info.name}</div>
                    <div class="sport-card-status ${statusClass}">${info.status}</div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="sport-selector">
                <h1>🏆 Showdown Optimizer</h1>
                <p>Select a sport to begin</p>
                <div class="sport-cards">
                    ${cardsHtml}
                </div>
            </div>
        `;
        
        // Hide header tabs if visible
        const tabsContainer = document.querySelector('.main-tabs');
        if (tabsContainer) tabsContainer.style.display = 'none';
        
        // Update header
        this.updateHeader(null);
    },
    
    /**
     * Select a sport and load its UI
     * @param {string} sportId 
     */
    selectSport(sportId) {
        const sport = this.sports[sportId];
        
        if (!sport || !sport.ready) {
            UI.error('This sport is not available yet');
            return;
        }
        
        console.log(`Loading ${sportId}...`);
        
        // Save preference
        Utils.saveToStorage('selectedSport', sportId);
        
        // Set current sport
        this.currentSport = sportId;
        
        // Create optimizer instance
        this.optimizer = sport.optimizer();
        
        // Load sport UI
        const sportUI = sport.ui();
        if (sportUI && sportUI.init) {
            sportUI.init(this.optimizer);
        }
        
        // Update header
        const config = sport.config();
        this.updateHeader(config);
        
        // Show tabs
        const tabsContainer = document.querySelector('.main-tabs');
        if (tabsContainer) tabsContainer.style.display = 'flex';
    },
    
    /**
     * Go back to sport selector
     */
    backToSportSelector() {
        Utils.removeFromStorage('selectedSport');
        this.currentSport = null;
        this.optimizer = null;
        this.showSportSelector();
    },
    
    /* ==========================================
       HEADER MANAGEMENT
       ========================================== */
    
    /**
     * Update header based on selected sport
     * @param {Object} config - Sport config or null
     */
    updateHeader(config) {
        const logoEl = document.querySelector('.header-logo');
        const badgeEl = document.querySelector('.header-badge');
        
        if (!config) {
            if (logoEl) logoEl.innerHTML = `<span>🏆</span> Showdown Optimizer`;
            if (badgeEl) badgeEl.textContent = 'Select Sport';
            return;
        }
        
        if (logoEl) {
            logoEl.innerHTML = `<span>${this.sportInfo[config.id]?.icon || '🏆'}</span> ${config.fullName || config.name}`;
        }
        
        if (badgeEl) {
            badgeEl.textContent = config.platform || 'DraftKings';
        }
    },
    
    /* ==========================================
       TAB MANAGEMENT
       ========================================== */
    
    /**
     * Switch main tab
     * @param {string} tabId 
     */
    switchTab(tabId) {
        this.currentTab = tabId;
        UI.switchTab(tabId);
        
        // Notify sport UI
        const sport = this.sports[this.currentSport];
        if (sport?.ui()?.onTabSwitch) {
            sport.ui().onTabSwitch(tabId);
        }
    },
    
    /* ==========================================
       UTILITIES
       ========================================== */
    
    /**
     * Get current optimizer instance
     * @returns {BaseOptimizer|null}
     */
    getOptimizer() {
        return this.optimizer;
    },
    
    /**
     * Get current sport config
     * @returns {Object|null}
     */
    getConfig() {
        if (!this.currentSport) return null;
        const sport = this.sports[this.currentSport];
        return sport?.config ? sport.config() : null;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make available globally
window.App = App;
