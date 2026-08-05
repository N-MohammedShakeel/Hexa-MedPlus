import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Wraps the browser's native SpeechRecognition API.
 * Calls onTranscript(text) once per finalized speech segment — safe to append
 * directly to a text field, since each callback carries only the new segment
 * (not the full growing transcript like the raw onresult event does).
 */
export function useSpeechToText({ onTranscript, lang = 'en-US' } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef(null);
    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;

    const SpeechRecognitionImpl = typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : null;
    const isSupported = !!SpeechRecognitionImpl;

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const start = useCallback(() => {
        if (!isSupported || isListening) return;

        const recognition = new SpeechRecognitionImpl();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    onTranscriptRef.current?.(transcript);
                } else {
                    interim += transcript;
                }
            }
            setInterimTranscript(interim);
        };
        recognition.onerror = () => {
            setIsListening(false);
            setInterimTranscript('');
        };
        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [isSupported, isListening, lang, SpeechRecognitionImpl]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    return { isSupported, isListening, interimTranscript, start, stop };
}
