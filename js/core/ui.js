/* ==========================================
   SHOWDOWN OPTIMIZER - UI MANAGER
   Common UI operations, notifications, modals
   ========================================== */

const UI = {
    
    /* ==========================================
       NOTIFICATIONS
       ========================================== */
    
    /**
     * Show a notification toast
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'info'
     * @param {number} duration - Duration in ms
     */
    notify(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },
    
    /**
     * Show success notification
     * @param {string} message 
     */
    success(message) {
        this.notify(message, 'success');
    },
    
    /**
     * Show error notification
     * @param {string} message 
     */
    error(message) {
        this.notify(message, 'error');
    },
    
    /**
     * Show info notification
     * @param {string} message 
     */
    info(message) {
        this.notify(message, 'info');
    },
    
    /* ==========================================
       TAB MANAGEMENT
       ========================================== */
    
    /**
     * Initialize tab switching
     * @param {string} containerSelector - Selector for tab container
     * @param {Function} onSwitch - Callback when tab switches
     */
    initTabs(containerSelector, onSwitch = null) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const tabs = container.querySelectorAll('.main-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId, containerSelector);
                if (onSwitch) onSwitch(tabId);
            });
        });
    },
    
    /**
     * Switch to a specific tab
     * @param {string} tabId - Tab identifier
     * @param {string} containerSelector - Tab container selector
     */
    switchTab(tabId, containerSelector = '.main-tabs') {
        // Update tab buttons
        document.querySelectorAll(`${containerSelector} .main-tab`).forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    },
    
    /* ==========================================
       MODAL MANAGEMENT
       ========================================== */
    
    /**
     * Open a modal
     * @param {string} modalId - Modal element ID
     */
    openModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Close a modal
     * @param {string} modalId - Modal element ID
     */
    closeModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Initialize modal close on overlay click
     * @param {string} modalId - Modal element ID
     */
    initModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal(modalId);
            }
        });
        
        // Close button
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal(modalId));
        }
    },
    
    /* ==========================================
       PROGRESS BAR
       ========================================== */
    
    /**
     * Show progress bar
     * @param {string} containerId - Progress container ID
     */
    showProgress(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('active');
        }
    },
    
    /**
     * Hide progress bar
     * @param {string} containerId - Progress container ID
     */
    hideProgress(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.remove('active');
            const fill = container.querySelector('.progress-fill');
            if (fill) fill.style.width = '0%';
        }
    },
    
    /**
     * Update progress bar
     * @param {string} containerId - Progress container ID
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} text - Optional status text
     */
    updateProgress(containerId, percent, text = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const fill = container.querySelector('.progress-fill');
        const textEl = container.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${percent}%`;
        if (textEl && text) textEl.textContent = text;
    },
    
    /* ==========================================
       DRAG & DROP
       ========================================== */
    
    /**
     * Initialize drag and drop on upload zones
     * @param {string} selector - Selector for upload zones
     */
    initDragDrop(selector = '.upload-zone') {
        document.querySelectorAll(selector).forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                
                const input = zone.querySelector('input[type="file"]');
                if (input && e.dataTransfer.files.length > 0) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        });
    },
    
    /* ==========================================
       BUTTON GROUPS
       ========================================== */
    
    /**
     * Initialize option button groups (radio-style)
     * @param {string} containerSelector - Container selector
     * @param {Function} onChange - Callback with selected value
     */
    initOptionButtons(containerSelector, onChange = null) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const buttons = container.querySelectorAll('.option-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (onChange) {
                    onChange(btn.dataset.value || btn.textContent);
                }
            });
        });
    },
    
    /**
     * Set active option button by value
     * @param {string} containerSelector - Container selector
     * @param {string} value - Value to select
     */
    setOptionButton(containerSelector, value) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            const btnValue = btn.dataset.value || btn.textContent;
            btn.classList.toggle('active', btnValue === value.toString());
        });
    },
    
    /* ==========================================
       SLIDERS
       ========================================== */
    
    /**
     * Initialize a range slider with display update
     * @param {string} sliderId - Slider input ID
     * @param {string} displayId - Display element ID
     * @param {Function} formatter - Value formatter function
     * @param {Function} onChange - Change callback
     */
    initSlider(sliderId, displayId, formatter = null, onChange = null) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        
        if (!slider) return;
        
        const updateDisplay = () => {
            const value = parseFloat(slider.value);
            if (display) {
                display.textContent = formatter ? formatter(value) : value;
            }
            if (onChange) onChange(value);
        };
        
        slider.addEventListener('input', updateDisplay);
        updateDisplay(); // Initial update
    },
    
    /**
     * Initialize dual range slider
     * @param {string} minId - Min slider ID
     * @param {string} maxId - Max slider ID
     * @param {string} rangeId - Range highlight element ID
     * @param {Object} options - Display IDs and callbacks
     */
    initDualSlider(minId, maxId, rangeId, options = {}) {
        const minSlider = document.getElementById(minId);
        const maxSlider = document.getElementById(maxId);
        const range = document.getElementById(rangeId);
        
        if (!minSlider || !maxSlider) return;
        
        const update = () => {
            let minVal = parseInt(minSlider.value);
            let maxVal = parseInt(maxSlider.value);
            
            // Ensure min <= max
            if (minVal > maxVal) {
                [minVal, maxVal] = [maxVal, minVal];
                minSlider.value = minVal;
                maxSlider.value = maxVal;
            }
            
            // Update range highlight
            if (range) {
                const min = parseInt(minSlider.min);
                const max = parseInt(minSlider.max);
                const leftPct = ((minVal - min) / (max - min)) * 100;
                const rightPct = ((maxVal - min) / (max - min)) * 100;
                range.style.left = leftPct + '%';
                range.style.width = (rightPct - leftPct) + '%';
            }
            
            // Update displays
            if (options.minDisplayId) {
                const el = document.getElementById(options.minDisplayId);
                if (el) el.textContent = options.formatter ? options.formatter(minVal) : minVal;
            }
            
            if (options.maxDisplayId) {
                const el = document.getElementById(options.maxDisplayId);
                if (el) el.textContent = options.formatter ? options.formatter(maxVal) : maxVal;
            }
            
            if (options.onChange) {
                options.onChange(minVal, maxVal);
            }
        };
        
        minSlider.addEventListener('input', update);
        maxSlider.addEventListener('input', update);
        update(); // Initial update
    },
    
    /* ==========================================
       EMPTY STATES
       ========================================== */
    
    /**
     * Render empty state
     * @param {HTMLElement} container - Container element
     * @param {string} title - Title text
     * @param {string} message - Message text
     * @param {string} icon - SVG icon HTML (optional)
     */
    renderEmptyState(container, title, message, icon = null) {
        const defaultIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
        `;
        
        container.innerHTML = `
            <div class="empty-state">
                ${icon || defaultIcon}
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
    },
    
    /* ==========================================
       TABLE RENDERING
       ========================================== */
    
    /**
     * Render a data table
     * @param {HTMLElement} container - Container element
     * @param {Object[]} data - Array of data objects
     * @param {Object[]} columns - Column definitions [{key, label, formatter, class}]
     * @param {Object} options - Options (maxHeight, sortable, etc.)
     */
    renderTable(container, data, columns, options = {}) {
        if (!data || data.length === 0) {
            this.renderEmptyState(
                container, 
                options.emptyTitle || 'No Data',
                options.emptyMessage || 'No data to display'
            );
            return;
        }
        
        let html = '<div class="table-container"';
        if (options.maxHeight) {
            html += ` style="max-height: ${options.maxHeight}px"`;
        }
        html += '><table><thead><tr>';
        
        // Headers
        for (const col of columns) {
            const sortClass = options.sortable ? ' class="sortable"' : '';
            html += `<th${sortClass} data-key="${col.key}">${col.label}</th>`;
        }
        
        html += '</tr></thead><tbody>';
        
        // Rows
        for (const row of data) {
            html += '<tr>';
            for (const col of columns) {
                const value = row[col.key];
                const formatted = col.formatter ? col.formatter(value, row) : value;
                const cellClass = col.class ? ` class="${col.class}"` : '';
                html += `<td${cellClass}>${formatted}</td>`;
            }
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }
};

// Make available globally
window.UI = UI;
