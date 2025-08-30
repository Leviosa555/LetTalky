// LetTalky - Premium Proximity Chat Application
// Enhanced JavaScript with modern interactions and animations

class LetTalkyApp {
    constructor() {
        this.peer = null;
        this.connections = new Map();
        this.currentUsername = '';
        this.currentAvatar = '😊';
        this.currentLocation = null;
        this.activeChatUser = null;
        this.typingTimeouts = new Map();
        this.heartbeatInterval = null;
        this.discoveryInterval = null;
        this.messageQueue = new Map();
        this.fileTransfers = new Map();
        if (window.location.hostname === 'localhost') {
            this.debugMode = true;
        }
        if (this.isMobileDevice()) {
            this.initializeMobileFeatures();
        }
        this.selectedFile = null;
        this.notificationTimeout = null;
        this.fileTransfers = new Map();

        // Enhanced settings with better defaults
        this.settings = {
            discoveryRange: 5000,
            soundNotifications: true,
            autoAcceptFiles: false,
            theme: 'light'
        };

        // Animation and interaction handlers
        this.animationQueue = [];
        this.isTyping = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing LetTalky...');
        this.loadSettings();
        this.setupEventListeners();
        this.setupAnimations();
        await this.requestLocationPermission();
        
        // Show welcome screen with animation
        this.showWelcomeScreen();
    }

    setupEventListeners() {
        // Welcome screen events
        const usernameForm = document.getElementById('usernameForm');
        if (usernameForm) {
            usernameForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUsernameSubmit();
            });
        }

        // Enhanced avatar selection with better feedback
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectAvatar(item);
            });
        });

        // Sidebar events with enhanced feedback
        const refreshBtn = document.getElementById('refreshUsers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshUsers();
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // Enhanced search with debouncing
        let searchTimeout;
        const searchInput = document.getElementById('searchUsers');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterUsers(e.target.value);
                }, 300);
            });
        }

        // Chat events
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.isMobileDevice()) {
                    this.handleMobileBackButton();
                } else {
                    this.closeChatInterface();
                }
            });
        }

        // Enhanced message input handling
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', () => {
                this.handleTyping();
                this.autoResizeTextarea(messageInput);
            });

            messageInput.addEventListener('focus', () => {
                this.addInputFocus();
            });

            messageInput.addEventListener('blur', () => {
                this.removeInputFocus();
            });
        }

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

                // Connection request modal events
        const closeConnectionRequest = document.getElementById('closeConnectionRequest');
        if (closeConnectionRequest) {
            closeConnectionRequest.addEventListener('click', () => {
                this.hideConnectionRequestDialog();
            });
        }

        const cancelRequest = document.getElementById('cancelRequest');
        if (cancelRequest) {
            cancelRequest.addEventListener('click', () => {
                this.hideConnectionRequestDialog();
            });
        }

        const sendRequest = document.getElementById('sendRequest');
        if (sendRequest) {
            sendRequest.addEventListener('click', () => {
                this.sendConnectionRequest();
            });
        }

        // Incoming request modal events
        const acceptIncomingRequest = document.getElementById('acceptIncomingRequest');
        if (acceptIncomingRequest) {
            acceptIncomingRequest.addEventListener('click', () => {
                this.acceptIncomingRequest();
            });
        }

        const declineIncomingRequest = document.getElementById('declineIncomingRequest');
        if (declineIncomingRequest) {
            declineIncomingRequest.addEventListener('click', () => {
                this.declineIncomingRequest();
            });
        }


        // File handling
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.handleFileSelection(e.target.files[0]);
                }
            });
        }

        const removePreview = document.getElementById('removePreview');
        if (removePreview) {
            removePreview.addEventListener('click', () => {
                this.removeFilePreview();
            });
        }

        // Settings modal events
        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                this.hideSettings();
            });
        }

        const rangeSelect = document.getElementById('rangeSelect');
        if (rangeSelect) {
            rangeSelect.addEventListener('change', (e) => {
                this.updateDiscoveryRange(parseInt(e.target.value));
            });
        }

        const soundNotifications = document.getElementById('soundNotifications');
        if (soundNotifications) {
            soundNotifications.addEventListener('change', (e) => {
                this.settings.soundNotifications = e.target.checked;
                this.saveSettings();
                this.showNotification(
                    `Sound notifications ${e.target.checked ? 'enabled' : 'disabled'}`,
                    'info'
                );
            });
        }

        const autoAcceptFiles = document.getElementById('autoAcceptFiles');
        if (autoAcceptFiles) {
            autoAcceptFiles.addEventListener('change', (e) => {
                this.settings.autoAcceptFiles = e.target.checked;
                this.saveSettings();
            });
        }

        // Call buttons
        const callBtn = document.getElementById('callBtn');
        if (callBtn) {
            callBtn.addEventListener('click', () => {
                this.handleVoiceCall();
            });
        }

        const videoBtn = document.getElementById('videoBtn');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => {
                this.handleVideoCall();
            });
        }

        // Enhanced modal handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Page visibility and cleanup
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.peer) {
                this.sendHeartbeat();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Click outside modal to close
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Handle window resize for responsive adjustments
        window.addEventListener('resize', () => {
            if (this.isMobileDevice()) {
                this.handleMobileOrientationChange();
            }
        });
    }

    setupAnimations() {
        // Add intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
    }

    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const appContainer = document.getElementById('appContainer');
        
        if (welcomeScreen && appContainer) {
            welcomeScreen.style.display = 'flex';
            appContainer.style.display = 'none';

            // Animate welcome content with stagger effect
            setTimeout(() => {
                const welcomeContent = welcomeScreen.querySelector('.welcome-content');
                const brandingContent = welcomeScreen.querySelector('.welcome-branding');
                
                if (brandingContent) {
                    brandingContent.style.opacity = '1';
                    brandingContent.style.transform = 'translateY(0)';
                }
                
                setTimeout(() => {
                    if (welcomeContent) {
                        welcomeContent.style.opacity = '1';
                        welcomeContent.style.transform = 'translateY(0) scale(1)';
                    }
                }, 200);
            }, 100);
        }
    }

    selectAvatar(selectedItem) {
        // Remove previous selection
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection with animation
        selectedItem.classList.add('selected');
        this.currentAvatar = selectedItem.dataset.emoji;

        // Add selection feedback
        selectedItem.style.transform = 'scale(1.15)';
        setTimeout(() => {
            selectedItem.style.transform = 'scale(1.1)';
        }, 150);

        // Update current user avatar if already initialized
        const currentUserAvatar = document.getElementById('currentUserAvatar');
        if (currentUserAvatar) {
            currentUserAvatar.textContent = this.currentAvatar;
        }
    }

    async handleUsernameSubmit() {
        const usernameInput = document.getElementById('usernameInput');
        if (!usernameInput) return;

        const username = usernameInput.value.trim();

        // Enhanced validation with better feedback
        if (!username) {
            this.showNotification('Please enter your username', 'error');
            this.shakeElement(usernameInput);
            return;
        }

        if (username.length < 3) {
            this.showNotification('Username must be at least 3 characters long', 'error');
            this.shakeElement(usernameInput);
            return;
        }

        if (username.length > 20) {
            this.showNotification('Username must be less than 20 characters', 'error');
            this.shakeElement(usernameInput);
            return;
        }

        // Check for invalid characters
        if (!/^[a-zA-Z0-9\s\-_.]+$/.test(username)) {
            this.showNotification('Username contains invalid characters. Use only letters, numbers, spaces, and basic punctuation.', 'error');
            this.shakeElement(usernameInput);
            return;
        }

        if (!this.currentLocation) {
            this.showNotification('Please enable location access to continue', 'error');
            await this.requestLocationPermission();
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('.cta-button');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Connecting...';
        submitBtn.disabled = true;

        this.currentUsername = username;

        try {
            await this.initializePeer();
            this.showMainApp();
            this.startHeartbeat();
            this.startDiscovery();
            this.showNotification('Welcome to LetTalky! 🎉', 'success');
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showNotification('Failed to connect. Please check your internet connection.', 'error');
            
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async requestLocationPermission() {
        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by this browser');
            }

            // Show better loading feedback
            this.showNotification('Getting your location...', 'info');

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 300000
                });
            });

            this.currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            console.log('📍 Location obtained:', this.currentLocation);
            this.showNotification('Location detected successfully!', 'success');

        } catch (error) {
            console.error('Error getting location:', error);
            
            let errorMessage = 'Location access is required for LetTalky to work.';
            
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Location permission denied. Please enable location sharing in your browser settings.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage = 'Location information unavailable. Please check your device settings.';
            } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Location request timed out. Please try again.';
            }
            
            this.showNotification(errorMessage, 'error');

            // Fallback location (New York City)
            this.currentLocation = {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10000
            };
        }
    }

    async initializePeer() {
        return new Promise((resolve, reject) => {
          const peerId = `lettalky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`🔗 Connecting to public PeerJS server...`);
          
          // Use public PeerJS server
          this.peer = new Peer(peerId, {
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                {
                  urls: 'turn:openrelay.metered.ca:80',
                  username: 'openrelayproject',
                  credential: 'openrelayproject'
                },
                {
                  urls: 'turn:openrelay.metered.ca:443',
                  username: 'openrelayproject',
                  credential: 'openrelayproject'
                }
              ]
            }
          });
      
          this.peer.on('open', async (id) => {
            console.log('🔗 Peer connected with ID:', id);
            try {
              await this.registerWithServer();
              this.setupPeerEventListeners();
              resolve(id);
            } catch (error) {
              reject(error);
            }
          });
      
          this.peer.on('error', (error) => {
            console.error('❌ Peer error:', error);
            reject(error);
          });
      
          setTimeout(() => {
            if (!this.peer || !this.peer.open) {
              reject(new Error('Peer connection timeout - please check your internet connection'));
            }
          }, 15000);
        });
    }
      

    setupPeerEventListeners() {
        this.peer.on('connection', (conn) => {
            console.log('📞 Incoming connection from:', conn.peer);
            this.handleIncomingConnection(conn);
        });
    
        this.peer.on('call', (call) => {
            console.log('📱 Incoming call from:', call.peer);
            // Future implementation for voice/video calls
        });
    
        this.peer.on('disconnected', () => {
            console.log('🔌 Peer disconnected, attempting to reconnect...');
            this.showNotification('Connection lost, reconnecting...', 'info');
            this.attemptReconnection();
        });
    
        this.peer.on('error', (error) => {
            console.error('❌ Peer error:', error);
            if (error.type === 'network') {
                this.attemptReconnection();
            }
        });
    }
    
    handleIncomingConnection(conn) {
        conn.on('open', () => {
            console.log('✅ Incoming connection opened with:', conn.peer);
            this.connections.set(conn.peer, conn);
            this.setupConnectionEventListeners(conn);
        });
    
        conn.on('error', (error) => {
            console.error('❌ Incoming connection error:', error);
            this.connections.delete(conn.peer);
        });
    }
    

    handleIncomingConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.setupConnectionEventListeners(conn);
            console.log('✅ Connection established with:', conn.peer);
        });

        conn.on('error', (error) => {
            console.error('❌ Connection error:', error);
            this.connections.delete(conn.peer);
        });
    }

    setupConnectionEventListeners(conn) {
        conn.on('data', (data) => {
            this.handleIncomingData(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('🔌 Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            this.updateUserStatus(conn.peer, 'offline');
        });

        conn.on('error', (error) => {
            console.error('❌ Connection error:', error);
            this.connections.delete(conn.peer);
        });
    }

    async registerWithServer() {
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    peerId: this.peer.id,
                    username: this.currentUsername,
                    avatar: this.currentAvatar,
                    location: this.currentLocation
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const result = await response.json();
            console.log('✅ Registered successfully:', result);
            return result;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async discoverNearbyUsers() {
        if (!this.peer || !this.peer.open) return;

        try {
            const response = await fetch(
                `/peers?peerId=${this.peer.id}&range=${this.settings.discoveryRange}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch nearby users`);
            }

            const data = await response.json();
            this.updateUsersList(data.peers);
            this.updateUsersCount(data.peers.length);
            
            console.log(`🕵️ Found ${data.peers.length} nearby users`);
        } catch (error) {
            console.error('❌ Error discovering users:', error);
            this.showNotification('Failed to discover nearby users', 'error');
        }
    }

    updateUsersList(users) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
    
        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="discovery-loading">
                    <div class="illustration-circle" style="width: 60px; height: 60px; font-size: 24px;">
                        🔍
                    </div>
                    <div class="loading-text">
                        <p>No users found nearby.</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">Try expanding your search range in settings.</p>
                    </div>
                </div>
            `;
            return;
        }
    
        usersList.innerHTML = users.map(user => `
            <div class="user-item" data-peer-id="${user.peerId}" data-username="${user.username}" data-avatar="${user.avatar}" data-distance="${this.formatDistance(user.distance)}">
                <div class="user-avatar" style="width: 48px; height: 48px; font-size: 20px;">
                    ${user.avatar}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-distance">${this.formatDistance(user.distance)} • ${user.status}</div>
                </div>
                <div class="status-dot ${user.isActive ? 'active' : ''}"></div>
            </div>
        `).join('');
    
        // Add click event listeners to each user item
        usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const peerId = item.dataset.peerId;
                const username = item.dataset.username;
                const avatar = item.dataset.avatar;
                const distance = item.dataset.distance;
                
                this.connectToUser(peerId, username, avatar, distance);
            });
        });
    }
    
    

    async connectToUser(peerId, username, avatar, distance = '0m') {
        console.log('User clicked on:', { peerId, username, avatar });
        
        // Check if already connected to this peer
        const existingConnection = this.connections.get(peerId);
        if (existingConnection && existingConnection.open) {
            console.log('✅ Already connected to:', username, '- Opening chat directly');
            this.openChatInterface(peerId, username, avatar);
            this.showNotification(`Reopened chat with ${username}`, 'success');
            return;
        }
        
        // Store the target user info for the modal
        this.pendingConnectionRequest = {
            peerId,
            username,
            avatar,
            distance
        };
        
        // Show confirmation dialog for new connections
        this.showConnectionRequestDialog(username, avatar, distance);
    }
    
        // Add this method to store user information with connections
    storeUserConnection(peerId, connection, userInfo) {
        this.connections.set(peerId, connection);
        
        // Store user info for future reference
        if (!this.userInfoCache) {
            this.userInfoCache = new Map();
        }
        this.userInfoCache.set(peerId, userInfo);
        
        console.log('🔗 Stored connection for:', userInfo.username);
    }

    // Add this method to get cached user info
    getCachedUserInfo(peerId) {
        if (!this.userInfoCache) {
            return null;
        }
        return this.userInfoCache.get(peerId);
    }

    // Add this method to check connection status
    isConnectedToPeer(peerId) {
        const connection = this.connections.get(peerId);
        return connection && connection.open;
    }

    // Add this method to clean up closed connections
    cleanupConnection(peerId) {
        this.connections.delete(peerId);
        if (this.userInfoCache) {
            this.userInfoCache.delete(peerId);
        }
        console.log('🗑️ Cleaned up connection for:', peerId);
    }

    
    showConnectionRequestDialog(username, avatar, distance) {
        const modal = document.getElementById('connectionRequestModal');
        const targetAvatar = document.getElementById('targetUserAvatar');
        const targetName = document.getElementById('targetUserName');
        const targetDistance = document.getElementById('targetUserDistance');
        
        if (targetAvatar) targetAvatar.textContent = avatar;
        if (targetName) targetName.textContent = username;
        if (targetDistance) targetDistance.textContent = distance;
        
        if (modal) {
            modal.classList.add('show');
        }
    }
    
        // Update your sendConnectionRequest method
    async sendConnectionRequest() {
        if (!this.pendingConnectionRequest) return;
        
        const { peerId, username, avatar } = this.pendingConnectionRequest;
        
        if (!this.peer || !this.peer.open) {
            this.showNotification('Please wait for connection to initialize', 'error');
            this.hideConnectionRequestDialog();
            return;
        }

        try {
            // Visual feedback
            const userItem = document.querySelector(`[data-peer-id="${peerId}"]`);
            if (userItem) {
                userItem.classList.add('pending-request');
            }

            this.showNotification(`Sending connection request to ${username}...`, 'info');
            
            // Create connection
            const connection = this.peer.connect(peerId, {
                reliable: true,
                serialization: 'json'
            });
            
            connection.on('open', () => {
                console.log('✅ Connection opened with:', peerId);
                
                // Store connection with user info
                const userInfo = {
                    peerId,
                    username,
                    avatar,
                    connectedAt: Date.now()
                };
                this.storeUserConnection(peerId, connection, userInfo);
                this.setupConnectionEventListeners(connection);
                
                // Send connection request
                const requestData = {
                    type: 'connection_request',
                    sender: {
                        peerId: this.peer.id,
                        username: this.currentUsername,
                        avatar: this.currentAvatar
                    },
                    timestamp: Date.now(),
                    message: `${this.currentUsername} wants to connect with you`
                };
                
                connection.send(requestData);
                console.log('📤 Connection request sent to:', username);
                this.showNotification(`Connection request sent to ${username}`, 'success');
            });

            connection.on('error', (error) => {
                console.error('❌ Connection error:', error);
                this.showNotification(`Failed to send request to ${username}`, 'error');
                if (userItem) {
                    userItem.classList.remove('pending-request');
                }
            });

            connection.on('close', () => {
                console.log('🔌 Connection closed with:', peerId);
                this.cleanupConnection(peerId);
                if (userItem) {
                    userItem.classList.remove('pending-request', 'connected');
                }
            });

            // Hide the dialog
            this.hideConnectionRequestDialog();
            
            // Clear pending request
            this.pendingConnectionRequest = null;

        } catch (error) {
            console.error('Error sending connection request:', error);
            this.showNotification('Failed to send connection request', 'error');
            this.hideConnectionRequestDialog();
        }
    }

    
    hideConnectionRequestDialog() {
        const modal = document.getElementById('connectionRequestModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.pendingConnectionRequest = null;
    }
    

    sendConversationRequest(connection, username, avatar) {
        const requestData = {
            type: 'conversation_request',
            sender: {
                peerId: this.peer.id,
                username: this.currentUsername,
                avatar: this.currentAvatar
            },
            timestamp: Date.now(),
            message: `${this.currentUsername} wants to start a conversation with you`
        };
        
        try {
            connection.send(requestData);
            console.log('📤 Conversation request sent to:', username);
            this.showNotification(`Conversation request sent to ${username}`, 'success');
        } catch (error) {
            console.error('Failed to send conversation request:', error);
        }
    }

    handleConnectionRequest(data) {
        const { sender, message, timestamp } = data;
        
        console.log('📨 Received connection request from:', sender.username);
        
        // Store the incoming request data
        this.incomingConnectionRequest = {
            sender,
            connection: this.connections.get(sender.peerId),
            timestamp
        };
        
        // Show incoming request modal
        this.showIncomingRequestDialog(sender);
        
        // Play notification sound
        this.playNotificationSound();
    }
    
    showIncomingRequestDialog(sender) {
        const modal = document.getElementById('incomingRequestModal');
        const senderAvatar = document.getElementById('senderUserAvatar');
        const senderName = document.getElementById('senderUserName');
        
        if (senderAvatar) senderAvatar.textContent = sender.avatar;
        if (senderName) senderName.textContent = sender.username;
        
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    acceptIncomingRequest() {
        if (!this.incomingConnectionRequest) return;
        
        const { sender, connection } = this.incomingConnectionRequest;
        
        console.log('✅ Accepting connection request from:', sender.username);
        
        // Store connection with user info
        const userInfo = {
            peerId: sender.peerId,
            username: sender.username,
            avatar: sender.avatar,
            connectedAt: Date.now()
        };
        this.storeUserConnection(sender.peerId, connection, userInfo);
        
        // Send acceptance response
        if (connection && connection.open) {
            connection.send({
                type: 'connection_accepted',
                accepter: {
                    peerId: this.peer.id,
                    username: this.currentUsername,
                    avatar: this.currentAvatar
                },
                timestamp: Date.now(),
                message: `${this.currentUsername} accepted your connection request`
            });
        }
        
        // Open chat interface
        this.openChatInterface(sender.peerId, sender.username, sender.avatar);
        
        // Update UI
        const userItem = document.querySelector(`[data-peer-id="${sender.peerId}"]`);
        if (userItem) {
            userItem.classList.add('connected');
            userItem.classList.remove('pending-request');
        }
        
        this.showNotification(`Connected to ${sender.username}!`, 'success');
        this.hideIncomingRequestDialog();
    }
    
    
    declineIncomingRequest() {
        if (!this.incomingConnectionRequest) return;
        
        const { sender, connection } = this.incomingConnectionRequest;
        
        console.log('❌ Declining connection request from:', sender.username);
        
        // Send decline response
        if (connection && connection.open) {
            connection.send({
                type: 'connection_declined',
                decliner: {
                    peerId: this.peer.id,
                    username: this.currentUsername,
                    avatar: this.currentAvatar
                },
                timestamp: Date.now(),
                message: 'Connection request declined'
            });
            
            // Close connection
            connection.close();
        }
        
        this.connections.delete(sender.peerId);
        this.showNotification(`Declined connection from ${sender.username}`, 'info');
        this.hideIncomingRequestDialog();
    }
    
    hideIncomingRequestDialog() {
        const modal = document.getElementById('incomingRequestModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.incomingConnectionRequest = null;
    }
    
    
    handleConversationRequest(data) {
        const { sender, message, timestamp } = data;
        
        console.log('📨 Received conversation request from:', sender.username);
        
        // Show notification to the receiver
        this.showConversationRequestNotification(sender, message);
        
        // Add to pending requests (optional)
        this.addToPendingRequests(sender);
        
        // Auto-open chat interface for receiver (optional)
        this.openChatInterface(sender.peerId, sender.username, sender.avatar);
        
        // Send acknowledgment back
        const connection = this.connections.get(sender.peerId);
        if (connection && connection.open) {
            connection.send({
                type: 'conversation_request_received',
                message: 'Conversation request received',
                timestamp: Date.now(),
                receiver: {
                    peerId: this.peer.id,
                    username: this.currentUsername,
                    avatar: this.currentAvatar
                }
            });
        }
    }
    
    showConversationRequestNotification(sender, message) {
        // Show a special notification for conversation requests
        const notificationHtml = `
            <div class="conversation-request-notification">
                <div class="request-header">
                    <div class="sender-avatar">${sender.avatar}</div>
                    <div class="sender-info">
                        <div class="sender-name">${sender.username}</div>
                        <div class="request-message">wants to start a conversation</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="app.acceptConversationRequest('${sender.peerId}', '${sender.username}', '${sender.avatar}')">
                        Accept
                    </button>
                    <button class="decline-btn" onclick="app.declineConversationRequest('${sender.peerId}')">
                        Decline
                    </button>
                </div>
            </div>
        `;
        
        this.showNotification(notificationHtml, 'conversation-request', 10000); // Show for 10 seconds
    }
    
    acceptConversationRequest(peerId, username, avatar) {
        console.log('✅ Accepting conversation request from:', username);
        
        // Open chat interface
        this.openChatInterface(peerId, username, avatar);
        
        // Send acceptance message
        const connection = this.connections.get(peerId);
        if (connection && connection.open) {
            connection.send({
                type: 'conversation_accepted',
                message: `${this.currentUsername} accepted your conversation request`,
                timestamp: Date.now(),
                accepter: {
                    peerId: this.peer.id,
                    username: this.currentUsername,
                    avatar: this.currentAvatar
                }
            });
        }
        
        this.showNotification(`Conversation with ${username} started!`, 'success');
    }
    
    declineConversationRequest(peerId) {
        console.log('❌ Declining conversation request from peer:', peerId);
        
        // Send decline message
        const connection = this.connections.get(peerId);
        if (connection && connection.open) {
            connection.send({
                type: 'conversation_declined',
                message: 'Conversation request declined',
                timestamp: Date.now()
            });
            
            // Close connection
            connection.close();
        }
        
        this.connections.delete(peerId);
        this.showNotification('Conversation request declined', 'info');
    }
    
    addToPendingRequests(sender) {
        // Add visual indicator in the sidebar for pending requests
        const userItem = document.querySelector(`[data-peer-id="${sender.peerId}"]`);
        if (userItem) {
            userItem.classList.add('has-request');
            
            // Add request indicator
            const requestIndicator = document.createElement('div');
            requestIndicator.className = 'request-indicator';
            requestIndicator.innerHTML = '💬';
            requestIndicator.title = 'Conversation request';
            userItem.appendChild(requestIndicator);
        }
    }    
    
    markMessageAsFailed(messageData) {
        // Find the last message in the container and mark it as failed
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            const lastMessage = messagesContainer.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('outgoing')) {
                lastMessage.classList.add('failed');
                lastMessage.style.opacity = '0.5';
                
                // Add retry button
                const retryBtn = document.createElement('button');
                retryBtn.textContent = '🔄 Retry';
                retryBtn.className = 'retry-message-btn';
                retryBtn.onclick = () => {
                    this.retryMessage(messageData);
                    lastMessage.remove();
                };
                lastMessage.appendChild(retryBtn);
            }
        }
    }
    
    retryMessage(messageData) {
        const connection = this.connections.get(this.activeChatUser.peerId);
        if (connection && connection.open) {
            try {
                connection.send(messageData);
                this.displayMessage(messageData, 'outgoing');
                this.showNotification('Message sent successfully!', 'success');
            } catch (error) {
                this.showNotification('Retry failed. Please check your connection.', 'error');
            }
        } else {
            this.showNotification('No connection available. Please reconnect.', 'error');
        }
    }

    //Mobile function

        // =============================================================================
    // MOBILE-SPECIFIC FUNCTIONS ONLY
    // =============================================================================

    // 1. Mobile Device Detection
    isMobileDevice() {
        return window.innerWidth <= 768;    
    }

    // 2. Mobile Navigation State Management
    initializeMobileState() {
        this.mobileNavState = 'users'; // 'users' or 'chat'
        this.isMobile = this.isMobileDevice();
    }

    // 3. Mobile Chat Interface Opening
    openMobileChatInterface(peerId, username, avatar) {
        console.log('📱 Opening mobile chat for:', username);
        
        this.activeChatUser = { peerId, username, avatar };
        this.mobileNavState = 'chat';
        
        // Update chat header
        const chatUserName = document.getElementById('chatUserName');
        const chatUserAvatar = document.getElementById('chatUserAvatar');
        
        if (chatUserName) chatUserName.textContent = username;
        if (chatUserAvatar) chatUserAvatar.textContent = avatar;
        
        // Mobile navigation: slide to chat
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        const chatInterface = document.getElementById('chatInterface');
        
        if (sidebar) {
            sidebar.classList.add('chat-open');
        }
        
        if (chatArea) {
            chatArea.classList.add('active');
            chatArea.style.display = 'flex';
        }
        
        if (chatInterface) {
            chatInterface.style.display = 'flex';
            chatInterface.classList.add('active');
        }
        
        // Clear messages and focus input
        this.clearMessages();
        
        setTimeout(() => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.focus();
        }, 350);
    }

    // 4. Mobile Chat Interface Closing
    closeMobileChatInterface() {
        console.log('📱 Closing mobile chat');
        
        this.activeChatUser = null;
        this.mobileNavState = 'users';
        
        // Mobile navigation: slide back to users
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        const chatInterface = document.getElementById('chatInterface');
        
        if (sidebar) {
            sidebar.classList.remove('chat-open');
        }
        
        if (chatArea) {
            chatArea.classList.remove('active');
            setTimeout(() => {
                chatArea.style.display = 'none';
            }, 300);
        }
        
        if (chatInterface) {
            chatInterface.style.display = 'none';
            chatInterface.classList.remove('active');
        }
    }

    // 5. Mobile Back Button Handler
    handleMobileBackButton() {
        console.log('📱 Mobile back button pressed');
        
        if (this.mobileNavState === 'chat') {
            this.closeMobileChatInterface();
        }
    }

    // 6. Mobile Orientation Change Handler
    handleMobileOrientationChange() {
        const wasMobile = this.isMobile;
        this.isMobile = this.isMobileDevice();
        
        console.log('📱 Orientation changed - Mobile:', this.isMobile);
        
        // If switching from/to mobile, adjust interface
        if (wasMobile !== this.isMobile) {
            if (this.activeChatUser && this.isMobile) {
                // Switch to mobile chat layout
                setTimeout(() => {
                    this.closeChatInterface(); // Close desktop version
                    this.openMobileChatInterface(
                        this.activeChatUser.peerId,
                        this.activeChatUser.username,
                        this.activeChatUser.avatar
                    );
                }, 100);
            } else if (this.activeChatUser && !this.isMobile) {
                // Switch to desktop chat layout
                setTimeout(() => {
                    this.closeMobileChatInterface(); // Close mobile version
                    this.openChatInterface(
                        this.activeChatUser.peerId,
                        this.activeChatUser.username,
                        this.activeChatUser.avatar
                    );
                }, 100);
            }
        }
    }

    // 7. Mobile Keyboard Height Adjustment
    adjustForMobileKeyboard() {
        if (!this.isMobileDevice()) return;
        
        const chatArea = document.querySelector('.chat-area');
        const messagesContainer = document.getElementById('messagesContainer');
        
        // Detect virtual keyboard
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const windowHeight = window.innerHeight;
        
        if (viewportHeight < windowHeight * 0.7) {
            // Keyboard is likely open
            if (chatArea) {
                chatArea.style.height = `${viewportHeight}px`;
            }
            
            // Scroll to bottom of messages
            if (messagesContainer) {
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            }
        } else {
            // Keyboard is closed
            if (chatArea) {
                chatArea.style.height = '100vh';
            }
        }
    }

    // 8. Mobile Touch Gestures
    initializeMobileTouchGestures() {
        if (!this.isMobileDevice()) return;
        
        let startX = 0;
        let startY = 0;
        
        const chatArea = document.querySelector('.chat-area');
        if (!chatArea) return;
        
        chatArea.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches.clientY;
        });
        
        chatArea.addEventListener('touchmove', (e) => {
            if (this.mobileNavState !== 'chat') return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches.clientY;
            
            const deltaX = currentX - startX;
            const deltaY = Math.abs(currentY - startY);
            
            // Swipe right to go back (only if more horizontal than vertical)
            if (deltaX > 100 && deltaY < 50) {
                this.closeMobileChatInterface();
            }
        });
    }

    // 9. Mobile Message Input Auto-Resize
    handleMobileMessageInput(input) {
        if (!this.isMobileDevice()) return;
        
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        
        // Adjust messages container height
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            const inputHeight = input.offsetHeight;
            const maxInputHeight = 100;
            const heightDiff = inputHeight - 40; // Default input height
            
            if (heightDiff > 0) {
                messagesContainer.style.marginBottom = `${heightDiff}px`;
            } else {
                messagesContainer.style.marginBottom = '0';
            }
        }
    }

    // 10. Mobile Safe Area Handling
    handleMobileSafeArea() {
        if (!this.isMobileDevice()) return;
        
        const root = document.documentElement;
        
        // Set CSS custom properties for safe areas
        if (window.CSS && CSS.supports && CSS.supports('padding', 'env(safe-area-inset-top)')) {
            root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
            root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
            root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');
            root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
        }
    }

    // 11. Mobile Notification Positioning
    showMobileNotification(message, type = 'info') {
        if (!this.isMobileDevice()) return this.showNotification(message, type);
        
        // Position notifications at top for mobile
        const notification = document.createElement('div');
        notification.className = `notification mobile-notification ${type}`;
        notification.textContent = message;
        
        // Create container if it doesn't exist
        let container = document.getElementById('mobileNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mobileNotificationContainer';
            container.className = 'mobile-notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 12. Mobile Haptic Feedback
    provideMobileHapticFeedback(type = 'light') {
        if (!this.isMobileDevice()) return;
        
        if ('vibrate' in navigator) {
            switch (type) {
                case 'light':
                    navigator.vibrate(50);
                    break;
                case 'medium':
                    navigator.vibrate(100);
                    break;
                case 'heavy':
                    navigator.vibrate(200);
                    break;
                case 'success':
                    navigator.vibrate([100, 50, 100]);
                    break;
                case 'error':
                    navigator.vibrate([200, 100, 200]);
                    break;
            }
        }
    }

    // 13. Mobile Connection Status Indicator
    showMobileConnectionStatus(status) {
        if (!this.isMobileDevice()) return;
        
        const indicator = document.getElementById('mobileConnectionStatus') || document.createElement('div');
        indicator.id = 'mobileConnectionStatus';
        indicator.className = `mobile-connection-status ${status}`;
        
        switch (status) {
            case 'connecting':
                indicator.textContent = 'Connecting...';
                indicator.className += ' connecting';
                break;
            case 'connected':
                indicator.textContent = 'Connected';
                indicator.className += ' connected';
                break;
            case 'disconnected':
                indicator.textContent = 'Disconnected';
                indicator.className += ' disconnected';
                break;
        }
        
        if (!indicator.parentNode) {
            document.body.appendChild(indicator);
        }
        
        // Auto-hide after 3 seconds for success states
        if (status === 'connected') {
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0';
                    setTimeout(() => {
                        if (indicator.parentNode) {
                            indicator.parentNode.removeChild(indicator);
                        }
                    }, 300);
                }
            }, 3000);
        }
    }

    // 14. Mobile Debug Helper
    debugMobileState() {
        if (!this.isMobileDevice()) return;
        
        console.log('📱 Mobile Debug State:');
        console.log('- Is Mobile:', this.isMobile);
        console.log('- Mobile Nav State:', this.mobileNavState);
        console.log('- Viewport Size:', window.innerWidth, 'x', window.innerHeight);
        console.log('- Visual Viewport:', window.visualViewport?.width, 'x', window.visualViewport?.height);
        console.log('- Active Chat User:', this.activeChatUser);
        console.log('- Chat Area Active:', document.querySelector('.chat-area.active') !== null);
        console.log('- Sidebar Chat Open:', document.querySelector('.sidebar.chat-open') !== null);
    }

    // 15. Mobile Initialization
    initializeMobileFeatures() {
        if (!this.isMobileDevice()) return;
        
        console.log('📱 Initializing mobile features');
        
        // Initialize mobile state
        this.initializeMobileState();
        
        // Handle safe areas
        this.handleMobileSafeArea();
        
        // Initialize touch gestures
        this.initializeMobileTouchGestures();
        
        // Listen for viewport changes (keyboard)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.adjustForMobileKeyboard();
            });
        }
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleMobileOrientationChange();
            }, 100);
        });
        
        // Enhanced message input for mobile
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.handleMobileMessageInput(messageInput);
            });
        }
        
        console.log('✅ Mobile features initialized');
    }

        // 16. Mobile-Specific Notification for Call Features
    showMobileNotification(message, type = 'info') {
        console.log('📱 Mobile notification:', message, type);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = type === 'error' ? '#ff4444' : 
                                            type === 'success' ? '#44bb44' : '#4267B2';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '600';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '300px';
        notification.style.textAlign = 'center';
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
        
        // Add haptic feedback
        this.provideMobileHapticFeedback('light');
    }

    // 17. Mobile Voice Call Handler
    handleMobileVoiceCall() {
        console.log('📱 Mobile voice call button clicked');
        this.showMobileNotification('Voice calling feature coming soon!', 'info');
    }

    // 18. Mobile Video Call Handler  
    handleMobileVideoCall() {
        console.log('📱 Mobile video call button clicked');
        this.showMobileNotification('Video calling feature coming soon!', 'info');
    }
    //End Mobile Function
    

    openChatInterface(peerId, username, avatar) {
        if (this.isMobileDevice()) {
            this.openMobileChatInterface(peerId, username, avatar);
        } else {
        this.activeChatUser = { peerId, username, avatar };
        
        // Update chat header
        const chatAvatar = document.getElementById('chatAvatar');
        const chatUserName = document.getElementById('chatUserName');
        
        if (chatAvatar) chatAvatar.textContent = avatar;
        if (chatUserName) chatUserName.textContent = username;

        // Show chat interface
        const welcomeState = document.getElementById('welcomeState');
        const chatInterface = document.getElementById('chatInterface');
        
        if (welcomeState) welcomeState.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';

        // Clear previous messages
        this.clearMessages();
        
        // Focus message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }
    }
    }

    closeChatInterface() {
        this.activeChatUser = null;
        
        const welcomeState = document.getElementById('welcomeState');
        const chatInterface = document.getElementById('chatInterface');
        
        if (welcomeState) welcomeState.style.display = 'flex';
        if (chatInterface) chatInterface.style.display = 'none';

        // Remove active state from user items
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !this.activeChatUser) return;
    
        const message = messageInput.value.trim();
        if (!message && !this.selectedFile) return;
    
        const connection = this.connections.get(this.activeChatUser.peerId);
        if (!connection || !connection.open) {
            this.showNotification('No active connection. Please reconnect.', 'error');
            return;
        }
    
        // Handle file sending
        if (this.selectedFile) {
            this.sendFileSimple(this.selectedFile, connection, message);
        } else {
            // Handle text message
            const messageData = {
                type: 'message',
                content: message,
                timestamp: Date.now(),
                sender: this.currentUsername,
                avatar: this.currentAvatar
            };
    
            try {
                connection.send(messageData);
                this.displayMessage(messageData, 'outgoing');
            } catch (error) {
                this.showNotification('Failed to send message', 'error');
            }
        }
    
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        this.removeFilePreview();
    }

        // Simple and reliable file sending
    sendFileSimple(file, connection, message = '') {
        console.log(`📤 Sending file: ${file.name}, size: ${file.size} bytes`);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            
            // Convert to Base64 for reliable transmission
            const uint8Array = new Uint8Array(arrayBuffer);
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
            }
            const base64Data = btoa(binaryString);
            
            const fileData = {
                type: 'file_transfer',
                filename: file.name,
                filetype: file.type,
                filesize: file.size,
                filedata: base64Data,
                message: message,
                timestamp: Date.now(),
                sender: this.currentUsername,
                avatar: this.currentAvatar
            };
            
            try {
                connection.send(fileData);
                console.log('✅ File sent successfully');
                this.showNotification(`File sent: ${file.name}`, 'success');
                
                // Show in sender's chat
                const displayData = {
                    type: 'file',
                    filename: file.name,
                    filetype: file.type,
                    filesize: file.size,
                    content: message,
                    timestamp: Date.now(),
                    sender: this.currentUsername,
                    avatar: this.currentAvatar
                };
                this.displayFileMessage(displayData, 'outgoing');
                
            } catch (error) {
                console.error('Error sending file:', error);
                this.showNotification('Failed to send file', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('Error reading file', 'error');
        };
        
        reader.readAsArrayBuffer(file);
    }

    

        // New method to send files in chunks
        // Enhanced sendFileInChunks method
        // Fixed sendFileInChunks method
        // FIXED - Base64 encoding for reliable transmission
    sendFileInChunks(file, connection, message = '') {
        const CHUNK_SIZE = 8192; // Smaller chunks for better reliability
        let offset = 0;
        let chunkIndex = 0;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        console.log(`📤 Starting file transfer: ${file.name}, size: ${file.size} bytes, chunks: ${totalChunks}`);
        this.showNotification(`Sending file: ${file.name}...`, 'info');

        const sendNextChunk = () => {
            if (offset >= file.size) {
                console.log('✅ All chunks sent successfully');
                this.showNotification(`File sent: ${file.name}`, 'success');
                
                // Display file message in sender's chat
                const fileMessageData = {
                    type: 'file',
                    filename: file.name,
                    filetype: file.type,
                    filesize: file.size,
                    content: message,
                    timestamp: Date.now(),
                    sender: this.currentUsername,
                    avatar: this.currentAvatar
                };
                this.displayFileMessage(fileMessageData, 'outgoing');
                return;
            }

            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const reader = new FileReader();

            reader.onload = (e) => {
                // Convert ArrayBuffer to Base64 string
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64String = btoa(binary);
                
                const chunkData = {
                    type: 'file_chunk',
                    chunk: base64String, // Send as Base64 string
                    chunkSize: arrayBuffer.byteLength, // Store original size
                    chunkIndex: chunkIndex,
                    totalChunks: totalChunks,
                    filename: file.name,
                    filetype: file.type,
                    filesize: file.size,
                    message: message,
                    timestamp: Date.now(),
                    sender: this.currentUsername,
                    avatar: this.currentAvatar,
                    isLast: (chunkIndex === totalChunks - 1)
                };

                try {
                    connection.send(chunkData);
                    console.log(`📦 Sent chunk ${chunkIndex + 1}/${totalChunks} (${arrayBuffer.byteLength} bytes)`);

                    chunkIndex++;
                    offset += CHUNK_SIZE;
                    
                    // Small delay to prevent overwhelming
                    setTimeout(sendNextChunk, 50);
                } catch (error) {
                    console.error('Error sending chunk:', error);
                    this.showNotification('Failed to send file chunk', 'error');
                }
            };

            reader.readAsArrayBuffer(chunk);
        };

        sendNextChunk();
    }


    handleIncomingData(peerId, data) {
        if (this.debugMode) {
            console.log('🔍 DEBUG: Incoming data type:', data.type);
        }
        
        console.log('📨 Processing incoming data from:', peerId, data.type);
        
        switch (data.type) {
            case 'file_transfer':
                console.log('📎 Received file transfer:', data.filename);
                this.handleFileTransfer(peerId, data);
                break;
                
            case 'message':
                this.displayMessage(data, 'incoming');
                this.playNotificationSound();
                break;
                
            case 'connection_request':
                this.handleConnectionRequest(data);
                break;
                
            case 'connection_accepted':
                console.log('🎉 Connection request accepted!');
                this.showNotification(`${data.accepter.username} accepted your connection request!`, 'success');
                this.openChatInterface(data.accepter.peerId, data.accepter.username, data.accepter.avatar);
                break;
                
            case 'connection_declined':
                console.log('❌ Connection request declined');
                this.showNotification(`${data.decliner?.username || 'User'} declined your connection request`, 'info');
                break;
                
            case 'typing':
                this.showTypingIndicator(data.username);
                break;
                
            case 'stop-typing':
                this.hideTypingIndicator();
                break;
                
            default:
                console.log('❓ Unknown data type:', data.type, data);
        }
    }
    
        // Handle complete file transfer
    handleFileTransfer(peerId, data) {
        try {
            console.log(`📥 Processing file: ${data.filename}, size: ${data.filesize} bytes`);
            
            // Convert Base64 back to ArrayBuffer
            const binaryString = atob(data.filedata);
            const arrayBuffer = new ArrayBuffer(binaryString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }
            
            // Create blob
            const blob = new Blob([uint8Array], { type: data.filetype });
            const fileUrl = URL.createObjectURL(blob);
            
            console.log(`✅ File reconstructed: ${blob.size} bytes`);
            
            // Create file data for display
            const fileData = {
                type: 'file',
                filename: data.filename,
                filetype: data.filetype,
                filesize: blob.size,
                fileUrl: fileUrl,
                content: data.message,
                timestamp: data.timestamp,
                sender: data.sender,
                avatar: data.avatar
            };
            
            // Display file message
            this.displayFileMessage(fileData, 'incoming');
            this.showNotification(`File received: ${data.filename}`, 'success');
            this.playNotificationSound();
            
        } catch (error) {
            console.error('❌ Error processing file:', error);
            this.showNotification('Error receiving file', 'error');
        }
    }

    
    // Enhanced file chunk handling method
    // FIXED - Base64 decoding for file reconstruction
    handleFileChunk(peerId, data) {
        const transferId = `${peerId}_${data.filename}_${data.timestamp}`;
        
        // Initialize file transfer tracking if not exists
        if (!this.fileTransfers.has(transferId)) {
            this.fileTransfers.set(transferId, {
                chunks: new Array(data.totalChunks),
                receivedChunks: 0,
                expectedChunks: data.totalChunks,
                filename: data.filename,
                filetype: data.filetype,
                filesize: data.filesize,
                message: data.message,
                timestamp: data.timestamp,
                sender: data.sender,
                avatar: data.avatar
            });
            
            console.log(`📥 Starting file transfer: ${data.filename} (${this.formatFileSize(data.filesize)})`);
            this.showNotification(`Receiving file: ${data.filename}...`, 'info');
        }

        const transfer = this.fileTransfers.get(transferId);
        
        // Convert Base64 string back to ArrayBuffer
        if (!transfer.chunks[data.chunkIndex]) {
            try {
                const base64String = data.chunk;
                const binaryString = atob(base64String);
                const arrayBuffer = new ArrayBuffer(binaryString.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                
                transfer.chunks[data.chunkIndex] = arrayBuffer;
                transfer.receivedChunks++;
                
                console.log(`📦 Received chunk ${data.chunkIndex + 1}/${transfer.expectedChunks} - Size: ${arrayBuffer.byteLength} bytes`);
                
                // Show progress
                const progress = Math.round((transfer.receivedChunks / transfer.expectedChunks) * 100);
                console.log(`📊 Progress: ${transfer.receivedChunks}/${transfer.expectedChunks} chunks (${progress}%)`);
            } catch (error) {
                console.error('Error decoding chunk:', error);
                return;
            }
        }

        // Check if all chunks received
        if (data.isLast || transfer.receivedChunks === transfer.expectedChunks) {
            console.log('✅ All chunks received, reconstructing file...');
            this.reconstructFile(transferId, transfer);
        }
    }

        

    // Enhanced file reconstruction method
    // FIXED - Simple and reliable file reconstruction
    reconstructFile(transferId, transfer) {
        try {
            console.log('🔧 Reconstructing file:', transfer.filename);
            
            // Check all chunks are present
            for (let i = 0; i < transfer.expectedChunks; i++) {
                if (!transfer.chunks[i]) {
                    throw new Error(`Missing chunk ${i}`);
                }
            }

            // Calculate total size and create combined buffer
            let totalSize = 0;
            for (let i = 0; i < transfer.chunks.length; i++) {
                totalSize += transfer.chunks[i].byteLength;
            }
            
            const combined = new Uint8Array(totalSize);
            let offset = 0;
            
            for (let i = 0; i < transfer.chunks.length; i++) {
                const chunk = new Uint8Array(transfer.chunks[i]);
                combined.set(chunk, offset);
                offset += chunk.length;
            }

            console.log(`📏 File reconstructed: ${combined.length} bytes (expected: ${transfer.filesize})`);

            // Create blob
            const blob = new Blob([combined], { type: transfer.filetype });
            const fileUrl = URL.createObjectURL(blob);
            
            console.log(`✅ Blob created: ${blob.size} bytes`);

            // Create file data for display
            const fileData = {
                type: 'file',
                filename: transfer.filename,
                filetype: transfer.filetype,
                filesize: blob.size,
                fileUrl: fileUrl,
                content: transfer.message,
                timestamp: transfer.timestamp,
                sender: transfer.sender,
                avatar: transfer.avatar
            };

            // Display file message
            this.displayFileMessage(fileData, 'incoming');
            this.showNotification(`File received: ${transfer.filename} (${this.formatFileSize(blob.size)})`, 'success');
            this.playNotificationSound();

            // Clean up
            this.fileTransfers.delete(transferId);
            
        } catch (error) {
            console.error('❌ Error reconstructing file:', error);
            this.showNotification(`Error receiving file: ${transfer.filename}`, 'error');
            this.fileTransfers.delete(transferId);
        }
    }


        // Initialize file transfer when metadata is received
    initializeFileTransfer(peerId, metadata) {
        const transferId = `${peerId}_${metadata.fileId}`;
        
        console.log(`📥 Initializing file transfer: ${metadata.filename} (${this.formatFileSize(metadata.filesize)})`);
        
        this.fileTransfers.set(transferId, {
            fileId: metadata.fileId,
            chunks: new Array(metadata.totalChunks).fill(null),
            receivedChunks: 0,
            expectedChunks: metadata.totalChunks,
            filename: metadata.filename,
            filetype: metadata.filetype,
            filesize: metadata.filesize,
            message: metadata.message,
            timestamp: metadata.timestamp,
            sender: metadata.sender,
            avatar: metadata.avatar
        });
        
        this.showNotification(`Receiving file: ${metadata.filename}...`, 'info');
    }

    // Enhanced file chunk handling
    handleFileChunk(peerId, data) {
        const transferId = `${peerId}_${data.fileId}`;
        const transfer = this.fileTransfers.get(transferId);
        
        if (!transfer) {
            console.error('❌ No transfer found for:', transferId);
            return;
        }
        
        // Store chunk in correct position
        if (transfer.chunks[data.chunkIndex] === null) {
            transfer.chunks[data.chunkIndex] = data.chunk;
            transfer.receivedChunks++;
            
            console.log(`📦 Stored chunk ${data.chunkIndex + 1}/${transfer.expectedChunks} - Size: ${data.chunk.byteLength} bytes`);
            
            // Show progress
            const progress = Math.round((transfer.receivedChunks / transfer.expectedChunks) * 100);
            console.log(`📊 Progress: ${transfer.receivedChunks}/${transfer.expectedChunks} chunks (${progress}%)`);
        }

        // Check if all chunks received
        if (transfer.receivedChunks === transfer.expectedChunks) {
            console.log('✅ All chunks received, reconstructing file...');
            this.reconstructAndDisplayFile(transferId, transfer);
        }
    }

    

        // Add this method for debugging
    debugFileTransfer(transferId, transfer) {
        console.group(`🔍 Debug File Transfer: ${transfer.filename}`);
        console.log('Transfer ID:', transferId);
        console.log('Expected chunks:', transfer.expectedChunks);
        console.log('Received chunks:', transfer.receivedChunks);
        console.log('Chunks array length:', transfer.chunks.length);
        
        // Check each chunk
        for (let i = 0; i < transfer.chunks.length; i++) {
            const chunk = transfer.chunks[i];
            if (chunk) {
                console.log(`Chunk ${i}:`, {
                    type: chunk.constructor.name,
                    size: chunk.byteLength || chunk.length,
                    isArrayBuffer: chunk instanceof ArrayBuffer,
                    isUint8Array: chunk instanceof Uint8Array
                });
            } else {
                console.log(`Chunk ${i}: undefined`);
            }
        }
        console.groupEnd();
    }

    

    // Method to display file messages in chat
    displayFileMessage(fileData, direction) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
    
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', direction, 'file-message');
        
        const fileIcon = this.getFileIcon(fileData.filetype);
        const formattedSize = this.formatFileSize(fileData.filesize);
        
        let content = `
            <div class="file-message-container">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${fileData.filename}">${fileData.filename}</div>
                    <div class="file-details">${formattedSize}</div>
                </div>
                <div class="file-actions">
                    ${fileData.fileUrl ? `<a href="${fileData.fileUrl}" target="_blank" download="${fileData.filename}" class="file-open-btn">📂 Open</a>` : '<span class="file-open-btn">📂 Sent</span>'}
                </div>
            </div>
            ${fileData.content ? `<div class="message-text">${this.escapeHtml(fileData.content)}</div>` : ''}
            <div class="message-time">${this.formatTime(fileData.timestamp)}</div>
        `;
    
        messageElement.innerHTML = content;
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
    

    // Method to open received files
        // Enhanced method to open received files with better cross-browser support
    openReceivedFile(fileUrl, filename, filetype) {
        console.log('📂 Opening file:', filename, filetype);
        
        if (!fileUrl) {
            this.showNotification('File not available', 'error');
            return;
        }

        try {
            // Create temporary link element
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = fileUrl;
            
            // Set filename for download
            downloadLink.download = filename;
            
            // Add to document
            document.body.appendChild(downloadLink);
            
            // Handle different file types with multiple fallback methods
            if (filetype.startsWith('image/') || 
                filetype.startsWith('video/') || 
                filetype.startsWith('audio/') ||
                filetype === 'application/pdf' ||
                filetype.startsWith('text/')) {
                
                // Method 1: Try opening in new tab with proper attributes
                try {
                    const newTab = window.open();
                    if (newTab) {
                        newTab.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>${filename}</title>
                                <style>
                                    body { margin: 0; padding: 0; }
                                    iframe { width: 100vw; height: 100vh; border: none; }
                                </style>
                            </head>
                            <body>
                                <iframe src="${fileUrl}"></iframe>
                            </body>
                            </html>
                        `);
                        newTab.document.close();
                        
                        this.showNotification(`Opening ${filename}`, 'success');
                        
                        // Clean up after 30 seconds
                        setTimeout(() => {
                            document.body.removeChild(downloadLink);
                            URL.revokeObjectURL(fileUrl);
                        }, 30000);
                        
                    } else {
                        // Method 2: Fallback - direct navigation with target="_blank"
                        downloadLink.target = '_blank';
                        downloadLink.rel = 'noopener noreferrer';
                        downloadLink.click();
                        
                        this.showNotification(`Opening ${filename}`, 'success');
                        
                        // Clean up
                        setTimeout(() => {
                            document.body.removeChild(downloadLink);
                            URL.revokeObjectURL(fileUrl);
                        }, 2000);
                    }
                    
                } catch (error) {
                    console.error('Failed to open in new tab, falling back to download:', error);
                    // Method 3: Force download as fallback
                    downloadLink.click();
                    this.showNotification(`Downloaded ${filename}`, 'info');
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(fileUrl);
                    }, 2000);
                }
                
            } else {
                // For other file types, always download
                downloadLink.click();
                this.showNotification(`Downloaded ${filename}`, 'success');
                
                // Clean up
                setTimeout(() => {
                    document.body.removeChild(downloadLink);
                    URL.revokeObjectURL(fileUrl);
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error opening file:', error);
            this.showNotification('Error opening file', 'error');
            
            // Try simple download as last resort
            try {
                const simpleLink = document.createElement('a');
                simpleLink.href = fileUrl;
                simpleLink.download = filename;
                simpleLink.click();
            } catch (fallbackError) {
                console.error('All methods failed:', fallbackError);
            }
        }
    }


    // Helper method to get file icon based on type
    getFileIcon(filetype) {
        if (filetype.startsWith('image/')) return '🖼️';
        if (filetype.startsWith('video/')) return '🎥';
        if (filetype.startsWith('audio/')) return '🎵';
        if (filetype === 'application/pdf') return '📄';
        if (filetype.includes('text/')) return '📝';
        if (filetype.includes('zip') || filetype.includes('rar')) return '🗂️';
        return '📎';
    }

    // Enhanced formatFileSize method
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    

    displayMessage(messageData, direction) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', direction);
        
        let content = `
            <div class="message-content">${this.escapeHtml(messageData.content)}</div>
            <div class="message-time">${this.formatTime(messageData.timestamp)}</div>
        `;

        if (messageData.file) {
            content = `
                <div class="message-file">
                    <div class="file-icon-container">
                        <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${messageData.file.name}</div>
                        <div class="file-size">${this.formatFileSize(messageData.file.size)}</div>
                    </div>
                </div>
                ${messageData.content ? `<div class="message-content">${this.escapeHtml(messageData.content)}</div>` : ''}
                <div class="message-time">${this.formatTime(messageData.timestamp)}</div>
            `;
        }

        messageElement.innerHTML = content;
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    handleTyping() {
        if (!this.activeChatUser) return;

        const connection = this.connections.get(this.activeChatUser.peerId);
        if (!connection || !connection.open) return;

        // Send typing indicator
        connection.send({
            type: 'typing',
            username: this.currentUsername
        });

        // Clear previous timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set timeout to stop typing
        this.typingTimeout = setTimeout(() => {
            connection.send({
                type: 'stop-typing'
            });
        }, 2000);
    }

    showTypingIndicator(username) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            typingIndicator.querySelector('span').textContent = `${username} is typing...`;
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.hideTypingIndicator();
            }, 3000);
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    handleFileSelection(file) {
        // Validate file size (max 50MB for better compatibility)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            this.showNotification('File size must be less than 50MB', 'error');
            return;
        }
    
        this.selectedFile = file;
        this.showFilePreview(file);
    }

        // Alternative: Update displayFileMessage to use direct click approach
    displayFileMessage(fileData, direction) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', direction, 'file-message');
        
        const fileIcon = this.getFileIcon(fileData.filetype);
        const formattedSize = this.formatFileSize(fileData.filesize);
        
        let content = `
            <div class="file-message-container">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${fileData.filename}">${fileData.filename}</div>
                    <div class="file-details">${formattedSize} • ${fileData.filetype}</div>
                </div>
                <div class="file-actions">
                    <a href="${fileData.fileUrl}" 
                    target="_blank" 
                    download="${fileData.filename}"
                    class="file-open-btn"
                    onclick="app.trackFileOpen('${fileData.filename}')"
                    title="Click to open/download file">
                        📂 Open
                    </a>
                </div>
            </div>
            ${fileData.content ? `<div class="message-text">${this.escapeHtml(fileData.content)}</div>` : ''}
            <div class="message-time">${this.formatTime(fileData.timestamp)}</div>
        `;

        messageElement.innerHTML = content;
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    // Add tracking method
    trackFileOpen(filename) {
        console.log('📂 User opened file:', filename);
        this.showNotification(`Opening ${filename}`, 'info');
    }

    

    reconstructAndDisplayFile(transferId, transfer) {
        try {
            console.log('🔧 Reconstructing file:', transfer.filename);
            
            // Filter out any undefined chunks and convert to Uint8Array
            const validChunks = transfer.chunks
                .filter(chunk => chunk !== undefined)
                .map(chunk => {
                    if (chunk instanceof ArrayBuffer) {
                        return new Uint8Array(chunk);
                    } else if (chunk instanceof Uint8Array) {
                        return chunk;
                    } else {
                        // Handle other formats if needed
                        console.warn('Unexpected chunk format:', typeof chunk);
                        return new Uint8Array();
                    }
                });
    
            // Calculate total size
            const totalSize = validChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            console.log(`📏 Total file size: ${totalSize} bytes`);
    
            // Combine all chunks
            const combined = new Uint8Array(totalSize);
            let offset = 0;
            
            for (const chunk of validChunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
    
            // Create blob
            const blob = new Blob([combined], { type: transfer.filetype });
            const fileUrl = URL.createObjectURL(blob);
    
            console.log('✅ File reconstructed successfully:', transfer.filename);
    
            // Create file data for display
            const fileData = {
                type: 'file',
                filename: transfer.filename,
                filetype: transfer.filetype,
                filesize: transfer.filesize,
                fileUrl: fileUrl,
                content: transfer.message,
                timestamp: transfer.timestamp,
                sender: transfer.sender,
                avatar: transfer.avatar
            };
    
            // Display file message in chat
            this.displayFileMessage(fileData, 'incoming');
            this.showNotification(`File received: ${transfer.filename}`, 'success');
            this.playNotificationSound();
    
            // Clean up transfer data
            this.fileTransfers.delete(transferId);
            
        } catch (error) {
            console.error('❌ Error reconstructing file:', error);
            this.showNotification(`Error receiving file: ${transfer.filename}`, 'error');
            this.fileTransfers.delete(transferId);
        }
    }
    
    openReceivedFile(fileUrl, filename, filetype) {
        console.log('📂 Opening file:', filename, filetype);
        
        if (!fileUrl) {
            this.showNotification('File not available', 'error');
            return;
        }
    
        try {
            // For viewable files, open in new tab
            if (filetype.startsWith('image/') || 
                filetype.startsWith('video/') || 
                filetype.startsWith('audio/') ||
                filetype === 'application/pdf' ||
                filetype.startsWith('text/')) {
                
                window.open(fileUrl, '_blank');
                this.showNotification(`Opening ${filename}`, 'success');
                
            } else {
                // For other files, trigger download
                const downloadLink = document.createElement('a');
                downloadLink.href = fileUrl;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                this.showNotification(`Downloading ${filename}`, 'success');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            this.showNotification('Error opening file', 'error');
        }
    }
    

    // Method to open received files
    openFile(fileUrl, filename, filetype) {
        if (!fileUrl) {
            this.showNotification('File not available', 'error');
            return;
        }

        try {
            // For images, videos, and PDFs, open in new tab
            if (filetype.startsWith('image/') || 
                filetype.startsWith('video/') || 
                filetype === 'application/pdf') {
                window.open(fileUrl, '_blank');
            } else {
                // For other files, trigger download
                const downloadLink = document.createElement('a');
                downloadLink.href = fileUrl;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
            
            this.showNotification(`Opening ${filename}`, 'success');
        } catch (error) {
            console.error('Error opening file:', error);
            this.showNotification('Error opening file', 'error');
        }
    }

    // Helper method to get file icon based on type
    getFileIcon(filetype) {
        if (filetype.startsWith('image/')) return '🖼️';
        if (filetype.startsWith('video/')) return '🎥';
        if (filetype.startsWith('audio/')) return '🎵';
        if (filetype === 'application/pdf') return '📄';
        if (filetype.includes('text/')) return '📝';
        if (filetype.includes('zip') || filetype.includes('rar')) return '🗂️';
        return '📎';
    }

    // Enhanced formatFileSize method
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }


    showFilePreview(file) {
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (filePreview && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            filePreview.style.display = 'flex';
        }
    }

    removeFilePreview() {
        this.selectedFile = null;
        const filePreview = document.getElementById('filePreview');
        if (filePreview) {
            filePreview.style.display = 'none';
        }
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    showMainApp() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const appContainer = document.getElementById('appContainer');
        
        if (welcomeScreen && appContainer) {
            welcomeScreen.style.display = 'none';
            appContainer.style.display = 'flex';
        }

        // Update current user display
        const currentUserName = document.getElementById('currentUserName');
        const currentUserAvatar = document.getElementById('currentUserAvatar');
        
        if (currentUserName) currentUserName.textContent = this.currentUsername;
        if (currentUserAvatar) currentUserAvatar.textContent = this.currentAvatar;
    }

    startHeartbeat() {
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);
    }

    async sendHeartbeat() {
        if (!this.peer?.id) return;

        try {
            await fetch('/heartbeat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    peerId: this.peer.id,
                    activity: 'active'
                })
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    startDiscovery() {
        // Discover users immediately
        this.discoverNearbyUsers();
        
        // Then discover every 10 seconds
        this.discoveryInterval = setInterval(() => {
            this.discoverNearbyUsers();
        }, 10000);
    }

    refreshUsers() {
        const refreshBtn = document.getElementById('refreshUsers');
        if (refreshBtn) {
            // Add visual feedback
            refreshBtn.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 300);
        }

        this.discoverNearbyUsers();
        this.showNotification('Users list refreshed', 'info');
    }

    filterUsers(query) {
        const userItems = document.querySelectorAll('.user-item');
        const searchQuery = query.toLowerCase();

        userItems.forEach(item => {
            const username = item.querySelector('.user-name')?.textContent.toLowerCase() || '';
            const distance = item.querySelector('.user-distance')?.textContent.toLowerCase() || '';
            
            if (username.includes(searchQuery) || distance.includes(searchQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateUsersCount(count) {
        const usersCount = document.getElementById('usersCount');
        if (usersCount) {
            usersCount.textContent = count.toString();
        }
    }

    showSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('show');
            
            // Load current settings
            const rangeSelect = document.getElementById('rangeSelect');
            const soundNotifications = document.getElementById('soundNotifications');
            const autoAcceptFiles = document.getElementById('autoAcceptFiles');
            
            if (rangeSelect) rangeSelect.value = this.settings.discoveryRange;
            if (soundNotifications) soundNotifications.checked = this.settings.soundNotifications;
            if (autoAcceptFiles) autoAcceptFiles.checked = this.settings.autoAcceptFiles;
        }
    }

    hideSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('show');
        }
    }

    updateDiscoveryRange(range) {
        this.settings.discoveryRange = range;
        this.saveSettings();
        this.discoverNearbyUsers();
        this.showNotification(`Discovery range updated to ${this.formatDistance(range)}`, 'info');
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('lettalky-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('lettalky-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    handleVoiceCall() {
        console.log('🎤 Voice call button clicked, mobile:', this.isMobileDevice());
        
        if (this.isMobileDevice()) {
            this.handleMobileVoiceCall();
        } else {
            this.showNotification('Voice calling feature coming soon!', 'info');
        }
    }

    handleVideoCall() {
        console.log('📹 Video call button clicked, mobile:', this.isMobileDevice());
        
        if (this.isMobileDevice()) {
            this.handleMobileVideoCall();
        } else {
            this.showNotification('Video calling feature coming soon!', 'info');
        }
    }

    showNotification(message, type = 'info', duration = 4000) { if (this.isMobileDevice()) {
        this.showMobileNotification(message, type);
    } else {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
    
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        
        if (type === 'conversation-request') {
            notification.innerHTML = message; // HTML content for conversation requests
            notification.classList.add('conversation-request');
        } else {
            notification.textContent = message;
        }
    
        container.appendChild(notification);
    
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    }
    

    playNotificationSound() {
        if (!this.settings.soundNotifications) return;

        try {
            // Create a simple notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
        textarea.style.height = newHeight + 'px';
    }

    addInputFocus() {
        const inputContainer = document.querySelector('.message-input-wrapper');
        if (inputContainer) {
            inputContainer.classList.add('focused');
        }
    }

    removeInputFocus() {
        const inputContainer = document.querySelector('.message-input-wrapper');
        if (inputContainer) {
            inputContainer.classList.remove('focused');
        }
    }

    shakeElement(element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    clearMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showNotification('Connection failed. Please refresh the page.', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

        setTimeout(async () => {
            try {
                if (this.peer && !this.peer.open) {
                    this.peer.reconnect();
                } else {
                    await this.initializePeer();
                }
                this.reconnectAttempts = 0;
                this.showNotification('Reconnected successfully!', 'success');
            } catch (error) {
                console.error('Reconnection failed:', error);
                this.attemptReconnection();
            }
        }, delay);
    }

    updateUserStatus(peerId, status) {
        const userItem = document.querySelector(`[data-peer-id="${peerId}"]`);
        if (userItem) {
            const statusDot = userItem.querySelector('.status-dot');
            if (statusDot) {
                statusDot.classList.toggle('active', status === 'online');
            }
        }
    }

    handleResize() {
        // Handle responsive adjustments
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && this.activeChatUser) {
            // On mobile, hide sidebar when in chat
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
            }
        } else {
            // Show sidebar on desktop or when not in chat
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.style.display = 'flex';
            }
        }
    }

    cleanup() {
        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Close connections
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.close();
            }
        });

        // Close peer
        if (this.peer) {
            this.peer.destroy();
        }

        console.log('🧹 LetTalky cleaned up');
    }

    // Utility methods
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
const app = new LetTalkyApp();

// Make app globally accessible for HTML onclick handlers
window.app = app;

