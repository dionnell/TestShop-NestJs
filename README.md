# TestShop API
 
API RESTful para una tienda en línea construida con NestJS. Permite gestionar productos, usuarios y autenticación, con soporte para carga de archivos y comunicación en tiempo real mediante WebSockets.
 
## Funcionalidades
 
- **Autenticación y autorización**: Registro e inicio de sesión de usuarios con JWT. Protección de rutas por roles (`user`, `admin`, `super-user`) mediante guards y decoradores personalizados.
- **Gestión de productos**: CRUD completo de productos con soporte para imágenes, tallas, géneros, tags, precios y stock. Incluye paginación, filtros por género, precio, talla y búsqueda por texto.
- **Carga de archivos**: Subida de imágenes de productos al servidor con validación de tipo y renombramiento automático.
- **Seed**: Endpoint para poblar la base de datos con datos iniciales de productos y usuarios de prueba.
- **Documentación**: Swagger/OpenAPI disponible en `/api`.
## Tecnologías
 
- **[NestJS](https://nestjs.com/)**: Framework principal de Node.js orientado a módulos, con soporte nativo para inyección de dependencias, guards, interceptores y decoradores.
- **[TypeORM](https://typeorm.io/)**: ORM para la gestión de entidades y relaciones en la base de datos PostgreSQL. Se utiliza con `synchronize: true` para desarrollo.
- **[PostgreSQL](https://www.postgresql.org/)**: Base de datos relacional. Se levanta mediante Docker Compose.
- **[Passport + JWT](https://www.passportjs.org/)**: Estrategia de autenticación basada en JSON Web Tokens con `@nestjs/passport` y `passport-jwt`.
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)**: Hash seguro de contraseñas antes de persistirlas en la base de datos.
- **[Socket.IO](https://socket.io/)**: Comunicación bidireccional en tiempo real para el módulo de mensajería (`@nestjs/websockets`).
- **[Multer](https://github.com/expressjs/multer)**: Middleware para la gestión y almacenamiento de archivos subidos.
- **[Swagger](https://swagger.io/)**: Documentación automática de la API generada con `@nestjs/swagger`.
- **[class-validator / class-transformer](https://github.com/typestack/class-validator)**: Validación y transformación de DTOs mediante decoradores.
---
 
## Cómo ejecutar el proyecto
 
1. Clonar proyecto
2. `yarn install`
3. Clonar el archivo `.env.template` y renombrarlo a `.env`
4. Cambiar las variables de entorno
5. Levantar la base de datos

```
docker compose up -d
```

6. Levantar:

```
npm run start:dev
yarn start:dev

```

7. Ejecutar SEED

```
http://localhost:3000/api/seed
```


Para ver los enpoint en Swagger [https://testshop-nestjs.onrender.com/api/](https://testshop-nestjs.onrender.com/api/)