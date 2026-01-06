import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Cloud, Coffee, Waves, Wind, Music, Search, Play, Pause, Youtube, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePDF } from '../context/PDFContext';

const AmbientSoundPlayer = () => {
    const {
        audioActiveMode: activeMode, setAudioActiveMode: setActiveMode,
        audioActiveSound: activeSound, setAudioActiveSound: setActiveSound,
        audioVolume: volume, setAudioVolume: setVolume,
        audioIsMuted: isMuted, setAudioIsMuted: setIsMuted,
        audioActiveInternetTrack: activeInternetTrack, setAudioActiveInternetTrack: setActiveInternetTrack,
        audioContextRef, audioNodesRef, internetAudioRef
    } = usePDF();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const sounds = [
        { id: 'rain', name: 'Rain', icon: <Cloud size={16} />, color: 'from-blue-400 to-blue-600', generator: 'rain' },
        { id: 'cafe', name: 'Cafe', icon: <Coffee size={16} />, color: 'from-amber-400 to-orange-600', generator: 'cafe' },
        { id: 'ocean', name: 'Ocean', icon: <Waves size={16} />, color: 'from-cyan-400 to-blue-600', generator: 'ocean' },
        { id: 'forest', name: 'Forest', icon: <Wind size={16} />, color: 'from-green-400 to-emerald-600', generator: 'forest' },
        { id: 'piano', name: 'Piano', icon: <Music size={16} />, color: 'from-purple-400 to-pink-600', generator: 'piano' }
    ];

    const curatedMusic = [
        { id: 'lofi-1', name: 'Midnight Study', artist: 'Lofi Records', url: 'https://stream.zeno.fm/f3wv088bc0duv' },
        { id: 'jazz-1', name: 'Coffee Shop Jazz', artist: 'Jazz Cafe', url: 'https://any-radio-stream.example.com/jazz' }, // Placeholder for demo
    ];

    // Important: volume sync for internet audio
    useEffect(() => {
        if (internetAudioRef.current) {
            internetAudioRef.current.volume = volume;
        }
    }, [volume]);

    const stopInternetMusic = () => {
        if (internetAudioRef.current) {
            internetAudioRef.current.pause();
            internetAudioRef.current.src = "";
        }
        setActiveInternetTrack(null);
    };

    const playInternetMusic = (track) => {
        stopAllSounds();
        setActiveSound(null);

        if (activeInternetTrack?.id === track.id) {
            stopInternetMusic();
        } else {
            internetAudioRef.current.src = track.url;
            internetAudioRef.current.play().catch(e => console.log("Stream failed", e));
            setActiveInternetTrack(track);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // Professional simulation of music search with real focus video IDs
        setSearchResults([
            { id: 'yt-1', videoId: 'jfKfPfyJRdk', title: `${searchQuery} - Lofi Girl`, duration: 'LIVE', platform: 'Global' },
            { id: 'yt-2', videoId: '5qap5aO4i9A', title: `Relaxing ${searchQuery} Mix`, duration: '12:00', platform: 'Internet' },
            { id: 'yt-3', videoId: 'DWcJFNfaw9c', title: `${searchQuery} (Jazz Focus)`, duration: '4:20', platform: 'Focus' }
        ]);
    };

    // --- SYNTHETIC SOUND LOGIC ---
    const createAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    const createBrownNoise = (context) => {
        const bufferSize = 2 * context.sampleRate;
        const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }
        const brownNoise = context.createBufferSource();
        brownNoise.buffer = noiseBuffer;
        brownNoise.loop = true;
        return brownNoise;
    };

    const createRainSound = (context, gainNode) => {
        const noise = createBrownNoise(context);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        const patterGain = context.createGain();
        patterGain.gain.value = 0.05;
        const interval = setInterval(() => {
            if (!audioNodesRef.current.gainNode) return clearInterval(interval);
            const osc = context.createOscillator();
            const g = context.createGain();
            osc.frequency.setValueAtTime(1000 + Math.random() * 2000, context.currentTime);
            g.gain.setValueAtTime(0.015, context.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
            osc.connect(g);
            g.connect(patterGain);
            osc.start();
            osc.stop(context.currentTime + 0.1);
        }, 150);
        noise.connect(filter);
        filter.connect(gainNode);
        patterGain.connect(gainNode);
        noise.start(0);
        return { noise, filter, interval };
    };

    const createOceanSound = (context, gainNode) => {
        const noise = createBrownNoise(context);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = context.createGain();
        lfoGain.gain.value = 0.5;
        const mainGain = context.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(mainGain.gain);
        noise.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(gainNode);
        noise.start(0);
        lfo.start(0);
        return { noise, filter, lfo };
    };

    const createForestSound = (context, gainNode) => {
        const noise = createBrownNoise(context);
        const filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2500;
        const interval = setInterval(() => {
            if (!audioNodesRef.current.gainNode) return clearInterval(interval);
            const osc = context.createOscillator();
            const g = context.createGain();
            const startTime = context.currentTime;
            osc.frequency.setValueAtTime(3000 + Math.random() * 2000, startTime);
            osc.frequency.exponentialRampToValueAtTime(2000, startTime + 0.2);
            g.gain.setValueAtTime(0.02, startTime);
            g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);
            osc.connect(g);
            g.connect(gainNode);
            osc.start();
            osc.stop(startTime + 0.2);
        }, 4000 + Math.random() * 6000);
        noise.connect(filter);
        filter.connect(gainNode);
        noise.start(0);
        return { noise, filter, interval };
    };

    const createCafeSound = (context, gainNode) => {
        const noise = createBrownNoise(context);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        const interval = setInterval(() => {
            if (!audioNodesRef.current.gainNode) return clearInterval(interval);
            const osc = context.createOscillator();
            const g = context.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2500 + Math.random() * 1000, context.currentTime);
            g.gain.setValueAtTime(0.01, context.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05);
            osc.connect(g);
            g.connect(gainNode);
            osc.start();
            osc.stop(context.currentTime + 0.05);
        }, 7000 + Math.random() * 10000);
        noise.connect(filter);
        filter.connect(gainNode);
        noise.start(0);
        return { noise, filter, interval };
    };

    const createPianoSound = (context, gainNode) => {
        const freqs = [220, 277.18, 329.63, 415.30];
        const oscillators = freqs.map(f => {
            const osc = context.createOscillator();
            const g = context.createGain();
            osc.frequency.value = f;
            g.gain.value = 0.04;
            const lfo = context.createOscillator();
            const lfoGain = context.createGain();
            lfo.frequency.value = 2 + Math.random();
            lfoGain.gain.value = 2;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            osc.connect(g);
            g.connect(gainNode);
            osc.start(0);
            return { osc, g, lfo };
        });
        return { oscillators };
    };

    const playSound = (sound) => {
        stopInternetMusic();
        if (activeSound === sound.id) {
            stopAllSounds();
            setActiveSound(null);
        } else {
            stopAllSounds();
            const context = createAudioContext();
            const gainNode = context.createGain();
            gainNode.gain.value = 0;
            gainNode.connect(context.destination);
            gainNode.gain.linearRampToValueAtTime(isMuted ? 0 : volume, context.currentTime + 1.5);
            let nodes;
            switch (sound.generator) {
                case 'rain': nodes = createRainSound(context, gainNode); break;
                case 'ocean': nodes = createOceanSound(context, gainNode); break;
                case 'forest': nodes = createForestSound(context, gainNode); break;
                case 'cafe': nodes = createCafeSound(context, gainNode); break;
                case 'piano': nodes = createPianoSound(context, gainNode); break;
                default: nodes = createRainSound(context, gainNode);
            }
            audioNodesRef.current = { ...nodes, gainNode, context };
            setActiveSound(sound.id);
        }
    };

    const stopAllSounds = () => {
        if (audioNodesRef.current.interval) clearInterval(audioNodesRef.current.interval);
        Object.values(audioNodesRef.current).forEach(node => {
            if (node && typeof node.stop === 'function') try { node.stop(); } catch (e) { }
            if (node && Array.isArray(node.oscillators)) {
                node.oscillators.forEach(n => {
                    if (n.osc) try { n.osc.stop(); } catch (e) { }
                    if (n.lfo) try { n.lfo.stop(); } catch (e) { }
                });
            }
        });
        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch (e) { }
            audioContextRef.current = null;
        }
        audioNodesRef.current = {};
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioNodesRef.current.gainNode) audioNodesRef.current.gainNode.gain.value = newVolume;
        internetAudioRef.current.volume = newVolume;
    };

    return (
        <div className="glass-card p-5 space-y-4 overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                <div className="flex bg-primary/20 p-1 rounded-xl gap-1">
                    {['ambient', 'music', 'search'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setActiveMode(mode)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeMode === mode ? 'bg-white dark:bg-accent text-accent dark:text-white shadow-sm' : 'text-secondary hover:bg-secondary/20'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-xl bg-secondary/30 text-secondary transition hover:scale-110"
                >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeMode === 'ambient' && (
                    <motion.div
                        key="ambient"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-5 gap-2">
                            {sounds.map(sound => (
                                <button
                                    key={sound.id}
                                    onClick={() => playSound(sound)}
                                    className={`p-3 rounded-xl transition-all ${activeSound === sound.id ? `bg-gradient-to-br ${sound.color} text-white shadow-lg` : 'bg-secondary/40 text-secondary hover:bg-secondary/60'}`}
                                >
                                    {sound.icon}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { name: 'Rainy Cafe', sound: 'rain' },
                                { name: 'Deep Ocean', sound: 'ocean' }
                            ].map(preset => (
                                <button
                                    key={preset.name}
                                    className="p-2.5 rounded-xl bg-bg-secondary border border-divider text-[9px] font-black uppercase text-secondary hover:border-accent transition-all text-left flex justify-between group"
                                    onClick={() => playSound(sounds.find(s => s.id === preset.sound))}
                                >
                                    {preset.name}
                                    <Play size={10} className="opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeMode === 'music' && (
                    <motion.div
                        key="music"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                            <Radio size={20} className="text-indigo-600 animate-pulse" />
                            <div>
                                <p className="text-[10px] font-black text-primary">LIVE LO-FI RADIO</p>
                                <p className="text-[9px] text-secondary font-medium">Chilled study beats from Global Streams</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {curatedMusic.map(track => (
                                <button
                                    key={track.id}
                                    onClick={() => playInternetMusic(track)}
                                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${activeInternetTrack?.id === track.id ? 'bg-accent/10 border border-accent ring-2 ring-accent/5' : 'bg-secondary/20 border border-transparent hover:border-divider'}`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
                                        {activeInternetTrack?.id === track.id ? <Pause size={14} /> : <Play size={14} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-primary">{track.name}</p>
                                        <p className="text-[9px] text-secondary font-bold uppercase">{track.artist}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeMode === 'search' && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search any music/lo-fi..."
                                className="w-full bg-primary/40 border border-divider rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-accent"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-secondary hover:text-accent">
                                <Search size={14} />
                            </button>
                        </form>

                        {/* YouTube Focus Player */}
                        {activeInternetTrack?.type === 'youtube' && (
                            <div className="rounded-xl overflow-hidden aspect-video bg-black shadow-lg shadow-indigo-500/10">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${activeInternetTrack.videoId}?autoplay=1`}
                                    title="YouTube Focus Music"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}

                        <div className="max-h-[150px] overflow-y-auto pr-1 no-scrollbar space-y-2">
                            {searchResults.length > 0 ? searchResults.map(res => (
                                <button
                                    key={res.id}
                                    onClick={() => {
                                        stopAllSounds();
                                        setActiveSound(null);
                                        setActiveInternetTrack({ type: 'youtube', videoId: res.videoId, title: res.title });
                                    }}
                                    className="w-full p-3 rounded-xl bg-secondary/20 border border-transparent hover:border-accent group flex items-center gap-3 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center">
                                        <Youtube size={16} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[10px] font-black text-primary truncate max-w-[120px]">{res.title}</p>
                                        <p className="text-[9px] text-secondary font-bold">YouTube Focus • {res.duration}</p>
                                    </div>
                                    <Play size={12} className="text-accent opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            )) : (
                                <div className="text-center py-6">
                                    <Music size={32} className="mx-auto text-secondary opacity-20" />
                                    <p className="text-[9px] text-secondary font-medium mt-2">Search focus music on the internet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Volume Control */}
            <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center text-[8px] font-black text-secondary uppercase tracking-widest">
                    <span>Focus Intensity</span>
                    <span>{Math.round(volume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                />
            </div>
        </div>
    );
};

export default AmbientSoundPlayer;
