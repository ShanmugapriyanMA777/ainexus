import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Conversation, Message, ModelId, UserFile, UserSettings } from '../types';
import { streamChat, AVAILABLE_MODELS } from '../services/ai';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  files: UserFile[];
  settings: UserSettings | null;
  loadingConversations: boolean;
  loadingMessages: boolean;
  isStreaming: boolean;
  selectedModelId: ModelId;
  webSearchEnabled: boolean;
  sidebarOpen: boolean;
  setSelectedModelId: (modelId: ModelId) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  createNewConversation: (title?: string, model?: ModelId) => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePinConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (content: string, imageFiles?: { name: string; type: string; base64: string }[], customContext?: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
  uploadFileRecord: (fileName: string, fileType: string, fileUrl: string, fileSize: number) => Promise<UserFile | null>;
  deleteFileRecord: (fileId: string) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>('gpt-4o');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load conversations, settings, and files once user is authenticated
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      setFiles([]);
      setSettings(null);
      return;
    }

    const loadUserData = async () => {
      setLoadingConversations(true);
      try {
        // 1. Fetch conversations
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        
        const convList = convData || [];
        setConversations(convList);

        if (convList.length > 0) {
          setActiveConversationId(convList[0].id);
          setSelectedModelId(convList[0].model_name);
        } else {
          // Auto-create a first conversation
          await createNewConversation('New Chat', 'gpt-4o');
        }

        // 2. Fetch User Settings
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsData) {
          setSettings(settingsData);
          setSelectedModelId(settingsData.preferred_model);
          // Apply Dark/Light theme class to body
          if (settingsData.dark_mode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } else {
          // If no settings exist, initialize them
          const newSettings = {
            user_id: user.id,
            preferred_model: 'gpt-4o' as ModelId,
            dark_mode: true,
            system_prompt: 'You are AI Nexus, a highly sophisticated AI assistant.',
          };
          await supabase.from('user_settings').upsert(newSettings);
          setSettings(newSettings as any);
        }

        // 3. Fetch User Files
        const { data: fileData } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        setFiles(fileData || []);
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoadingConversations(false);
      }
    };

    loadUserData();
  }, [user]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });
        
        setMessages(data || []);
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
    
    // Sync model selection with current conversation model
    const currentConv = conversations.find(c => c.id === activeConversationId);
    if (currentConv) {
      setSelectedModelId(currentConv.model_name);
    }
  }, [activeConversationId]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    try {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...updates });
      
      setSettings(prev => prev ? { ...prev, ...updates } : null);

      if (updates.dark_mode !== undefined) {
        if (updates.dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const createNewConversation = async (title = 'New Chat', model: ModelId = selectedModelId) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          model_name: model,
          is_pinned: false,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setConversations(prev => [data, ...prev]);
        setActiveConversationId(data.id);
        return data.id;
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
    return null;
  };

  const deleteConversation = async (id: string) => {
    try {
      await supabase.from('conversations').delete().eq('id', id);
      setConversations(prev => prev.filter(c => c.id !== id));
      
      if (activeConversationId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          setActiveConversationId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const renameConversation = async (id: string, title: string) => {
    try {
      await supabase.from('conversations').update({ title }).eq('id', id);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    } catch (err) {
      console.error('Error renaming conversation:', err);
    }
  };

  const togglePinConversation = async (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    try {
      const nextPinned = !conv.is_pinned;
      await supabase.from('conversations').update({ is_pinned: nextPinned }).eq('id', id);
      setConversations(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, is_pinned: nextPinned } : c);
        // Re-sort: pinned first, then by date descending
        return updated.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
    } catch (err) {
      console.error('Error pinning conversation:', err);
    }
  };

  const sendMessage = async (
    content: string,
    imageFiles?: { name: string; type: string; base64: string }[],
    customContext?: string
  ) => {
    let convId = activeConversationId;
    if (!user) return;
    
    // Auto-create conversation if none is active
    if (!convId) {
      convId = await createNewConversation(content.slice(0, 30) || 'New Chat');
      if (!convId) return;
    }

    try {
      // 1. Insert user message to DB
      const userMsgPayload = {
        conversation_id: convId,
        role: 'user' as const,
        content: content,
        tokens_used: Math.ceil(content.length / 4),
      };
      
      const { data: userMsg, error: insertUserErr } = await supabase
        .from('messages')
        .insert(userMsgPayload)
        .select()
        .single();
      
      if (insertUserErr) throw insertUserErr;

      // Update state
      setMessages(prev => [...prev, userMsg]);

      // Set up conversation title rename if it was a default placeholder title
      const currentConv = conversations.find(c => c.id === convId);
      if (currentConv && currentConv.title === 'New Chat') {
        const cleanTitle = content.trim().slice(0, 32) + (content.length > 32 ? '...' : '');
        renameConversation(convId, cleanTitle);
      }

      // 2. Prepare streaming assistant placeholder in UI
      const assistantMsgPlaceholder: Message = {
        id: 'streaming-placeholder',
        conversation_id: convId,
        role: 'assistant',
        content: '',
        tokens_used: 0,
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, assistantMsgPlaceholder]);
      setIsStreaming(true);

      // Construct system prompt with general custom prompt + RAG file contexts
      let sysPrompt = settings?.system_prompt || 'You are AI Nexus, a highly sophisticated AI assistant.';
      if (customContext) {
        sysPrompt += `\n\n[Referenced Documents Context]\n${customContext}\nUse the information above to answer the user's query directly.`;
      }

      // Gather current messaging history for LLM context
      // Exclude placeholder and fetch previous messages + the newly saved userMsg
      const chatHistory = [...messages, userMsg];

      let responseBuffer = '';

      // Call streaming service
      await streamChat(
        chatHistory,
        selectedModelId,
        {
          systemPrompt: sysPrompt,
          imageFiles,
          webSearchEnabled,
          webSearchQuery: webSearchEnabled ? content : undefined,
        },
        (chunk) => {
          // Accumulate chunk
          responseBuffer += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === 'streaming-placeholder'
                ? { ...m, content: responseBuffer }
                : m
            )
          );
        },
        (err) => {
          // Handle error
          console.error('Streaming error callback:', err);
          setMessages(prev =>
            prev.map(m =>
              m.id === 'streaming-placeholder'
                ? { ...m, content: `⚠️ **Streaming Connection Error:** ${err.message || 'Check your environment API key configurations.'}`, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
        },
        async (finalText) => {
          // Streaming completed successfully, save response in Supabase
          setIsStreaming(false);
          
          try {
            const assistantMsgPayload = {
              conversation_id: convId!,
              role: 'assistant' as const,
              content: finalText || 'No response generated.',
              tokens_used: Math.ceil((finalText || '').length / 4),
            };

            const { data: savedAssistantMsg } = await supabase
              .from('messages')
              .insert(assistantMsgPayload)
              .select()
              .single();

            // Replace streaming placeholder with actual saved db object
            setMessages(prev =>
              prev.map(m =>
                m.id === 'streaming-placeholder' ? savedAssistantMsg : m
              ).filter(Boolean)
            );
          } catch (saveErr) {
            console.error('Error saving assistant message:', saveErr);
            // Fallback: keep placeholder with static id
            setMessages(prev =>
              prev.map(m =>
                m.id === 'streaming-placeholder' ? { ...m, id: 'temp-' + Date.now(), isStreaming: false } : m
              )
            );
          }
        }
      );
    } catch (err) {
      console.error('Error in sendMessage workflow:', err);
      setIsStreaming(false);
    }
  };

  const regenerateResponse = async (messageId: string) => {
    if (!activeConversationId || isStreaming) return;
    
    // Find message position, delete messages after this and regenerate
    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

    // Find the last user message before this index
    let userMsgIdx = -1;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIdx = i;
        break;
      }
    }

    if (userMsgIdx === -1) return;
    const userMsg = messages[userMsgIdx];

    try {
      // Delete assistant message and succeeding messages from DB
      const messagesToDelete = messages.slice(userMsgIdx + 1);
      for (const m of messagesToDelete) {
        if (m.id !== 'streaming-placeholder') {
          await supabase.from('messages').delete().eq('id', m.id);
        }
      }

      // Truncate messages state array to keep only up to the user message
      const history = messages.slice(0, userMsgIdx + 1);
      setMessages(history);
      
      // Re-trigger sendMessage flow
      const assistantMsgPlaceholder: Message = {
        id: 'streaming-placeholder',
        conversation_id: activeConversationId,
        role: 'assistant',
        content: '',
        tokens_used: 0,
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, assistantMsgPlaceholder]);
      setIsStreaming(true);

      const chatHistory = [...history];
      let responseBuffer = '';

      await streamChat(
        chatHistory,
        selectedModelId,
        {
          systemPrompt: settings?.system_prompt || undefined,
        },
        (chunk) => {
          responseBuffer += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === 'streaming-placeholder'
                ? { ...m, content: responseBuffer }
                : m
            )
          );
        },
        (err) => {
          setIsStreaming(false);
          setMessages(prev =>
            prev.map(m =>
              m.id === 'streaming-placeholder'
                ? { ...m, content: `⚠️ **Regeneration Error:** ${err.message || 'Stream disconnected.'}`, isStreaming: false }
                : m
            )
          );
        },
        async (finalText) => {
          setIsStreaming(false);
          try {
            const assistantMsgPayload = {
              conversation_id: activeConversationId!,
              role: 'assistant' as const,
              content: finalText,
              tokens_used: Math.ceil(finalText.length / 4),
            };

            const { data: savedAssistantMsg } = await supabase
              .from('messages')
              .insert(assistantMsgPayload)
              .select()
              .single();

            setMessages(prev =>
              prev.map(m =>
                m.id === 'streaming-placeholder' ? savedAssistantMsg : m
              )
            );
          } catch (err) {
            console.error('Error saving regenerated response:', err);
          }
        }
      );
    } catch (err) {
      console.error('Error during regeneration:', err);
      setIsStreaming(false);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);

      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, content: newContent } : m))
      );
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await supabase.from('messages').delete().eq('id', messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const uploadFileRecord = async (fileName: string, fileType: string, fileUrl: string, fileSize: number) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: fileType,
          file_url: fileUrl,
          file_size: fileSize,
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setFiles(prev => [data, ...prev]);
        return data;
      }
    } catch (err) {
      console.error('Error uploading file record:', err);
    }
    return null;
  };

  const deleteFileRecord = async (fileId: string) => {
    try {
      await supabase.from('files').delete().eq('id', fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Error deleting file record:', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        messages,
        files,
        settings,
        loadingConversations,
        loadingMessages,
        isStreaming,
        selectedModelId,
        webSearchEnabled,
        sidebarOpen,
        searchQuery,
        setSelectedModelId,
        setWebSearchEnabled,
        setSidebarOpen,
        setSearchQuery,
        createNewConversation,
        deleteConversation,
        renameConversation,
        togglePinConversation,
        setActiveConversationId,
        sendMessage,
        editMessage,
        deleteMessage,
        regenerateResponse,
        uploadFileRecord,
        deleteFileRecord,
        updateSettings,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
