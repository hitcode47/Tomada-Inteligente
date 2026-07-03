
// ============================================
// EcoPlugWeb - Smart Socket Controller
// Modular and well-organized functionality
// ============================================

// ============================================
// 1. STATE MANAGEMENT
// ============================================

const state = {
    sockets: [],
    currentMetrics: {
        voltage: 0,
        amperage: 0,
        power: 0
    },
    history: [],
    isOnline: true,
    monitoredSockets: [],
    chartedSockets: [],
    chart: null
};

// ============================================
// 2. DOM ELEMENTS CACHE
// ============================================

const DOM = {
    // Status
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    
    // Management
    newSocketInput: document.getElementById('new-socket-name'),
    addSocketBtn: document.getElementById('add-socket-btn'),
    deleteSocketSelect: document.getElementById('delete-socket-select'),
    deleteSocketBtn: document.getElementById('delete-socket-btn'),
    configSocketSelect: document.getElementById('config-socket-select'),
    configSocketInput: document.getElementById('config-socket-name'),
    configSocketBtn: document.getElementById('config-socket-btn'),
    
    // Monitoring
    voltageDisplay: document.getElementById('current-voltage'),
    amperageDisplay: document.getElementById('current-amperage'),
    powerDisplay: document.getElementById('current-power'),
    socketChecklist: document.getElementById('socket-checklist'),
    
    // Chart and History
    chartSocketChecklist: document.getElementById('chart-socket-checklist'),
    updateChartBtn: document.getElementById('update-chart-btn'),
    chartCanvas: document.getElementById('consumption-chart'),
    historyList: document.getElementById('history-list')
};

// ============================================
// 3. SOCKET MANAGEMENT MODULE
// ============================================

const SocketManager = {
    /**
     * Add a new socket
     * @param {string} name - Socket name
     */
    addSocket(name) {
        if (!name.trim()) {
            alert('Por favor, digite um nome para a tomada');
            return;
        }

        const newSocket = {
            id: Date.now(),
            name: name,
            status: false,
            createdAt: new Date()
        };

        state.sockets.push(newSocket);
        DOM.newSocketInput.value = '';
        
        UIManager.updateSelectOptions();
        UIManager.updateControlGrid();
        UIManager.updateSocketChecklists();
        this.logAction(`Tomada "${name}" adicionada`);
    },

    /**
     * Delete a socket by ID
     * @param {number} socketId - Socket ID to delete
     */
    deleteSocket(socketId) {
        const socketIndex = state.sockets.findIndex(s => s.id === socketId);
        
        if (socketIndex === -1) {
            alert('Tomada não encontrada');
            return;
        }

        const socketName = state.sockets[socketIndex].name;
        state.sockets.splice(socketIndex, 1);
        
        UIManager.updateSelectOptions();
        UIManager.updateControlGrid();
        UIManager.updateSocketChecklists();
        this.logAction(`Tomada "${socketName}" deletada`);
    },

    /**
     * Update socket configuration
     * @param {number} socketId - Socket ID
     * @param {string} newName - New name for socket
     */
    configSocket(socketId, newName) {
        if (!newName.trim()) {
            alert('Por favor, digite um novo nome');
            return;
        }

        const socket = state.sockets.find(s => s.id === socketId);
        
        if (!socket) {
            alert('Tomada não encontrada');
            return;
        }

        const oldName = socket.name;
        socket.name = newName;
        
        UIManager.updateSelectOptions();
        UIManager.updateControlGrid();
        UIManager.updateSocketChecklists();
        this.logAction(`Tomada "${oldName}" renomeada para "${newName}"`);
    },

    /**
     * Toggle socket power status
     * @param {number} socketId - Socket ID
     */
    toggleSocket(socketId) {
        const socket = state.sockets.find(s => s.id === socketId);
        
        if (!socket) return;

        socket.status = !socket.status;
        const action = socket.status ? 'Ligado' : 'Desligado';
        
        UIManager.updateControlGrid();
        this.logAction(`${socket.name} - ${action}`);
    },

    /**
     * Log action to history
     * @param {string} action - Action description
     */
    logAction(action) {
        const historyEntry = {
            timestamp: new Date(),
            action: action,
            power: state.currentMetrics.power
        };

        state.history.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (state.history.length > 50) {
            state.history.pop();
        }

        UIManager.updateHistory();
    }
};

// ============================================
// 4. METRICS MODULE
// ============================================

const MetricsManager = {
    /**
     * Update metrics from device/API
     * @param {Object} data - Metrics data
     */
    updateMetrics(data) {
        state.currentMetrics = {
            voltage: data.voltage || 0,
            amperage: data.amperage || 0,
            power: data.power || 0
        };

        UIManager.updateMetricsDisplay();
    },

    /**
     * Simulate real-time metrics
     */
    simulateMetrics() {
        const metrics = {
            voltage: (200 + Math.random() * 60).toFixed(1),
            amperage: (Math.random() * 15).toFixed(2),
            power: Math.floor(Math.random() * 2000)
        };

        this.updateMetrics(metrics);
    }
};

// ============================================
// 5. CONNECTION STATUS MODULE
// ============================================

const ConnectionManager = {
    /**
     * Update online/offline status
     * @param {boolean} isOnline - Connection status
     */
    setStatus(isOnline) {
        state.isOnline = isOnline;

        DOM.statusIndicator.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        DOM.statusText.textContent = isOnline ? 'Online' : 'Offline';
    },

    /**
     * Simulate connection check
     */
    checkConnection() {
        const isConnected = Math.random() > 0.1; // 90% chance of connection
        this.setStatus(isConnected);
    }
};

// ============================================
// 6. CHART MODULE
// ============================================

const ChartManager = {
    /**
     * Initialize chart
     */
    initChart() {
        if (!DOM.chartCanvas) return;

        state.chart = new Chart(DOM.chartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Consumo de Energia por Tomada'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Potência (W)'
                        }
                    }
                }
            }
        });
    },

    /**
     * Update chart with selected sockets
     */
    updateChart() {
        if (!state.chart) return;

        const selectedSockets = Array.from(
            DOM.chartSocketChecklist.querySelectorAll('.chart-socket-checkbox:checked')
        ).map(cb => parseInt(cb.value));

        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        const datasets = selectedSockets.map((socketId, index) => {
            const socket = state.sockets.find(s => s.id === socketId);
            return {
                label: socket?.name || `Tomada ${socketId}`,
                data: Array(10).fill(Math.floor(Math.random() * 2000)),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.1
            };
        });

        state.chart.data.labels = Array.from({length: 10}, (_, i) => `${i}h`);
        state.chart.data.datasets = datasets;
        state.chart.update();
    }
};

// ============================================
// 7. UI MANAGER MODULE
// ============================================

const UIManager = {
    /**
     * Update select options for socket management
     */
    updateSelectOptions() {
        const selects = [DOM.deleteSocketSelect, DOM.configSocketSelect];

        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Selecione uma tomada</option>';

            state.sockets.forEach(socket => {
                const option = document.createElement('option');
                option.value = socket.id;
                option.textContent = socket.name;
                select.appendChild(option);
            });

            select.value = currentValue;
        });
    },

    /**
     * Update socket checklists for monitoring and chart
     */
    updateSocketChecklists() {
        [DOM.socketChecklist, DOM.chartSocketChecklist].forEach((checklist, index) => {
            if (!checklist) return;

            const isChart = index === 1;
            const checkboxClass = isChart ? 'chart-socket-checkbox' : 'socket-checkbox';

            checklist.innerHTML = state.sockets.map(socket => `
                <label class="checklist-item">
                    <input 
                        type="checkbox" 
                        class="${checkboxClass}" 
                        value="${socket.id}"
                        checked
                    >
                    <span>${socket.name}</span>
                </label>
            `).join('');
        });
    },

    /**
     * Update control grid with current sockets
     */
    updateControlGrid() {
        const controlGrid = document.querySelector('.control-grid');
        
        if (state.sockets.length === 0) {
            controlGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nenhuma tomada adicionada</p>';
            return;
        }

        controlGrid.innerHTML = state.sockets.map(socket => `
            <div class="control-card">
                <h3>${socket.name}</h3>
                <div class="switch-container">
                    <input 
                        type="checkbox" 
                        id="switch-${socket.id}" 
                        class="toggle-switch socket-toggle"
                        data-socket-id="${socket.id}"
                        ${socket.status ? 'checked' : ''}
                    >
                    <label for="switch-${socket.id}" class="switch-label"></label>
                </div>
                <p class="switch-status">${socket.status ? 'Ligado' : 'Desligado'}</p>
            </div>
        `).join('');

        // Reattach event listeners
        document.querySelectorAll('.socket-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const socketId = parseInt(e.target.dataset.socketId);
                SocketManager.toggleSocket(socketId);
            });
        });
    },

    /**
     * Update metrics display
     */
    updateMetricsDisplay() {
        DOM.voltageDisplay.textContent = state.currentMetrics.voltage.toFixed(1);
        DOM.amperageDisplay.textContent = state.currentMetrics.amperage.toFixed(2);
        DOM.powerDisplay.textContent = state.currentMetrics.power;
    },

    /**
     * Update history table
     */
    updateHistory() {
        if (state.history.length === 0) {
            DOM.historyList.innerHTML = '<tr><td>--</td><td>--</td><td>--</td></tr>';
            return;
        }

        DOM.historyList.innerHTML = state.history.map(entry => `
            <tr>
                <td>${entry.timestamp.toLocaleString('pt-BR')}</td>
                <td>${entry.action}</td>
                <td>${entry.power} W</td>
            </tr>
        `).join('');
    }
};

// ============================================
// 8. EVENT LISTENERS SETUP
// ============================================

const EventSetup = {
    init() {
        // Add socket
        DOM.addSocketBtn.addEventListener('click', () => {
            SocketManager.addSocket(DOM.newSocketInput.value);
        });

        DOM.newSocketInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                SocketManager.addSocket(DOM.newSocketInput.value);
            }
        });

        // Delete socket
        DOM.deleteSocketBtn.addEventListener('click', () => {
            const socketId = parseInt(DOM.deleteSocketSelect.value);
            if (socketId) {
                SocketManager.deleteSocket(socketId);
                DOM.deleteSocketSelect.value = '';
            }
        });

        // Config socket
        DOM.configSocketBtn.addEventListener('click', () => {
            const socketId = parseInt(DOM.configSocketSelect.value);
            if (socketId) {
                SocketManager.configSocket(socketId, DOM.configSocketInput.value);
                DOM.configSocketInput.value = '';
                DOM.configSocketSelect.value = '';
            }
        });

        // Update chart
        DOM.updateChartBtn.addEventListener('click', () => {
            ChartManager.updateChart();
        });
    }
};

// ============================================
// 9. INITIALIZATION
// ============================================

function init() {
    console.log('Initializing EcoPlugWeb...');
    
    EventSetup.init();
    ChartManager.initChart();
    ConnectionManager.setStatus(true);
    
    // Simulate real-time updates
    setInterval(() => {
        MetricsManager.simulateMetrics();
        ConnectionManager.checkConnection();
    }, 3000);

    console.log('EcoPlugWeb initialized successfully!');
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);