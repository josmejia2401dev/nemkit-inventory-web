import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BackendHealthPollProfile, BackendHealthService } from '../../../core/services/backend-health.service';

@Component({
  selector: 'app-backend-status-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, TooltipModule],
  templateUrl: "./backend-status-tag.component.html",
})
export class BackendStatusTagComponent {
  private health = inject(BackendHealthService);

  compact = input(false);
  pollProfile = input<BackendHealthPollProfile | null>(null);

  status = this.health.status;

  constructor() {
    effect((onCleanup) => {
      const profile = this.pollProfile();
      if (!profile) return;
      this.health.setPollProfile(profile);
      onCleanup(() => this.health.setPollProfile('relaxed'));
    });
  }

  label = computed(() => {
    const compact = this.compact();
    switch (this.status()) {
      case 'checking': return compact ? '…' : 'Verificando API';
      case 'online': return compact ? 'En línea' : 'API en línea';
      case 'offline': return compact ? 'Sin conexión' : 'API sin conexión';
    }
  });

  severity = computed(() => {
    switch (this.status()) {
      case 'checking': return 'secondary';
      case 'online': return 'success';
      case 'offline': return 'warn';
    }
  });

  icon = computed(() => {
    switch (this.status()) {
      case 'checking': return 'pi pi-spin pi-spinner';
      case 'online': return 'pi pi-check-circle';
      case 'offline': return 'pi pi-moon';
    }
  });

  tooltip = computed(() => {
    switch (this.status()) {
      case 'checking': return 'Comprobando conexión con la API';
      case 'online': return 'El servidor está disponible';
      case 'offline': return 'No se pudo conectar con el servidor';
    }
  });
}
