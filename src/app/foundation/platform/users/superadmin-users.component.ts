import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PlatformService, PlatformUser } from "../platform.service";
import { DEFAULT_PAGE_SIZE, PaginationComponent } from "../../../shared/components/pagination/pagination.component";

@Component({
  selector: "app-superadmin-users",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: "./superadmin-users.component.html",
})
export class SuperadminUsersComponent implements OnInit {
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private platform = inject(PlatformService);

  users = signal<PlatformUser[]>([]);
  loading = signal(true);
  page = signal(1);
  pageCount = signal(1);
  total = signal(0);
  search = "";
  kind = "";

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.platform.listUsers({
      page: this.page(),
      limit: this.pageSize,
      search: this.search.trim() || undefined,
      kind: this.kind || undefined,
    }).subscribe({
      next: (response) => {
        const totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        if (this.page() > totalPages) {
          this.page.set(totalPages);
          this.load();
          return;
        }
        this.users.set(response.data ?? []);
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
