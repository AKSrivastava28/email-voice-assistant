import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { 
  Sparkles, 
  Settings, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  Sliders, 
  ChevronRight,
  Info,
  X,
  Users
} from 'lucide-react';
import GoogleAuth from './components/GoogleAuth';
import VoiceController from './components/VoiceController';
import './App.css';

// Read configurations safely (avoiding exposing them in the settings panel)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "447103694308-gvjaf5ovr72cqlf1mh3aepis5j01qapv.apps.googleusercontent.com";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);

  // Contacts state loaded from localStorage
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('voicemail_contacts');
    return saved ? JSON.parse(saved) : {};
  });

  // Auth token state
  const [token, setToken] = useState(() => {
    return localStorage.getItem('voicemail_oauth_token') || null;
  });

  // App flow states: 'auth' | 'voice' | 'draft' | 'sent'
  const [step, setStep] = useState('auth');
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'sending' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);

  // Email draft state (stores details of sent/failed email)
  const [draft, setDraft] = useState({
    recipient: '',
    subject: '',
    body: ''
  });

  // Sync token and step
  useEffect(() => {
    if (token) {
      localStorage.setItem('voicemail_oauth_token', token);
      if (step === 'auth') {
        setStep('voice');
      }
    } else {
      localStorage.removeItem('voicemail_oauth_token');
      setStep('auth');
    }
  }, [token]);

  // Save config settings (Contacts list only)
  const saveSettings = (newContacts) => {
    localStorage.setItem('voicemail_contacts', JSON.stringify(newContacts));
    setContacts(newContacts);
    setShowSettings(false);
  };

  const handleLogout = () => {
    setToken(null);
    setStep('auth');
    setDraft({ recipient: '', subject: '', body: '' });
    setErrorMsg(null);
    setStatus('idle');
  };

  // 1. Process voice transcript and auto-send in one unified step
  const handleTranscriptSubmit = async (transcriptText) => {
    if (!token) {
      setErrorMsg('No Google access token found. Please sign in again.');
      setStep('auth');
      return;
    }

    setStatus('processing');
    setErrorMsg(null);
    
    try {
      const response = await fetch(`${API_URL}/api/process-and-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: transcriptText,
          access_token: token,
          contacts: contacts
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDraft({
          recipient: data.draft?.recipient || '',
          subject: data.draft?.subject || '',
          body: data.draft?.body || ''
        });
        setStep('sent');
        setStatus('idle');
      } else {
        // Fallback to manual review if auto-send failed (e.g., recipient email unresolved),
        // allowing the user to type the recipient and send manually.
        if (data.draft) {
          setDraft({
            recipient: data.draft.recipient || '',
            subject: data.draft.subject || '',
            body: data.draft.body || ''
          });
          setStep('draft');
          setErrorMsg(data.error || 'Auto-sending failed. Please review details, modify the recipient, and send manually.');
        } else {
          throw new Error(data.error || 'AI could not process transcript.');
        }
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to send email: ${err.message}. Verify that your backend server is running and your Groq/Gemini API key is configured.`);
      setStatus('idle');
    }
  };

  // 2. Fallback manual send endpoint (used if auto-send drops back to draft editor)
  const handleSendEmail = async () => {
    if (!token) {
      setErrorMsg('No Google access token found. Please sign in again.');
      setStep('auth');
      return;
    }
    
    if (!draft.recipient.trim()) {
      setErrorMsg('Please specify a recipient email address.');
      return;
    }

    setStatus('sending');
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: draft.recipient,
          subject: draft.subject,
          body: draft.body,
          access_token: token
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStep('sent');
        setStatus('idle');
      } else {
        throw new Error(data.error || 'Failed to send email.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to send email: ${err.message}. Your Google access token might have expired. Try disconnecting and reconnecting.`);
      setStatus('idle');
    }
  };

  const handleEditDraftChange = (field, value) => {
    setDraft(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between py-6 border-b border-slate-905 mb-8">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Mail className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            VoiceMail <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold border border-indigo-500/10">AI</span>
          </h1>
          <p className="text-xs text-gray-500">Voice-Activated Gmail Dispatch</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2.5 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 rounded-xl transition-all duration-300 text-gray-400 hover:text-gray-200 cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
          title="Manage Contact Book"
        >
          <Users size={16} className="text-indigo-400" />
          <span className="hidden sm:inline">Contacts</span>
        </button>
      </div>
    </header>
  );

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="min-h-screen bg-slate-950 text-gray-200 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-slate-900/20 border border-slate-850 p-6 md:p-8 rounded-3xl shadow-3xl backdrop-blur-xl relative">
          
          {renderHeader()}

          {/* Settings Modal (Contacts only) */}
          {showSettings && (
            <SettingsDrawer 
              initialContacts={contacts}
              onSave={saveSettings} 
              onClose={() => setShowSettings(false)} 
            />
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded-2xl flex items-start space-x-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium">
                {errorMsg}
              </div>
              <button 
                onClick={() => setErrorMsg(null)}
                className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Auth Step */}
          {step === 'auth' && (
            <div className="space-y-6 text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 animate-pulse">
                <Mail size={36} />
              </div>
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-white mb-2">Connect Your Email</h2>
                <p className="text-sm text-gray-400">
                  Log in with Google to allow this application to securely compose and send emails via Gmail on your behalf.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <GoogleAuth 
                  token={token}
                  onLoginSuccess={(accessToken) => setToken(accessToken)}
                  onLogout={handleLogout}
                />
              </div>
            </div>
          )}

          {/* Recording & Auto-Sending Step */}
          {step === 'voice' && (
            <div className="space-y-6">
              <GoogleAuth 
                token={token}
                onLoginSuccess={(accessToken) => setToken(accessToken)}
                onLogout={handleLogout}
              />
              
              <div className="bg-slate-900/10 border border-slate-850 p-4 rounded-2xl flex items-center space-x-3 text-xs text-gray-400">
                <Info size={16} className="text-blue-400 shrink-0" />
                <p>
                  <strong>How to send:</strong> Dictate your email naturally (e.g. *"Email gk about project sync saying we are on schedule"*), and conclude by saying **"...and send it"** or **"...send the email"**.
                </p>
              </div>

              <VoiceController 
                onTranscriptComplete={handleTranscriptSubmit}
                isProcessing={status === 'processing'}
              />
            </div>
          )}

          {/* Manual Review Fallback Step */}
          {step === 'draft' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Sparkles size={20} className="text-indigo-400" />
                  <span>Review Draft Details</span>
                </h2>
                <button
                  onClick={() => setStep('voice')}
                  className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Record Again</span>
                </button>
              </div>

              <div className="bg-slate-905 p-4 rounded-xl text-xs text-amber-400 border border-amber-500/10">
                Auto-sending was bypassed because the recipient email was not resolved. Please correct it manually below.
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4 backdrop-blur-md">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recipient Email</label>
                  <input
                    type="email"
                    value={draft.recipient}
                    onChange={(e) => handleEditDraftChange('recipient', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-gray-200 rounded-xl text-sm transition-all focus:outline-none placeholder-gray-700"
                    placeholder="e.g. tushar@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => handleEditDraftChange('subject', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-gray-200 rounded-xl text-sm transition-all focus:outline-none placeholder-gray-700"
                    placeholder="Email Subject"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Body</label>
                  <textarea
                    value={draft.body}
                    onChange={(e) => handleEditDraftChange('body', e.target.value)}
                    className="w-full h-48 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-gray-200 rounded-xl text-sm transition-all focus:outline-none placeholder-gray-700 resize-none leading-relaxed"
                    placeholder="Write email body..."
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setStep('voice')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-gray-300 font-semibold rounded-xl text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleSendEmail}
                    disabled={status === 'sending'}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'sending' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Step showing what was sent */}
          {step === 'sent' && (
            <div className="space-y-6 text-center py-6 animate-scaleUp">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} className="animate-pulse" />
              </div>
              
              <div className="max-w-md mx-auto space-y-1">
                <h2 className="text-2xl font-bold text-white">Email Sent!</h2>
                <p className="text-xs text-gray-400">
                  Dispatched securely through the Gmail API.
                </p>
              </div>

              {/* Sent summary card */}
              <div className="max-w-md mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-left space-y-3 backdrop-blur-md">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sent Summary</h3>
                <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 block font-medium">To:</span>
                    <span className="text-gray-300 font-semibold">{draft.recipient}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-medium">Subject:</span>
                    <span className="text-gray-300 font-semibold">{draft.subject}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-medium">Body:</span>
                    <p className="text-gray-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-905 mt-1 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-normal">
                      {draft.body}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setDraft({ recipient: '', subject: '', body: '' });
                    setStep('voice');
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer text-sm"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

// Sub-component Settings Drawer Panel (Contact Book only)
function SettingsDrawer({ initialContacts, onSave, onClose }) {
  // Format initialContacts object to text config format (name: email)
  const [contactsText, setContactsText] = useState(() => {
    return Object.entries(initialContacts)
      .map(([name, email]) => `${name}: ${email}`)
      .join('\n');
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse contactsText back into a dictionary
    const parsedContacts = {};
    contactsText.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const name = parts[0].trim().toLowerCase();
        const email = parts.slice(1).join(':').trim();
        if (name && email) {
          parsedContacts[name] = email;
        }
      }
    });

    onSave(parsedContacts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-850 hover:bg-slate-800 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-indigo-400" />
          <span>Manage Contact Book</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Contact Book (Aliases)</span>
            </label>
            <textarea
              value={contactsText}
              onChange={(e) => setContactsText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 text-gray-200 rounded-xl text-sm font-mono transition-all focus:outline-none placeholder-gray-700 resize-none"
              placeholder="gk: gksrivastava12@gmail.com&#10;tushar: tushar28a@gmail.com"
            />
            <span className="text-[10px] text-gray-500 block mt-1.5 leading-relaxed">
              Format as <code className="bg-slate-950 px-1 py-0.5 rounded text-gray-300">alias: email</code>, one contact per line. Names in voice transcripts matching these aliases will be auto-resolved to their email addresses.
            </span>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-gray-300 font-semibold rounded-xl text-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm cursor-pointer transition-colors"
            >
              Save Contacts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
