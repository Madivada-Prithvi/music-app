import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Search, Home,
  Library, Settings, Menu, X, Music, TrendingUp, Clock,
  Heart, Shuffle, Repeat, MoreHorizontal, ChevronRight
} from 'lucide-react';

const App = () => {
  // API Configuration
  const API_BASE = 'http://127.0.0.1:5000';

  // Audio Ref
  const audioRef = useRef(null);

  // Main State Management
  const [appState, setAppState] = useState({
    // Audio Player State
    isPlaying: false,
    currentTrack: null,
    queue: [],
    volume: 0.7,
    currentTime: 0,
    duration: 0,

    // UI State
    sidebarCollapsed: false,
    searchQuery: '',
    searchResults: [],
    loading: false,
    error: null,

    // Data State
    featuredTracks: [],
    recentlyPlayed: [],
    trendingTracks: [],

    // Player UI State
    showVolumeSlider: false,
    isShuffled: false,
    repeatMode: 'off', // 'off', 'one', 'all'

    // Responsive State
    mobileMenuOpen: false,
    breakpoint: 'desktop'
  });

  // Responsive Hook
  const useBreakpoint = () => {
    const [breakpoint, setBreakpoint] = useState('desktop');

    useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        if (width < 768) setBreakpoint('mobile');
        else if (width < 1024) setBreakpoint('tablet');
        else setBreakpoint('desktop');
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
  };

  const currentBreakpoint = useBreakpoint();

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: -280 }
  };

  // API Functions
  const searchTracks = async (query) => {
    if (!query.trim()) return [];

    try {
      setAppState(prev => ({ ...prev, loading: true, error: null }));
      const response = await fetch(`${API_BASE}/result/?query=${encodeURIComponent(query)}&lyrics=true`);
      const data = await response.json();
      return data.slice(0, 12); // Limit results for performance
    } catch (error) {
      setAppState(prev => ({ ...prev, error: 'Search failed' }));
      return [];
    } finally {
      setAppState(prev => ({ ...prev, loading: false }));
    }
  };

  const getSongDetails = async (songUrl) => {
    try {
      const response = await fetch(`${API_BASE}/song/?query=${encodeURIComponent(songUrl)}&lyrics=true`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get song details:', error);
      return null;
    }
  };

  // Audio Engine Functions
  const playTrack = useCallback((track) => {
    if (audioRef.current && track.url) {
      audioRef.current.src = track.url;
      audioRef.current.play();

      // Add to recently played
      const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
      const filtered = recentlyPlayed.filter(t => t.songid !== track.songid);
      const updated = [track, ...filtered].slice(0, 10);
      localStorage.setItem('recentlyPlayed', JSON.stringify(updated));

      setAppState(prev => ({
        ...prev,
        currentTrack: track,
        isPlaying: true,
        recentlyPlayed: updated
      }));
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (appState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setAppState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  }, [appState.isPlaying]);

  const skipToNext = useCallback(() => {
    // Simple next track logic - in real app would use queue
    if (appState.searchResults.length > 0) {
      const currentIndex = appState.searchResults.findIndex(t => t.songid === appState.currentTrack?.songid);
      const nextIndex = currentIndex + 1;
      if (nextIndex < appState.searchResults.length) {
        playTrack(appState.searchResults[nextIndex]);
      }
    }
  }, [appState.currentTrack, appState.searchResults, playTrack]);

  const skipToPrevious = useCallback(() => {
    if (appState.searchResults.length > 0) {
      const currentIndex = appState.searchResults.findIndex(t => t.songid === appState.currentTrack?.songid);
      const prevIndex = Math.max(0, currentIndex - 1);
      playTrack(appState.searchResults[prevIndex]);
    }
  }, [appState.currentTrack, appState.searchResults, playTrack]);

  const handleVolumeChange = useCallback((value) => {
    setAppState(prev => ({ ...prev, volume: value }));
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }, []);

  const handleSeek = useCallback((value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setAppState(prev => ({ ...prev, currentTime: value }));
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio Event Handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setAppState(prev => ({ ...prev, currentTime: audio.currentTime }));
    const updateDuration = () => setAppState(prev => ({ ...prev, duration: audio.duration || 0 }));
    const handleEnded = () => {
      if (appState.repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (appState.repeatMode === 'all' || appState.queue.length > 0) {
        skipToNext();
      } else {
        setAppState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.volume = appState.volume;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [appState.volume, appState.repeatMode, appState.queue, skipToNext]);

  // Initialize with demo data
  useEffect(() => {
    const demoTracks = [
      {
        songid: "demo1",
        title: "Midnight Dreams",
        singers: "Artist One",
        album: "Neon Nights",
        duration: "210",
        image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
      },
      {
        songid: "demo2",
        title: "Electric Pulse",
        singers: "DJ Future",
        album: "Synth Wave",
        duration: "195",
        image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
      }
    ];

    setAppState(prev => ({
      ...prev,
      featuredTracks: demoTracks,
      trendingTracks: demoTracks,
      recentlyPlayed: JSON.parse(localStorage.getItem('recentlyPlayed') || '[]')
    }));
  }, []);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (appState.searchQuery) {
        searchTracks(appState.searchQuery).then(results => {
          setAppState(prev => ({ ...prev, searchResults: results }));
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [appState.searchQuery]);

  // Grid Component
  const BentoGrid = () => {
    const gridClass = currentBreakpoint === 'mobile'
      ? 'grid-cols-1 gap-4'
      : currentBreakpoint === 'tablet'
      ? 'grid-cols-2 gap-4'
      : 'grid-cols-3 gap-6';

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={`grid ${gridClass} p-6`}
      >
        {/* Featured Album - 2x2 */}
        <motion.div
          variants={itemVariants}
          className={`${currentBreakpoint === 'mobile' ? 'col-span-1' : currentBreakpoint === 'tablet' ? 'col-span-2 row-span-2' : 'col-span-2 row-span-2'}`}
        >
          <div className="glass-glow rounded-2xl p-6 h-full min-h-[400px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-glow/20 to-cyberpunk/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-xl font-semibold mb-4 tracking-wide text-white/90">Featured Album</h3>
            {appState.featuredTracks[0] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={appState.featuredTracks[0].image_url}
                    alt={appState.featuredTracks[0].title}
                    className="w-48 h-48 rounded-xl shadow-2xl hardware-accelerated"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => playTrack(appState.featuredTracks[0])}
                    className="absolute bottom-4 right-4 w-12 h-12 bg-cyberpunk rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Play className="w-6 h-6 text-white" fill="white" />
                  </motion.button>
                </div>
                <h4 className="text-lg font-semibold text-white/90">{appState.featuredTracks[0].title}</h4>
                <p className="text-white/60">{appState.featuredTracks[0].singers}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 tracking-wide text-white/90">Quick Actions</h3>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass-light rounded-lg p-3 text-left flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-cyberpunk" />
                <span className="text-white/80">Liked Songs</span>
              </span>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass-light rounded-lg p-3 text-left flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-electric" />
                <span className="text-white/80">Recently Played</span>
              </span>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </motion.button>
          </div>
        </motion.div>

        {/* Now Playing Mini */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 tracking-wide text-white/90">Now Playing</h3>
          {appState.currentTrack ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <img
                  src={appState.currentTrack.image_url}
                  alt={appState.currentTrack.title}
                  className={`w-24 h-24 rounded-lg shadow-lg ${appState.isPlaying ? 'animate-breathe' : ''}`}
                />
                {appState.isPlaying && (
                  <div className="absolute inset-0 rounded-lg animate-glow-pulse bg-purple-glow/20" />
                )}
              </div>
              <p className="text-sm font-medium text-white/90 truncate w-full text-center">{appState.currentTrack.title}</p>
              <p className="text-xs text-white/60 truncate w-full text-center">{appState.currentTrack.singers}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32">
              <Music className="w-8 h-8 text-white/30 mb-2" />
              <p className="text-sm text-white/40">No track playing</p>
            </div>
          )}
        </motion.div>

        {/* Search Results */}
        {(appState.searchQuery || appState.searchResults.length > 0) && (
          <motion.div
            variants={itemVariants}
            className={`${currentBreakpoint === 'mobile' ? 'col-span-1' : 'col-span-3'} glass rounded-2xl p-6`}
          >
            <h3 className="text-lg font-semibold mb-4 tracking-wide text-white/90">
              {appState.searchQuery ? `Search Results for "${appState.searchQuery}"` : 'Trending Tracks'}
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {(appState.searchQuery ? appState.searchResults : appState.trendingTracks).map((track) => (
                <motion.div
                  key={track.songid}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => playTrack(track)}
                  className="glass-light rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <img
                    src={track.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=50&h=50&fit=crop'}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{track.title}</p>
                    <p className="text-xs text-white/60 truncate">{track.singers}</p>
                  </div>
                  <Play className="w-4 h-4 text-white/40 flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Sidebar Component
  const Sidebar = () => {
    const menuItems = [
      { icon: Home, label: 'Home', active: true },
      { icon: Search, label: 'Search', active: false },
      { icon: Library, label: 'Library', active: false },
      { icon: Settings, label: 'Settings', active: false }
    ];

    return (
      <>
        {/* Mobile Menu Button */}
        {currentBreakpoint === 'mobile' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setAppState(prev => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }))}
            className="fixed top-4 left-4 z-50 w-12 h-12 glass rounded-xl flex items-center justify-center"
          >
            {appState.mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        )}

        {/* Sidebar */}
        <motion.aside
          variants={currentBreakpoint === 'mobile' ? sidebarVariants : {}}
          initial={currentBreakpoint === 'mobile' ? 'closed' : false}
          animate={currentBreakpoint === 'mobile' ? (appState.mobileMenuOpen ? 'open' : 'closed') : false}
          className={`fixed left-0 top-0 h-full z-40 glass-heavy border-r border-white/10 ${
            currentBreakpoint === 'mobile' ? 'w-64' : appState.sidebarCollapsed ? 'w-20' : 'w-64'
          } transition-all duration-300`}
        >
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-cyberpunk to-electric rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              {(!appState.sidebarCollapsed || currentBreakpoint === 'mobile') && (
                <span className="text-xl font-bold tracking-wide">Deep Space</span>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  whileHover={{ scale: 1.05, x: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (item.label === 'Search') {
                      document.getElementById('search-input')?.focus();
                    }
                    setAppState(prev => ({ ...prev, mobileMenuOpen: false }));
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    item.active
                      ? 'bg-gradient-to-r from-cyberpunk/20 to-electric/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {(!appState.sidebarCollapsed || currentBreakpoint === 'mobile') && (
                    <span>{item.label}</span>
                  )}
                </motion.button>
              ))}
            </nav>
          </div>
        </motion.aside>

        {/* Mobile Menu Overlay */}
        {currentBreakpoint === 'mobile' && appState.mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAppState(prev => ({ ...prev, mobileMenuOpen: false }))}
            className="fixed inset-0 bg-black/50 z-30"
          />
        )}
      </>
    );
  };

  // Player Bar Component
  const PlayerBar = () => {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 glass-heavy border-t border-white/10 z-30"
      >
        <div className="h-20 flex items-center px-4 md:px-6 gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {appState.currentTrack ? (
              <>
                <img
                  src={appState.currentTrack.image_url}
                  alt={appState.currentTrack.title}
                  className={`w-14 h-14 rounded-lg shadow-lg ${appState.isPlaying ? 'animate-breathe' : ''}`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-white/90 truncate">{appState.currentTrack.title}</p>
                  <p className="text-sm text-white/60 truncate">{appState.currentTrack.singers}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 glass rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-white/30" />
                </div>
                <div>
                  <p className="font-medium text-white/60">No track selected</p>
                  <p className="text-sm text-white/40">Select a track to play</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={skipToPrevious}
                className="text-white/60 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlayPause}
                disabled={!appState.currentTrack}
                className="w-12 h-12 bg-gradient-to-r from-cyberpunk to-electric rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {appState.isPlaying ? (
                  <Pause className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Play className="w-6 h-6 text-white" fill="white" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={skipToNext}
                className="text-white/60 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-white/40 w-10 text-right">
                {formatTime(appState.currentTime)}
              </span>
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyberpunk to-electric"
                  style={{ width: `${(appState.currentTime / appState.duration) * 100 || 0}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max={appState.duration}
                  value={appState.currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={!appState.currentTrack}
                />
              </div>
              <span className="text-xs text-white/40 w-10">
                {formatTime(appState.duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setAppState(prev => ({ ...prev, showVolumeSlider: !prev.showVolumeSlider }))}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {appState.showVolumeSlider && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 100, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="h-1 bg-white/20 rounded-full overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-white/60"
                    style={{ width: `${appState.volume * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={appState.volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  // Search Bar Component
  const SearchBar = () => (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-light border-b border-white/10 sticky top-0 z-20 backdrop-blur-xl"
    >
      <div className="max-w-2xl mx-auto p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            id="search-input"
            type="text"
            value={appState.searchQuery}
            onChange={(e) => setAppState(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search for tracks, artists, albums..."
            className="w-full glass rounded-xl px-12 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-glow/50 transition-all"
          />
          {appState.loading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-white/40 border-t-cyberpunk rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-obsidian relative">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} />

      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-obsidian via-deep-blue to-deep-purple opacity-50" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${
        currentBreakpoint === 'mobile' ? 'ml-0' : appState.sidebarCollapsed ? 'ml-20' : 'ml-64'
      } ${currentBreakpoint === 'mobile' ? 'pt-16' : ''}`}>
        {/* Search Bar */}
        <SearchBar />

        {/* Bento Grid */}
        <BentoGrid />

        {/* Bottom Padding for Player */}
        <div className="h-24" />
      </main>

      {/* Player Bar */}
      <PlayerBar />

      {/* Error Toast */}
      <AnimatePresence>
        {appState.error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 glass bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl z-50"
          >
            {appState.error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;