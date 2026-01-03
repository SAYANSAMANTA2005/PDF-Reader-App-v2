/**
 * Text-to-Speech Service
 * Provides advanced speech synthesis with speed control, voice selection, and highlighting
 */

class TextToSpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.speechQueue = [];
        this.currentQueueIndex = 0;
        this.onHighlight = null;
        this.onEnd = null;
        this.selectedVoice = null;
        this.speechRate = 1;
        this.speechPitch = 1;
        this.speechVolume = 1;

        this.loadVoices();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }

        // Chrome speech synthesis bug workarounds
        this._stuckCheckInterval = setInterval(() => {
            if (this.isPlaying && !this.isPaused && !this.synth.speaking) {
                console.warn('Speech synthesis appears stuck. Resetting...');
                this.stop();
            }
        }, 5000);
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        if (this.voices.length > 0 && !this.selectedVoice) {
            const preferredVoice = this.voices.find(v =>
                v.name.includes("Google") || v.name.includes("Natural")
            ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
            this.selectedVoice = preferredVoice;
        }
    }

    getAvailableVoices() {
        return this.voices;
    }

    setVoice(voice) {
        this.selectedVoice = voice;
    }

    setSpeechRate(rate) {
        this.speechRate = Math.max(0.5, Math.min(2.0, rate));
        if (this.isPlaying && this.currentUtterance) {
            // Speed can't be changed mid-speech in Web Speech API easily
            // We'd have to stop and restart from boundary
        }
    }

    setSpeechPitch(pitch) {
        this.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
    }

    setSpeechVolume(volume) {
        this.speechVolume = Math.max(0, Math.min(1, volume));
        if (this.isPlaying && this.currentUtterance) {
            // Volume also can't usually be changed mid-utterance
        }
    }

    speakText(text, onHighlight = null) {
        if (!text) return;

        this.stop();

        // Small delay to ensure synth.cancel() completes
        setTimeout(() => {
            this.isPlaying = true;
            this.isPaused = false;
            this.onHighlight = onHighlight;

            const utterance = new SpeechSynthesisUtterance(text);

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            utterance.rate = this.speechRate;
            utterance.pitch = this.speechPitch;
            utterance.volume = this.speechVolume;

            utterance.onboundary = (event) => {
                if (this.onHighlight && event.name === 'word') {
                    const charIndex = event.charIndex;
                    const nextCharIndex = event.charIndex + (event.charLength || 1);
                    this.onHighlight(charIndex, nextCharIndex);
                }
            };

            utterance.onend = () => {
                this._cleanup();
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                this._cleanup();
            };

            this.currentUtterance = utterance;
            this.synth.speak(utterance);
        }, 50);
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
        }
    }

    resume() {
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
        }
    }

    stop() {
        this.synth.cancel();
        this._cleanup();
    }

    _cleanup() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.speechQueue = [];
        this.currentQueueIndex = 0;
        if (this.onEnd) this.onEnd();
    }

    isSpeaking() {
        return this.isPlaying;
    }

    speakQueue(textArray, onHighlight = null, pauseDuration = 500) {
        if (!textArray || textArray.length === 0) return;

        this.stop();

        setTimeout(() => {
            this.speechQueue = textArray;
            this.currentQueueIndex = 0;
            this.onHighlight = onHighlight;
            this.isPlaying = true;
            this.playNextInQueue(pauseDuration);
        }, 100);
    }

    playNextInQueue(pauseDuration) {
        if (this.currentQueueIndex >= this.speechQueue.length) {
            this._cleanup();
            return;
        }

        if (!this.isPlaying) return; // Stopped externally

        const text = this.speechQueue[this.currentQueueIndex];
        const utterance = new SpeechSynthesisUtterance(text);

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        utterance.rate = this.speechRate;
        utterance.pitch = this.speechPitch;
        utterance.volume = this.speechVolume;

        utterance.onboundary = (event) => {
            if (this.onHighlight && event.name === 'word') {
                this.onHighlight(event.charIndex, event.charIndex + (event.charLength || 1));
            }
        };

        utterance.onend = () => {
            this.currentQueueIndex++;
            if (this.currentQueueIndex < this.speechQueue.length) {
                setTimeout(() => {
                    this.playNextInQueue(pauseDuration);
                }, pauseDuration);
            } else {
                this._cleanup();
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis queue error:', event);
            this.currentQueueIndex++;
            this.playNextInQueue(pauseDuration);
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    destroy() {
        if (this._stuckCheckInterval) {
            clearInterval(this._stuckCheckInterval);
        }
    }
}

export const ttsService = new TextToSpeechService();
export default TextToSpeechService;

