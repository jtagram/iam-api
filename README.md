# iam-api

## Variables de entorno

La app requiere las siguientes variables de entorno para arrancar (definidas y
validadas en `src/common/config/env.validation.ts`; si falta alguna, el
proceso no arranca):

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `JWT_EXPIRES_IN`
- `PORT`
- `LOG_LEVEL`
- `IAM_APPLICATION_NAME`

## Cómo obtener cada una

### `POSTGRES_USER` / `POSTGRES_PASSWORD`

Credenciales del Secret `postgres-credentials` de PostgreSQL (ver
`wiki-hub/microk8s/microk8s.secrets.md`). Las define quien crea el Secret.

### `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME`

Datos de conexión a la base de datos de `iam-api`: el host es el nombre del
Service de PostgreSQL dentro del namespace del cluster, el puerto el que
expone ese Service (por defecto `5432`), y el nombre es el de la base
creada específicamente para `iam-api`.

### `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`

Par de claves RSA (algoritmo RS256) generado una única vez para todo el
ecosistema. `iam-api` es el único servicio que conoce la clave privada
(la usa para firmar los tokens); la clave pública se comparte con cada API
que valida tokens (`iam-api`, `ticket-hub-api`, etc.).

```bash
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
```

### `JWT_EXPIRES_IN`

Tiempo de vida del token, en el formato que acepta `@nestjs/jwt` (por
ejemplo `1h`, `30m`). Es una decisión del equipo, no un valor que se
"obtenga" de ningún lado.

### `PORT`

Puerto en el que escucha el proceso de Nest.

### `LOG_LEVEL`

Nivel de log de Pino: `trace`, `debug`, `info`, `warn`, `error` o `fatal`.

### `IAM_APPLICATION_NAME`

Nombre exacto (columna `name`) de la aplicación "iam" tal como está
registrada en la propia base de datos de `iam-api` (tabla
`apps_applications`). Lo usa `RolesGuard` para verificar que el token
recibido fue emitido para esta aplicación.
