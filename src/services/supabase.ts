import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock database storage prefix
const STORAGE_PREFIX = 'ai-nexus-mock-db:';

const isSandboxSession = localStorage.getItem(STORAGE_PREFIX + 'sandbox-session-active') === 'true';

// Check if credentials exist, otherwise build a local mock
export const isMockClient = !supabaseUrl || !supabaseAnonKey || isSandboxSession;

const getMockData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setMockData = <T>(key: string, data: T): void => {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
};

// Seed mock tables if empty
if (isMockClient) {
  if (!localStorage.getItem(STORAGE_PREFIX + 'profiles')) {
    setMockData('profiles', [
      {
        id: 'mock-user-123',
        full_name: 'Alex Developer',
        email: 'alex@nexus.ai',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
        is_admin: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'mock-user-456',
        full_name: 'Sarah Chen',
        email: 'sarah@nexus.ai',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        is_admin: false,
        created_at: new Date().toISOString(),
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'user_settings')) {
    setMockData('user_settings', [
      {
        id: 'mock-settings-123',
        user_id: 'mock-user-123',
        preferred_model: 'gpt-4o',
        dark_mode: true,
        system_prompt: 'You are AI Nexus, a highly sophisticated AI assistant.',
        created_at: new Date().toISOString(),
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'conversations')) {
    setMockData('conversations', [
      {
        id: 'conv-1',
        user_id: 'mock-user-123',
        title: 'Welcome to AI Nexus',
        model_name: 'gpt-4o',
        is_pinned: true,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'conv-2',
        user_id: 'mock-user-123',
        title: 'Vision AI Analysis Guide',
        model_name: 'gemini-2.5-flash',
        is_pinned: false,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'messages')) {
    setMockData('messages', [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: `👋 **Welcome to AI Nexus Platform!**

This workspace is designed to be your ultimate AI control center. Here are some things you can try:

1. **Select different models** using the selector in the header.
2. **Upload images** or click the image icon to analyze visual content.
3. **Upload documents** (PDFs, TXT, CSV) to chat with them (Advanced client-side RAG).
4. **Use voice commands** (STT) or ask the bot to read responses out loud (TTS).
5. **Turn on Web Search** to find up-to-date information on the web.

You are currently running in **Demo Sandbox mode** because Supabase environment variables are not connected. Everything you save will persist in your browser's local storage. Fill in your \`.env\` variables and restart Vite to link your production Supabase database!`,
        tokens_used: 120,
        created_at: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-2',
        role: 'user',
        content: 'Tell me how to use the vision AI.',
        tokens_used: 10,
        created_at: new Date(Date.now() - 3600000 * 24 + 1000).toISOString(),
      },
      {
        id: 'msg-3',
        conversation_id: 'conv-2',
        role: 'assistant',
        content: 'Simply click the attachment button or drag and drop any image (PNG, JPG, WEBP) directly into the chatbox. I can perform OCR, analyze charts, explain structures, or audit UI layouts in real-time!',
        tokens_used: 35,
        created_at: new Date(Date.now() - 3600000 * 24 + 5000).toISOString(),
      }
    ]);
  }
}

// Custom mock Supabase implementation
const mockSupabase = {
  auth: {
    signUp: async ({ email, password, options }: any) => {
      console.log('Mock signup', email);
      const profiles = getMockData<any[]>('profiles', []);
      const existingUser = profiles.find((p) => p.email === email);
      if (existingUser) return { data: { user: null }, error: { message: 'User already exists' } };
      
      const newUserId = 'mock-user-' + Math.random().toString(36).substring(2, 9);
      const newProfile = {
        id: newUserId,
        full_name: options?.data?.full_name || email.split('@')[0],
        email: email,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
        is_admin: false,
        created_at: new Date().toISOString(),
      };
      
      profiles.push(newProfile);
      setMockData('profiles', profiles);
      
      // Save settings
      const settings = getMockData<any[]>('user_settings', []);
      settings.push({
        id: 'mock-settings-' + newUserId,
        user_id: newUserId,
        preferred_model: 'gpt-4o',
        dark_mode: true,
        system_prompt: 'You are AI Nexus, a highly sophisticated AI assistant.',
        created_at: new Date().toISOString(),
      });
      setMockData('user_settings', settings);

      const session = { access_token: 'mock-jwt-token', user: newProfile };
      return { data: { user: newProfile, session }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      console.log('Mock signin', email);
      const profiles = getMockData<any[]>('profiles', []);
      const user = profiles.find((p) => p.email === email);
      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }
      
      // Check if user is banned
      if (user.is_banned) {
        return { data: { user: null, session: null }, error: { message: 'Your account has been suspended by an administrator.' } };
      }

      const session = { access_token: 'mock-jwt-token', user };
      // Save user session in localStorage
      localStorage.setItem(STORAGE_PREFIX + 'active-session', JSON.stringify({ user, expires_at: Date.now() + 86400000 }));
      
      // Trigger callbacks
      mockAuthCallbacks.forEach((cb) => cb('SIGNED_IN', session));

      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(STORAGE_PREFIX + 'active-session');
      mockAuthCallbacks.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    },
    getSession: async () => {
      const sessionData = localStorage.getItem(STORAGE_PREFIX + 'active-session');
      if (!sessionData) return { data: { session: null }, error: null };
      const parsed = JSON.parse(sessionData);
      if (parsed.expires_at < Date.now()) {
        localStorage.removeItem(STORAGE_PREFIX + 'active-session');
        return { data: { session: null }, error: null };
      }
      return { data: { session: parsed }, error: null };
    },
    getUser: async () => {
      const sessionData = localStorage.getItem(STORAGE_PREFIX + 'active-session');
      if (!sessionData) return { data: { user: null }, error: null };
      return { data: { user: JSON.parse(sessionData).user }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      mockAuthCallbacks.push(callback);
      // Trigger initial session check
      const sessionData = localStorage.getItem(STORAGE_PREFIX + 'active-session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        callback('SIGNED_IN', parsed);
      } else {
        callback('SIGNED_OUT', null);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = mockAuthCallbacks.indexOf(callback);
              if (idx !== -1) mockAuthCallbacks.splice(idx, 1);
            },
          },
        },
      };
    },
    resetPasswordForEmail: async (email: string) => {
      return { data: {}, error: null };
    }
  },
  from: (table: string) => {
    return {
      select: (columns: string = '*') => {
        let items = getMockData<any[]>(table, []);
        
        const builder = {
          eq: (column: string, value: any) => {
            items = items.filter((item) => item[column] === value);
            return builder;
          },
          neq: (column: string, value: any) => {
            items = items.filter((item) => item[column] !== value);
            return builder;
          },
          order: (column: string, { ascending = true } = {}) => {
            items.sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (typeof valA === 'string') {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return ascending ? valA - valB : valB - valA;
            });
            return builder;
          },
          single: async () => {
            if (items.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
            return { data: items[0], error: null };
          },
          then: async (resolve: any) => {
            resolve({ data: items, error: null });
          }
        };
        return builder;
      },
      insert: (data: any) => {
        let items = getMockData<any[]>(table, []);
        const records = Array.isArray(data) ? data : [data];
        
        const newRecords = records.map((r) => ({
          id: r.id || 'mock-id-' + Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          ...r,
        }));
        
        items = [...items, ...newRecords];
        setMockData(table, items);

        const builder = {
          select: () => {
            return {
              single: async () => ({ data: newRecords[0], error: null }),
              then: async (resolve: any) => resolve({ data: newRecords, error: null })
            };
          },
          then: async (resolve: any) => resolve({ data: newRecords, error: null })
        };
        return builder;
      },
      update: (data: any) => {
        let items = getMockData<any[]>(table, []);
        let updatedItems: any[] = [];
        
        const builder = {
          eq: (column: string, value: any) => {
            items = items.map((item) => {
              if (item[column] === value) {
                const updated = { ...item, ...data };
                updatedItems.push(updated);
                return updated;
              }
              return item;
            });
            setMockData(table, items);
            return builder;
          },
          then: async (resolve: any) => {
            resolve({ data: updatedItems, error: null });
          }
        };
        return builder;
      },
      upsert: (data: any) => {
        let items = getMockData<any[]>(table, []);
        const records = Array.isArray(data) ? data : [data];
        
        records.forEach((rec) => {
          const idx = items.findIndex((item) => item.user_id === rec.user_id || (rec.id && item.id === rec.id));
          if (idx !== -1) {
            items[idx] = { ...items[idx], ...rec };
          } else {
            items.push({
              id: rec.id || 'mock-id-' + Math.random().toString(36).substring(2, 9),
              created_at: new Date().toISOString(),
              ...rec
            });
          }
        });
        
        setMockData(table, items);
        
        const builder = {
          then: async (resolve: any) => resolve({ data: records, error: null })
        };
        return builder;
      },
      delete: () => {
        let items = getMockData<any[]>(table, []);
        
        const builder = {
          eq: (column: string, value: any) => {
            items = items.filter((item) => item[column] !== value);
            setMockData(table, items);
            return builder;
          },
          then: async (resolve: any) => {
            resolve({ data: null, error: null });
          }
        };
        return builder;
      }
    };
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        console.log('Mock storage upload', bucket, path, file.name);
        const url = URL.createObjectURL(file);
        return { data: { path, fullPath: `${bucket}/${path}`, url }, error: null };
      },
      remove: async (paths: string[]) => {
        return { data: null, error: null };
      },
      getPublicUrl: (path: string) => {
        // Return a mock placeholder URL or object URL
        return { data: { publicUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80` } };
      }
    })
  }
};

const mockAuthCallbacks: any[] = [];

export const supabase = isMockClient
  ? (mockSupabase as any)
  : createClient(supabaseUrl, supabaseAnonKey);
