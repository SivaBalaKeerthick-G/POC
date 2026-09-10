import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  filterQuery = signal('');
  selectedDocForDrawer = signal<DocumentFile | null>(null);
  drawerChunks = signal<VectorChunk[]>([]);
  isDrawerLoading = signal(false);

  // Notification Toast State
  notificationMessage = signal<string | null>(null);

  // Inline Upload Modal State
  isUploadModalOpen = signal(false);
  isUploading = signal(false);
  selectedFile = signal<File | null>(null);
  selectedCategory = 'Security & Policy';
  isDragging = signal(false);

  // Delete Confirm Modal State
  isDeleteConfirmOpen = signal(false);
  docPendingDelete = signal<DocumentFile | null>(null);

  // Dashboard metrics (loaded from API)
  vectorChunks = signal(0);
  monthlyQueries = signal(0);
  groundingRate = signal('—');
  avgLatencyMs = signal(0);

  documents = signal<DocumentFile[]>([]);
  isLoadingDocs = signal(true);

  private documentService = inject(DocumentService);

  ngOnInit(): void {
    this.loadDocuments();
    this.loadMetrics();
  }

  readonly filteredDocuments = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const docs = this.documents();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    );
  });

  private loadDocuments(): void {
    this.isLoadingDocs.set(true);
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.isLoadingDocs.set(false);
      },
      error: (err) => {
        console.error('Failed to load documents:', err);
        this.showNotification(`Could not load documents: ${err.message ?? 'unknown error'}`);
        this.isLoadingDocs.set(false);
      },
    });
  }

  private loadMetrics(): void {
    this.documentService.getMetrics().subscribe({
      next: (m) => {
        this.vectorChunks.set(m.vectorChunks);
        this.monthlyQueries.set(m.monthlyQueries);
        this.groundingRate.set(m.groundingRate);
        this.avgLatencyMs.set(m.avgLatencyMs);
      },
      error: (err) => console.error('Failed to load metrics:', err),
    });
  }

  // Toast Notification Helper (auto-dismiss after 2 seconds)
  showNotification(msg: string): void {
    this.notificationMessage.set(msg);
    setTimeout(() => {
      this.notificationMessage.set(null);
    }, 2000);
  }

  // Upload Modal Handlers
  openUploadModal(): void {
    this.selectedFile.set(null);
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    if (this.isUploading()) return;
    this.isUploadModalOpen.set(false);
  }

  // Drag & Drop Handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
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
    this.selectedFile.set(file);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
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
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;
    this.isUploading.set(true);

    this.documentService.uploadDocument(file, this.selectedCategory).subscribe({
      next: (newDoc) => {
        this.documents.update((docs) => [newDoc, ...docs]);
        this.isUploadModalOpen.set(false);
        this.isUploading.set(false);
        this.showNotification(`Document "${newDoc.name}" uploaded successfully!`);
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.isUploading.set(false);
        this.showNotification(`Upload failed: ${err.message ?? 'unknown error'}`);
      },
    });
  }

  // Chunk Drawer Handlers
  openChunkDrawer(doc: DocumentFile): void {
    this.selectedDocForDrawer.set(doc);
    this.drawerChunks.set([]);
    this.isDrawerLoading.set(true);

    this.documentService.getChunks(doc.id).subscribe({
      next: (chunks) => {
        this.drawerChunks.set(chunks);
        this.isDrawerLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load chunks:', err);
        this.isDrawerLoading.set(false);
        this.showNotification('Error: Could not load vector chunks.');
      },
    });
  }

  closeChunkDrawer(): void {
    this.selectedDocForDrawer.set(null);
    this.drawerChunks.set([]);
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
    this.docPendingDelete.set(doc);
    this.isDeleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen.set(false);
    this.docPendingDelete.set(null);
  }

  confirmDelete(): void {
    const doc = this.docPendingDelete();
    if (!doc) return;

    this.isDeleteConfirmOpen.set(false);
    this.docPendingDelete.set(null);

    this.documentService.deleteDocument(doc.id).subscribe({
      next: () => {
        this.documents.update((docs) => docs.filter((d) => d.id !== doc.id));
        this.showNotification(`Removed "${doc.name}" from knowledge base.`);
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.showNotification(`Error: Failed to delete "${doc.name}".`);
      },
    });
  }
}