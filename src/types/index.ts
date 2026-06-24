export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'deepseek-chat'
  | 'deepseek-reasoner'
  | 'llama-4'
  | 'mistral-large';

export interface Model {
  id: ModelId;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'mistral';
  description: string;
  contextWindow: string;
  tag?: string;
  isMultimodal?: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model_name: ModelId;
  is_pinned: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
  isStreaming?: boolean;
}

export interface UserFile {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  preferred_model: ModelId;
  dark_mode: boolean;
  system_prompt: string | null;
  created_at: string;
}

export interface UsageStats {
  totalChats: number;
  totalMessages: number;
  totalFiles: number;
  totalTokens: number;
  mostUsedModel: string;
  dailyUsage: { date: string; messages: number; tokens: number }[];
  modelDistribution: { model: string; count: number }[];
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_banned?: boolean;
  created_at: string;
  chat_count?: number;
}
