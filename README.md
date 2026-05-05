# TestShop API

API RESTful para una tienda en línea construida con NestJS. Gestiona productos, usuarios, autenticación, carrito de compras, favoritos y pagos con Transbank Webpay Plus, con soporte para carga de archivos y comunicación en tiempo real mediante WebSockets.

## Funcionalidades

- **Autenticación y autorización**: Registro e inicio de sesión de usuarios con JWT. Protección de rutas por roles (`user`, `admin`, `super-user`) mediante guards y decoradores personalizados. Soporte para actualización de perfil (nombre, teléfono, dirección) y cambio de contraseña con verificación de la contraseña actual. Reactivación automática de usuarios inactivos al iniciar sesión.
- **Gestión de usuarios (admin)**: Listado paginado de todos los usuarios con búsqueda por nombre o email. Edición de cualquier usuario por ID incluyendo nombre, email, teléfono, dirección, roles, estado activo y contraseña.
- **Gestión de productos**: CRUD completo de productos con soporte para imágenes, tallas, géneros, tags, precios y stock. Incluye paginación, filtros por género, precio mínimo/máximo, tallas y búsqueda por texto.
- **Carrito de compras**: Agregar, actualizar cantidad y eliminar productos del carrito. El sistema detecta si el mismo producto con la misma talla ya existe e incrementa la cantidad automáticamente. Validación de tallas disponibles por producto. Consulta del carrito de cualquier usuario por ID.
- **Favoritos**: Agregar y eliminar productos de favoritos por usuario. Endpoint para administradores que agrupa todos los productos con el conteo de usuarios que los tienen en favoritos, ordenados de mayor a menor, con búsqueda y paginación.
- **Pagos con Transbank Webpay Plus**: Integración completa con el SDK de Transbank. Crea transacciones desde el carrito del usuario, redirige a la página de pago de Webpay, confirma el resultado y vacía el carrito si el pago fue aprobado. Guarda un snapshot de los items al momento del pago. Soporta ambientes de integración (testing) y producción mediante variable de entorno.
- **Historial de pagos**: El usuario puede consultar su propio historial de pagos con detalle de items. Los administradores pueden ver todos los pagos con paginación, filtro por estado (`pending`, `approved`, `failed`, `cancelled`) y búsqueda por email o nombre de usuario. Los administradores también pueden cancelar pagos aprobados y consultar el historial de cualquier usuario por ID.
- **Carga de archivos**: Subida de imágenes de productos al servidor con validación de tipo y renombramiento automático con UUID.
- **WebSockets**: Módulo de mensajería en tiempo real con Socket.IO, autenticado mediante JWT.
- **Seed**: Endpoint para poblar la base de datos con productos y usuarios de prueba.
- **Documentación**: Swagger/OpenAPI disponible en `/api`.

## Tecnologías

- **[NestJS](https://nestjs.com/)**: Framework principal de Node.js orientado a módulos, con soporte nativo para inyección de dependencias, guards, interceptores y decoradores.
- **[TypeORM](https://typeorm.io/)**: ORM para la gestión de entidades y relaciones en PostgreSQL. Utiliza `synchronize: true` para desarrollo y soporte SSL para producción.
- **[PostgreSQL](https://www.postgresql.org/)**: Base de datos relacional. Se puede levantar localmente mediante Docker Compose.
- **[Passport + JWT](https://www.passportjs.org/)**: Estrategia de autenticación stateless basada en JSON Web Tokens con `@nestjs/passport` y `passport-jwt`.
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)**: Hash seguro de contraseñas antes de persistirlas en la base de datos.
- **[transbank-sdk](https://github.com/TransbankDevelopers/transbank-sdk-nodejs)**: Integración con Webpay Plus para procesamiento de pagos en ambientes de integración y producción.
- **[Socket.IO](https://socket.io/)**: Comunicación bidireccional en tiempo real para el módulo de mensajería (`@nestjs/websockets`).
- **[Multer](https://github.com/expressjs/multer)**: Middleware para la gestión y almacenamiento de archivos subidos.
- **[Swagger](https://swagger.io/)**: Documentación automática de la API generada con `@nestjs/swagger`.
- **[class-validator / class-transformer](https://github.com/typestack/class-validator)**: Validación y transformación de DTOs mediante decoradores.
- **[UUID](https://github.com/uuidjs/uuid)**: Generación de identificadores únicos para archivos y órdenes de pago.

## Documentación API (Swagger)

La documentación interactiva de todos los endpoints está disponible en:

**Local:**
```
http://localhost:3000/api
```

**Producción:**
```
https://testshop-nestjs.onrender.com/api/
```

## Alojamiento

> ⚠️ **Nota importante**: El backend está alojado en Render con un plan gratuito. Si lleva un tiempo sin recibir peticiones, puede tardar **hasta 1 minuto** en despertar antes de responder. Es normal que la primera carga sea lenta.

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| Backend | Render | [https://testshop-nestjs.onrender.com/api/](https://testshop-nestjs.onrender.com/api/) |
| Base de datos | Neon Serverless PostgreSQL | — |
| Frontend | Netlify | [https://test-shop-react.netlify.app/](https://test-shop-react.netlify.app/) |

### Credenciales de administrador

```
Usuario: test1@google.com
Contraseña: Abc123
```

### Credenciales de prueba para Transbank Webpay Plus

El pago utiliza el ambiente de **integración** de Transbank, por lo que no se realizan cobros reales.

**Tarjeta de crédito (aprobada):**

| Campo | Valor |
|-------|-------|
| Número | `4051 8856 0044 6623` |
| CVV | `123` |
| Fecha de expiración | Cualquiera futura, ej. `12/26` |
| RUT | `11.111.111-1` |
| Contraseña | `123` |

## Cómo ejecutar el proyecto

1. Clonar el repositorio:

```bash
git clone <url-del-repo>
```

2. Instalar dependencias:

```bash
yarn install
```

3. Copiar el archivo de entorno y configurar las variables:

```bash
cp .env.template .env
```

4. Levantar la base de datos con Docker:

```bash
docker compose up -d
```

5. Iniciar el servidor en modo desarrollo:

```bash
yarn start:dev
```

6. Poblar la base de datos con datos iniciales:

```
GET http://localhost:3000/api/seed
```

## Variables de entorno

```env
DB_PASSWORD=
DB_NAME=
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres

JWT_SECRET=

HOST_API=http://localhost:3000/api
PORT=3000

STAGE=dev

API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173/#/profile

TRANSBANK_ENV=integration
# Solo en producción:
# TRANSBANK_COMMERCE_CODE=
# TRANSBANK_API_KEY=
```

## Endpoints principales

### Auth (`/api/auth`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| POST | `/register` | — | Registro de usuario |
| POST | `/login` | — | Inicio de sesión |
| GET | `/check-status` | user | Refresca token y datos del usuario |
| PATCH | `/profile` | user | Actualizar nombre, teléfono y dirección |
| PATCH | `/change-password` | user | Cambiar contraseña con verificación |
| GET | `/users` | admin | Listar todos los usuarios (paginado, buscable) |
| PATCH | `/users/:id` | admin | Editar cualquier usuario por ID |

### Products (`/api/products`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| GET | `/` | — | Listar productos (filtros: género, precio, tallas, texto) |
| GET | `/:term` | — | Obtener producto por ID, slug o título |
| POST | `/` | user | Crear producto |
| PATCH | `/:id` | admin | Actualizar producto |
| DELETE | `/:id` | admin | Eliminar producto |

### Cart (`/api/cart`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| GET | `/` | user | Ver carrito del usuario autenticado |
| POST | `/` | user | Agregar producto al carrito |
| PATCH | `/item/:itemId` | user | Actualizar cantidad de un item |
| DELETE | `/item/:itemId` | user | Eliminar un item del carrito |
| DELETE | `/` | user | Vaciar el carrito |
| GET | `/user/:userId` | user | Ver carrito de un usuario por ID |

### Favorites (`/api/favorites`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| GET | `/` | user | Ver favoritos del usuario autenticado |
| POST | `/` | user | Agregar producto a favoritos |
| DELETE | `/:productId` | user | Eliminar producto de favoritos |
| GET | `/admin/group` | admin | Productos agrupados por conteo de favoritos |

### Payments (`/api/payments`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| POST | `/create` | user | Iniciar transacción Webpay desde el carrito |
| GET | `/confirm` | — | Callback de Transbank (confirmación de pago) |
| GET | `/my-payments` | user | Historial de pagos del usuario autenticado |
| GET | `/admin/all` | admin | Todos los pagos (paginado, filtro por estado y búsqueda) |
| GET | `/:id` | user | Detalle de un pago por ID |
| GET | `/user/:userId/payments` | admin | Historial de pagos de un usuario específico |
| PATCH | `/:id/cancel` | admin | Cancelar un pago aprobado |

### Files (`/api/files`)

| Método | Ruta | Rol requerido | Descripción |
|--------|------|---------------|-------------|
| POST | `/product` | — | Subir imagen de producto |
| GET | `/product/:imageName` | — | Obtener imagen de producto |

### Seed (`/api/seed`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Reinicia la base de datos con datos de prueba |