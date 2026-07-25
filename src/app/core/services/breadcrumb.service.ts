import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Хлебные крошки для админ-панели (`stream.Front#74`) — собираются из
 * `data.breadcrumb` каждого сегмента активного дерева роутов (родитель →
 * самый глубокий активный child), обновляются на каждый `NavigationEnd`.
 * Сегменты без `data.breadcrumb` (например пустой `redirectTo`-роут)
 * пропускаются, а не превращаются в пустую крошку.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  private readonly crumbsSignal = signal<string[]>(this.collectCrumbs());
  readonly crumbs = this.crumbsSignal.asReadonly();

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.crumbsSignal.set(this.collectCrumbs()));
  }

  private collectCrumbs(): string[] {
    const crumbs: string[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;

    while (route) {
      const breadcrumb = route.data['breadcrumb'] as string | undefined;
      if (breadcrumb) {
        crumbs.push(breadcrumb);
      }
      route = route.firstChild;
    }

    return crumbs;
  }
}
