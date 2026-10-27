import { CommonModule } from "@angular/common";
import { Component, inject, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthStore } from "../../../../core/store/auth.store";

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
  templateUrl: "./role-dashboard.component.html",
})
export class RoleDashboardComponent {
  private store = inject(AuthStore);

  @Input() eyebrow = "TU ESPACIO DE TRABAJO";
  @Input() subtitle = "Accede rápido a lo que necesitas.";
  @Input({ required: true }) shortcuts: RoleShortcut[] = [];

  name = () => this.store.user()?.fullName?.split(" ")[0] ?? "";
}
