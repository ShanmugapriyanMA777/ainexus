import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, KeyRound, Globe, ArrowRight, Github, Chrome, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMode = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithOAuth, resetPassword, isDemo } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/');
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Please enter your full name');
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setMessage('Registration successful! Please sign in.');
        setMode('login');
      } else {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Password reset link sent to your email.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw error;
      if (isDemo) {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OAuth authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLaunchSandbox = async () => {
    // In local sandbox fallback, signing in with demo credentials unlocks the app instantly
    setSubmitting(true);
    try {
      await signIn('alex@nexus.ai', 'sandbox');
      window.location.href = '/';
    } catch (err: any) {
      setError('Sandbox launch failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-zinc-950 px-4 py-12 text-white overflow-hidden select-none">
      
      {/* 1. Backdrop gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-violet-900/10 blur-[120px] bg-gradient-radial" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-indigo-900/10 blur-[120px] bg-gradient-radial" />
        <div className="absolute left-[30%] top-[30%] h-[40%] w-[40%] rounded-full bg-violet-600/5 blur-[160px] bg-gradient-radial" />
      </div>

      {/* 2. Glassmorphic Outer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, cubicBezier: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-black/60"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-2xl shadow-lg shadow-violet-600/30">
            N
          </div>
          <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight text-white">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            {mode === 'login' && 'Enter your credentials to access your workspace'}
            {mode === 'signup' && 'Get started with your collaborative AI workspace'}
            {mode === 'forgot' && 'We will send a reset link to your email'}
          </p>
        </div>

        {/* Error / Alert Banners */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2"
            >
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-zinc-500" size={16} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-zinc-500" size={16} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                required
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-[10px] text-zinc-400 hover:text-white hover:underline transition-all"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/10 hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            <span>{submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Third Party OAuth logins */}
        {mode !== 'forgot' && (
          <>
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <span className="relative bg-zinc-950 px-3 text-[10px] uppercase tracking-wider text-zinc-500">
                Or connect with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuthLogin('google')}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <Chrome size={14} />
                <span>Google</span>
              </button>
              <button
                onClick={() => handleOAuthLogin('github')}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <Github size={14} />
                <span>GitHub</span>
              </button>
            </div>
          </>
        )}

        {/* Tab Swappers */}
        <div className="mt-8 text-center text-xs text-zinc-400">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="font-semibold text-violet-400 hover:underline hover:text-violet-300">
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="font-semibold text-violet-400 hover:underline hover:text-violet-300">
                Sign in
              </button>
            </span>
          )}
        </div>

        {/* SANDBOX BYPASS BUTTON */}
        <div className="mt-6 border-t border-white/5 pt-4 text-center">
          <button
            onClick={handleLaunchSandbox}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/5 py-2.5 text-xs font-semibold text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 transition-all"
          >
            <KeyRound size={13} />
            <span>Launch Demo Sandbox Session</span>
          </button>
          <span className="block mt-1 text-[8px] text-zinc-500">
            For local testing. Bypasses live Auth/DB connection.
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
