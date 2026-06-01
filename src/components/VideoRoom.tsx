import { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import { Link, Play, Pause, Maximize, Volume2, Users, Settings } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface RoomState {
  videoId: string | null;
  playing: boolean;
  currentTime: number;
  timestamp: number;
}

export function VideoRoom({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const playerRef = useRef<ReactPlayer>(null);
  
  // Track if current play/pause/seek was triggered by a remote socket event
  const isRemoteAction = useRef(false);

  useEffect(() => {
    // Only connect once
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("join_room", roomId);

    newSocket.on("sync_state", (state: RoomState) => {
      isRemoteAction.current = true;
      setRoomState(state);
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - state.currentTime) > 1) {
        playerRef.current.seekTo(state.currentTime);
      }
      setTimeout(() => { isRemoteAction.current = false; }, 100);
    });

    newSocket.on("play", (time: number) => {
      isRemoteAction.current = true;
      setRoomState(prev => prev ? { ...prev, playing: true, currentTime: time } : null);
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - time) > 1) {
        playerRef.current.seekTo(time);
      }
      setTimeout(() => { isRemoteAction.current = false; }, 100);
    });

    newSocket.on("pause", (time: number) => {
      isRemoteAction.current = true;
      setRoomState(prev => prev ? { ...prev, playing: false, currentTime: time } : null);
      if (playerRef.current) {
        playerRef.current.seekTo(time);
      }
      setTimeout(() => { isRemoteAction.current = false; }, 100);
    });

    newSocket.on("seek", (time: number) => {
      isRemoteAction.current = true;
      setRoomState(prev => prev ? { ...prev, currentTime: time } : null);
      if (playerRef.current) {
        playerRef.current.seekTo(time);
      }
      setTimeout(() => { isRemoteAction.current = false; }, 100);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const extractPixeldrainId = (url: string) => {
    const match = url.match(/pixeldrain\.com\/u\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleSetVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !inputUrl) return;
    
    // Check if what was pasted is just an ID or a URL
    let videoId = inputUrl;
    if (inputUrl.includes("pixeldrain.com")) {
      const extracted = extractPixeldrainId(inputUrl);
      if (extracted) {
        videoId = extracted;
      }
    }
    
    socket.emit("set_video", roomId, videoId);
    setInputUrl("");
  };

  const handlePlay = () => {
    if (isRemoteAction.current || !socket || !playerRef.current) return;
    socket.emit("play", roomId, playerRef.current.getCurrentTime());
  };

  const handlePause = () => {
    if (isRemoteAction.current || !socket || !playerRef.current) return;
    socket.emit("pause", roomId, playerRef.current.getCurrentTime());
  };

  const handleSeek = (time: number) => {
    if (isRemoteAction.current || !socket) return;
    socket.emit("seek", roomId, time);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied to clipboard!"); // Can use a better toast later
  };

  if (!roomState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="animate-pulse">Connecting to room...</div>
      </div>
    );
  }

  const directVideoUrl = roomState.videoId 
    ? `https://pixeldrain.com/api/file/${roomState.videoId}`
    : null;

  return (
    <div className="w-full min-h-screen bg-gray-950 text-white flex flex-col p-4 sm:p-8 font-sans">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b border-gray-800">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">SyncWatch 🎥</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">Room: {roomId}</p>
          </div>
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-sm font-medium rounded-md border border-gray-800 transition-colors"
          >
            <Link className="h-4 w-4" />
            Share Room Link
          </button>
        </header>

        {/* Admin Controls */}
        <div className="flex flex-col gap-2 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Admin Controls</h2>
          <form onSubmit={handleSetVideo} className="flex gap-3">
            <input 
              type="text" 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste Pixeldrain video link (e.g. https://pixeldrain.com/u/xxxx)"
              className="flex-1 bg-gray-950 border border-gray-800 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-colors"
            >
              Load Video
            </button>
          </form>
        </div>

        {/* Video Player Canvas */}
        <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative flex items-center justify-center">
          {!directVideoUrl ? (
            <div className="text-center p-8">
              <p className="text-gray-400 font-medium">No video selected</p>
              <p className="text-sm text-gray-600 mt-2">Paste a Pixeldrain link above to start watching together.</p>
            </div>
          ) : (
            <div className="w-full h-full relative group">
              <ReactPlayer
                ref={playerRef}
                url={directVideoUrl}
                width="100%"
                height="100%"
                playing={roomState.playing}
                controls={true}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload'
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
