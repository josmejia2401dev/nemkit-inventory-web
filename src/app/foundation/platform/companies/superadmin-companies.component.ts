import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformCompany } from "../platform.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-superadmin-companies",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: "./superadmin-companies.component.html",
})
export class SuperadminCompaniesComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private platform = inject(PlatformService);

  companies = signal<PlatformCompany[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  total = signal(0);
  search = "";

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.listCompanies({
      page: this.page(),
      limit: this.pageSize,
      search: this.search.trim() || undefined,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.companies.set(response.data ?? []);
        this.total.set(response.pagination?.total ?? 0);
        this.pageCount.set(totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(next: number): void {
    if (next < 1 || next > this.pageCount()) return;
    this.page.set(next);
    this.load();
  }
}
