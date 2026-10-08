import React, { useState, useEffect } from 'react';
import { AvatarConfig, RoomPublicInfo } from '../../types';
import { Avatar, AVATAR_COLORS } from '../Avatar/Avatar';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Play,
  Lock,
  ArrowRight,
  Users,
  RefreshCw,
} from 'lucide-react';

interface HomeScreenProps {
  onJoinRoom: (roomId: string, name: string, avatar: AvatarConfig) => void;
  onCreateRoom: (name: string, avatar: AvatarConfig, isPrivate: boolean) => void;
  initialRoomId?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onJoinRoom,
  onCreateRoom,
  initialRoomId = '',
}) => {
  const [name, setName] = useState(() => localStorage.getItem('skribbl_name') || 'Guest' + Math.floor(Math.random() * 900 + 100));
  const [roomCode, setRoomCode] = useState(initialRoomId);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('skribbl_avatar');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      eyes: Math.floor(Math.random() * 10),
      mouth: Math.floor(Math.random() * 10),
    };
  });

  const [publicRooms, setPublicRooms] = useState<RoomPublicInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Fetch public rooms
  
  const fetchPublicRooms = async () => {
    setIsLoadingRooms(true);

    const serverUrl =
      import.meta.env.VITE_SERVER_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:4000'
        : window.location.origin);

    try {
      const res = await fetch(`${serverUrl}/api/rooms`);

      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };


  useEffect(() => {
    fetchPublicRooms();
  }, []);

  const saveProfile = (newName: string, newAvatar: AvatarConfig) => {
    localStorage.setItem('skribbl_name', newName);
    localStorage.setItem('skribbl_avatar', JSON.stringify(newAvatar));
  };

  const cycleEyes = (dir: number) => {
    setAvatar((prev) => {
      const next = { ...prev, eyes: (prev.eyes + dir + 10) % 10 };
      saveProfile(name, next);
      return next;
    });
  };

  const cycleMouth = (dir: number) => {
    setAvatar((prev) => {
      const next = { ...prev, mouth: (prev.mouth + dir + 10) % 10 };
      saveProfile(name, next);
      return next;
    });
  };

  const cycleColor = (color: string) => {
    setAvatar((prev) => {
      const next = { ...prev, color };
      saveProfile(name, next);
      return next;
    });
  };

  const randomizeAvatar = () => {
    const randomized: AvatarConfig = {
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      eyes: Math.floor(Math.random() * 10),
      mouth: Math.floor(Math.random() * 10),
    };
    setAvatar(randomized);
    saveProfile(name, randomized);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    saveProfile(val, avatar);
  };

  const handleQuickPlay = () => {
    // If public room exists with available spots, join first
    const openRoom = publicRooms.find((r) => r.playerCount < r.maxPlayers);
    if (openRoom) {
      onJoinRoom(openRoom.id, name, avatar);
    } else {
      // Create new public room
      onCreateRoom(name, avatar, false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-400 via-sky-300 to-amber-100 select-none">
      {/* Title Logo */}
      <div className="mb-6 text-center animate-bounce-short">
        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3">
          <span className="text-yellow-300">skribbl</span>
          <span className="text-white">.io</span>
          <span className="text-3xl sm:text-4xl">🎨</span>
        </h1>
        <p className="text-slate-800 font-extrabold text-sm sm:text-base mt-1 drop-shadow-sm">
          Free Online Multiplayer Drawing & Guessing Game
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-700 flex flex-col gap-5">
        {/* Nickname Input */}
        <div>
          <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1">
            Choose Your Nickname
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={18}
            placeholder="Enter nickname..."
            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-300 rounded-2xl font-bold text-slate-800 text-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
          />
        </div>

        {/* Avatar Customizer */}
        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              Customize Character
            </span>
            <button
              onClick={randomizeAvatar}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Shuffle size={14} />
              <span>Random</span>
            </button>
          </div>

          {/* Avatar and Expression Switchers */}
          <div className="flex items-center justify-center gap-4 my-2">
            {/* Eyes switcher */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Eyes</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cycleEyes(-1)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => cycleEyes(1)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Avatar Preview */}
            <div className="p-2 bg-white rounded-full shadow-md border-2 border-slate-200">
              <Avatar config={avatar} size="lg" />
            </div>

            {/* Mouth switcher */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Mouth</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cycleMouth(-1)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => cycleMouth(1)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
            {AVATAR_COLORS.map((col) => (
              <button
                key={col}
                onClick={() => cycleColor(col)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  avatar.color === col
                    ? 'scale-125 border-slate-800 ring-2 ring-offset-1 ring-blue-500'
                    : 'border-white hover:scale-110'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Quick Play */}
          <button
            onClick={handleQuickPlay}
            disabled={!name.trim()}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-black text-2xl shadow-lg border-b-4 border-emerald-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Play fill="white" size={26} />
            <span>PLAY!</span>
          </button>

          {/* Create Private Room */}
          <button
            onClick={() => onCreateRoom(name, avatar, true)}
            disabled={!name.trim()}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl font-black text-base shadow-md border-b-4 border-blue-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            <span>Create Private Room</span>
          </button>
        </div>

        {/* Join with Code */}
        <div className="pt-2 border-t-2 border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="Enter Room Code..."
            className="flex-1 px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 uppercase text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => roomCode.trim() && onJoinRoom(roomCode.trim(), name, avatar)}
            disabled={!roomCode.trim() || !name.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-transform active:scale-95 flex items-center gap-1"
          >
            <span>Join</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Public Rooms List */}
      {publicRooms.length > 0 && (
        <div className="w-full max-w-md mt-6 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border-2 border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-sm">
              <Users size={16} />
              <span>Public Rooms ({publicRooms.length})</span>
            </div>
            <button
              onClick={fetchPublicRooms}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
              title="Refresh rooms"
            >
              <RefreshCw size={14} className={isLoadingRooms ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
            {publicRooms.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div>
                  <div className="font-bold text-slate-800">{r.name}</div>
                  <div className="text-slate-500 text-[11px]">
                    {r.playerCount}/{r.maxPlayers} players • Round {r.round}/{r.totalRounds}
                  </div>
                </div>
                <button
                  onClick={() => onJoinRoom(r.id, name, avatar)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-transform active:scale-95"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
