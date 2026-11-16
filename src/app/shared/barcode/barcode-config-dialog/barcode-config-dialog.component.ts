import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import {
  BARCODE_SENSITIVITIES,
  BarcodeConfig,
  BarcodeConfigService,
  BarcodeTerminator,
} from "../../../core/barcode/barcode-config.service";
import { BarcodeScannerService } from "../../../core/barcode/barcode-scanner.service";

@Component({
  selector: "app-barcode-config-dialog",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./barcode-config-dialog.component.html",
  styleUrl: "./barcode-config-dialog.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeConfigDialogComponent implements OnChanges, OnDestroy {
  private readonly configService = inject(BarcodeConfigService);
  private readonly scannerService = inject(BarcodeScannerService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly config = this.configService.config;
  readonly sensitivities = BARCODE_SENSITIVITIES;
  readonly sensitivity = computed(() => this.configService.sensitivity());
  readonly testCode = signal<string | null>(null);

  readonly statusLabel = computed(() => {
    switch (this.scannerService.state()) {
      case "active":
        return "Pistola activa · escaneo detectado hace poco";
      case "configured":
        return "Configurada · sin actividad reciente";
      case "off":
        return "Captura global desactivada";
      default:
        return "Sin actividad todavía";
    }
  });

  readonly statusTone = computed(() => this.scannerService.state());

  constructor() {
    this.scannerService.scans$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((scan) => {
        if (this.visible) this.testCode.set(scan.code);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes["visible"]) return;
    // Mientras el diálogo está abierto, la prueba no ejecuta acciones de la página.
    this.scannerService.setDispatchSuspended(this.visible);
    if (!this.visible) this.testCode.set(null);
  }

  ngOnDestroy(): void {
    this.scannerService.setDispatchSuspended(false);
  }

  update(patch: Partial<BarcodeConfig>): void {
    this.configService.update(patch);
  }

  updateTerminator(value: BarcodeTerminator): void {
    this.update({ terminator: value });
  }

  setSensitivity(value: string): void {
    this.configService.applySensitivity(value as "high" | "medium" | "low");
  }

  reset(): void {
    this.configService.reset();
    this.testCode.set(null);
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
