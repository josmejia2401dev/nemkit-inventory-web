import { Component, inject, signal, computed, OnInit, Input, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
  KnowledgeService, KnowledgeFolder, KnowledgeItem, KnowledgeKind,
} from '../../../core/services/knowledge.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';

interface Crumb { id: number | null; name: string; }

/** Estado de subida en curso mostrado en la UI. */
interface UploadTask {
  name: string;
  sizeBytes: number;
  mimeType: string;
  percent: WritableSignal<number>;
  status: WritableSignal<'uploading' | 'error' | 'done'>;
  error: WritableSignal<string>;
}

interface DownloadTask {
  name: string;
  sizeBytes: number;
  mimeType: string;
  percent: WritableSignal<number>;
  status: WritableSignal<'downloading' | 'error' | 'done'>;
  error: WritableSignal<string>;
}

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (alineado con STORAGE_MAX_FILE_MB del backend)

/** Prefilled template for a bug report. */
const BUG_TEMPLATE = `## Summary
_Short description of the bug._

## Steps to reproduce
1.
2.
3.

## Expected behavior
_What should happen._

## Actual behavior
_What actually happens (error messages, stack traces...)._

## Environment
- App / service:
- Version / commit:
- OS / browser:

## Workaround / fix
_How it was solved, or a temporary workaround (if any)._
`;

const NOTE_TEMPLATE = `# Title

_Write your note here..._
`;

const LANGUAGES = [
  { label: 'Text', value: 'text' },
  { label: 'Java', value: 'java' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'shell' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'XML', value: 'xml' },
  { label: 'Python', value: 'python' },
];

@Component({
  selector: 'app-knowledge-explorer',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule, DialogModule, MenuModule],
  templateUrl: './knowledge-explorer.component.html',
})
export class KnowledgeExplorerComponent implements OnInit {
  private service = inject(KnowledgeService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  /** Compact mode trims paddings/typography for the drawer. */
  @Input() compact = false;

  @ViewChild('newMenu') newMenu!: Menu;

  languages = LANGUAGES;

  // Search
  searchQuery = '';
  searching = signal(false);
  searchActive = signal(false);
  searchResults = signal<KnowledgeItem[]>([]);

  // Kind filter chips
  kindFilter = signal<KnowledgeKind | null>(null); // null = All
  readonly kindChips: { label: string; value: KnowledgeKind | null }[] = [
    { label: 'All', value: null },
    { label: 'Files', value: 'file' },
    { label: 'Notes', value: 'note' },
    { label: 'Bugs', value: 'bug' },
  ];

  // "New" dropdown menu
  newMenuItems: MenuItem[] = [
    { label: 'New file / snippet', icon: 'pi pi-file', command: () => this.newEntry('file') },
    { label: 'New note', icon: 'pi pi-pencil', command: () => this.newEntry('note') },
    { label: 'Report a bug', icon: 'pi pi-exclamation-triangle', command: () => this.newEntry('bug') },
  ];

  // Navigation state
  currentFolderId = signal<number | null>(null);
  breadcrumbs = signal<Crumb[]>([{ id: null, name: 'Root' }]);

  // Data
  folders = signal<KnowledgeFolder[]>([]);
  items = signal<KnowledgeItem[]>([]);
  uploads = signal<UploadTask[]>([]);
  uploadDialogVisible = signal(false);

  // Selección múltiple para descarga
  selectionMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  downloads = signal<DownloadTask[]>([]);
  downloadDialogVisible = signal(false);
  loading = signal(false);

  // New folder inline
  creatingFolder = signal(false);
  newFolderName = '';

  // Editor dialog
  editorVisible = signal(false);
  editorSaving = signal(false);
  editing = signal<KnowledgeItem | null>(null);
  editingPath = signal<string>('');
  form = { name: '', kind: 'file' as KnowledgeKind, language: 'text', content: '', tags: '' };

  // Internal drag & drop (move)
  private dragged = signal<{ kind: 'folder' | 'item'; id: number } | null>(null);
  dropTarget = signal<number | 'root' | null>(null); // folder id being hovered, or 'root'

  isEmpty = computed(() => this.folders().length === 0 && this.items().length === 0);

  ngOnInit(): void { this.load(); }

  // ── Loading ───────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    const fid = this.currentFolderId();
    this.service.listFolders(fid).subscribe({
      next: (res) => this.folders.set(res.data ?? []),
      error: () => this.notify.error('Failed to load folders'),
    });
    this.service.listItems(fid, this.kindFilter()).subscribe({
      next: (res) => { this.items.set(res.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Failed to load entries'); },
    });
  }

  setKindFilter(kind: KnowledgeKind | null): void {
    this.kindFilter.set(kind);
    if (this.searchActive()) this.runSearch();
    else this.load();
  }

  toggleNewMenu(event: Event): void {
    this.newMenu.toggle(event);
  }

  // ── Search (name / tags / content, global) ────────────
  runSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) { this.clearSearch(); return; }
    this.searching.set(true);
    this.searchActive.set(true);
    this.service.searchItems(q, this.kindFilter()).subscribe({
      next: (res) => { this.searchResults.set(res.data ?? []); this.searching.set(false); },
      error: () => { this.searching.set(false); this.notify.error('Search failed'); },
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchActive.set(false);
    this.searchResults.set([]);
  }

  // ── Navigation ────────────────────────────────────────
  openFolder(folder: KnowledgeFolder): void {
    // Evita agregar migas duplicadas si ya estamos dentro de esa carpeta.
    if (this.currentFolderId() === folder.id) return;
    this.currentFolderId.set(folder.id);
    this.breadcrumbs.update(bc => [...bc, { id: folder.id, name: folder.name }]);
    this.cancelNewFolder();
    this.load();
  }

  goToCrumb(index: number): void {
    const bc = this.breadcrumbs();
    const target = bc[index];
    this.breadcrumbs.set(bc.slice(0, index + 1));
    this.currentFolderId.set(target.id);
    this.cancelNewFolder();
    this.load();
  }

  // ── Folder CRUD ───────────────────────────────────────
  startNewFolder(): void { this.creatingFolder.set(true); this.newFolderName = ''; }
  cancelNewFolder(): void { this.creatingFolder.set(false); this.newFolderName = ''; }

  saveNewFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;
    this.service.createFolder({ name, parentId: this.currentFolderId() }).subscribe({
      next: () => { this.notify.success('Folder created'); this.cancelNewFolder(); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Failed to create folder'),
    });
  }

  // Rename folder dialog
  renameVisible = signal(false);
  renameSaving = signal(false);
  private renaming = signal<KnowledgeFolder | null>(null);
  renameValue = '';

  renameFolder(folder: KnowledgeFolder): void {
    this.renaming.set(folder);
    this.renameValue = folder.name;
    this.renameVisible.set(true);
  }

  closeRename(): void { this.renameVisible.set(false); this.renaming.set(null); }

  saveRename(): void {
    const folder = this.renaming();
    const name = this.renameValue.trim();
    if (!folder) return;
    if (!name) { this.notify.warn('Folder name is required'); return; }
    if (name === folder.name) { this.closeRename(); return; }

    this.renameSaving.set(true);
    this.service.renameFolder(folder.id, name).subscribe({
      next: () => {
        this.notify.success('Folder renamed');
        this.renameSaving.set(false);
        this.closeRename();
        this.load();
      },
      error: (e) => {
        this.renameSaving.set(false);
        this.notify.error(e?.error?.message ?? 'Failed to rename folder');
      },
    });
  }

  async deleteFolder(folder: KnowledgeFolder): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete folder',
      message: `Delete "${folder.name}" and all its contents? This cannot be undone.`,
      confirmLabel: 'Delete', severity: 'danger',
    });
    if (!ok) return;
    this.service.deleteFolder(folder.id).subscribe({
      next: () => { this.notify.success('Folder deleted'); this.load(); },
      error: () => this.notify.error('Failed to delete folder'),
    });
  }

  // ── Entry editor (file / note / bug) ──────────────────
  newEntry(kind: KnowledgeKind): void {
    this.editing.set(null);
    this.editingPath.set('');
    const defaults: Record<KnowledgeKind, { name: string; language: string; content: string }> = {
      file: { name: '', language: 'text', content: '' },
      note: { name: '', language: 'markdown', content: NOTE_TEMPLATE },
      bug:  { name: '', language: 'markdown', content: BUG_TEMPLATE },
    };
    const d = defaults[kind];
    this.form = { name: d.name, kind, language: d.language, content: d.content, tags: '' };
    this.editorVisible.set(true);
  }

  openFile(item: KnowledgeItem): void {
    if (item.isBinary) { this.downloadFile(item); return; }
    this.service.getItem(item.id).subscribe({
      next: (res) => {
        const full = res.data;
        this.editing.set(full);
        this.editingPath.set(full.folderPath ?? '');
        this.form = {
          name: full.name,
          kind: full.kind ?? 'file',
          language: full.language ?? 'text',
          content: full.content ?? '',
          tags: (full.tags ?? []).join(', '),
        };
        this.editorVisible.set(true);
      },
      error: () => this.notify.error('Failed to open entry'),
    });
  }

  closeEditor(): void { this.editorVisible.set(false); this.editing.set(null); this.editingPath.set(''); }

  get contentBytes(): number {
    return new Blob([this.form.content ?? '']).size;
  }
  get overLimit(): boolean { return this.contentBytes > MAX_BYTES; }

  saveFile(): void {
    const name = this.form.name.trim();
    const label = this.kindLabel(this.form.kind);
    if (!name) { this.notify.warn(`${label} name is required`); return; }
    if (this.overLimit) { this.notify.error('Content exceeds the 1MB limit'); return; }

    const tags = this.form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload: Partial<KnowledgeItem> = {
      name, kind: this.form.kind, language: this.form.language, content: this.form.content, tags,
    };

    this.editorSaving.set(true);
    const editing = this.editing();
    const req$ = editing
      ? this.service.updateItem(editing.id, payload)
      : this.service.createItem({ ...payload, folderId: this.currentFolderId() });

    req$.subscribe({
      next: () => {
        this.notify.success(editing ? `${label} updated` : `${label} created`);
        this.editorSaving.set(false);
        this.closeEditor();
        this.load();
      },
      error: (e) => {
        this.editorSaving.set(false);
        this.notify.error(e?.error?.message ?? `Failed to save ${label.toLowerCase()}`);
      },
    });
  }

  async deleteFile(item: KnowledgeItem): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete file',
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmLabel: 'Delete', severity: 'danger',
    });
    if (!ok) return;
    this.service.deleteItem(item.id).subscribe({
      next: () => { this.notify.success('File deleted'); this.load(); },
      error: () => this.notify.error('Failed to delete file'),
    });
  }

  // ── Internal drag & drop (move items/folders) ─────────
  onDragStart(event: DragEvent, kind: 'folder' | 'item', id: number): void {
    this.dragged.set({ kind, id });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Some browsers require data to be set for the drag to start.
      event.dataTransfer.setData('text/plain', `${kind}:${id}`);
    }
  }

  onDragEnd(): void {
    this.dragged.set(null);
    this.dropTarget.set(null);
  }

  /** Hover over a folder row (valid drop target). */
  onFolderDragOver(event: DragEvent, folder: KnowledgeFolder): void {
    if (!this.dragged()) return; // let OS-file drops bubble to the root dropzone
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(folder.id);
  }

  onFolderDragLeave(folder: KnowledgeFolder): void {
    if (this.dropTarget() === folder.id) this.dropTarget.set(null);
  }

  /** Drop onto a folder row → move dragged item/folder into it. */
  onFolderDrop(event: DragEvent, folder: KnowledgeFolder): void {
    if (!this.dragged()) return;
    event.preventDefault();
    event.stopPropagation();
    this.performMove(folder.id);
  }

  /** Hover over a breadcrumb (drop into an ancestor folder / root). */
  onCrumbDragOver(event: DragEvent, crumbId: number | null): void {
    if (!this.dragged()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(crumbId ?? 'root');
  }

  onCrumbDrop(event: DragEvent, crumbId: number | null): void {
    if (!this.dragged()) return;
    event.preventDefault();
    this.performMove(crumbId);
  }

  /** Executes the move of the currently dragged element to a target folder (null = root). */
  private performMove(targetFolderId: number | null): void {
    const dragged = this.dragged();
    this.dropTarget.set(null);
    if (!dragged) return;
    this.dragged.set(null);

    if (dragged.kind === 'item') {
      const item = this.items().find(i => i.id === dragged.id);
      if (item && (item.folderId ?? null) === (targetFolderId ?? null)) return; // no-op
      this.service.moveItem(dragged.id, targetFolderId).subscribe({
        next: () => { this.notify.success('File moved'); this.load(); },
        error: (e) => this.notify.error(e?.error?.message ?? 'Failed to move file'),
      });
    } else {
      // Folder → folder. Guard obvious no-ops; backend prevents cycles.
      if (dragged.id === targetFolderId) return;
      const folder = this.folders().find(f => f.id === dragged.id);
      if (folder && (folder.parentId ?? null) === (targetFolderId ?? null)) return; // already here
      this.service.moveFolder(dragged.id, targetFolderId).subscribe({
        next: () => { this.notify.success('Folder moved'); this.load(); },
        error: (e) => this.notify.error(e?.error?.message ?? 'Failed to move folder'),
      });
    }
  }

  // ── Upload (button + drag & drop) ─────────────────────
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  /** Drop on the root surface: OS file upload, OR move a dragged item/folder to the current folder. */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropTarget.set(null);

    // OS files being dropped → upload
    const files = event.dataTransfer?.files;
    if (files?.length) { this.uploadFiles(Array.from(files)); return; }

    // Internal drag → move to the folder we're currently viewing
    this.performMove(this.currentFolderId());
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  private uploadFiles(files: File[]): void {
    const folderId = this.currentFolderId();
    const valid = files.filter((f) => {
      if (f.size > MAX_BYTES) { this.notify.error(`"${f.name}" exceeds the 15MB limit`); return false; }
      return true;
    });
    if (!valid.length) return;

    // Inicializa el dialog con todos los archivos en estado "uploading".
    const tasks: UploadTask[] = valid.map((f) => ({
      name: f.name,
      sizeBytes: f.size,
      mimeType: f.type || '',
      percent: signal(0),
      status: signal<'uploading' | 'error' | 'done'>('uploading'),
      error: signal(''),
    }));
    this.uploads.set(tasks);
    this.uploadDialogVisible.set(true);

    valid.forEach((file, i) => {
      const task = tasks[i];
      this.service.uploadFile(file, folderId).subscribe({
        next: (ev) => {
          if (ev.status === 'progress') {
            task.percent.set(ev.percent);
          } else {
            task.percent.set(100);
            task.status.set('done');
            this.load();
          }
        },
        error: (e) => {
          task.status.set('error');
          task.error.set(e?.error?.message ?? `Failed to upload ${file.name}`);
        },
      });
    });
  }

  get allUploadsSettled(): boolean {
    return this.uploads().every((t) => t.status() !== 'uploading');
  }

  get uploadDoneCount(): number {
    return this.uploads().filter((t) => t.status() === 'done').length;
  }

  get uploadErrorCount(): number {
    return this.uploads().filter((t) => t.status() === 'error').length;
  }

  get uploadOverallPercent(): number {
    const list = this.uploads();
    if (!list.length) return 0;
    const sum = list.reduce((acc, t) => acc + (t.status() === 'done' ? 100 : t.percent()), 0);
    return Math.round(sum / list.length);
  }

  uploadIcon(mime: string, name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (mime.startsWith('image/')) return 'pi pi-image';
    if (mime.startsWith('video/')) return 'pi pi-video';
    if (mime.startsWith('audio/')) return 'pi pi-volume-up';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pi pi-file-pdf';
    if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'pi pi-box';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'pi pi-file-excel';
    if (['doc', 'docx'].includes(ext)) return 'pi pi-file-word';
    if (['js', 'ts', 'java', 'py', 'json', 'html', 'css', 'sh', 'ps1', 'xml', 'yml', 'yaml'].includes(ext)) return 'pi pi-code';
    return 'pi pi-file';
  }

  closeUploadDialog(): void {
    this.uploadDialogVisible.set(false);
    this.uploads.set([]);
  }

  downloadFile(item: KnowledgeItem): void {
    this.service.downloadFile(item.id).subscribe({
      next: (ev) => {
        if (ev.status === 'done' && ev.body) {
          const url = URL.createObjectURL(ev.body);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.originalName || item.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      error: () => this.notify.error(`Failed to download ${item.name}`),
    });
  }

  // ── Selección múltiple + descarga ──
  toggleSelectionMode(): void {
    this.selectionMode.update((v) => !v);
    if (!this.selectionMode()) this.selectedIds.set(new Set());
  }

  toggleSelected(id: number): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  selectAllBinary(): void {
    const ids = this.items().filter((i) => i.isBinary).map((i) => i.id);
    this.selectedIds.set(new Set(ids));
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  get selectedCount(): number { return this.selectedIds().size; }

  downloadSelected(): void {
    const ids = this.selectedIds();
    const files = this.items().filter((i) => i.isBinary && ids.has(i.id));
    if (!files.length) { this.notify.warn('Select at least one file'); return; }

    const tasks: DownloadTask[] = files.map((f) => ({
      name: f.originalName || f.name,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      percent: signal(0),
      status: signal<'downloading' | 'error' | 'done'>('downloading'),
      error: signal(''),
    }));
    this.downloads.set(tasks);
    this.downloadDialogVisible.set(true);

    files.forEach((file, i) => {
      const task = tasks[i];
      this.service.downloadFile(file.id).subscribe({
        next: (ev) => {
          if (ev.status === 'progress') {
            task.percent.set(ev.percent);
          } else if (ev.body) {
            task.percent.set(100);
            task.status.set('done');
            const url = URL.createObjectURL(ev.body);
            const a = document.createElement('a');
            a.href = url;
            a.download = task.name;
            a.click();
            URL.revokeObjectURL(url);
          }
        },
        error: () => {
          task.status.set('error');
          task.error.set(`Failed to download ${task.name}`);
        },
      });
    });
  }

  get allDownloadsSettled(): boolean {
    return this.downloads().every((t) => t.status() !== 'downloading');
  }

  get downloadDoneCount(): number {
    return this.downloads().filter((t) => t.status() === 'done').length;
  }

  get downloadErrorCount(): number {
    return this.downloads().filter((t) => t.status() === 'error').length;
  }

  get downloadOverallPercent(): number {
    const list = this.downloads();
    if (!list.length) return 0;
    const sum = list.reduce((acc, t) => acc + (t.status() === 'done' ? 100 : t.percent()), 0);
    return Math.round(sum / list.length);
  }

  closeDownloadDialog(): void {
    this.downloadDialogVisible.set(false);
    this.downloads.set([]);
    this.selectionMode.set(false);
    this.selectedIds.set(new Set());
  }

  private guessLanguage(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      java: 'java', js: 'javascript', mjs: 'javascript', ts: 'typescript',
      json: 'json', yml: 'yaml', yaml: 'yaml', sql: 'sql', sh: 'shell', bash: 'shell',
      md: 'markdown', markdown: 'markdown', html: 'html', htm: 'html', css: 'css',
      xml: 'xml', py: 'python',
    };
    return map[ext] ?? 'text';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private fileIcon(language: string): string {
    switch (language) {
      case 'java': return 'pi pi-cog';
      case 'javascript':
      case 'typescript': return 'pi pi-code';
      case 'json':
      case 'yaml':
      case 'xml': return 'pi pi-database';
      case 'markdown': return 'pi pi-book';
      default: return 'pi pi-file';
    }
  }

  /** Icon for a list row: bugs and notes take precedence over the language icon. */
  itemIcon(item: KnowledgeItem): string {
    if (item.kind === 'bug') return 'pi pi-exclamation-triangle';
    if (item.kind === 'note') return 'pi pi-pencil';
    return this.fileIcon(item.language);
  }

  /** Accent color per kind (used for the row icon). */
  kindColor(kind: KnowledgeKind): string {
    switch (kind) {
      case 'bug':  return '#DC2626';
      case 'note': return '#2563EB';
      default:     return 'var(--deploy-text-secondary)';
    }
  }

  kindLabel(kind: KnowledgeKind): string {
    switch (kind) {
      case 'bug':  return 'Bug';
      case 'note': return 'Note';
      default:     return 'File';
    }
  }
}
