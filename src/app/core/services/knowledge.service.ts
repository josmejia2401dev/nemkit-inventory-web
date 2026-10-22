import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpRequest, HttpEventType, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, filter, map, firstValueFrom } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { environment } from '../../../environments/environment';

/** Umbral: < 500 KB carga directa; ≥ 500 KB por chunks (también tamaño de cada chunk). */
const CHUNK_THRESHOLD = 500 * 1024;

/** Estado de progreso emitido durante subida/descarga. */
export interface TransferProgress<T = unknown> {
  status: 'progress' | 'done';
  percent: number;      // 0..100
  body?: T;             // presente cuando status === 'done'
}

/** A folder node in the knowledge tree. */
export interface KnowledgeFolder {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Nested tree node returned by GET /knowledge/tree. */
export interface KnowledgeTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  children: KnowledgeTreeNode[];
}

export type KnowledgeKind = 'file' | 'note' | 'bug';

/** A file/note/bug entry. `content` is only present when fetched by id. */
export interface KnowledgeItem {
  id: number;
  folderId: number | null;
  name: string;
  kind: KnowledgeKind;
  language: string;
  mimeType: string;
  sizeBytes: number;
  isBinary?: boolean;
  originalName?: string | null;
  tags: string[];
  content?: string;
  folderPath?: string; // ruta legible, ej: "Root / mi-unidad / bugs"
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Tree ──────────────────────────────────────────────
  getTree(): Observable<ApiResponse<KnowledgeTreeNode[]>> {
    return this.api.get<KnowledgeTreeNode[]>('/knowledge/tree');
  }

  // ── Folders ───────────────────────────────────────────
  listFolders(parentId: number | null): Observable<ApiResponse<KnowledgeFolder[]>> {
    return this.api.get<KnowledgeFolder[]>('/knowledge/folders', { parentId: parentId ?? 'root' });
  }

  createFolder(body: { name: string; parentId?: number | null }): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.post<KnowledgeFolder>('/knowledge/folders', body);
  }

  renameFolder(id: number, name: string): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.put<KnowledgeFolder>(`/knowledge/folders/${id}`, { name });
  }

  moveFolder(id: number, parentId: number | null): Observable<ApiResponse<KnowledgeFolder>> {
    return this.api.patch<KnowledgeFolder>(`/knowledge/folders/${id}/move`, { parentId });
  }

  deleteFolder(id: number): Observable<ApiResponse<{ deletedFolders: number }>> {
    return this.api.delete<{ deletedFolders: number }>(`/knowledge/folders/${id}`);
  }

  // ── Items ─────────────────────────────────────────────
  listItems(folderId: number | null, kind?: KnowledgeKind | null): Observable<ApiResponse<KnowledgeItem[]>> {
    const params: Record<string, unknown> = { folderId: folderId ?? 'root' };
    if (kind) params['kind'] = kind;
    return this.api.get<KnowledgeItem[]>('/knowledge/items', params);
  }

  getItem(id: number): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.get<KnowledgeItem>(`/knowledge/items/${id}`);
  }

  searchItems(q: string, kind?: KnowledgeKind | null): Observable<ApiResponse<KnowledgeItem[]>> {
    const params: Record<string, unknown> = { q };
    if (kind) params['kind'] = kind;
    return this.api.get<KnowledgeItem[]>('/knowledge/items/search', params);
  }

  createItem(body: Partial<KnowledgeItem>): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.post<KnowledgeItem>('/knowledge/items', body);
  }

  updateItem(id: number, body: Partial<KnowledgeItem>): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.put<KnowledgeItem>(`/knowledge/items/${id}`, body);
  }

  moveItem(id: number, folderId: number | null): Observable<ApiResponse<KnowledgeItem>> {
    return this.api.patch<KnowledgeItem>(`/knowledge/items/${id}/move`, { folderId });
  }

  deleteItem(id: number): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`/knowledge/items/${id}`);
  }

  /**
   * Sube un archivo transmitiéndolo como stream binario. El backend (nemkit/storage)
   * decide staging en memoria o disco según el tamaño. Emite progreso de subida.
   */
  /**
   * Sube un archivo. < 500 KB → carga directa (1 request, binario crudo).
   * ≥ 500 KB → carga por chunks (init → chunks → complete). Emite progreso real.
   */
  uploadFile(file: File, folderId: number | null): Observable<TransferProgress<KnowledgeItem>> {
    return file.size < CHUNK_THRESHOLD
      ? this.#uploadDirect(file, folderId)
      : this.#uploadChunked(file, folderId);
  }

  /** Carga directa: el archivo va como body binario crudo. */
  #uploadDirect(file: File, folderId: number | null): Observable<TransferProgress<KnowledgeItem>> {
    let params = new HttpParams().set('name', file.name);
    if (folderId != null) params = params.set('folderId', String(folderId));

    const headers = new HttpHeaders({
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    });

    const req = new HttpRequest('POST', `${this.base}/knowledge/items/upload`, file, {
      params, headers, reportProgress: true,
    });

    return this.http.request<ApiResponse<KnowledgeItem>>(req).pipe(
      filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e) => {
        if (e.type === HttpEventType.UploadProgress) {
          const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          return { status: 'progress', percent } as TransferProgress<KnowledgeItem>;
        }
        const body = (e as any).body as ApiResponse<KnowledgeItem>;
        return { status: 'done', percent: 100, body: body?.data } as TransferProgress<KnowledgeItem>;
      }),
    );
  }

  /** Carga por chunks: parte el archivo y envía cada pedazo por separado. */
  #uploadChunked(file: File, folderId: number | null): Observable<TransferProgress<KnowledgeItem>> {
    const totalChunks = Math.ceil(file.size / CHUNK_THRESHOLD);

    return new Observable<TransferProgress<KnowledgeItem>>((subscriber) => {
      let cancelled = false;
      let uploadId: string | null = null;

      const run = async () => {
        try {
          const init = await firstValueFrom(this.api.post<{ uploadId: string; totalChunks: number }>(
            '/knowledge/items/upload/init',
            { originalName: file.name, name: file.name, mime: file.type || 'application/octet-stream', totalChunks, totalSize: file.size, folderId },
          ));
          uploadId = init.data.uploadId;

          for (let index = 0; index < totalChunks; index++) {
            if (cancelled) return;
            const start = index * CHUNK_THRESHOLD;
            const blob = file.slice(start, Math.min(start + CHUNK_THRESHOLD, file.size));
            await firstValueFrom(this.#sendChunk(uploadId, index, blob));
            const percent = Math.round(((index + 1) / totalChunks) * 100);
            subscriber.next({ status: 'progress', percent });
          }

          const done = await firstValueFrom(this.api.post<KnowledgeItem>(
            `/knowledge/items/upload/${uploadId}/complete`, {},
          ));
          subscriber.next({ status: 'done', percent: 100, body: done.data });
          subscriber.complete();
        } catch (err) {
          if (uploadId) { this.api.delete(`/knowledge/items/upload/${uploadId}`).subscribe({ error: () => {} }); }
          subscriber.error(err);
        }
      };

      run();
      return () => { cancelled = true; };
    });
  }

  #sendChunk(uploadId: string, index: number, blob: Blob): Observable<unknown> {
    return this.http.post(
      `${this.base}/knowledge/items/upload/${uploadId}/chunk/${index}`,
      blob,
      { headers: new HttpHeaders({ 'Content-Type': 'application/octet-stream' }) },
    );
  }

  /** Descarga un archivo binario como Blob, emitiendo progreso de descarga. */
  downloadFile(id: number): Observable<TransferProgress<Blob>> {
    const req = new HttpRequest('GET', `${this.base}/knowledge/items/${id}/download`, {
      reportProgress: true,
      responseType: 'blob',
    });

    return this.http.request(req).pipe(
      filter((e) => e.type === HttpEventType.DownloadProgress || e.type === HttpEventType.Response),
      map((e) => {
        if (e.type === HttpEventType.DownloadProgress) {
          const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          return { status: 'progress', percent } as TransferProgress<Blob>;
        }
        return { status: 'done', percent: 100, body: (e as any).body as Blob } as TransferProgress<Blob>;
      }),
    );
  }
}
