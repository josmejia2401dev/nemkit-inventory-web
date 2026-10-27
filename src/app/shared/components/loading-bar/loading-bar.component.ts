import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationError, RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  templateUrl: "./loading-bar.component.html",
  styleUrl: "./loading-bar.component.css",
})
export class LoadingBarComponent implements OnInit, OnDestroy {
  loading = inject(LoadingService);
  private router = inject(Router);
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof RouteConfigLoadStart) this.loading.start();
      if (event instanceof RouteConfigLoadEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loading.stop();
      }
    });
  }

  ngOnDestroy(): void { this.routerSubscription?.unsubscribe(); }
}
