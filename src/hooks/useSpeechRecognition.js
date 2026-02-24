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
  const lastTranscriptRef = useRef('');
  const finalizedRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const finalize = useCallback((transcript) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    clearTimeout(dictSilenceRef.current);
    clearTimeout(dictRestartRef.current);
    if (dictRecognitionRef.current) {
      dictRecognitionRef.current.onend = null;
      try { dictRecognitionRef.current.abort(); } catch {}
      dictRecognitionRef.current = null;
    }
    setDictating(false);
    setDictLiveText('');
    const text = (transcript || lastTranscriptRef.current || '').trim();
    if (text.length > 0) {
      onResultRef.current(text);
    }
  }, []);

  const startDictation = useCallback(() => {
    if (!SpeechRecognition) return;
    setDictating(true);
    setDictLiveText('');
    lastTranscriptRef.current = '';
    finalizedRef.current = false;

    const startRec = () => {
      if (finalizedRef.current) return;
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (event) => {
        const result = event.results[0];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          finalize(transcript);
          return;
        } else {
          lastTranscriptRef.current = transcript;
          setDictLiveText(transcript);
          clearTimeout(dictSilenceRef.current);
          dictSilenceRef.current = setTimeout(() => {
            finalize(lastTranscriptRef.current);
          }, SILENCE_TIMEOUT);
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
      };

      rec.onend = () => {
        if (finalizedRef.current) return;
        if (lastTranscriptRef.current) {
          finalize(lastTranscriptRef.current);
        } else if (dictRecognitionRef.current) {
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
  }, [finalize]);

  const stopDictation = useCallback(() => {
    if (lastTranscriptRef.current && !finalizedRef.current) {
      finalize(lastTranscriptRef.current);
      return;
    }
    finalizedRef.current = true;
    clearTimeout(dictRestartRef.current);
    clearTimeout(dictSilenceRef.current);
    if (dictRecognitionRef.current) {
      dictRecognitionRef.current.onend = null;
      dictRecognitionRef.current.abort();
      dictRecognitionRef.current = null;
    }
    setDictating(false);
    setDictLiveText('');
  }, [finalize]);

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
