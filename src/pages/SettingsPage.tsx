import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { AVAILABLE_MODELS } from '../services/ai';
import { ModelId } from '../types';
import { Save, User, Cpu, FileText, Key, Check, Info, ShieldAlert } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { settings, updateSettings } = useChat();

  // Settings form states
  const [fullName, setFullName] = useState('');
  const [preferredModel, setPreferredModel] = useState<ModelId>('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  // Client API key local overrides (saves to localStorage override cache)
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load initial settings values
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
    if (settings) {
      setPreferredModel(settings.preferred_model);
      setSystemPrompt(settings.system_prompt || '');
      setDarkMode(settings.dark_mode);
    }
    
    // Load local overrides
    setOpenaiKey(localStorage.getItem('VITE_OPENAI_API_KEY_OVERRIDE') || '');
    setGeminiKey(localStorage.getItem('VITE_GEMINI_API_KEY_OVERRIDE') || '');
    setOpenrouterKey(localStorage.getItem('VITE_OPENROUTER_API_KEY_OVERRIDE') || '');
  }, [user, settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({ full_name: fullName });
      if (error) throw error;
      triggerSuccess('Profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings({
        preferred_model: preferredModel,
        system_prompt: systemPrompt,
        dark_mode: darkMode,
      });
      triggerSuccess('System configurations saved.');
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      if (openaiKey) localStorage.setItem('VITE_OPENAI_API_KEY_OVERRIDE', openaiKey);
      else localStorage.removeItem('VITE_OPENAI_API_KEY_OVERRIDE');

      if (geminiKey) localStorage.setItem('VITE_GEMINI_API_KEY_OVERRIDE', geminiKey);
      else localStorage.removeItem('VITE_GEMINI_API_KEY_OVERRIDE');

      if (openrouterKey) localStorage.setItem('VITE_OPENROUTER_API_KEY_OVERRIDE', openrouterKey);
      else localStorage.removeItem('VITE_OPENROUTER_API_KEY_OVERRIDE');

      triggerSuccess('API keys updated in local memory.');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKeys(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10 select-none">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Workspace Configuration</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Fine-tune system settings, profiles, prompts, and API endpoints.</p>
          </div>
          
          {successBanner && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Check size={14} />
              <span>{successBanner}</span>
            </div>
          )}
        </div>

        {/* 1. Account Settings Card */}
        <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-900">
            <User size={16} className="text-violet-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Profile Settings</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
              <input
                type="text"
                value={user?.email || ''}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-400 dark:text-zinc-500 outline-none cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-violet-700 transition-all disabled:opacity-50"
            >
              <Save size={13} />
              <span>{savingProfile ? 'Saving...' : 'Update Account'}</span>
            </button>
          </form>
        </div>

        {/* 2. Neural System Configurations */}
        <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-900">
            <Cpu size={16} className="text-violet-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">System Behavior</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Preferred System Model</label>
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value as ModelId)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Selector check */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Color Palette Theme</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      checked={darkMode}
                      onChange={() => setDarkMode(true)}
                      className="accent-violet-500"
                    />
                    <span>Sleek Dark Mode</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      checked={!darkMode}
                      onChange={() => setDarkMode(false)}
                      className="accent-violet-500"
                    />
                    <span>Clean Light Mode</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <FileText size={13} className="text-zinc-400" />
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">System Instruction Prompt</label>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                placeholder="Instruct the assistant how to behave, respond, and structure queries..."
                className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 p-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
              />
              <span className="block text-[10px] text-zinc-400">
                This prompt is injected before message logs inside the context window.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-violet-700 transition-all disabled:opacity-50"
            >
              <Save size={13} />
              <span>{savingSettings ? 'Saving...' : 'Save Behavior'}</span>
            </button>
          </form>
        </div>

        {/* 3. API Key Local memory Overrides */}
        <div className="glass-panel rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-900">
            <Key size={16} className="text-violet-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">API Key Overrides (Client-Side)</h3>
          </div>

          <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 p-3.5 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
            <Info size={16} className="text-violet-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-semibold text-zinc-700 dark:text-zinc-300">Local Sandbox Developer Console</span>
              <span className="block leading-relaxed">
                If you do not want to configure server-side environment variables, paste your personal credentials here. They are saved **securely inside your browser's localStorage** and are never sent to external servers except direct OpenAI/Google endpoints.
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveKeys} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">OpenAI API Key Override</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gemini API Key Override</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">OpenRouter API Key Override</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 py-2.5 px-3 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingKeys}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-violet-700 transition-all disabled:opacity-50"
            >
              <Save size={13} />
              <span>{savingKeys ? 'Saving overrides...' : 'Apply Key Overrides'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
