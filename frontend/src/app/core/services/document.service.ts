import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentFile, VectorChunk, DashboardMetrics } from '../../models/document.model';

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

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/documents/${id}`).pipe(
      timeout(this.requestTimeout),
      catchError(this.handleError)
    );
  }

  reindexDocument(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/documents/${id}/reindex`, {}).pipe(
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
