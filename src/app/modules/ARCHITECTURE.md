# Frontend modules

Role areas compose feature routes. Feature pages define their capability at
route composition time; shared boards and directories do not inspect user roles
to hide or reveal actions.

## Feature boundaries

| Feature | Page modules | Shared implementation |
| --- | --- | --- |
| Products | `products/catalog`; `products/management` | `products/product-catalog.service.ts`, `products/components/product-filter-bar`, `products/components/product-table` |
| Contacts | `customers/customers-page`; `contacts` | `contacts/contact-directory` |
| Documents | `sales`; `purchases` | `documents/document-workbench`, `documents/document-receipt`, `documents/customer-sale-summary` |
| Deliveries | `deliveries/delivery-operations-page`; `deliveries/courier-deliveries-page` | `deliveries/delivery-board` |
| Kitchen | `kitchen/kitchen-service-page`; `kitchen/kitchen-preparation-page` | `kitchen/kitchen-board` |
| Foundation | Authentication, profile, feedback, and platform administration | Shared account, platform, and presentation services |

Each component lives in its own directory with a TypeScript file and an adjacent
HTML template. A component CSS file is added when it needs styles that do not
belong in the shared design system. Route files stay at the feature boundary
and compose those components through lazy loading.

Document previews and customer context are isolated presentational components:
the receipt owns printable output, and the customer summary owns the history
shown while preparing a sale. Role route files compose feature routes directly;
there is no second, unmounted inventory route table.

## Role composition

| Role area | Mounted capabilities |
| --- | --- |
| Admin | Product management, customers, suppliers, sales, purchases, delivery operations, kitchen service, and administration features |
| Warehouse | Product management, suppliers, purchases, and stock operations |
| Cashier | Product catalog, customers, sales, and delivery operations |
| Seller | Product catalog, customers, sales, and delivery operations |
| Waiter | Product catalog, customers, sales, delivery operations, and kitchen service |
| Courier | Courier delivery workflow |
| Cook | Kitchen preparation workflow |
| Superadmin | Platform dashboard, users, employees, companies, and support reports |

Route guards protect role areas. They provide frontend navigation control; the
API remains responsible for authorization of every data read and mutation.
The product catalog and product management pages compose the same neutral
filter and table components. The management page supplies its row-action
template; the catalog supplies only the table. Neither shared component reads
the active role or hides actions based on a role check. Existing API permissions
give ADMIN and WAREHOUSE write access; cashier, seller, and waiter receive the
read-only catalog.

Platform administration is part of `foundation/platform`, not the role feature
folders. It owns the superadmin route group, its guard and service, and separate
micro modules for dashboard, users, user detail, employees, companies, company
detail, support reports, and shell. Its dashboard summarizes companies, employee lifecycle
states, employee role distribution, platform accounts, and user reports.

The unused TimeTrack `private` project, task, activity, and knowledge screens
and their exclusive services were removed from this inventory frontend. Shared
UI components remain under `shared/components`, each in its own directory.

## Adding a role capability

1. Use or create a feature route in the feature folder.
2. Compose that route only in the appropriate role route configuration.
3. Reuse the feature's shared implementation behind a capability-specific page
   wrapper when two roles have different actions.
4. Keep role checks out of feature templates and components. Domain state may
   still control actions, such as whether a delivery is already complete.
