import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformOverview } from "../platform.service";

@Component({
  selector: "app-superadmin-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./superadmin-dashboard.component.html",
  styleUrl: "./superadmin-dashboard.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperadminDashboardComponent implements OnInit {
  private platform = inject(PlatformService);

  data = signal<PlatformOverview | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.overview().subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: "Administrador",
      cashier: "Cajero",
      seller: "Vendedor",
      courier: "Domiciliario",
      warehouse: "Almacén",
      waiter: "Mesero",
      cook: "Cocina",
    };
    return labels[role] ?? role;
  }
}
