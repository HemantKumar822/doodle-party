'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COLORS } from './design_system';
import { validateDisplayName } from './lib/gameUtils';
import { DEFAULT_SETTINGS } from './types/game';
import { useAudio } from './contexts/AudioContext';
import GlobalControls from './components/GlobalControls';
import AvatarSelector, { AvatarConfig, defaultAvatarConfig } from './components/AvatarSelector';
import logger from './lib/logger';

// localStorage keys
const STORAGE_KEY_NAME = 'doodleparty_name';
const STORAGE_KEY_AVATAR = 'doodleparty_avatar';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { isMusicPlaying, toggleMusic } = useAudio();
  const [avatar, setAvatar] = useState<AvatarConfig>(defaultAvatarConfig());
  const handleAvatarChange = useCallback((config: AvatarConfig) => setAvatar(config), []);

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedName = localStorage.getItem(STORAGE_KEY_NAME);
    const savedAvatar = localStorage.getItem(STORAGE_KEY_AVATAR);

    if (savedName) setName(savedName);
    if (savedAvatar) {
      try {
        setAvatar(JSON.parse(savedAvatar));
      } catch (e) { /* ignore parse errors */ }
    }
  }, []);

  // Save name when it changes (debounced effect)
  useEffect(() => {
    if (name.trim()) {
      localStorage.setItem(STORAGE_KEY_NAME, name);
    }
  }, [name]);

  // Save avatar when it changes
  useEffect(() => {
    if (avatar?.style && avatar?.seed) {
      localStorage.setItem(STORAGE_KEY_AVATAR, JSON.stringify(avatar));
    }
  }, [avatar]);

  const createRoom = async () => {
    // Validate name
    const validation = validateDisplayName(name);
    if (!validation.isValid) {
      setNameError(validation.error || 'Invalid name');
      return;
    }
    setNameError(null);
    setLoading(true);

    logger.info(`Creating party for host: ${name}`, { context: 'room' });

    try {
      // Ensure avatar has valid data
      const playerAvatar = (avatar?.style && avatar?.seed)
        ? avatar
        : { style: 'adventurer', seed: 'default' };

      // 1. Create Room with default settings
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_code: roomCode,
          status: 'waiting',
          current_round: 1,
          max_rounds: 3,
          settings: DEFAULT_SETTINGS
        })
        .select()
        .single();

      if (roomError) {
        logger.room.error('Failed to create room', roomError);
        throw roomError;
      }

      logger.room.created(roomCode, room.id);

      // 2. Create Host Player with selected avatar
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          display_name: name,
          is_host: true,
          is_connected: true,
          score: 0,
          turn_order: 0,
          avatar: playerAvatar
        })
        .select()
        .single();

      if (playerError) {
        logger.room.error('Failed to create host player', playerError);
        throw playerError;
      }

      logger.player.connected(name, player.id);

      // 3. Store Player ID (session) and Redirect
      localStorage.setItem(`player_id_${room.id}`, player.id);

      logger.success(`Redirecting to party ${roomCode}`, { context: 'room' });
      router.push(`/room/${room.id}`);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; details?: string };
      logger.room.error('Create party failed', e);
      alert(`Error creating party: ${err?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Global Controls - Music Toggle + Settings */}
      <div className="absolute top-4 right-4 z-20">
        <GlobalControls />
      </div>

      {/* Decorative Blob */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-wobble"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-wobble" style={{ animationDelay: '1s' }}></div>

      <div className="z-10 sketchy-border bg-white p-8 md:p-10 max-w-2xl w-full shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl mb-2 animate-wobble" style={{ color: COLORS.palette.red }}>
            Doodle Party
          </h1>
          <p className="text-xl text-gray-600 transform -rotate-1">
            Draw • Guess • Win!
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-0">
          {/* Left: Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 md:pr-8 md:border-r-2 md:border-gray-200">
            <label className="block text-sm font-bold mb-3 text-center text-gray-700">Choose Your Avatar</label>
            <AvatarSelector value={avatar} onChange={handleAvatarChange} size={90} />
          </div>

          {/* Right: Form */}
          <div className="flex-1 flex flex-col justify-center gap-4 md:pl-8">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="e.g. Picasso"
                className={`w-full p-3 border-2 rounded-xl font-inherit text-lg focus:outline-none focus:ring-4 focus:ring-yellow-200 transition-all ${nameError ? 'border-red-500' : 'border-black'}`}
                maxLength={20}
              />
              {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
            </div>

            {/* Create Party Button */}
            <button
              onClick={createRoom}
              disabled={loading || !name}
              className={`w-full py-3 px-5 text-lg font-bold rounded-xl border-2 border-black transition-all shadow-[3px_3px_0px_rgba(0,0,0,0.9)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.9)] hover:translate-x-[2px] hover:translate-y-[2px] ${loading || !name
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-300 hover:bg-yellow-400 text-black'
                }`}
            >
              {loading ? 'Creating...' : '🎨 Create Party'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-gray-400 font-bold text-xs uppercase">or join</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Join Party */}
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                placeholder="PARTY CODE"
                className={`flex-1 p-3 border-2 rounded-xl font-mono text-base uppercase tracking-wider text-center focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all ${joinError ? 'border-red-500' : 'border-black'}`}
                maxLength={6}
              />
              <button
                onClick={async () => {
                  if (!joinCode || joinCode.length < 6) {
                    setJoinError('Enter 6-character code');
                    return;
                  }
                  if (!name.trim()) {
                    setNameError('Enter your name first!');
                    return;
                  }
                  setJoining(true);
                  setJoinError(null);

                  const { data: room, error } = await supabase
                    .from('rooms')
                    .select('id')
                    .eq('room_code', joinCode)
                    .single();

                  if (error || !room) {
                    setJoinError('Party not found!');
                    setJoining(false);
                    return;
                  }

                  localStorage.setItem('pending_player_name', name.trim());
                  localStorage.setItem('pending_player_avatar', JSON.stringify(avatar));
                  router.push(`/room/${room.id}`);
                }}
                disabled={joining || joinCode.length < 6 || !name.trim()}
                className={`px-5 py-3 border-2 border-black rounded-xl font-bold text-base transition-all shadow-[3px_3px_0px_rgba(0,0,0,0.9)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.9)] hover:translate-x-[2px] hover:translate-y-[2px] ${joining || joinCode.length < 6 || !name.trim()
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-300 hover:bg-blue-400 text-black'
                  }`}
              >
                {joining ? '...' : 'Join 🚀'}
              </button>
            </div>
            {joinError && <p className="text-red-500 text-sm text-center">{joinError}</p>}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 font-bold text-sm md:text-base flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform cursor-pointer z-20">
        <span>Made with ❤️ by</span>
        <a
          href="https://www.instagram.com/hemant._.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-pink-600 hover:text-pink-500"
        >
          <span>Hemant</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
      </div>
    </main>
  );
}
