import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3000;

// In-memory state for rooms
interface RoomState {
  videoId: string | null;
  playing: boolean;
  currentTime: number;
  timestamp: number;
}

const rooms = new Map<string, RoomState>();

function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      videoId: null,
      playing: false,
      currentTime: 0,
      timestamp: Date.now(),
    });
  }
  return rooms.get(roomId)!;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Socket.io Real-time Logic
  io.on("connection", (socket) => {
    socket.on("join_room", (roomId: string) => {
      socket.join(roomId);
      const state = getRoom(roomId);
      socket.emit("sync_state", state);
    });

    socket.on("set_video", (roomId: string, videoId: string) => {
      const state = getRoom(roomId);
      state.videoId = videoId;
      state.playing = false;
      state.currentTime = 0;
      state.timestamp = Date.now();
      io.to(roomId).emit("sync_state", state);
    });

    socket.on("play", (roomId: string, currentTime: number) => {
      const state = getRoom(roomId);
      state.playing = true;
      state.currentTime = currentTime;
      state.timestamp = Date.now();
      socket.to(roomId).emit("play", currentTime);
    });

    socket.on("pause", (roomId: string, currentTime: number) => {
      const state = getRoom(roomId);
      state.playing = false;
      state.currentTime = currentTime;
      state.timestamp = Date.now();
      socket.to(roomId).emit("pause", currentTime);
    });

    socket.on("seek", (roomId: string, currentTime: number) => {
      const state = getRoom(roomId);
      state.currentTime = currentTime;
      state.timestamp = Date.now();
      socket.to(roomId).emit("seek", currentTime);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
