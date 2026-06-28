import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function VoiceController({ onTranscriptComplete, isProcessing }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let finalAccumulated = '';
      let interimAccumulated = '';

      for (let i = 0; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalAccumulated += text + ' ';
        } else {
          interimAccumulated += text;
        }
      }

      const fullTranscript = (finalAccumulated + ' ' + interimAccumulated).trim();
      transcriptRef.current = fullTranscript;
      const lowerText = fullTranscript.toLowerCase();
      
      // Auto-send trigger keywords
      const triggerWords = ["send the email", "send email", "send mail", "send it"];
      let detectedTrigger = null;
      for (const word of triggerWords) {
        if (lowerText.endsWith(word)) {
          detectedTrigger = word;
          break;
        }
      }

      if (detectedTrigger) {
        // Stop recording immediately
        rec.stop();
        setIsListening(false);

        // Extract transcript before trigger word
        const triggerIndex = lowerText.lastIndexOf(detectedTrigger);
        let cleanText = fullTranscript.substring(0, triggerIndex).trim();

        // Remove trailing "and" or commas if present
        if (cleanText.toLowerCase().endsWith("and")) {
          cleanText = cleanText.substring(0, cleanText.length - 3).trim();
        }
        cleanText = cleanText.replace(/[,]+$/, "").trim();

        // Auto trigger submit
        if (cleanText && !isSubmittedRef.current) {
          isSubmittedRef.current = true;
          onTranscriptComplete(cleanText);
        }
      }
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone permission is required for speech recognition. Please allow microphone access in your browser settings.');
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscriptComplete]);

  const toggleListening = () => {
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Auto-submit when user manually stops recording
      setTimeout(() => {
        const textToSubmit = transcriptRef.current.trim();
        if (textToSubmit && !isSubmittedRef.current) {
          isSubmittedRef.current = true;
          onTranscriptComplete(textToSubmit);
        }
      }, 300);
    } else {
      transcriptRef.current = '';
      isSubmittedRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Mic Controller Card */}
      <div className="flex flex-col items-center justify-center p-10 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md relative overflow-hidden">
        {/* Animated Glow behind mic */}
        {isListening && (
          <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
        )}
        
        {/* Audio Wave / Processing Animation */}
        <div className="h-12 flex items-center justify-center space-x-1.5 mb-6 w-full">
          {isProcessing ? (
            <div className="flex items-center space-x-2 text-indigo-400">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold animate-pulse">Sending email...</span>
            </div>
          ) : isListening ? (
            [...Array(11)].map((_, i) => (
              <span
                key={i}
                className="w-1.5 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-full animate-bounce"
                style={{
                  height: `${Math.random() * 32 + 10}px`,
                  animationDuration: `${0.4 + i * 0.08}s`,
                }}
              />
            ))
          ) : (
            <span className="text-sm text-gray-500 font-medium">Click the microphone to start speaking</span>
          )}
        </div>

        {/* Big Mic Button */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 transform active:scale-95 shadow-2xl ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white ring-8 ring-red-500/20 shadow-red-500/30'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white ring-8 ring-blue-500/10 shadow-blue-500/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isListening ? (
            <MicOff size={44} className="animate-pulse" />
          ) : (
            <Mic size={44} />
          )}
        </button>

        {isListening && (
          <span className="mt-4 text-xs font-semibold tracking-widest text-red-400 animate-pulse uppercase">
            Listening Active
          </span>
        )}

        {!isSupported && (
          <div className="mt-6 w-full text-left bg-amber-950/20 border border-amber-500/15 p-4 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 text-xs">
              <AlertCircle size={14} />
              <span>Speech recognition is not supported in this browser. Please type your message below.</span>
            </div>
            
            <textarea
              id="fallback-transcript"
              className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-800 text-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500/40"
              placeholder="e.g. Send email to gk about project update saying we are on schedule..."
            />
            <button
              onClick={() => {
                const el = document.getElementById("fallback-transcript");
                if (el && el.value.trim()) {
                  onTranscriptComplete(el.value.trim());
                }
              }}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-xl"
            >
              Send Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
