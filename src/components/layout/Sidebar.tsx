import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageSquare, Plus, Pin, Trash2, Edit3, Settings, 
  BarChart2, ShieldAlert, LogOut, Search, ChevronLeft, Menu, Check, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter conversations based on search
  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter(c => c.is_pinned);
  const recentConversations = filteredConversations.filter(c => !c.is_pinned);

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  const handleNewChat = async () => {
    const id = await createNewConversation();
    if (id) {
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile Menu trigger */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Container */}
      <motion.div
        animate={{ width: sidebarOpen ? 280 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`relative z-40 flex h-screen flex-col border-r border-zinc-200/50 bg-white/80 dark:border-zinc-800/40 dark:bg-zinc-950/80 backdrop-blur-md overflow-hidden ${
          sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0'
        } ${!sidebarOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/40">
          <div className="flex items-center gap-2" onClick={() => navigate('/')}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-lg shadow-md shadow-violet-500/20">
              N
            </span>
            <span className="font-sans font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
              AI Nexus
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
              SaaS
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/10 hover:from-violet-700 hover:to-indigo-700 transition-all duration-200"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Local Search Engine */}
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/40 py-2 pl-9 pr-4 text-xs outline-none focus:border-primary/50 dark:text-zinc-300 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Scrollable Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 select-none">
          {/* Pinned Threads Group */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Pin size={10} className="rotate-45" />
                <span>Pinned Chats</span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {pinnedConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConversationId === conv.id}
                    editingId={editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => { setActiveConversationId(conv.id); navigate('/'); }}
                    onPin={(e) => { e.stopPropagation(); togglePinConversation(conv.id); }}
                    onRename={(e) => handleStartRename(conv.id, conv.title, e)}
                    onSave={(e) => handleSaveRename(conv.id, e)}
                    onCancel={(e) => { e.stopPropagation(); setEditingId(null); }}
                    onDelete={(e) => handleDelete(conv.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Threads Group */}
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Recent Chats
            </div>
            <div className="mt-1.5 space-y-0.5">
              {recentConversations.length > 0 ? (
                recentConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConversationId === conv.id}
                    editingId={editingId}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => { setActiveConversationId(conv.id); navigate('/'); }}
                    onPin={(e) => { e.stopPropagation(); togglePinConversation(conv.id); }}
                    onRename={(e) => handleStartRename(conv.id, conv.title, e)}
                    onSave={(e) => handleSaveRename(conv.id, e)}
                    onCancel={(e) => { e.stopPropagation(); setEditingId(null); }}
                    onDelete={(e) => handleDelete(conv.id, e)}
                  />
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 italic">
                  No chats found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer User Navigation */}
        <div className="mt-auto border-t border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-1.5">
          {/* Navigation Items */}
          <div className="space-y-0.5">
            <button
              onClick={() => navigate('/analytics')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                location.pathname === '/analytics'
                  ? 'bg-violet-500/10 text-violet-500 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
              }`}
            >
              <BarChart2 size={15} />
              <span>Usage & Analytics</span>
            </button>

            {user?.is_admin && (
              <button
                onClick={() => navigate('/admin')}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-violet-500/10 text-violet-500 font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                <ShieldAlert size={15} />
                <span>Admin Dashboard</span>
              </button>
            )}

            <button
              onClick={() => navigate('/settings')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                location.pathname === '/settings'
                  ? 'bg-violet-500/10 text-violet-500 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
              }`}
            >
              <Settings size={15} />
              <span>System Settings</span>
            </button>
          </div>

          {/* User profile section */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-900/60 p-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg'}
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 object-cover bg-zinc-100 dark:bg-zinc-950"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {user?.full_name || 'Alex Developer'}
                </span>
                <span className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                  {user?.email || 'alex@nexus.ai'}
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
};

// Sub-component: Individual Conversation Item
interface ConversationItemProps {
  conv: any;
  isActive: boolean;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (val: string) => void;
  onSelect: () => void;
  onPin: (e: any) => void;
  onRename: (e: any) => void;
  onSave: (e: any) => void;
  onCancel: (e: any) => void;
  onDelete: (e: any) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  isActive,
  editingId,
  editTitle,
  setEditTitle,
  onSelect,
  onPin,
  onRename,
  onSave,
  onCancel,
  onDelete,
}) => {
  const isEditing = editingId === conv.id;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${
        isActive
          ? 'bg-zinc-150/80 dark:bg-zinc-900/80 text-primary dark:text-zinc-200'
          : 'text-zinc-600 hover:bg-zinc-100/50 dark:text-zinc-400 dark:hover:bg-zinc-900/50'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <MessageSquare size={13} className="text-zinc-400 dark:text-zinc-500" />
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave(e)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white dark:bg-zinc-800 border border-violet-500 rounded px-1.5 py-0.5 outline-none text-zinc-800 dark:text-zinc-150"
            autoFocus
          />
        ) : (
          <span className="truncate pr-4">{conv.title}</span>
        )}
      </div>

      {/* Control Actions (Pin, Rename, Delete) - Visible on hover */}
      <div className={`flex items-center gap-1 absolute right-2 z-10 transition-opacity duration-150 ${
        isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {isEditing ? (
          <>
            <button 
              onClick={onSave}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-green-500"
            >
              <Check size={11} />
            </button>
            <button 
              onClick={onCancel}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-red-500"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={onPin}
              className={`h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ${
                conv.is_pinned ? 'text-violet-500 hover:text-violet-600' : ''
              }`}
              title={conv.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={11} className={conv.is_pinned ? 'rotate-0' : 'rotate-45'} />
            </button>
            <button 
              onClick={onRename}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Rename"
            >
              <Edit3 size={11} />
            </button>
            <button 
              onClick={onDelete}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
