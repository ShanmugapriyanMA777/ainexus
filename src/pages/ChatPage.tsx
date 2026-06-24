import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useSpeech } from '../hooks/useSpeech';
import { 
  parsePdfFile, parseTxtFile, parseCsvFile, 
  chunkDocument, querySemanticContext, DocChunk 
} from '../services/documentParser';
import { 
  Send, Paperclip, Image as ImageIcon, Mic, MicOff, Volume2, 
  VolumeX, RefreshCw, Edit, Trash2, Copy, Check, FileText, X, AlertCircle, Play, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatPage: React.FC = () => {
  const {
    messages,
    sendMessage,
    isStreaming,
    activeConversationId,
    selectedModelId,
    editMessage,
    deleteMessage,
    regenerateResponse,
    uploadFileRecord,
    loadingMessages,
  } = useChat();

  const {
    isListening,
    transcript,
    isSTTSupported,
    toggleListening,
    stopListening,
    isSpeaking,
    speakText,
    stopSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate
  } = useSpeech();

  // Component local states
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  
  // File attachments states
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; content: string; size: number }[]>([]);
  const [attachedImages, setAttachedImages] = useState<{ name: string; type: string; base64: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  // Accumulate document chunks for client-side RAG
  const [docChunks, setDocChunks] = useState<DocChunk[]>([]);

  // Refs for scroll and files
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync speech transcription to input text
  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + transcript);
    }
  }, [transcript]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Document attachment handler
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setRagStatus(`Parsing document: "${file.name}"...`);

    try {
      let parsedText = '';
      const lowerType = file.name.toLowerCase();
      
      if (lowerType.endsWith('.pdf')) {
        parsedText = await parsePdfFile(file);
      } else if (lowerType.endsWith('.csv')) {
        parsedText = await parseCsvFile(file);
      } else if (lowerType.endsWith('.txt') || lowerType.endsWith('.json') || lowerType.endsWith('.md')) {
        parsedText = await parseTxtFile(file);
      } else {
        throw new Error('Unsupported file extension. Upload PDF, CSV, TXT, or MD.');
      }

      // Add to context document chunks
      const newChunks = chunkDocument(parsedText, file.name);
      setDocChunks(prev => [...prev, ...newChunks]);

      // Add file attachment pill
      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        content: parsedText,
        size: file.size
      }]);

      // Log file record to Supabase
      const fakeUrl = URL.createObjectURL(file);
      await uploadFileRecord(file.name, file.type, fakeUrl, file.size);
      
      setRagStatus(`Successfully index "${file.name}" into context (${newChunks.length} chunks created).`);
      setTimeout(() => setRagStatus(null), 4000);
    } catch (err: any) {
      console.error(err);
      setRagStatus(`Error parsing file: ${err.message || 'Verification failure'}`);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Image attachment handler
  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAttachedImages(prev => [...prev, {
        name: file.name,
        type: file.type,
        base64: base64String
      }]);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Remove staging items
  const removeAttachedFile = (idx: number) => {
    const fileToRemove = attachedFiles[idx];
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
    setDocChunks(prev => prev.filter(c => c.fileName !== fileToRemove.name));
  };

  const removeAttachedImage = (idx: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Send message hook
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachedImages.length === 0) || isStreaming) return;

    const msgQuery = inputText.trim();
    setInputText('');
    stopListening();

    // 1. Check client-side RAG context
    let contextStr = '';
    if (docChunks.length > 0 && msgQuery) {
      setRagStatus('Retrieving semantic matches...');
      contextStr = await querySemanticContext(msgQuery, docChunks, 4);
      setRagStatus(contextStr ? 'Context injected.' : 'No similarity matches found.');
      setTimeout(() => setRagStatus(null), 3000);
    }

    // 2. Dispatch
    const imagePayload = attachedImages.length > 0 ? attachedImages : undefined;
    setAttachedImages([]);
    // Keep document context until manually cleared by user removing the attachment card
    
    await sendMessage(msgQuery, imagePayload, contextStr || undefined);
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* 1. Messages Stream viewport */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-zinc-400">Loading chat logs...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Empty Chat Area / Dashboard guides */
          <div className="flex h-full max-w-2xl mx-auto flex-col items-center justify-center text-center px-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel rounded-3xl p-8 max-w-lg border border-zinc-200/50 dark:border-zinc-800/40"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 font-semibold mb-4 text-xl">
                🚀
              </span>
              <h3 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
                Start a conversation with AI Nexus
              </h3>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Choose any LLM model, toggle **Web Search**, upload PDF documents to ask questions directly, or attach images to generate OCR audits.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div 
                  onClick={() => { setInputText('How does standard document chunking work?'); }} 
                  className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 p-3 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-all"
                >
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Chunking guides</span>
                  <span className="block text-[10px] text-zinc-400 mt-1">Explain RAG systems.</span>
                </div>
                <div 
                  onClick={() => { setInputText('Write an interface configuration for TypeScript.'); }}
                  className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/40 p-3 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-all"
                >
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Code generation</span>
                  <span className="block text-[10px] text-zinc-400 mt-1">Produce custom types.</span>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Render messages */
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 p-4 rounded-2xl transition-all ${
                  msg.role === 'user'
                    ? 'bg-transparent'
                    : 'glass-panel'
                }`}
              >
                {/* Avatar */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center shadow-sm">
                  {msg.role === 'user' ? (
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">U</span>
                  ) : (
                    <span className="text-xs font-bold text-violet-500">AI</span>
                  )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 capitalize">
                      {msg.role === 'user' ? 'You' : `AI Assistant (${selectedModelId})`}
                    </span>
                    
                    {/* Message Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Copy"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                      
                      {msg.role === 'assistant' && !msg.isStreaming && (
                        <>
                          <button
                            onClick={() => speakText(msg.content)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            title="Read out loud"
                          >
                            <Volume2 size={12} />
                          </button>
                          <button
                            onClick={() => regenerateResponse(msg.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            title="Regenerate"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </>
                      )}

                      {msg.role === 'user' && (
                        <>
                          <button
                            onClick={() => { setEditingMessageId(msg.id); setEditBuffer(msg.content); }}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Message Content / Edit View */}
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-violet-500/50 p-3 text-xs outline-none text-zinc-800 dark:text-zinc-200"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => { await editMessage(msg.id, editBuffer); setEditingMessageId(null); }}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Simple safe RegEx compiler rendering bold/italic/headers/lists/code blocks */
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans select-text whitespace-pre-wrap">
                      <MessageMarkdownCompiler text={msg.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && (
              /* Typing state wave loader */
              <div className="flex gap-4 p-4 rounded-2xl glass-panel">
                <div className="h-9 w-9 shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-500 animate-pulse">AI</span>
                </div>
                <div className="flex-1 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Thinking...</span>
                  <div className="flex items-center gap-1 text-violet-500 dots-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* 2. TTS Voice Controller Panel (Appears if Speaking) */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="border-t border-zinc-200/50 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-950/70 backdrop-blur px-6 py-2.5 flex items-center justify-between gap-4 max-w-xl mx-auto rounded-t-2xl shadow-lg border-x"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Volume2 size={16} className="animate-bounce" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Reading assistant reply</span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Use speed configurations and voice accents</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed rate configuration */}
              <select
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/40 px-2 py-1 text-[10px] outline-none text-zinc-700 dark:text-zinc-300"
              >
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x</option>
              </select>

              <button
                onClick={stopSpeaking}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                title="Stop Reading"
              >
                <Square size={12} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Staged Attachments Pills (Documents / Images) */}
      {(attachedFiles.length > 0 || attachedImages.length > 0 || ragStatus) && (
        <div className="px-4 md:px-8 py-2 border-t border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-100/50 dark:bg-zinc-900/30 space-y-2">
          {/* RAG Context Status banner */}
          {ragStatus && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-500 dark:text-violet-400">
              <AlertCircle size={12} className="animate-pulse" />
              <span>{ragStatus}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Documents */}
            {attachedFiles.map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 shadow-sm"
              >
                <FileText size={14} className="text-violet-500" />
                <div className="flex flex-col">
                  <span className="font-semibold truncate max-w-[120px]">{file.name}</span>
                  <span className="text-[9px] text-zinc-400">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  onClick={() => removeAttachedFile(idx)}
                  className="ml-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* Images */}
            {attachedImages.map((img, idx) => (
              <div 
                key={idx}
                className="relative h-12 w-12 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm shrink-0"
              >
                <img 
                  src={`data:${img.type};base64,${img.base64}`} 
                  alt="Staged" 
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removeAttachedImage(idx)}
                  className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Chat Input Bar Form */}
      <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur relative z-20">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all duration-200">
          
          {/* File Picker input buttons */}
          <div className="flex items-center gap-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileAttach}
              className="hidden" 
              accept=".pdf,.csv,.txt,.json,.md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Attach Document (PDF, CSV, TXT)"
              disabled={uploadingFile}
            >
              <Paperclip size={16} />
            </button>

            <input 
              type="file" 
              ref={imageInputRef} 
              onChange={handleImageAttach}
              className="hidden" 
              accept="image/png,image/jpg,image/jpeg,image/webp"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Attach Image (Vision AI)"
            >
              <ImageIcon size={16} />
            </button>
          </div>

          {/* Autogrowing Input Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={
              attachedFiles.length > 0 
                ? "Ask details about indexed files..." 
                : "Type message or write a prompt..."
            }
            className="flex-1 bg-transparent border-0 outline-none py-2 px-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none max-h-32 min-h-[36px]"
            rows={1}
            disabled={isStreaming}
          />

          {/* Voice Mic + Submit Send button */}
          <div className="flex items-center gap-1.5">
            {isSTTSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500/10 text-red-500 ring-2 ring-red-500/30 animate-pulse'
                    : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
                title={isListening ? "Listening... click to stop" : "Start Voice Input"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            <button
              type="submit"
              disabled={(!inputText.trim() && attachedImages.length === 0) || isStreaming}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 shadow-md shadow-violet-500/10 transition-all"
            >
              <Send size={15} />
            </button>
          </div>
        </form>
        <span className="block text-center text-[9px] text-zinc-400 dark:text-zinc-600 mt-2 select-none">
          AI Nexus can produce inaccurate details. Verify outputs before deployment.
        </span>
      </div>
    </div>
  );
};

// ---------------- CUSTOM LIGHTWEIGHT MARKDOWN COMPILER ----------------

const MessageMarkdownCompiler: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Regex-based blocks matching
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {blocks.map((block, idx) => {
        if (block.startsWith('```')) {
          // Extract language and code content
          const match = block.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : 'code';
          const code = match ? match[2] : block.slice(3, -3);
          
          return (
            <div key={idx} className="relative group my-4 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-150">
              <div className="flex items-center justify-between bg-zinc-900/60 dark:bg-black/60 px-4 py-2 text-[10px] font-mono text-zinc-400 uppercase border-b border-zinc-800">
                <span>{lang || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <Copy size={11} />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="m-0 p-4 overflow-x-auto">
                <code className="text-zinc-100 font-mono text-xs leading-relaxed bg-transparent p-0 border-0">
                  {code.trim()}
                </code>
              </pre>
            </div>
          );
        }

        // Compile standard styling inline text (bold, italic, list markers, headers)
        const lines = block.split('\n');
        return (
          <p key={idx} className="mb-2 leading-relaxed">
            {lines.map((line, lIdx) => {
              let cleanLine: React.ReactNode = line;

              // Check list bullets
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const innerText = line.trim().slice(2);
                cleanLine = (
                  <span className="flex items-start gap-1.5 pl-3">
                    <span className="text-violet-500 select-none mt-1 text-[10px]">•</span>
                    <span>{parseInlineFormatting(innerText)}</span>
                  </span>
                );
              } else if (line.match(/^\d+\.\s/)) {
                // Numbered lists
                const dotIdx = line.indexOf('.');
                const number = line.slice(0, dotIdx);
                const innerText = line.slice(dotIdx + 1).trim();
                cleanLine = (
                  <span className="flex items-start gap-1.5 pl-3">
                    <span className="text-violet-500 font-semibold select-none text-xs">{number}.</span>
                    <span>{parseInlineFormatting(innerText)}</span>
                  </span>
                );
              } else if (line.startsWith('### ')) {
                cleanLine = <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-3 mb-1 uppercase tracking-wider">{parseInlineFormatting(line.slice(4))}</h4>;
              } else if (line.startsWith('## ')) {
                cleanLine = <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-1.5">{parseInlineFormatting(line.slice(3))}</h3>;
              } else if (line.startsWith('# ')) {
                cleanLine = <h2 className="text-base font-extrabold text-zinc-900 dark:text-white mt-5 mb-2">{parseInlineFormatting(line.slice(2))}</h2>;
              } else {
                cleanLine = parseInlineFormatting(line);
              }

              return (
                <span key={lIdx} className="block min-h-[0.5rem]">
                  {cleanLine}
                </span>
              );
            })}
          </p>
        );
      })}
    </>
  );
};

// Inline bold/italic/code formatter helper
const parseInlineFormatting = (text: string): React.ReactNode => {
  // Simple bold marker split: **text**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  
  return boldParts.map((part, bIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const cleanBold = part.slice(2, -2);
      return <strong key={bIdx} className="font-bold text-zinc-900 dark:text-white">{parseItalicFormatting(cleanBold)}</strong>;
    }
    return parseItalicFormatting(part);
  });
};

const parseItalicFormatting = (text: string): React.ReactNode => {
  // Italic marker split: *text* or _text_
  const italicParts = text.split(/(\*.*?\*)/g);
  return italicParts.map((part, iIdx) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const cleanItalic = part.slice(1, -1);
      return <em key={iIdx} className="italic text-zinc-800 dark:text-zinc-200">{parseCodeFormatting(cleanItalic)}</em>;
    }
    return parseCodeFormatting(part);
  });
};

const parseCodeFormatting = (text: string): React.ReactNode => {
  // Inline code split: `code`
  const codeParts = text.split(/(`.*?`)/g);
  return codeParts.map((part, cIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={cIdx} 
          className="font-mono bg-zinc-200/50 dark:bg-zinc-800/60 text-violet-600 dark:text-violet-400 px-1 py-0.5 rounded text-xs border border-zinc-200 dark:border-zinc-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

export default ChatPage;
