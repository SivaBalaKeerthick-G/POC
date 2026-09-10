import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DocumentFile,
  VectorChunk,
  DashboardMetrics,
  DocumentMetadataUpdate,
  IndexHealth,
} from '../../models/document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private requestTimeout = 60000;

  getDocuments(): Observable<DocumentFile[]> {
    return this.http.get<DocumentFile[]>(`${this.apiUrl}/api/documents`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  uploadDocument(file: File, category: string): Observable<DocumentFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return this.http.post<DocumentFile>(`${this.apiUrl}/api/documents/upload`, formData).pipe(
      timeout(300000),
      catchError(this.handleError)
    );
  }

  updateDocument(id: string, changes: DocumentMetadataUpdate): Observable<DocumentFile> {
    return this.http.patch<DocumentFile>(`${this.apiUrl}/api/documents/${id}`, changes).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/documents/${id}`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  /** Re-chunks, re-embeds and replaces the document's vectors. */
  reindexDocument(id: string): Observable<DocumentFile> {
    return this.http.post<DocumentFile>(`${this.apiUrl}/api/documents/${id}/reindex`, {}).pipe(
      timeout(300000),
      catchError(this.handleError)
    );
  }

  getChunks(docId: string): Observable<VectorChunk[]> {
    return this.http.get<VectorChunk[]>(`${this.apiUrl}/api/documents/${docId}/chunks`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  /** Chunk rows in PostgreSQL vs vectors in ChromaDB. */
  getIndexHealth(): Observable<IndexHealth> {
    return this.http.get<IndexHealth>(`${this.apiUrl}/api/documents/index-health`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/api/metrics`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    if (error.name === 'TimeoutError') {
      return throwError(() => new Error('Request timed out. Please try again.'));
    }
    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(error.error?.detail || error.message || 'An error occurred'));
    }
    return throwError(() => error);
  }
}
