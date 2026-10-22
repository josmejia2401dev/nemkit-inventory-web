import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthStore } from "../../../core/store/auth.store";
import { BackendStatusTagComponent } from "../../../shared/components/backend-status-tag/backend-status-tag.component";
import { InventoryStatusMessageComponent } from "../components/inventory-status-message/inventory-status-message.component";

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackendStatusTagComponent,
    InventoryStatusMessageComponent,
  ],
  templateUrl: "./layout.component.html",
})
export class LayoutComponent {
  private store = inject(AuthStore);
  private router = inject(Router);

  sidebarOpen = signal(false);
  user = this.store.user;
  today = new Date();

  get currentPage(): string {
    const path = this.router.url.split("/")[1];
    if (path === "profile") return "Mi perfil";

    return (
      this.navItems.find((item) => item.path.endsWith(path))?.label ?? "Resumen"
    );
  }

  navItems = [
    { path: "/dashboard", label: "Resumen", icon: "pi pi-chart-pie" },
    { path: "/products", label: "Productos", icon: "pi pi-box" },
    { path: "/categories", label: "Categorías", icon: "pi pi-tag" },
    {
      path: "/movements",
      label: "Movimientos",
      icon: "pi pi-arrow-right-arrow-left",
    },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.store.clear();
    this.router.navigate(["/login"]);
  }
}
