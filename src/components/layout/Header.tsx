import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { AVAILABLE_MODELS } from '../../services/ai';
import { ModelId } from '../../types';
import { 
  Menu, Sun, Moon, Globe, ChevronDown, Check, Sparkles, Cpu, 
  BookOpen, Keyboard, User, Activity 
} from 'lucide-react';

const Header: React.FC = () => {
  const {
    selectedModelId,
    setSelectedModelId,
    webSearchEnabled,
    setWebSearchEnabled,
    sidebarOpen,
    setSidebarOpen,
    settings,
    updateSettings,
  } = useChat();

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const activeModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  const handleSelectModel = (modelId: ModelId) => {
    setSelectedModelId(modelId);
    setModelDropdownOpen(false);
  };

  const toggleTheme = () => {
    const isDark = settings ? settings.dark_mode : true;
    updateSettings({ dark_mode: !isDark });
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 relative z-30 select-none">
      
      {/* Left side: Hamburger + Model Selector */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <Menu size={16} />
          </button>
        )}

        {/* Custom Premium Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-white/50 dark:bg-zinc-900/50 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all"
          >
            <Cpu size={14} className="text-violet-500" />
            <span>{activeModel.name}</span>
            <ChevronDown size={12} className="text-zinc-400" />
          </button>

          {modelDropdownOpen && (
            <>
              {/* Overlay backdrop to close */}
              <div 
                onClick={() => setModelDropdownOpen(false)}
                className="fixed inset-0 z-40"
              />
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Select Neural Engine
                  </span>
                </div>
                <div className="mt-1.5 max-h-[360px] overflow-y-auto space-y-0.5">
                  {AVAILABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleSelectModel(model.id)}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all ${
                        selectedModelId === model.id
                          ? 'bg-violet-500/5 dark:bg-violet-500/10'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selectedModelId === model.id
                          ? 'border-violet-500 bg-violet-500 text-white'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}>
                        {selectedModelId === model.id && <Check size={10} />}
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {model.name}
                          </span>
                          {model.tag && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200/50 dark:border-zinc-800/40">
                              {model.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal mt-0.5">
                          {model.description}
                        </span>
                        <span className="text-[8px] text-violet-500 font-mono mt-1 font-semibold">
                          Context: {model.contextWindow}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: Web search toggle + Theme toggle + API Key status */}
      <div className="flex items-center gap-2">
        {/* API Key configuration indicators */}
        <div className="hidden lg:flex items-center gap-1.5 border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl px-2.5 py-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
          <Activity size={10} className="text-emerald-500 animate-pulse" />
          <span>Local Engine Status: Sandbox</span>
        </div>

        {/* Web Search Agent Toggle */}
        <button
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200 ${
            webSearchEnabled
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30'
              : 'border-zinc-200/60 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
          }`}
          title="Toggle Online Agent Search Mode"
        >
          <Globe size={14} className={webSearchEnabled ? 'animate-spin-slow text-violet-500' : ''} />
          <span className="hidden sm:inline">Web Search</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all shadow-sm"
          title="Switch color mode"
        >
          {settings?.dark_mode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
