const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://unpkg.com"],
            connectSrc: ["'self'", "wss:", "ws:"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));

// Enhanced rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Increased for better UX
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute for registration
    message: {
        error: 'Too many registration attempts, please wait a minute.'
    }
});

app.use(limiter);
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

app.use(express.json({
    limit: '2mb' // Increased for file metadata
}));

// In-memory store for peers with enhanced data structure
const peers = new Map();
const userSessions = new Map();
const connectionStats = {
    totalConnections: 0,
    activeUsers: 0,
    messagesExchanged: 0
};

// Enhanced constants
const PEER_TIMEOUT = 8 * 60 * 1000; // 8 minutes
const MAX_PEERS_PER_USER = 100; // Increased limit
const DEFAULT_RANGE = 5000; // 5km default range
const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;

// Serve static files with caching
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));

// Enhanced peer registration with comprehensive validation
app.post('/register', strictLimiter, async (req, res) => {
    try {
        const { peerId, username, avatar, location } = req.body;

        // Comprehensive validation
        if (!peerId || typeof peerId !== 'string' || peerId.length < 10) {
            return res.status(400).json({
                error: 'Invalid peer ID format'
            });
        }

        if (!username || typeof username !== 'string') {
            return res.status(400).json({
                error: 'Username is required'
            });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < MIN_USERNAME_LENGTH || trimmedUsername.length > MAX_USERNAME_LENGTH) {
            return res.status(400).json({
                error: `Username must be between ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters`
            });
        }

        // Validate username characters (alphanumeric, spaces, some special chars)
        if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedUsername)) {
            return res.status(400).json({
                error: 'Username contains invalid characters'
            });
        }

        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return res.status(400).json({
                error: 'Valid location coordinates are required'
            });
        }

        // Validate coordinates are within valid ranges
        if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
            return res.status(400).json({
                error: 'Invalid coordinate values'
            });
        }

        // Validate avatar (basic emoji check)
        if (!avatar || typeof avatar !== 'string' || avatar.length > 10) {
            return res.status(400).json({
                error: 'Invalid avatar format'
            });
        }

        // Check for duplicate usernames in nearby area (1km radius)
        const existingPeer = Array.from(peers.values()).find(p =>
            p.username.toLowerCase() === trimmedUsername.toLowerCase() &&
            p.peerId !== peerId &&
            calculateDistance(p.location, location) < 1000 // 1km
        );

        if (existingPeer) {
            return res.status(409).json({
                error: 'Username already taken in this area. Please choose a different one.'
            });
        }

        const now = Date.now();
        const existingPeerData = peers.get(peerId);

        // Store enhanced peer data
        const peerData = {
            peerId,
            username: trimmedUsername,
            avatar,
            location: {
                latitude: parseFloat(location.latitude.toFixed(6)),
                longitude: parseFloat(location.longitude.toFixed(6)),
                accuracy: location.accuracy || 1000
            },
            lastSeen: now,
            joinedAt: existingPeerData?.joinedAt || now,
            messageCount: existingPeerData?.messageCount || 0,
            connectionsCount: existingPeerData?.connectionsCount || 0,
            ip: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown',
            status: 'online'
        };

        peers.set(peerId, peerData);

        // Update stats
        if (!existingPeerData) {
            connectionStats.totalConnections++;
        }

        // Cleanup old peers
        cleanupOldPeers();

        console.log(`✅ User registered: ${trimmedUsername} (${peerId.substr(0, 8)}...)`);

        res.json({
            success: true,
            peersCount: peers.size,
            message: 'Successfully registered with LetTalky',
            serverTime: now
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            error: 'Internal server error during registration'
        });
    }
});

// Enhanced peer discovery with advanced filtering and sorting
app.get('/peers', async (req, res) => {
    try {
        const { peerId, range = DEFAULT_RANGE } = req.query;

        if (!peerId) {
            return res.status(400).json({
                error: 'peerId query parameter is required'
            });
        }

        const requester = peers.get(peerId);
        if (!requester) {
            return res.status(404).json({
                error: 'Peer not found. Please register first.'
            });
        }

        const searchRange = Math.min(parseInt(range) || DEFAULT_RANGE, 50000); // Max 50km
        const now = Date.now();
        const nearbyPeers = [];

        for (const [id, peer] of peers.entries()) {
            if (id === peerId) continue;
            if (now - peer.lastSeen > PEER_TIMEOUT) continue;

            const distance = calculateDistance(requester.location, peer.location);
            if (distance <= searchRange) {
                const timeSinceLastSeen = now - peer.lastSeen;
                nearbyPeers.push({
                    peerId: peer.peerId,
                    username: peer.username,
                    avatar: peer.avatar,
                    location: peer.location,
                    distance: Math.round(distance),
                    lastSeen: peer.lastSeen,
                    isActive: timeSinceLastSeen < 60000, // Active in last minute
                    status: timeSinceLastSeen < 30000 ? 'online' : 'away',
                    joinedAt: peer.joinedAt
                });
            }
        }

        // Enhanced sorting: active users first, then by distance, then by join time
        nearbyPeers.sort((a, b) => {
            // First priority: active status
            if (a.isActive !== b.isActive) {
                return b.isActive - a.isActive;
            }
            // Second priority: distance
            if (Math.abs(a.distance - b.distance) > 100) { // 100m threshold
                return a.distance - b.distance;
            }
            // Third priority: newer users first (more likely to be responsive)
            return b.joinedAt - a.joinedAt;
        });

        const limitedPeers = nearbyPeers.slice(0, MAX_PEERS_PER_USER);

        res.json({
            peers: limitedPeers,
            total: nearbyPeers.length,
            searchRange,
            timestamp: now,
            serverStats: {
                totalUsers: peers.size,
                activeUsers: Array.from(peers.values()).filter(p =>
                    now - p.lastSeen < 60000
                ).length
            }
        });

    } catch (error) {
        console.error('❌ Peer discovery error:', error);
        res.status(500).json({
            error: 'Failed to discover nearby users'
        });
    }
});

// Enhanced heartbeat endpoint with activity tracking
app.post('/heartbeat', async (req, res) => {
    try {
        const { peerId, activity } = req.body;

        if (!peerId) {
            return res.status(400).json({
                error: 'peerId is required'
            });
        }

        const peer = peers.get(peerId);
        if (peer) {
            const now = Date.now();
            peer.lastSeen = now;
            peer.status = 'online';

            // Track activity if provided
            if (activity) {
                peer.lastActivity = activity;
                peer.lastActivityTime = now;
            }

            res.json({
                success: true,
                serverTime: now,
                status: 'heartbeat_received'
            });
        } else {
            res.status(404).json({
                error: 'Peer not found'
            });
        }

    } catch (error) {
        console.error('❌ Heartbeat error:', error);
        res.status(500).json({
            error: 'Heartbeat processing failed'
        });
    }
});

// User status update endpoint
app.post('/status', async (req, res) => {
    try {
        const { peerId, status } = req.body;

        if (!peerId || !status) {
            return res.status(400).json({
                error: 'peerId and status are required'
            });
        }

        const validStatuses = ['online', 'away', 'busy', 'offline'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const peer = peers.get(peerId);
        if (peer) {
            peer.status = status;
            peer.lastSeen = Date.now();

            res.json({
                success: true,
                message: `Status updated to ${status}`
            });
        } else {
            res.status(404).json({
                error: 'Peer not found'
            });
        }

    } catch (error) {
        console.error('❌ Status update error:', error);
        res.status(500).json({
            error: 'Status update failed'
        });
    }
});

// Analytics endpoint for monitoring
app.get('/analytics', (req, res) => {
    const now = Date.now();
    const activeUsers = Array.from(peers.values()).filter(p =>
        now - p.lastSeen < 60000
    );

    const locationStats = {};
    peers.forEach(peer => {
        const region = getRegionFromCoords(peer.location);
        locationStats[region] = (locationStats[region] || 0) + 1;
    });

    res.json({
        timestamp: now,
        totalRegistrations: connectionStats.totalConnections,
        currentUsers: peers.size,
        activeUsers: activeUsers.length,
        messagesExchanged: connectionStats.messagesExchanged,
        locationDistribution: locationStats,
        averageSessionTime: calculateAverageSessionTime(),
        serverUptime: process.uptime()
    });
});

// Enhanced distance calculation with error handling
function calculateDistance(loc1, loc2) {
    try {
        if (!loc1 || !loc2 ||
            typeof loc1.latitude !== 'number' || typeof loc1.longitude !== 'number' ||
            typeof loc2.latitude !== 'number' || typeof loc2.longitude !== 'number') {
            return Infinity;
        }

        // Validate coordinate bounds
        if (Math.abs(loc1.latitude) > 90 || Math.abs(loc2.latitude) > 90 ||
            Math.abs(loc1.longitude) > 180 || Math.abs(loc2.longitude) > 180) {
            return Infinity;
        }

        // Haversine formula for accurate distance calculation
        const R = 6371000; // Earth radius in meters
        const phi1 = loc1.latitude * Math.PI / 180;
        const phi2 = loc2.latitude * Math.PI / 180;
        const deltaPhi = (loc2.latitude - loc1.latitude) * Math.PI / 180;
        const deltaLambda = (loc2.longitude - loc1.longitude) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                 Math.cos(phi1) * Math.cos(phi2) *
                 Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return Math.max(0, distance); // Ensure non-negative

    } catch (error) {
        console.error('❌ Distance calculation error:', error);
        return Infinity;
    }
}

// Helper function to get region from coordinates
function getRegionFromCoords(location) {
    const { latitude, longitude } = location;
    
    // Simple region classification (can be enhanced)
    if (latitude >= 40 && latitude <= 50 && longitude >= -80 && longitude <= -70) {
        return 'Northeast US';
    } else if (latitude >= 30 && latitude <= 40 && longitude >= -120 && longitude <= -110) {
        return 'Southwest US';
    } else if (latitude >= 50 && latitude <= 60 && longitude >= -130 && longitude <= -60) {
        return 'Canada';
    } else if (latitude >= 50 && latitude <= 60 && longitude >= -10 && longitude <= 30) {
        return 'Europe';
    } else {
        return 'Other';
    }
}

// Calculate average session time
function calculateAverageSessionTime() {
    const now = Date.now();
    const sessions = Array.from(peers.values()).map(peer =>
        now - peer.joinedAt
    );

    if (sessions.length === 0) return 0;

    const totalTime = sessions.reduce((sum, time) => sum + time, 0);
    return Math.round(totalTime / sessions.length / 1000); // Return in seconds
}

// Enhanced cleanup function with detailed logging
function cleanupOldPeers() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, peer] of peers.entries()) {
        if (now - peer.lastSeen > PEER_TIMEOUT) {
            peers.delete(id);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} inactive peers. Active users: ${peers.size}`);
    }

    // Update active users count
    connectionStats.activeUsers = peers.size;
}

// Graceful cleanup on server shutdown
function gracefulShutdown() {
    console.log('👋 Server shutting down gracefully...');
    
    // Log final statistics
    console.log(`📊 Final Stats:
- Total Connections: ${connectionStats.totalConnections}
- Active Users: ${peers.size}
- Messages Exchanged: ${connectionStats.messagesExchanged}
- Uptime: ${Math.round(process.uptime())}s
`);

    process.exit(0);
}

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Enhanced periodic cleanup every 3 minutes
setInterval(cleanupOldPeers, 3 * 60 * 1000);

// Log server statistics every 10 minutes
setInterval(() => {
    const now = Date.now();
    const activeUsers = Array.from(peers.values()).filter(p =>
        now - p.lastSeen < 60000
    ).length;

    console.log(`📊 Server Stats: ${peers.size} total users, ${activeUsers} active, uptime: ${Math.round(process.uptime())}s`);
}, 10 * 60 * 1000);

// Health check endpoint with comprehensive status
app.get('/health', (req, res) => {
    const now = Date.now();
    const activeUsers = Array.from(peers.values()).filter(p =>
        now - p.lastSeen < 60000
    ).length;

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        },
        users: {
            total: peers.size,
            active: activeUsers,
            totalConnections: connectionStats.totalConnections
        },
        performance: {
            averageSessionTime: calculateAverageSessionTime(),
            messagesExchanged: connectionStats.messagesExchanged
        }
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'LetTalky API',
        version: '1.0.0',
        description: 'Proximity-based chat application API',
        endpoints: {
            'POST /register': 'Register a new peer',
            'GET /peers': 'Discover nearby peers',
            'POST /heartbeat': 'Send heartbeat to maintain connection',
            'POST /status': 'Update user status',
            'GET /health': 'Server health check',
            'GET /analytics': 'Server analytics (admin)',
            'GET /api': 'This documentation'
        },
        features: [
            'Location-based peer discovery',
            'Real-time messaging via WebRTC',
            'File sharing support',
            'User status management',
            'Automatic cleanup of inactive users'
        ]
    });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`
🚀 LetTalky Server Started Successfully!
📍 Local: http://localhost:${PORT}
🌐 Network: http://0.0.0.0:${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
⏰ Started at: ${new Date().toISOString()}
`);
});

// Handle server shutdown gracefully
server.on('close', () => {
    console.log('🛑 LetTalky server closed');
});

module.exports = server;

