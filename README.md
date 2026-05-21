# Tempel × SIERA — MVP plataforma de video deportivo

Fase 1 (MVP local): plataforma web para que complejos deportivos vendan grabaciones a sus jugadores. Storage local en disco, base de datos SQLite, 3 roles (Admin / Cancha / Cliente).

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS (mobile-first)
- Prisma ORM + SQLite (`file:./dev.db`)
- Auth.js v5 (Credentials provider, JWT)
- HTML5 `<video>` con streaming Range via API route autenticada

## Setup

```bash
pnpm install
pnpm prisma migrate dev
pnpm db:seed
pnpm dev
```

Abrí http://localhost:3000

## Cuentas de prueba (seed)

| Rol     | Email                            | Password    |
|---------|----------------------------------|-------------|
| Admin   | admin@tempelgroup.com            | admin123    |
| Cancha  | dueno@complejolosalamos.com      | cancha123   |
| Cliente | jugador@gmail.com                | cliente123  |

El seed también imprime un código de acceso de ejemplo (ej: `XBG7HBHR`) que el Cliente puede canjear.

## Flujo end-to-end

1. **Cancha** crea grabación en `/cancha/grabaciones/nuevo` referenciando un archivo de `storage/videos/`.
2. **Cancha** genera token en `/cancha/accesos` (con maxUses opcional, vencimiento opcional).
3. **Cliente** canjea el código en `/cliente/claim` o via link directo `/claim/<código>`.
4. **Cliente** reproduce el video en `/cliente/dashboard/<id>` (streaming Range autenticado).
5. **Cliente** opcionalmente paga el "adicional de descarga" (simulado) y baja el `.mp4`.

## Estructura

```
prisma/
  schema.prisma          # Modelo de datos completo
  seed.ts                # Datos de prueba
storage/
  videos/                # Archivos de video (gitignored)
  thumbnails/            # Thumbnails (gitignored)
src/
  app/                   # App Router: páginas por rol + API routes
    (auth)/login, register
    cliente/             # Mis Partidos, claim, video player
    cancha/              # Dashboard, canchas, grabaciones, accesos, métricas
    admin/               # Dashboard global, complejos, config, logs, storage
    api/                 # Endpoints REST
    claim/[code]/        # Deep link de canje
  components/            # UI compartida (AppShell, VideoPlayer, MetricCard)
  lib/
    auth.ts              # NextAuth full
    auth.config.ts       # Config edge-safe para middleware
    db.ts                # PrismaClient singleton
    storage/             # StorageProvider abstracción (LocalStorage hoy, S3 mañana)
    logger.ts            # Logger interface (DB hoy, Datadog mañana)
    config.ts            # ConfigSetting live-editable con cache 30s
    rate-limit.ts        # Token bucket in-memory
    tokens.ts            # Generación de códigos (nanoid sin ambigüedades)
    money.ts             # Centavos / basis points helpers
    queries.ts           # Queries de métricas reutilizables
    roles.ts             # Enum Role + helpers
  middleware.ts          # Role-based route protection
```

## Modelo de datos (resumen)

- `User` (Role: ADMIN / CANCHA / CLIENTE)
- `Complex` 1:1 con un user CANCHA, contiene N `Court` (canchas físicas)
- `Recording` pertenece a un `Court`, con `priceCents` y `downloadFeeCents` snapshot
- `AccessToken` apunta a un Recording, reutilizable (maxUses + usedCount + expiresAt opcional)
- `Claim` une User ↔ Recording vía un Token canjeado; soft-revoke con `revokedAt`
- `Payment` registra cada cobro simulado (RECORDING o DOWNLOAD)
- `ConfigSetting` para flags de negocio editables en vivo desde Admin
- `Log` para auditoría y debug desde el panel Admin

Dinero siempre en `Int` centavos. Revenue share por complejo en basis points (`7000` = 70.00%).

## Endpoints clave

- `POST /api/register` — cliente crea cuenta
- `POST /api/auth/...` — NextAuth handler
- `POST /api/tokens/redeem` — cliente canjea código (transaccional, rate-limited)
- `POST /api/cancha/tokens` — cancha genera token
- `POST /api/cancha/recordings` — cancha crea recording
- `POST /api/cancha/courts` — cancha agrega subcampo
- `GET /api/recordings/[id]/stream` — streaming Range autenticado
- `POST /api/recordings/[id]/buy-download` — paga el adicional (simulado)
- `GET /api/recordings/[id]/download` — descarga (requiere flag)
- `PATCH /api/admin/complejos/[id]` — actualiza revenue share
- `PUT /api/admin/config` / `DELETE /api/admin/config?key=` — config live

## Fase 2 (no incluido aún)

- Upload directo de video desde el panel Cancha
- Storage en S3 (interface `StorageProvider` ya abstrae esto)
- Pagos reales (`Payment` ya prevé `externalRef`)
- IA: detección de jugadas, highlights
- Streaming en vivo
- Red social / matchmaking
