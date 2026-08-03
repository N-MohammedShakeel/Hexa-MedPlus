import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '../../common/hooks/useSpeechToText';

/**
 * Mic button that transcribes speech and appends each finalized segment
 * via onTranscript(text). Renders disabled with a tooltip if the browser
 * doesn't support the Web Speech API (e.g. Firefox, Safari < 14.1).
 */
export default function VoiceInputButton({ onTranscript, className = '', size = 'md' }) {
    const { isSupported, isListening, start, stop } = useSpeechToText({ onTranscript });

    const dimensions = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    if (!isSupported) {
        return (
            <button
                type="button"
                disabled
                title="Voice input isn't supported in this browser (try Chrome or Edge)"
                className={`${dimensions} rounded-lg flex items-center justify-center text-neutral-300 dark:text-slate-600 cursor-not-allowed flex-shrink-0 ${className}`}
            >
                <MicOff className={iconSize} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => (isListening ? stop() : start())}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            className={`${dimensions} rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                isListening
                    ? 'bg-danger-100 text-danger-600 animate-pulse'
                    : 'text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:text-slate-400 dark:hover:text-primary-400'
            } ${className}`}
        >
            <Mic className={iconSize} />
        </button>
    );
}
