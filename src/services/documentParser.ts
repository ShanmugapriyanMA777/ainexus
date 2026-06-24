// Client-Side Document Parser & Semantic Retrieval (RAG)

// Dynamically load PDF.js from CDN for browser parsing
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library'));
    document.head.appendChild(script);
  });
};

export interface DocChunk {
  text: string;
  fileName: string;
  chunkIndex: number;
  embedding?: number[];
}

// 1. Core Document Parsers
export const parseTxtFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
};

export const parseCsvFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string || '';
      // Turn CSV rows into structured markdown tables for the LLM to understand better
      const lines = csvText.split('\n');
      const tableRows = lines.map(line => `| ${line.split(',').join(' | ')} |`).join('\n');
      resolve(tableRows);
    };
    reader.onerror = (e) => reject(new Error('Failed to read CSV file'));
    reader.readAsText(file);
  });
};

export const parsePdfFile = async (file: File): Promise<string> => {
  const pdfjs = await loadPdfJs();
  const fileReader = new FileReader();
  
  return new Promise((resolve, reject) => {
    fileReader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
        let textContent = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          textContent += `[Page ${i}]\n${pageText}\n\n`;
        }
        
        resolve(textContent);
      } catch (err) {
        reject(new Error(`Failed to parse PDF: ${err}`));
      }
    };
    fileReader.onerror = () => reject(new Error('File load error'));
    fileReader.readAsArrayBuffer(file);
  });
};

// 2. Chunker
export const chunkDocument = (text: string, fileName: string, chunkSize = 600, overlap = 150): DocChunk[] => {
  const chunks: DocChunk[] = [];
  let index = 0;
  let chunkCount = 0;

  while (index < text.length) {
    const chunkText = text.substring(index, index + chunkSize);
    chunks.push({
      text: chunkText.trim(),
      fileName,
      chunkIndex: chunkCount++,
    });
    
    index += chunkSize - overlap;
  }

  return chunks;
};

// 3. Vector Embeddings API (OpenAI text-embedding-3-small)
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    // If no API key, return a mock embedding vector based on word values
    // This allows fallback Cosine Similarity to run without errors
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(1536).fill(0);
    words.forEach((word) => {
      let codeSum = 0;
      for (let i = 0; i < word.length; i++) codeSum += word.charCodeAt(i);
      const index = codeSum % 1536;
      vector[index] += 1;
    });
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((val) => (magnitude === 0 ? 0 : val / magnitude));
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate embedding from OpenAI');
  }

  const result = await response.json();
  return result.data[0].embedding;
};

// 4. Similarity Calculations (Cosine Similarity)
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// 5. Semantic Vector Retrieval
export const querySemanticContext = async (
  query: string,
  chunks: DocChunk[],
  topK = 3
): Promise<string> => {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Generate embeddings for chunks if not already cached
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        if (!chunk.embedding) {
          chunk.embedding = await generateEmbedding(chunk.text);
        }
        return chunk;
      })
    );

    // Calculate similarity
    const matches = chunksWithEmbeddings.map((chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding || []);
      return { chunk, score };
    });

    // Sort descending
    matches.sort((a, b) => b.score - a.score);

    // Retrieve top K chunks
    const topMatches = matches.slice(0, topK);
    
    return topMatches
      .map(
        (m, idx) =>
          `[Source: ${m.chunk.fileName} (Chunk #${m.chunk.chunkIndex + 1}) | Match Score: ${(m.score * 100).toFixed(1)}%]\n${m.chunk.text}`
      )
      .join('\n\n---\n\n');
  } catch (err) {
    console.error('Vector search failed, running text keyword match fallback...', err);
    // Fallback to text match
    return runKeywordSearchFallback(query, chunks, topK);
  }
};

// TF-IDF inspired keyword fallback search
const runKeywordSearchFallback = (query: string, chunks: DocChunk[], topK = 3): string => {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const scored = chunks.map((chunk) => {
    const txt = chunk.text.toLowerCase();
    let score = 0;
    queryTerms.forEach((term) => {
      if (txt.includes(term)) {
        score += 1;
        // Count frequencies
        const matches = txt.match(new RegExp(term, 'g'));
        if (matches) score += matches.length * 0.2;
      }
    });
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, topK)
    .filter((m) => m.score > 0)
    .map(
      (m) =>
        `[Source: ${m.chunk.fileName} (Chunk #${m.chunk.chunkIndex + 1}) | Keyword Rank: ${m.score.toFixed(1)}]\n${m.chunk.text}`
    )
    .join('\n\n---\n\n');
};
