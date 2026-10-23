import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PlatformService, LogEntry, LogFile } from "../../../core/services/platform.service";

@Component({
  selector: "app-superadmin-logs",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PLATAFORMA</p>
        <h1>Logs</h1>
        <p class="heading-subtitle">Registros del servidor para diagnosticar incidencias.</p>
      </div>
      <button class="button button-secondary" (click)="loadFiles()"><i class="pi pi-refresh"></i> Actualizar</button>
    </div>

    <section class="panel">
      <div class="filter-bar">
        <div class="filter-title"><span class="panel-icon"><i class="pi pi-list"></i></span><strong>Consulta</strong></div>
        <div class="feedback-filters">
          <select [(ngModel)]="file" name="file" aria-label="Archivo de log">
            <option value="">Selecciona un archivo…</option>
            @for (f of files(); track f.name) { <option [value]="f.name">{{ f.name }}</option> }
          </select>
          <select [(ngModel)]="level" name="level" aria-label="Nivel">
            <option value="">Todos los niveles</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
          <input [(ngModel)]="search" name="search" placeholder="Buscar en el mensaje" aria-label="Buscar en logs" />
          <button class="button button-primary button-small" [disabled]="!file || reading()" (click)="read()"><i [class]="reading() ? 'pi pi-spin pi-spinner' : 'pi pi-search'"></i> Leer</button>
        </div>
      </div>

      @if (!files().length && !loadingFiles()) {
        <div class="empty-state"><span class="empty-icon"><i class="pi pi-list"></i></span><strong>Sin archivos de log</strong><p>No hay archivos .log disponibles en el servidor.</p></div>
      } @else if (entries().length) {
        <p class="log-meta">{{ result()?.returned }} de {{ result()?.total }} líneas · {{ result()?.file }}</p>
        <div class="log-viewer">
          @for (e of entries(); track $index) {
            <div class="log-line log-line--{{ (e.level || 'info') }}">
              <span class="log-time">{{ e.timestamp ? (e.timestamp | date: "HH:mm:ss" : "" : "es-CO") : "—" }}</span>
              <span class="log-level">{{ e.level || "info" }}</span>
              <span class="log-msg">{{ e.message }}</span>
            </div>
          }
        </div>
      } @else if (didRead()) {
        <div class="empty-state"><span class="empty-icon"><i class="pi pi-inbox"></i></span><strong>Sin resultados</strong><p>No hay líneas que coincidan con el filtro.</p></div>
      }
    </section>
  `,
})
export class SuperadminLogsComponent implements OnInit {
  private platform = inject(PlatformService);

  files = signal<LogFile[]>([]);
  entries = signal<LogEntry[]>([]);
  result = signal<{ file: string; total: number; returned: number } | null>(null);
  loadingFiles = signal(true);
  reading = signal(false);
  didRead = signal(false);
  file = "";
  level = "";
  search = "";

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loadingFiles.set(true);
    this.platform.logFiles().subscribe({
      next: (response) => {
        this.files.set(response.data ?? []);
        if (!this.file && this.files().length) this.file = this.files()[0].name;
        this.loadingFiles.set(false);
      },
      error: () => this.loadingFiles.set(false),
    });
  }

  read(): void {
    if (!this.file) return;
    this.reading.set(true);
    this.platform.readLogs({
      file: this.file,
      level: this.level || undefined,
      search: this.search.trim() || undefined,
      limit: 300,
    }).subscribe({
      next: (response) => {
        this.entries.set(response.data?.entries ?? []);
        this.result.set({
          file: response.data?.file,
          total: response.data?.total ?? 0,
          returned: response.data?.returned ?? 0,
        });
        this.didRead.set(true);
        this.reading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.didRead.set(true);
        this.reading.set(false);
      },
    });
  }
}
