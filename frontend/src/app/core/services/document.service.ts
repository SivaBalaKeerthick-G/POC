import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentFile, VectorChunk, DashboardMetrics } from '../../models/document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** Fetch all documents in the knowledge base. */
  getDocuments(): Observable<DocumentFile[]> {
    return this.http.get<DocumentFile[]>(`${this.apiUrl}/api/documents`);
  }

  /** Upload a new document with its target category. */
  uploadDocument(file: File, category: string): Observable<DocumentFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return this.http.post<DocumentFile>(`${this.apiUrl}/api/documents/upload`, formData);
  }

  /** Permanently delete a document from the knowledge base. */
  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/documents/${id}`);
  }

  /** Trigger a re-index of a document's vector chunks. */
  reindexDocument(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/documents/${id}/reindex`, {});
  }

  /** Fetch vector chunks for a specific document. */
  getChunks(docId: string): Observable<VectorChunk[]> {
    return this.http.get<VectorChunk[]>(`${this.apiUrl}/api/documents/${docId}/chunks`);
  }

  /** Fetch live dashboard metrics (query count, vector chunks, latency, etc). */
  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/api/metrics`);
  }
}
