import { useState, useEffect, useRef } from 'react';

export const useSpeech = () => {
  // Speech to Text (STT) States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSTTSupported, setIsSTTSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text to Speech (TTS) States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  
  // Initialize speech recognition and synthesis
  useEffect(() => {
    // 1. STT Initialization
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSTTSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        console.error('Speech Recognition Error:', err);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // 2. TTS Voice Initialization
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        // Default to a premium English voice if available
        const enVoice = availableVoices.find(
          (v) => v.name.includes('Google') || v.lang.startsWith('en-US')
        );
        setSelectedVoice(enVoice || availableVoices[0] || null);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Speech to Text Controls
  const startListening = () => {
    if (!isSTTSupported || !recognitionRef.current) return;
    setTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopListening = () => {
    if (!isSTTSupported || !recognitionRef.current) return;
    setIsListening(false);
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Text to Speech Controls
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop currently speaking
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!text) return;

    // Clean markdown text before speaking so it doesn't read markdown symbols
    const cleanText = text
      .replace(/[\#\*\_`\[\]\(\)\-\+\>\!]/g, '') // remove markdown indicators
      .replace(/```[\s\S]*?```/g, 'Code block omitted.'); // omit entire code blocks

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = speechRate;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return {
    isListening,
    transcript,
    isSTTSupported,
    startListening,
    stopListening,
    toggleListening,
    
    // TTS
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    speakText,
    stopSpeaking,
  };
};
