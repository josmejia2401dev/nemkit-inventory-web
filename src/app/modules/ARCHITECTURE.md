# Frontend architecture

`nemkit-inventory-web` is a standalone Angular 19 SPA. Role areas only compose
capabilities; feature micro modules own the implementation. A shared component
never inspects the active role: it receives inputs, outputs or an action
template from the page that composes it.

## Layers

| Layer | Path | Owns | Does not own |
| --- | --- | --- | --- |
| Bootstrap | `app-root/`, `app.config.ts`, `app.routes.ts` | Providers, locale, interceptors, top-level route composition | Feature markup or domain rules |
| Core | `core/` | HTTP transport, endpoint failover, guards, interceptors, stores, models, barcode infrastructure | Anything visual beyond generic UI primitives |
| Foundation | `foundation/` | Authentication, profile, feedback, application shell, superadmin platform | Inventory domain rules |
| Inventory | `modules/inventory/` | Domain micro modules (one folder per capability) | Role-specific navigation |
| Roles | `modules/roles/` | One shell and one route table per role; mounts inventory routes | Feature implementation |
| Shared | `shared/` | Reusable UI components, barcode UI, utils | HTTP calls or domain state |

## Core

- `http/backend-endpoint.policy.ts` is framework-free: endpoint selection,
  probing classification, retry rules and the anti-flapping counters.
- `http/backend-probe.ts` probes `/ready`; `services/backend-endpoint.service.ts`
  is the Angular adapter that exposes `status`, `activeName`, `isFallback`,
  `nodeName` and `failovers` as signals.
- `services/inventory.service.ts` is the transport facade: it builds every URL
  from the active node (`apiUrl` getter), exposes `get/list/listAll/post/put/
  patch/delete` and the `changes` stream, and re-exports the models so historical
  imports keep working.
- `services/` also holds `api.service.ts` (generic transport), `limits.service.ts`,
  `notification.service.ts`, `confirm.service.ts`, `loading.service.ts` and
  `cash-withdrawals.service.ts`.
- `interceptors/` run in a fixed order: `loading` → `auth` → `error` → `failover`.
  The failover interceptor goes last so it only retries once the other
  interceptors finished.
- `models/inventory/` keeps one file per domain model (`product`, `contact`,
  `document`, `employee`, `movement`, `payment`, `report`, `table`, `dashboard`,
  `page-result`); `core/services/inventory.service.ts` re-exports them.
- `store/auth.store.ts` exposes `user`, `company` and `role` as signals.
- `guards/` holds `authGuard`, `roleGuard(allowedRoles)` and `rootRedirectGuard`.
- `barcode/` contains only infrastructure (scanner, camera, config, dispatcher,
  UI state, types). Its UI lives in `shared/barcode/`.

## Foundation

- `auth/`: `login`, `employee-login`, `register` and `authGuard`.
- `profile/`: profile page plus `business-profile-section`.
- `feedback/`: user feedback form.
- `layout/application-shell.component.*`: sidebar, topbar, mobile tabs, footer and
  the global barcode overlays. It receives `mobilePaths` and `showBarcodeTools`.
- `platform/`: superadmin micro modules (`dashboard`, `users`, `user-detail`,
  `employees`, `companies`, `company-detail`, `reports`, `shell`), plus
  `platform.service.ts`, `platform.guard.ts` and `platform.routes.ts`. It owns
  the `/superadmin` route group and never reuses inventory pages.

## Inventory micro modules

| Micro module | Implementation | API client | Route export |
| --- | --- | --- | --- |
| Products | `catalog/`, `management/`, `components/product-filter-bar`, `components/product-table`, `management/product-form-dialog`, `product-quick-create-dialog` | `products/product-catalog.service.ts`, `products/product-barcode.service.ts` | `productCatalogRoute`, `productManagementRoute` |
| Contacts | `contacts/contact-directory`, `contacts/loyalty-guide`, `customers/customers-page`, `suppliers/suppliers-page` | `contacts/contacts.api.ts` | `customerDirectoryRoute`, `supplierDirectoryRoute` |
| Documents | `documents/document-workbench`, `document-list`, `document-draft-form`, `document-receipt`, `customer-sale-summary`, `customer-create-form`, `sales/sales-page`, `purchases/purchases-page` | `documents/documents.api.ts` | `salesRoute`, `purchasesRoute` |
| Deliveries | `deliveries/delivery-board`, `delivery-operations-page`, `courier-deliveries-page` | `deliveries/deliveries.api.ts` | `deliveryOperationsRoute`, `courierDeliveriesRoute` |
| Kitchen | `kitchen/kitchen-board`, `kitchen-service-page`, `kitchen-preparation-page` | `kitchen/kitchen.api.ts` | `kitchenServiceRoute`, `kitchenPreparationRoute` |
| Movements | `movements/movements.component`, `movements/movement-form-dialog` | `movements/movements.api.ts` | composed in role routes |
| Reports | `reports/reports.component` + one component per report (`inventory`, `movements`, `sales`, `employees`, `cancellations`, `cash-flow`) | `reports/reports.api.ts`, `reports/report-export.service.ts` | composed in role routes |
| Employees | `employees/employees.component`, `employees/activity`, `employees/payments` | `employees/employees.api.ts` | composed in role routes |
| Categories | `categories/categories.component` | `categories/categories.api.ts` | composed in role routes |
| Tables | `tables/tables.component` | `tables/tables.api.ts` | composed in role routes |
| Cash withdrawals | `cash-withdrawals/cash-withdrawal-list.component` | `core/services/cash-withdrawals.service.ts` | composed in role routes |
| Dashboard | `dashboard/dashboard.component` | `dashboard/dashboard.api.ts` | composed in role routes |
| Alerts | `alerts/alerts.component` | `dashboard/dashboard.api.ts` (`alerts()`) | composed in role routes |
| Layout | `layout/layout.component` (wraps the application shell and loads the alert counter) | — | used by every role shell |
| Status message | `components/inventory-status-message` | — | shared inside inventory |

### Module notes

- **Products** has two pages over the same presentational pair
  (`product-filter-bar`, `product-table`). Management supplies row actions through
  `@ContentChild(TemplateRef)`; the catalog passes only the table. Neither
  component reads the role.
- **Contacts** has a single directory; `customers-page` and `suppliers-page` are
  thin wrappers that fix the `kind`. The loyalty guide is presentational.
- **Documents** composes a workbench for both sale and purchase (`kind`). The
  draft form owns the cart, the receipt owns printable output and the customer
  summary owns the history shown while preparing a sale. `sales-page` and
  `purchases-page` only wrap the workbench.
- **Reports** keeps a 86-line shell that switches tabs; each report component
  owns its own data request through `ReportsApi`, and `ReportExportService`
  handles Excel and PDF output.
- **Kitchen** and **deliveries** share the same shape: one board with the
  operations plus one thin page per role that mounts it.
- Single-page modules (`categories`, `movements`, `tables`, `cash-withdrawals`,
  `dashboard`, `alerts`) live in one folder without a page wrapper.

## API clients and transport

Every micro module exposes its HTTP contract in a `<feature>.api.ts` file:

- `@Injectable({ providedIn: "root" })`, `inject(InventoryService)`, methods that
  return `Observable`; no component calls `HttpClient` directly.
- The client owns the paths of its module (`/categories`, `/documents/sales`,
  `/kitchen/:id/status`); pages never build URLs.
- Cross-module reads are delegated, not duplicated: `DocumentsApi.products()`
  uses `ProductCatalogService.lookup()` and `DocumentsApi.employees()` uses
  `EmployeesApi.options()`. `ReportsApi.cashFlow()` owns the cash-flow report
  while `CashWithdrawalsService` owns withdrawals.
- Domain services (`product-catalog.service.ts`, `product-barcode.service.ts`,
  `report-export.service.ts`) hold logic that several components share.
- `InventoryService` stays as the transport layer; new code should depend on the
  module client, not on the transport.

## Role composition

| Role | Mounted capabilities |
| --- | --- |
| Admin | Dashboard, alerts, reports, cash withdrawals, product management, categories, movements, purchases, sales, deliveries, suppliers, customers, employees, tables, kitchen service, profile, feedback |
| Warehouse | Dashboard, alerts, categories, movements, product management, purchases, suppliers, profile, feedback |
| Cashier | Dashboard, sales, deliveries, customers, product catalog, profile, feedback |
| Seller | Dashboard, sales, deliveries, customers, product catalog, profile, feedback |
| Waiter | Dashboard, sales, kitchen service, deliveries, customers, product catalog, profile, feedback |
| Cook | Kitchen preparation, profile, feedback |
| Courier | Courier deliveries, profile, feedback |
| Superadmin | Platform dashboard, users, user detail, employees, companies, company detail, feedback inbox |

Route guards protect role areas; the API still authorizes every read and
mutation. Each role shell builds its own `baseNav` and passes `mobilePaths`; the
admin shell adds "Cocina" and "Mesas" only when `company.businessType` is
`restaurant`.

## Backend failover

- `environments/environment*.ts` declares `apiEndpoints` (`baseUrl` + `readyUrl`
  + `priority`) con el prefijo propio del MS (`/api/v1/inventory`), también en
  `readyUrl`. En desarrollo ambos nodos apuntan a `localhost:4000` para ejercitar
  la selección; en producción el nodo de casa es el gateway Tailscale y Render
  queda como respaldo.
- At bootstrap, `BackendEndpointService.initialize()` probes the primary with the
  short timeout. If it fails, the app starts on the fallback and wakes the
  primary in the background.
- A `503` carrying the API envelope means "database not ready": both nodes share
  Atlas, so the balancer does not switch. Only network errors, `502/503/504` and
  timeouts trigger a switch, and only for `GET`/`HEAD`.
- `BackendStatusTagComponent` renders the badge from the service signals.

## Conventions

- Standalone components only; no `NgModule`.
- `ChangeDetectionStrategy.OnPush` in every new component.
- `inject()` for dependencies; `signal()`/`computed()` for state.
- `input()`/`output()` in new components; `@Input()`/`@Output()` stay in older
  ones.
- Native control flow (`@if`, `@for` with `track`, `@switch`) in new templates.
- One folder per component with `*.component.ts`, `*.component.html` and
  `*.component.css` only when it needs encapsulated styles.
- Keep pages under ~400 lines of TypeScript; extract presentational components
  or feature services when they grow.
- No `*.test.*` / `*.spec.*` files: validation is done through the QA scripts in
  `.refactor/qa/`.

## Adding a micro module

1. Create `modules/inventory/<feature>/` with one folder per page.
2. Add `<feature>.api.ts` with the endpoints of the module.
3. Build the page as a smart component (state + HTTP) and keep presentational
   pieces as separate components with inputs and outputs.
4. Export the route constant from `<feature>/<feature>.routes.ts` and mount it in
   the role route tables that need it.
5. Add the navigation item in those role shells, never in the page.
6. Verify build and run the E2E script when the API contract changed.

## Anti-patterns

- Mounting a feature route in every role "just in case".
- Checking the role inside a shared component to hide actions.
- Duplicating paths already owned by another module client.
- Calling `HttpClient` from a page or building URLs by hand.
- Creating a second route table that is not mounted.
- Keeping a page wrapper that only repeats its child's template.
