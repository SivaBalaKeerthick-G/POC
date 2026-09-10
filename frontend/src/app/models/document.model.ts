export interface DocumentFile {
  id: string;
  name: string;
  size: string;
  category: string;
  chunksCount: number;
  status: 'Indexed' | 'Processing';
  lastUpdated: string;
}

export interface VectorChunk {
  id: string;
  chunkIndex: number;
  score: string;
  tokens: number;
  textExcerpt: string;
}

export interface DashboardMetrics {
  vectorChunks: number;
  monthlyQueries: number;
  groundingRate: string;
  avgLatencyMs: number;
}
