import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BackendEndpointService } from '../../../core/services/backend-endpoint.service';

@Component({
  selector: 'app-backend-status-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, TooltipModule],
  templateUrl: "./backend-status-tag.component.html",
})
export class BackendStatusTagComponent {
  private endpoint = inject(BackendEndpointService);

  compact = input(false);

  status = this.endpoint.status;

  label = computed(() => {
    const compact = this.compact();
    switch (this.status()) {
      case 'checking':
        return compact ? '…' : 'Verificando API';
      case 'online':
        if (this.endpoint.isFallback()) {
          return compact ? 'Respaldo' : `Servidor de respaldo · ${this.endpoint.activeName()}`;
        }
        return compact ? 'En línea' : `API en línea · ${this.endpoint.activeName()}`;
      case 'waking':
        return compact ? 'Despertando' : 'Despertando servidor (≈1 min)';
      case 'offline':
        return compact ? 'Sin conexión' : 'Sin conexión';
    }
  });

  severity = computed(() => {
    switch (this.status()) {
      case 'checking':
        return 'secondary';
      case 'online':
        return 'success';
      case 'waking':
        return 'warn';
      case 'offline':
        return 'danger';
    }
  });

  icon = computed(() => {
    switch (this.status()) {
      case 'checking':
        return 'pi pi-spin pi-spinner';
      case 'online':
        return 'pi pi-check-circle';
      case 'waking':
        return 'pi pi-clock';
      case 'offline':
        return 'pi pi-times-circle';
    }
  });

  tooltip = computed(() => {
    switch (this.status()) {
      case 'checking':
        return 'Comprobando conexión con la API';
      case 'waking':
        return 'El servidor de respaldo está arrancando; el primer request puede tardar hasta 1 minuto';
      case 'offline':
        return 'No se pudo conectar con ningún servidor. Revisa la red e inténtalo de nuevo';
      case 'online': {
        const name = this.endpoint.activeName();
        return this.endpoint.isFallback()
          ? `Servidor de respaldo (${name}) en uso`
          : `Servidor principal (${name}) en uso`;
      }
    }
  });
}
