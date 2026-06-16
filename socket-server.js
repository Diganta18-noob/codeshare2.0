const { createServer } = require('http');
const { Server } = require('socket.io');

// Color palette for remote users
const USER_COLORS = [
  { id: 'blue', bg: 'rgba(59, 130, 246, 0.3)', border: '#3b82f6', label: '#3b82f6' },
  { id: 'green', bg: 'rgba(34, 197, 94, 0.3)', border: '#22c55e', label: '#22c55e' },
  { id: 'purple', bg: 'rgba(168, 85, 247, 0.3)', border: '#a855f7', label: '#a855f7' },
  { id: 'pink', bg: 'rgba(236, 72, 153, 0.3)', border: '#ec4899', label: '#ec4899' },
  { id: 'orange', bg: 'rgba(249, 115, 22, 0.3)', border: '#f97316', label: '#f97316' },
  { id: 'teal', bg: 'rgba(20, 184, 166, 0.3)', border: '#14b8a6', label: '#14b8a6' },
  { id: 'red', bg: 'rgba(239, 68, 68, 0.3)', border: '#ef4444', label: '#ef4444' },
  { id: 'yellow', bg: 'rgba(234, 179, 8, 0.3)', border: '#eab308', label: '#eab308' },
];

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CodeShare Socket Server is running!\n');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track rooms: Map<roomId, Set<socketId>>
const rooms = new Map();

// Track user colors per room: Map<roomId, Map<socketId, colorIndex>>
const userColors = new Map();

// Debounce timers for DB saves: Map<roomId, Timeout>
const saveTimers = new Map();

// Lazy-load mongoose for DB saves
let mongoose = null;
let RoomModel = null;

async function getRoom() {
  if (!RoomModel) {
    mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codeshare';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { dbName: 'codeshare', bufferCommands: false });
    }
    // Define schema inline (CJS context)
    const schema = new mongoose.Schema({
      roomId: { type: String, required: true, unique: true, index: true },
      code: { type: String, default: '' },
      language: { type: String, default: 'javascript' },
      files: {
        type: [
          {
            name: { type: String, required: true },
            code: { type: String, default: '' },
            language: { type: String, default: 'javascript' },
          },
        ],
        default: [],
      },
      viewerCount: { type: Number, default: 0 },
    }, { timestamps: true });
    RoomModel = mongoose.models.Room || mongoose.model('Room', schema);
  }
  return RoomModel;
}

function assignColor(roomId, socketId) {
  if (!userColors.has(roomId)) {
    userColors.set(roomId, new Map());
  }
  const roomColors = userColors.get(roomId);
  // Find next available color index
  const usedIndices = new Set(roomColors.values());
  let colorIndex = 0;
  for (let i = 0; i < USER_COLORS.length; i++) {
    if (!usedIndices.has(i)) {
      colorIndex = i;
      break;
    }
  }
  roomColors.set(socketId, colorIndex);
  return USER_COLORS[colorIndex % USER_COLORS.length];
}

function removeColor(roomId, socketId) {
  if (userColors.has(roomId)) {
    userColors.get(roomId).delete(socketId);
    if (userColors.get(roomId).size === 0) {
      userColors.delete(roomId);
    }
  }
}

function getColor(roomId, socketId) {
  if (userColors.has(roomId) && userColors.get(roomId).has(socketId)) {
    const idx = userColors.get(roomId).get(socketId);
    return USER_COLORS[idx % USER_COLORS.length];
  }
  return USER_COLORS[0];
}

function debouncedSave(roomId, code, files) {
  if (saveTimers.has(roomId)) {
    clearTimeout(saveTimers.get(roomId));
  }
  saveTimers.set(roomId, setTimeout(async () => {
    try {
      const Room = await getRoom();
      const updateData = {};
      if (code !== undefined) updateData.code = code;
      if (files !== undefined) {
        updateData.files = files;
        if (files.length > 0) {
          updateData.code = files[0].code;
          updateData.language = files[0].language;
        }
      }
      await Room.findOneAndUpdate(
        { roomId },
        { ...updateData, updatedAt: new Date() },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[DB] Failed to save room ${roomId}:`, err.message);
    }
    saveTimers.delete(roomId);
  }, 1500));
}

io.on('connection', (socket) => {
  // Track which room this socket is in (for convenience)
  let currentRoom = null;

  // Join a room
  socket.on('join-room', ({ roomId }) => {
    socket.join(roomId);
    currentRoom = roomId;
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);
    const count = rooms.get(roomId).size;

    // Assign a color
    const color = assignColor(roomId, socket.id);

    // Send user their assigned color
    socket.emit('user-color', color);

    io.to(roomId).emit('presence-update', count);

    // Broadcast system message to chat
    io.to(roomId).emit('system-message', {
      text: `User-${socket.id.slice(-4)} joined the room`,
      timestamp: Date.now(),
    });

    console.log(`[Socket] ${socket.id} joined room ${roomId} (${count} viewers, color: ${color.id})`);
  });

  // Code change — broadcast to everyone else in room
  socket.on('code-change', ({ roomId, code, files }) => {
    socket.to(roomId).emit('code-update', { code, files });
    debouncedSave(roomId, code, files);
  });

  // File tree change (create/rename/delete)
  socket.on('file-tree-change', ({ roomId, files }) => {
    socket.to(roomId).emit('file-tree-update', { files });
    debouncedSave(roomId, undefined, files);
  });

  // Switch active file
  socket.on('file-switch', ({ roomId, activeFileIndex }) => {
    socket.to(roomId).emit('file-switch-update', { activeFileIndex });
  });

  // Selection change
  socket.on('selection-change', ({ roomId, selection }) => {
    const color = getColor(roomId, socket.id);
    socket.to(roomId).emit('selection-update', {
      socketId: socket.id,
      selection,
      color,
    });
  });

  // Cursor change
  socket.on('cursor-change', ({ roomId, position }) => {
    const color = getColor(roomId, socket.id);
    socket.to(roomId).emit('cursor-update', {
      socketId: socket.id,
      position,
      color,
    });
  });

  // Language change
  socket.on('language-change', ({ roomId, language }) => {
    socket.to(roomId).emit('language-update', language);

    // Broadcast language change as system message
    const color = getColor(roomId, socket.id);
    io.to(roomId).emit('system-message', {
      text: `User-${socket.id.slice(-4)} changed language to ${language}`,
      timestamp: Date.now(),
    });

    (async () => {
      try {
        const Room = await getRoom();
        await Room.findOneAndUpdate(
          { roomId },
          { language, updatedAt: new Date() },
          { upsert: true }
        );
      } catch (err) {
        console.error(`[DB] Failed to save language for ${roomId}:`, err.message);
      }
    })();
  });

  // Room lock change
  socket.on('room-lock-change', ({ roomId, isLocked, lockedBy }) => {
    socket.to(roomId).emit('room-lock-update', { isLocked, lockedBy });
    
    // Broadcast system message
    io.to(roomId).emit('system-message', {
      text: `Room is now ${isLocked ? 'LOCKED (read-only for others)' : 'UNLOCKED'}`,
      timestamp: Date.now(),
    });
  });

  // Chat message
  socket.on('chat-send', ({ roomId, text }) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) return;
    const color = getColor(roomId, socket.id);
    const message = {
      socketId: socket.id,
      text: text.trim().slice(0, 500),
      color,
      timestamp: Date.now(),
    };
    // Broadcast to everyone in the room including sender
    io.to(roomId).emit('chat-message', message);
  });

  // Disconnect
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        const count = rooms.get(roomId).size;

        // Clean up selections/cursors for others
        socket.to(roomId).emit('user-left', { socketId: socket.id });

        // Broadcast system message to chat
        socket.to(roomId).emit('system-message', {
          text: `User-${socket.id.slice(-4)} left the room`,
          timestamp: Date.now(),
        });

        // Remove color assignment
        removeColor(roomId, socket.id);

        if (count === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('presence-update', count);
        }
      }
    });
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`> Standalone Socket.IO Server running on port ${PORT}`);
});
