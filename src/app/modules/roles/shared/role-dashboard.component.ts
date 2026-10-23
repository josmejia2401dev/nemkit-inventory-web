import { CommonModule } from "@angular/common";
import { Component, inject, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthStore } from "../../../core/store/auth.store";

export interface RoleShortcut {
  path: string;
  label: string;
  description: string;
  icon: string;
}

/**
 * Dashboard genérico y ligero para roles operativos: saludo + accesos rápidos a
 * las secciones que el rol puede usar. Cada rol le pasa sus atajos.
 */
@Component({
  selector: "app-role-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>Hola {{ name() }}</h1>
        <p class="heading-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <section class="panel">
      <div class="quick-actions-grid">
        @for (item of shortcuts; track item.path) {
          <a [routerLink]="item.path" class="quick-action">
            <span class="quick-action-icon quick-action-icon--sage"><i [class]="item.icon"></i></span>
            <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
            <i class="pi pi-arrow-right"></i>
          </a>
        }
      </div>
    </section>
  `,
})
export class RoleDashboardComponent {
  private store = inject(AuthStore);

  @Input() eyebrow = "TU ESPACIO DE TRABAJO";
  @Input() subtitle = "Accede rápido a lo que necesitas.";
  @Input({ required: true }) shortcuts: RoleShortcut[] = [];

  name = () => this.store.user()?.fullName?.split(" ")[0] ?? "";
}
