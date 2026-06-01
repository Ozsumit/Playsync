/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { VideoRoom } from "./components/VideoRoom";
import { Play } from "lucide-react";

export default function App() {
  const [roomId, setRoomId] = partnerState();

  function partnerState() {
    const getHash = () => window.location.hash.replace("#", "");
    const [hash, setHash] = useState(getHash());

    useEffect(() => {
      const handleHashChange = () => setHash(getHash());
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    return [hash, () => {}] as const;
  }

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    window.location.hash = newRoomId;
  };

  if (roomId) {
    return <VideoRoom roomId={roomId} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white font-sans p-6 text-center">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-900/50">
        <Play className="h-8 w-8 text-white ml-1" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
        SyncWatch for Pixeldrain
      </h1>
      <p className="text-lg text-gray-400 mb-10 max-w-lg">
        Watch Pixeldrain videos in perfect sync with your friends. Create a room, paste the link, and enjoy together.
      </p>
      
      <button 
        onClick={createRoom}
        className="px-8 py-4 bg-white text-black hover:bg-gray-200 hover:scale-105 font-semibold rounded-full text-lg transition-all shadow-xl shadow-white/10"
      >
        Create Watch Room
      </button>
    </div>
  );
}
