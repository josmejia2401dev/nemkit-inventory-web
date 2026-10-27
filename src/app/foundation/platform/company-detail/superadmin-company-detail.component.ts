import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import {
  PlatformService,
  PlatformCompanyDetail,
} from "../platform.service";

@Component({
  selector: "app-superadmin-company-detail",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./superadmin-company-detail.component.html",
})
export class SuperadminCompanyDetailComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);

  company = signal<PlatformCompanyDetail | null>(null);
  loading = signal(true);

  private get companyId(): number {
    return Number(this.route.snapshot.paramMap.get("id"));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.getCompany(this.companyId).subscribe({
      next: (response) => {
        this.company.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
