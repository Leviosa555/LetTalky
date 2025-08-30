const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const http = require('http');

const app = express();

// Create HTTP server first
const server = http.createServer(app);

// Security middleware with updated CSP for PeerJS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://unpkg.com"],
      connectSrc: ["'self'", "wss:", "ws:", "*"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts, please wait a minute.' }
});

app.use(limiter);

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// In-memory store for peers
const peers = new Map();
const userSessions = new Map();
const connectionStats = {
  totalConnections: 0,
  activeUsers: 0,
  messagesExchanged: 0
};

// Constants
const PEER_TIMEOUT = 8 * 60 * 1000;
const MAX_PEERS_PER_USER = 100;
const DEFAULT_RANGE = 5000;
const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;

// Serve static files
app.use(express.static(path.join(__dirname), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true
}));

// Enhanced peer registration
app.post('/register', strictLimiter, async (req, res) => {
  try {
    const { peerId, username, avatar, location } = req.body;

    if (!peerId || typeof peerId !== 'string' || peerId.length < 10) {
      return res.status(400).json({ error: 'Invalid peer ID format' });
    }

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < MIN_USERNAME_LENGTH || trimmedUsername.length > MAX_USERNAME_LENGTH) {
      return res.status(400).json({
        error: `Username must be between ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters`
      });
    }

    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedUsername)) {
      return res.status(400).json({ error: 'Username contains invalid characters' });
    }

    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return res.status(400).json({ error: 'Valid location coordinates are required' });
    }

    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
      return res.status(400).json({ error: 'Invalid coordinate values' });
    }

    if (!avatar || typeof avatar !== 'string' || avatar.length > 10) {
      return res.status(400).json({ error: 'Invalid avatar format' });
    }

    const existingPeer = Array.from(peers.values()).find(p =>
      p.username.toLowerCase() === trimmedUsername.toLowerCase() &&
      p.peerId !== peerId &&
      calculateDistance(p.location, location) < 1000
    );

    if (existingPeer) {
      return res.status(409).json({
        error: 'Username already taken in this area. Please choose a different one.'
      });
    }

    const now = Date.now();
    const existingPeerData = peers.get(peerId);

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

    if (!existingPeerData) {
      connectionStats.totalConnections++;
    }

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
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Enhanced peer discovery
app.get('/peers', async (req, res) => {
  try {
    const { peerId, range = DEFAULT_RANGE } = req.query;

    if (!peerId) {
      return res.status(400).json({ error: 'peerId query parameter is required' });
    }

    const requester = peers.get(peerId);
    if (!requester) {
      return res.status(404).json({ error: 'Peer not found. Please register first.' });
    }

    const searchRange = Math.min(parseInt(range) || DEFAULT_RANGE, 50000);
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
          isActive: timeSinceLastSeen < 60000,
          status: timeSinceLastSeen < 30000 ? 'online' : 'away',
          joinedAt: peer.joinedAt
        });
      }
    }

    nearbyPeers.sort((a, b) => {
      if (a.isActive !== b.isActive) return b.isActive - a.isActive;
      if (Math.abs(a.distance - b.distance) > 100) return a.distance - b.distance;
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
        activeUsers: Array.from(peers.values()).filter(p => now - p.lastSeen < 60000).length
      }
    });

  } catch (error) {
    console.error('❌ Peer discovery error:', error);
    res.status(500).json({ error: 'Failed to discover nearby users' });
  }
});

// Heartbeat endpoint
app.post('/heartbeat', async (req, res) => {
  try {
    const { peerId, activity } = req.body;

    if (!peerId) {
      return res.status(400).json({ error: 'peerId is required' });
    }

    const peer = peers.get(peerId);
    if (peer) {
      const now = Date.now();
      peer.lastSeen = now;
      peer.status = 'online';

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
      res.status(404).json({ error: 'Peer not found' });
    }

  } catch (error) {
    console.error('❌ Heartbeat error:', error);
    res.status(500).json({ error: 'Heartbeat processing failed' });
  }
});

// Status update endpoint
app.post('/status', async (req, res) => {
  try {
    const { peerId, status } = req.body;

    if (!peerId || !status) {
      return res.status(400).json({ error: 'peerId and status are required' });
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
      res.json({ success: true, message: `Status updated to ${status}` });
    } else {
      res.status(404).json({ error: 'Peer not found' });
    }

  } catch (error) {
    console.error('❌ Status update error:', error);
    res.status(500).json({ error: 'Status update failed' });
  }
});

// Distance calculation using Haversine formula
function calculateDistance(loc1, loc2) {
  try {
    if (!loc1 || !loc2 ||
        typeof loc1.latitude !== 'number' || typeof loc1.longitude !== 'number' ||
        typeof loc2.latitude !== 'number' || typeof loc2.longitude !== 'number') {
      return Infinity;
    }

    if (Math.abs(loc1.latitude) > 90 || Math.abs(loc2.latitude) > 90 ||
        Math.abs(loc1.longitude) > 180 || Math.abs(loc2.longitude) > 180) {
      return Infinity;
    }

    const R = 6371000;
    const phi1 = loc1.latitude * Math.PI / 180;
    const phi2 = loc2.latitude * Math.PI / 180;
    const deltaPhi = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const deltaLambda = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.max(0, R * c);
  } catch (error) {
    console.error('❌ Distance calculation error:', error);
    return Infinity;
  }
}

// Cleanup old peers
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

  connectionStats.activeUsers = peers.size;
}

// Health check
app.get('/health', (req, res) => {
  const now = Date.now();
  const activeUsers = Array.from(peers.values()).filter(p => now - p.lastSeen < 60000).length;

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
    }
  });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Periodic cleanup
setInterval(cleanupOldPeers, 3 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3000;

// Start PeerJS server separately on a different port for local development
let peerServer;
try {
  const { PeerServer } = require('peer');
  const PEER_PORT = 9000;
  
  peerServer = PeerServer({
    port: PEER_PORT,
    path: '/peerjs',
    allow_discovery: true
  });
  
  console.log(`🚀 PeerJS Server started on port ${PEER_PORT}`);
} catch (error) {
  console.log('⚠️ PeerJS server not started (this is okay for production)');
}

// Start Express server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LetTalky Server Started Successfully!`);
  console.log(`📍 Express Server: http://localhost:${PORT}`);
  console.log(`📍 PeerJS Server: ws://localhost:9000/peerjs`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 For external access, use your network IP or port forwarding`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('👋 Server shutting down gracefully...');
  console.log(`📊 Final Stats: ${peers.size} users, ${connectionStats.totalConnections} total connections`);
  if (peerServer) {
    peerServer.close();
  }
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server;
