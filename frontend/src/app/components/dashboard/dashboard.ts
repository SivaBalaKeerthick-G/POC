import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentFile, VectorChunk } from '../../models/document.model';
import { DocumentService } from '../../core/services/document.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  filterQuery = '';
  selectedDocForDrawer: DocumentFile | null = null;
  drawerChunks: VectorChunk[] = [];
  isDrawerLoading = false;

  // Notification Toast State
  notificationMessage: string | null = null;

  // Inline Upload Modal State
  isUploadModalOpen = false;
  isUploading = false;
  selectedFile: File | null = null;
  selectedCategory = 'Security & Policy';
  isDragging = false;

  // Delete Confirm Modal State
  isDeleteConfirmOpen = false;
  docPendingDelete: DocumentFile | null = null;

  // Dashboard metrics (loaded from API)
  vectorChunks = 0;
  monthlyQueries = 0;
  groundingRate = '—';
  avgLatencyMs = 0;

  documents: DocumentFile[] = [];
  isLoadingDocs = true;

  private documentService = inject(DocumentService);

  ngOnInit(): void {
    this.loadDocuments();
    this.loadMetrics();
  }

  /** Computed filtered documents list used in the template */
  get filteredDocuments(): DocumentFile[] {
    const q = this.filterQuery.trim().toLowerCase();
    if (!q) return this.documents;
    return this.documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    );
  }

  private loadDocuments(): void {
    this.isLoadingDocs = true;
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        this.isLoadingDocs = false;
      },
      error: (err) => {
        console.error('Failed to load documents:', err);
        this.showNotification('Error: Could not load documents from server.');
        this.isLoadingDocs = false;
      },
    });
  }

  private loadMetrics(): void {
    this.documentService.getMetrics().subscribe({
      next: (m) => {
        this.vectorChunks = m.vectorChunks;
        this.monthlyQueries = m.monthlyQueries;
        this.groundingRate = m.groundingRate;
        this.avgLatencyMs = m.avgLatencyMs;
      },
      error: (err) => console.error('Failed to load metrics:', err),
    });
  }

  // Toast Notification Helper (auto-dismiss after 2 seconds)
  showNotification(msg: string): void {
    this.notificationMessage = msg;
    setTimeout(() => {
      this.notificationMessage = null;
    }, 2000);
  }

  // Upload Modal Handlers
  openUploadModal(): void {
    this.selectedFile = null;
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    if (this.isUploading) return;
    this.isUploadModalOpen = false;
  }

  // Drag & Drop Handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      this.handleFile(target.files[0]);
    }
  }

  private handleFile(file: File): void {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
    ];
    // Some browsers report application/octet-stream for xlsx — allow by extension too
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'docx', 'doc', 'txt', 'xlsx', 'xls'];
    if (!validTypes.includes(file.type) && !validExts.includes(ext ?? '')) {
      this.showNotification('Error: Please upload a PDF, DOCX, TXT, XLSX, or XLS file.');
      return;
    }
    this.selectedFile = file;
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /** Returns the Font Awesome icon class based on the file extension */
  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':  return 'fa-solid fa-file-pdf';
      case 'docx':
      case 'doc':  return 'fa-solid fa-file-word';
      case 'txt':  return 'fa-solid fa-file-lines';
      case 'xlsx':
      case 'xls':  return 'fa-solid fa-file-excel';
      default:     return 'fa-solid fa-file';
    }
  }

  /** Returns the icon colour class based on file extension */
  getFileIconColor(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':  return 'pdf-icon';
      case 'docx':
      case 'doc':  return 'word-icon';
      case 'txt':  return 'txt-icon';
      case 'xlsx':
      case 'xls':  return 'excel-icon';
      default:     return 'default-icon';
    }
  }

  startUpload(): void {
    if (!this.selectedFile || this.isUploading) return;
    this.isUploading = true;

    this.documentService.uploadDocument(this.selectedFile, this.selectedCategory).subscribe({
      next: (newDoc) => {
        this.documents.unshift(newDoc);
        this.isUploadModalOpen = false;
        this.isUploading = false;
        this.showNotification(`Document "${newDoc.name}" uploaded successfully!`);
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.isUploading = false;
        this.showNotification('Error: Document upload failed. Please try again.');
      },
    });
  }

  // Chunk Drawer Handlers
  openChunkDrawer(doc: DocumentFile): void {
    this.selectedDocForDrawer = doc;
    this.drawerChunks = [];
    this.isDrawerLoading = true;

    this.documentService.getChunks(doc.id).subscribe({
      next: (chunks) => {
        this.drawerChunks = chunks;
        this.isDrawerLoading = false;
      },
      error: (err) => {
        console.error('Failed to load chunks:', err);
        this.isDrawerLoading = false;
        this.showNotification('Error: Could not load vector chunks.');
      },
    });
  }

  closeChunkDrawer(): void {
    this.selectedDocForDrawer = null;
    this.drawerChunks = [];
  }

  copyChunk(text: string): void {
    navigator.clipboard.writeText(text);
    this.showNotification('Chunk excerpt copied to clipboard!');
  }

  // Admin Table Actions
  editDoc(doc: DocumentFile): void {
    this.showNotification(`Editing metadata for: ${doc.name}`);
  }

  reindexDoc(doc: DocumentFile): void {
    this.documentService.reindexDocument(doc.id).subscribe({
      next: () => this.showNotification(`Re-indexing started for ${doc.name}.`),
      error: (err) => {
        console.error('Reindex failed:', err);
        this.showNotification(`Error: Failed to re-index ${doc.name}.`);
      },
    });
  }

  // Delete flow using custom modal (replaces window.confirm)
  requestDelete(doc: DocumentFile): void {
    this.docPendingDelete = doc;
    this.isDeleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.docPendingDelete = null;
  }

  confirmDelete(): void {
    const doc = this.docPendingDelete;
    if (!doc) return;

    this.isDeleteConfirmOpen = false;
    this.docPendingDelete = null;

    this.documentService.deleteDocument(doc.id).subscribe({
      next: () => {
        this.documents = this.documents.filter((d) => d.id !== doc.id);
        this.showNotification(`Removed "${doc.name}" from knowledge base.`);
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.showNotification(`Error: Failed to delete "${doc.name}".`);
      },
    });
  }
}