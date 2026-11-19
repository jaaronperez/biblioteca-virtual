# App móvil: Biblioteca Virtual Eclesiástica

App en Expo (SDK 57, expo-router, TypeScript) que consume la [API del backend](../backend/README.md). Corre en Android, iOS y en el navegador con el mismo código.

## Pantallas

| Ruta | Archivo | Qué hace |
|---|---|---|
| Inicio | `src/app/(tabs)/index.tsx` | Portadas de los libros, accesos por tipo y resumen del avance |
| Biblioteca | `src/app/(tabs)/biblioteca.tsx` | Buscador: por metadatos (modo «Libros») o dentro del texto de las páginas (modo «En el texto»), con filtros combinables de iglesia, tipo, idioma y años. Resultados paginados al desplazar |
| Ajustes | `src/app/(tabs)/ajustes.tsx` | Tamaño de letra del lector, dirección de la API, estado de la conexión y acceso al panel |
| Detalle | `src/app/libro/[id].tsx` | Portada, descripción, ficha, buscar dentro del libro, leer el texto o abrir el PDF (enlace temporal) |
| Lector | `src/app/lector/[id].tsx` | Texto indexado página por página, con las palabras buscadas resaltadas y la página siguiente precargada |
| Panel | `src/app/admin.tsx` | Avance por integrante frente a su meta (se actualiza cada 15 s) y prueba de 20 peticiones concurrentes |

La barra inferior (Inicio, Biblioteca, Ajustes) está en `src/app/(tabs)/_layout.tsx`.

## Cómo consume la API

- `src/lib/api.ts`: todas las rutas de la API y una sola función `pedir`, que corta a los 15 s y convierte cualquier fallo (sin red, tiempo agotado, Azure caído = 502, 404, 422) en un `ErrorApi` con un mensaje para el usuario.
- `src/lib/consultas.ts`: hooks de TanStack Query. Caché compartida, dos reintentos con espera creciente ante fallos pasajeros y paginación con `useInfiniteQuery` (`limite` y `desde`; la API responde `hayMas`).
- `src/components/estados.tsx` y `src/components/aviso-conexion.tsx`: cada pantalla muestra cargando, error con «Reintentar» o vacío. Si la API deja de responder, aparece una franja roja arriba que desaparece sola al volver la conexión; lo ya cargado sigue visible.

## Correrla

1. Arranca la API, abierta a la red local para que el teléfono la alcance:

   ```powershell
   cd backend
   .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   La primera vez Windows puede pedir permiso en el firewall para Python: acéptalo en redes privadas.

2. Arranca la app:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

   - **Teléfono:** abre Expo Go y escanea el QR. El teléfono y la PC deben estar en la misma red Wi‑Fi.
   - **Navegador:** presiona `w`.

La app busca la API en la misma computadora que corre `expo start`, en el puerto 8000. Para usar otra dirección, escríbela en **Ajustes → Conexión con el servidor**, o crea `mobile/.env` con `EXPO_PUBLIC_API_URL=http://<ip>:8000` (ver `.env.example`).

## Comprobaciones

```powershell
npx tsc --noEmit   # tipos
npx expo lint      # lint
```
