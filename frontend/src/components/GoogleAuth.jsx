import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { LogIn, LogOut, CheckCircle2, User } from 'lucide-react';

export default function GoogleAuth({ onLoginSuccess, onLogout, token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user profile info when token is acquired
  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    setLoading(true);
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching Google profile:', err);
        setError('Connected, but could not load profile details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Configure Google Login using implicit flow to obtain access_token directly
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse?.access_token) {
        onLoginSuccess(tokenResponse.access_token);
        setError(null);
      } else {
        setError('Login succeeded but no access token was returned.');
      }
    },
    onError: (err) => {
      console.error('Google login failed:', err);
      setError('Google Authentication failed. Please try again.');
    },
    // Request Gmail send scope
    scope: 'https://www.googleapis.com/auth/gmail.send',
  });

  if (token && profile) {
    return (
      <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {profile.picture ? (
            <img
              src={profile.picture}
              alt={profile.name}
              className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User size={20} />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-gray-200 text-sm">{profile.name}</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <span className="text-xs text-gray-400 block">{profile.email}</span>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/30 text-gray-300 hover:text-red-400 rounded-xl transition-all duration-300 text-xs font-medium cursor-pointer"
        >
          <LogOut size={14} />
          <span>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-2xl backdrop-blur-md">
      <div className="text-center md:text-left mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Google Account Connection</h3>
        <p className="text-xs text-gray-500 mt-1">
          Connect your Google account to grant permissions to send emails via Gmail API.
        </p>
      </div>
      
      {error && (
        <div className="mb-3 p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={() => login()}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Connect with Google</span>
          </>
        )}
      </button>
    </div>
  );
}
