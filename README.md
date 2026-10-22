# Nemkit Inventory Web

Frontend Angular 19 para administrar el inventario usando la API `nemkit-inventory-api`. Reutiliza el inicio de sesión, registro de usuario, guard de rutas, almacenamiento y renovación de tokens, interceptores HTTP, estado de carga y notificaciones de `nemkit-timetrack-web`.

## Desarrollo

```bash
npm ci
npm start
```

La aplicación abre en `http://localhost:4200`. En desarrollo usa `http://localhost:4000/api/v1`; puedes ajustar `src/environments/environment.ts` si el backend escucha en otra dirección.

## Producción

```bash
npm run build
```

La URL de API de producción se define en `src/environments/environment.prod.ts`. Actualízala con el dominio donde publiques `nemkit-inventory-api` antes del despliegue.

## Módulos

- **Resumen:** métricas de inventario, últimos movimientos y productos más vendidos.
- **Productos:** búsqueda, filtros por categoría y estado, alta, edición y eliminación lógica.
- **Categorías:** alta, edición y eliminación lógica.
- **Movimientos:** historial y registro de compras, ventas, daños, pérdidas, consumo interno y ajustes manuales con varios productos.

El formulario de producto no permite modificar el stock directamente. Las existencias cambian al registrar movimientos, de acuerdo con las reglas de la API.
