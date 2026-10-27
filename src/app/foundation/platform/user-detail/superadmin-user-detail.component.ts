import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PlatformService, PlatformUser } from "../platform.service";

@Component({
  selector: "app-superadmin-user-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./superadmin-user-detail.component.html",
})
export class SuperadminUserDetailComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);

  user = signal<PlatformUser | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.platform.getUser(id).subscribe({
      next: (response) => {
        this.user.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
