import { useState, useCallback, useRef } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

const SILENCE_TIMEOUT = 700;

export function useSpeechRecognition(onResult) {
  const [dictating, setDictating] = useState(false);
  const [dictLiveText, setDictLiveText] = useState('');
  const dictRecognitionRef = useRef(null);
  const dictRestartRef = useRef(null);
  const dictSilenceRef = useRef(null);

  const startDictation = useCallback(() => {
    if (!SpeechRecognition) return;
    setDictating(true);
    setDictLiveText('');

    const startRec = () => {
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (event) => {
        const result = event.results[0];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          clearTimeout(dictSilenceRef.current);
          if (transcript.length > 0) {
            onResult(transcript);
          }
          setDictLiveText('');
        } else {
          setDictLiveText(transcript);
          clearTimeout(dictSilenceRef.current);
          dictSilenceRef.current = setTimeout(() => {
            if (dictRecognitionRef.current) {
              try { dictRecognitionRef.current.stop(); } catch {}
            }
          }, SILENCE_TIMEOUT);
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
      };

      rec.onend = () => {
        if (dictRecognitionRef.current) {
          dictRestartRef.current = setTimeout(startRec, 50);
        }
      };

      dictRecognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        dictRestartRef.current = setTimeout(startRec, 100);
      }
    };

    startRec();
  }, [onResult]);

  const stopDictation = useCallback(() => {
    clearTimeout(dictRestartRef.current);
    clearTimeout(dictSilenceRef.current);
    if (dictRecognitionRef.current) {
      dictRecognitionRef.current.onend = null;
      dictRecognitionRef.current.abort();
      dictRecognitionRef.current = null;
    }
    setDictating(false);
    setDictLiveText('');
  }, []);

  const toggleDictation = useCallback(() => {
    if (dictating) stopDictation();
    else startDictation();
  }, [dictating, stopDictation, startDictation]);

  return {
    dictating,
    dictLiveText,
    toggleDictation,
    stopDictation,
    supported: !!SpeechRecognition
  };
}
