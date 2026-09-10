export interface SourceChunk {
  id: string;
  fileName: string;
  chunkLocation: string;
  score: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  sources?: SourceChunk[];
}
