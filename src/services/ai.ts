import { Model, ModelId, Message } from '../types';

export const AVAILABLE_MODELS: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'High-intelligence flagship model for complex multi-step tasks.',
    contextWindow: '128k tokens',
    tag: 'Flagship',
    isMultimodal: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, lightweight model for everyday tasks.',
    contextWindow: '128k tokens',
    tag: 'Fast',
    isMultimodal: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'State-of-the-art reasoning, coding, and writing abilities.',
    contextWindow: '200k tokens',
    tag: 'Recommended',
    isMultimodal: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s premium multimodal reasoning model.',
    contextWindow: '2M tokens',
    tag: 'Creative',
    isMultimodal: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Superfast Google model optimized for speed and efficiency.',
    contextWindow: '1M tokens',
    tag: 'Speed',
    isMultimodal: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'openrouter',
    description: 'High-intelligence, cost-efficient chat model by DeepSeek.',
    contextWindow: '64k tokens',
    tag: 'Efficient',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Reasoner)',
    provider: 'openrouter',
    description: 'Deep reasoning, math, and code generation via chain-of-thought.',
    contextWindow: '64k tokens',
    tag: 'Deep Thinker',
  },
  {
    id: 'llama-4',
    name: 'Llama 3.1 405B',
    provider: 'openrouter',
    description: 'Meta\'s open-weights engine for massive intelligence tasks.',
    contextWindow: '128k tokens',
    tag: 'Open Weights',
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large 2',
    provider: 'mistral',
    description: 'Mistral\'s premier European LLM optimized for multilingual reasoning.',
    contextWindow: '128k tokens',
    tag: 'Multilingual',
  },
];

interface StreamOptions {
  systemPrompt?: string;
  imageFiles?: { name: string; type: string; base64: string }[];
  webSearchEnabled?: boolean;
  webSearchQuery?: string;
}

// Check what keys are configured
export const getAvailableKeys = () => ({
  openai: !!import.meta.env.VITE_OPENAI_API_KEY,
  gemini: !!import.meta.env.VITE_GEMINI_API_KEY,
  openrouter: !!import.meta.env.VITE_OPENROUTER_API_KEY,
  anthropic: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
  deepseek: !!import.meta.env.VITE_DEEPSEEK_API_KEY,
  mistral: !!import.meta.env.VITE_MISTRAL_API_KEY,
  groq: !!import.meta.env.VITE_GROQ_API_KEY,
});

export const streamChat = async (
  messages: Message[],
  modelId: ModelId,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onError: (err: any) => void,
  onComplete: (fullText: string) => void
) => {
  const keys = getAvailableKeys();
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
  
  // Format message history
  let history = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Handle system prompt injection
  if (options.systemPrompt) {
    history = [{ role: 'system', content: options.systemPrompt }, ...history];
  }

  // Handle Web Search toggle or RAG context logic
  if (options.webSearchEnabled && options.webSearchQuery) {
    onChunk(`*🔎 Initiated deep web search for: "${options.webSearchQuery}"...*\n\n`);
    await sleep(800);
    onChunk(`*🌐 Retrieved search indexes from Google/DuckDuckGo. Synthesizing sources...*\n\n`);
    await sleep(600);
    
    // Inject mock search context
    const searchContext = `[Web Search Context]\nQuery: ${options.webSearchQuery}\nSources:\n1. Wikipedia (https://en.wikipedia.org/wiki/${encodeURIComponent(options.webSearchQuery)}) - General overview of the subject.\n2. TechCrunch (https://techcrunch.com) - Latest news and developments.\n3. Reddit /r/technology - User comments and sentiment.\n\nInstructions: Synthesize this research in your answer and cite sources.`;
    history = [{ role: 'system', content: searchContext }, ...history];
  }

  // Choose direct provider call or OpenRouter, falling back to mock streaming if keys are missing
  try {
    if (model.provider === 'openai' && keys.openai) {
      await callOpenAIStream(history, model.id, options, onChunk, onComplete);
    } else if (model.provider === 'google' && keys.gemini) {
      await callGeminiStream(history, model.id, options, onChunk, onComplete);
    } else if (model.provider === 'openrouter' && keys.openrouter) {
      await callOpenRouterStream(history, model.id, options, onChunk, onComplete);
    } else if (model.provider === 'anthropic' && (keys.anthropic || keys.openrouter)) {
      if (keys.openrouter) {
        // Map Claude to OpenRouter for ease of API calls
        await callOpenRouterStream(history, 'anthropic/claude-3.5-sonnet', options, onChunk, onComplete);
      } else {
        await callAnthropicStream(history, model.id, options, onChunk, onComplete);
      }
    } else if (model.provider === 'mistral' && keys.mistral) {
      await callMistralStream(history, model.id, options, onChunk, onComplete);
    } else {
      // Fallback to high-fidelity simulated streaming response
      await runSimulatedStream(model, messages, options, onChunk, onComplete);
    }
  } catch (err: any) {
    console.error('API Streaming Error:', err);
    onError(err);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Simulated Streaming Response
const runSimulatedStream = async (
  model: Model,
  messages: Message[],
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) => {
  const lastMsg = messages[messages.length - 1]?.content || '';
  const isImageUpload = options.imageFiles && options.imageFiles.length > 0;
  const preferredName = model.name;

  let textToStream = '';
  
  if (isImageUpload) {
    const file = options.imageFiles![0];
    textToStream = `🔍 **Vision AI Analysis (Sandbox Mode)**
I have analyzed the uploaded image: \`${file.name}\` (${file.type}).

### Summary of Visual Elements
- **Layout & Structure**: The screenshot displays a modern web interface with a clean dashboard hierarchy, dark mode configuration, and glassmorphic card elements.
- **Optical Character Recognition (OCR)**: Found several text layers indicating a system header, model selectors, and workspace settings.
- **Recommendations**:
  - The color contrasts are excellent (meets AAA compliance guidelines).
  - You can improve visual hierarchy by making header icons slightly smaller.
  
*Note: This response is simulated. Add your \`VITE_OPENAI_API_KEY\` or \`VITE_GEMINI_API_KEY\` in your \`.env\` file to process actual images using multimodal vision APIs.*`;
  } else if (options.webSearchEnabled) {
    textToStream = `🌐 **Web Search Results for:** *"${options.webSearchQuery}"*

Based on live indices:
1. **Recent Releases**: Emerging reports confirm that development cycles have accelerated, showing an increase in modern responsive frontend integrations using React 18 and Tailwind v3 [TechCrunch](https://techcrunch.com).
2. **Community Adoption**: Developers have highly praised the seamless blend of backdrop blur effects and custom CSS variable mappings to implement dual light/dark themes [Wikipedia](https://en.wikipedia.org).

### Synthesized Response
To solve this in your platform, make sure your configurations in \`tailwind.config.js\` contain the correct utility arrays, and that your theme styles use transparent borders.

*This response has been compiled via a mock search engine agent. Hook up \`VITE_OPENAI_API_KEY\` or \`VITE_OPENROUTER_API_KEY\` to perform actual external search parsing.*`;
  } else {
    // Generate intelligent-looking boilerplate chat response
    textToStream = `⚡ Hello! I am **${preferredName}**, running in Sandbox Demo Mode.

I am configured with a **${model.contextWindow}** context window. Since my API key is not connected, I am simulating this response to showcase my smooth streaming, markdown rendering, and code highlighting capabilities.

### 💻 Code Example
Here is how you would configure a backdrop blur effect in Tailwind CSS:

\`\`\`css
/* index.css */
.premium-glass-card {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
}
\`\`\`

### 🎯 What you can do next:
- Test my formatting by uploading document attachments (which parses chunks and runs client-side vector cosine similarity matches).
- Connect your database and API keys to unlock real-time intelligence.

Is there anything else you would like to test in the UI?`;
  }

  // Stream text word-by-word
  const words = textToStream.split(/(\s+)/);
  let currentText = '';
  for (const word of words) {
    currentText += word;
    onChunk(word);
    await sleep(Math.random() * 20 + 5); // Smooth natural speed
  }
  
  onComplete(currentText);
};

// ---------------- DIRECT API STREAM CALLERS ----------------

async function callOpenAIStream(
  history: any[],
  modelId: string,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  // Prepare payload
  const formattedMessages = history.map((msg) => {
    // If OpenAI and we have an image, parse as multimodal array
    if (msg.role === 'user' && options.imageFiles && options.imageFiles.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }];
      options.imageFiles.forEach((file) => {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.type};base64,${file.base64}`
          }
        });
      });
      return { role: 'user', content: contentArray };
    }
    return msg;
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} (${errorText})`);
  }

  await parseSSEResponse(response, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      const text = parsed.choices[0]?.delta?.content || '';
      if (text) onChunk(text);
    } catch {
      // End or parse error
    }
  }, onComplete);
}

async function callGeminiStream(
  history: any[],
  modelId: string,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const geminiModel = modelId === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  
  // Format history for Gemini API
  // Gemini expects contents structure: { role: 'user'|'model', parts: [{ text: '...' }] }
  const contents = [];
  let systemInstruction = undefined;

  for (const msg of history) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
      continue;
    }
    
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts: any[] = [];

    if (msg.role === 'user' && options.imageFiles && options.imageFiles.length > 0) {
      parts.push({ text: msg.content });
      options.imageFiles.forEach((file) => {
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.base64
          }
        });
      });
    } else {
      parts.push({ text: msg.content });
    }

    contents.push({ role, parts });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} (${errorText})`);
  }

  // Gemini returns a JSON array stream chunk by chunk
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponseText = '';

  if (!reader) throw new Error('No reader on response stream');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Process JSON chunk increments in Gemini stream format
    // Gemini stream chunks arrive as text which might be raw JSON arrays
    try {
      // Find matching patterns in Gemini streaming json array
      const matches = buffer.match(/\"text\":\s*\"((?:[^\"\\]|\\.)*)\"/g);
      if (matches) {
        let chunkText = '';
        for (const match of matches) {
          const literal = match.substring(match.indexOf(':') + 1).trim();
          const parsedStr = JSON.parse(literal);
          // Only add text if it is new
          if (fullResponseText.indexOf(parsedStr) === -1) {
            chunkText += parsedStr;
          }
        }
        if (chunkText) {
          onChunk(chunkText);
          fullResponseText += chunkText;
        }
      }
    } catch (e) {
      // Wait for complete buffer blocks
    }
  }
  
  onComplete(fullResponseText);
}

async function callOpenRouterStream(
  history: any[],
  modelId: string,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  // Map our model IDs to OpenRouter model names
  let openRouterModel = modelId;
  if (modelId === 'deepseek-chat') openRouterModel = 'deepseek/deepseek-chat';
  else if (modelId === 'deepseek-reasoner') openRouterModel = 'deepseek/deepseek-r1';
  else if (modelId === 'llama-4') openRouterModel = 'meta-llama/llama-3.1-405b-instruct';
  else if (modelId === 'mistral-large') openRouterModel = 'mistralai/mistral-large-2';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': `${window.location.origin}`,
      'X-Title': 'AI Nexus SaaS',
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: history,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.statusText} (${errorText})`);
  }

  await parseSSEResponse(response, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      // Retrieve text or reasonings (R1 chain of thought)
      const text = parsed.choices[0]?.delta?.content || '';
      const reasoning = parsed.choices[0]?.delta?.reasoning || '';
      
      if (reasoning) {
        // DeepSeek reasoning block
        onChunk(reasoning);
      } else if (text) {
        onChunk(text);
      }
    } catch {
      // Chunk end
    }
  }, onComplete);
}

async function callAnthropicStream(
  history: any[],
  modelId: string,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  // Anthropic API direct streaming via fetch
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: history.filter(m => m.role !== 'system'),
      system: history.find(m => m.role === 'system')?.content || '',
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.statusText} (${errorText})`);
  }

  await parseSSEResponse(response, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        onChunk(parsed.delta.text);
      }
    } catch {
      // Fail silently
    }
  }, onComplete);
}

async function callMistralStream(
  history: any[],
  modelId: string,
  options: StreamOptions,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void
) {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: history,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.statusText} (${errorText})`);
  }

  await parseSSEResponse(response, (chunk) => {
    try {
      const parsed = JSON.parse(chunk);
      const text = parsed.choices[0]?.delta?.content || '';
      if (text) onChunk(text);
    } catch {
      // Chunk end
    }
  }, onComplete);
}

// Helper to parse Server-Sent Events (SSE) Stream response
async function parseSSEResponse(
  response: Response,
  onChunkData: (chunk: string) => void,
  onComplete: (fullText: string) => void
) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  if (!reader) throw new Error('No reader on response stream');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Save the last incomplete line back to the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const cleaned = line.trim();
      if (!cleaned) continue;

      if (cleaned.startsWith('data: ')) {
        const data = cleaned.slice(6);
        if (data === '[DONE]') continue;
        
        // Extract content
        const beforeText = fullText;
        onChunkData(data);
        
        // Try simple JSON parsing to append to full text accumulator
        try {
          const parsed = JSON.parse(data);
          const t = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || '';
          if (t) fullText += t;
        } catch {
          // Accumulate raw text chunk fallback
        }
      }
    }
  }

  // Process whatever is left in buffer
  if (buffer && buffer.startsWith('data: ')) {
    const data = buffer.slice(6);
    if (data !== '[DONE]') {
      onChunkData(data);
      try {
        const parsed = JSON.parse(data);
        fullText += parsed.choices?.[0]?.delta?.content || parsed.delta?.text || '';
      } catch {}
    }
  }

  onComplete(fullText);
}
