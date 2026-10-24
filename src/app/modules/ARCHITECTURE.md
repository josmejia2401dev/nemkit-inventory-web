# Frontend modules

The role areas compose feature routes. Feature pages decide the capability at
route composition time; shared boards and directories do not inspect user roles
to hide or reveal actions.

## Feature boundaries

| Feature | Page modules | Shared implementation |
| --- | --- | --- |
| Products | Product catalog; product management | `products/product-catalog.service.ts` |
| Contacts | Customers; suppliers | `contacts/contact-directory.component.ts` |
| Documents | Sales; purchases | `documents/document-workbench.component.ts` |
| Deliveries | Delivery operations; courier deliveries | `deliveries/delivery-board.component.ts` |
| Kitchen | Service; preparation | `kitchen/kitchen-board.component.ts` |
| Foundation | Authentication, profile, feedback, business settings | Shared account and platform services |

The remaining inventory folders each own one feature page: alerts, categories,
dashboard, employees, movements, reports, tables, and feedback inbox.

Document previews and customer context are isolated presentational components:
`document-receipt` owns the printable receipt, and `customer-sale-summary` owns
the customer history shown while preparing a sale. Role route files compose the
feature routes directly; there is no second, unmounted inventory route table.

## Role composition

| Role area | Mounted capabilities |
| --- | --- |
| Admin | Product management, customers, suppliers, sales, purchases, delivery operations, kitchen service, business settings, and administration features |
| Warehouse | Product management, suppliers, purchases, and stock operations |
| Cashier | Product catalog, customers, sales, and delivery operations |
| Seller | Product catalog, customers, sales, and delivery operations |
| Waiter | Product catalog, customers, sales, delivery operations, and kitchen service |
| Courier | Courier delivery workflow |
| Cook | Kitchen preparation workflow |

Route guards protect role areas. They provide frontend navigation control; the
API remains responsible for authorization of every data read and mutation.

## Adding a role capability

1. Use or create a feature route in the feature folder.
2. Compose that route only in the appropriate role route configuration.
3. Reuse the feature's shared implementation behind a capability-specific page
   wrapper when two roles have different actions.
4. Keep role checks out of feature templates and components. Domain state may
   still control actions, such as whether a delivery is already complete.
