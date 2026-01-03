import React, { useState, useEffect, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import { ttsService } from '../utils/textToSpeechService';
import {
    Play,
    Pause,
    Square,
    Volume2,
    Zap,
    Maximize2,
    Type,
    ChevronDown,
    ChevronUp,
    X,
    RotateCcw
} from 'lucide-react';
import '../styles/textToSpeech.css';

const TextToSpeechPanel = ({ onClose }) => {
    const {
        pdfDocument,
        currentPage,
        numPages
    } = usePDF();

    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedText, setSelectedText] = useState('');
    const [speechRate, setSpeechRate] = useState(1.0);
    const [speechPitch, setPitch] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoiceState] = useState(null);
    const [isHighlighting, setIsHighlighting] = useState(true);
    const [highlightedRange, setHighlightedRange] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, playing, paused

    // Initialize voices
    useEffect(() => {
        const availableVoices = ttsService.getAvailableVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0) {
            const preferred = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
            setSelectedVoiceState(preferred);
            ttsService.setVoice(preferred);
        }

        // Capture initial selection if it exists
        const selection = window.getSelection().toString();
        if (selection) {
            setSelectedText(selection);
        }
    }, []);

    // Sync status with service
    useEffect(() => {
        const interval = setInterval(() => {
            if (ttsService.isSpeaking()) {
                if (ttsService.isPaused) {
                    setStatus('paused');
                } else {
                    setStatus('playing');
                }
            } else {
                setStatus('idle');
            }
        }, 300);
        return () => clearInterval(interval);
    }, []);

    // Handle speech rate changes
    useEffect(() => {
        ttsService.setSpeechRate(speechRate);
    }, [speechRate]);

    // Handle pitch changes
    useEffect(() => {
        ttsService.setSpeechPitch(speechPitch);
    }, [speechPitch]);

    // Handle volume changes
    useEffect(() => {
        ttsService.setSpeechVolume(volume);
    }, [volume]);

    // Handle voice selection
    const handleVoiceChange = (voice) => {
        setSelectedVoiceState(voice);
        ttsService.setVoice(voice);
    };

    // Get selected text from PDF
    const handleGetSelectedText = () => {
        const selection = window.getSelection().toString();
        if (selection) {
            setSelectedText(selection);
        } else {
            // Fallback: try to get from PDF context selection if available
            // For now, just alert
            alert('Please select text in the PDF first');
        }
    };

    // Read selected text
    const handleReadSelection = () => {
        if (!selectedText) {
            alert('Please select text or paste text to read');
            return;
        }

        const highlightCallback = isHighlighting ? (start, end) => {
            setHighlightedRange({ start, end, total: selectedText.length });
        } : null;

        ttsService.speakText(selectedText, highlightCallback);
    };

    // Read entire current page
    const handleReadPage = async () => {
        if (!pdfDocument) return;

        try {
            const page = await pdfDocument.getPage(currentPage);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            if (pageText) {
                setSelectedText(pageText);
                const highlightCallback = isHighlighting ? (start, end) => {
                    setHighlightedRange({ start, end, total: pageText.length });
                } : null;

                ttsService.speakText(pageText, highlightCallback);
            }
        } catch (error) {
            console.error('Error reading page:', error);
            alert('Failed to read page');
        }
    };

    // Read all pages
    const handleReadAllPages = async () => {
        if (!pdfDocument) return;

        try {
            const textArray = [];
            for (let i = 1; i <= Math.min(numPages, 50); i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                if (pageText) {
                    textArray.push(`Page ${i}: ${pageText}`);
                }
            }

            if (textArray.length > 0) {
                setSelectedText(textArray.join('\n\n'));
                const highlightCallback = isHighlighting ? (start, end) => {
                    setHighlightedRange({ start, end });
                } : null;

                ttsService.speakQueue(textArray, highlightCallback);
            }
        } catch (error) {
            console.error('Error reading pages:', error);
            alert('Failed to read pages');
        }
    };

    // Pause/Resume
    const handleTogglePause = () => {
        if (ttsService.isSpeaking()) {
            if (ttsService.isPaused) {
                ttsService.resume();
            } else {
                ttsService.pause();
            }
        }
    };

    // Stop
    const handleStop = () => {
        ttsService.stop();
        setHighlightedRange(null);
    };

    // Clear selection
    const handleClearSelection = () => {
        setSelectedText('');
        setHighlightedRange(null);
    };

    return (
        <div className={`tts-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="tts-header">
                <div className="tts-title-group">
                    <Volume2 size={20} className="tts-icon-main" />
                    <span className="tts-panel-title">Text-to-Speech</span>
                </div>
                <div className="tts-header-actions">
                    <button
                        className="tts-action-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                        className="tts-action-btn close-btn"
                        onClick={onClose}
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="tts-body">
                    {/* Text Input Section */}
                    <div className="tts-section">
                        <textarea
                            className="tts-textarea"
                            value={selectedText}
                            onChange={(e) => setSelectedText(e.target.value)}
                            placeholder="Enter or select text to read..."
                        />
                        <div className="tts-section-btns">
                            <button className="tts-btn btn-primary-alt" onClick={handleGetSelectedText}>
                                <Type size={16} /> Get Selected
                            </button>
                            <button className="tts-btn btn-outline" onClick={handleClearSelection}>
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="tts-section">
                        <h4 className="tts-section-label">QUICK ACTIONS</h4>
                        <div className="tts-section-btns">
                            <button className="tts-btn btn-ghost" onClick={handleReadPage}>
                                <Maximize2 size={16} /> Read Page
                            </button>
                            <button className="tts-btn btn-ghost" onClick={handleReadAllPages}>
                                <Zap size={16} /> Read All
                            </button>
                        </div>
                    </div>

                    {/* Voice Selection */}
                    <div className="tts-section">
                        <h4 className="tts-section-label">VOICE</h4>
                        <select
                            className="tts-select"
                            value={selectedVoice?.name || ''}
                            onChange={(e) => {
                                const voice = voices.find(v => v.name === e.target.value);
                                if (voice) handleVoiceChange(voice);
                            }}
                        >
                            {voices.map((voice, idx) => (
                                <option key={idx} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Controls Range Sliders */}
                    <div className="tts-controls-list">
                        <div className="tts-control-item">
                            <div className="tts-control-header">
                                <span className="tts-control-name">SPEED:</span>
                                <span className="tts-control-value">{speechRate.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={speechRate}
                                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                className="tts-range-slider"
                            />
                            <div className="tts-range-labels">
                                <span>0.5x</span>
                                <span>1x</span>
                                <span>2x</span>
                            </div>
                        </div>

                        <div className="tts-control-item">
                            <div className="tts-control-header">
                                <span className="tts-control-name">PITCH:</span>
                                <span className="tts-control-value">{speechPitch.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={speechPitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="tts-range-slider"
                            />
                            <div className="tts-range-labels">
                                <span>Low</span>
                                <span>Normal</span>
                                <span>High</span>
                            </div>
                        </div>

                        <div className="tts-control-item">
                            <div className="tts-control-header">
                                <span className="tts-control-name">VOLUME:</span>
                                <span className="tts-control-value">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="tts-range-slider"
                            />
                        </div>
                    </div>

                    {/* Highlight Checkbox */}
                    <div className="tts-highlight-toggle">
                        <label className="tts-checkbox-container">
                            <input
                                type="checkbox"
                                checked={isHighlighting}
                                onChange={(e) => setIsHighlighting(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Highlight text while reading
                        </label>
                    </div>

                    {/* Playback Controls */}
                    <div className="tts-playback-actions">
                        <button
                            className={`tts-playback-btn btn-read ${status === 'playing' ? 'active' : ''}`}
                            onClick={handleReadSelection}
                        >
                            <Play size={20} fill="currentColor" />
                            <span>Read</span>
                        </button>
                        <button
                            className={`tts-playback-btn btn-pause ${status === 'paused' ? 'active' : ''}`}
                            onClick={handleTogglePause}
                            disabled={status === 'idle'}
                        >
                            <Pause size={20} fill="currentColor" />
                            <span>Pause</span>
                        </button>
                        <button
                            className="tts-playback-btn btn-stop"
                            onClick={handleStop}
                            disabled={status === 'idle'}
                        >
                            <Square size={20} fill="currentColor" />
                            <span>Stop</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TextToSpeechPanel;

