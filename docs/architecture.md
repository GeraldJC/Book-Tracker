# Arquitectura AWS

## Servicios usados

| Servicio | Rol en el proyecto |
| --- | --- |
| AWS Cognito | Gestiona usuarios, login, registro y confirmacion por correo. |
| API Gateway | Publica la API HTTP del backend. |
| AWS Lambda | Ejecuta la logica para crear, listar, editar y eliminar libros. |
| DynamoDB | Guarda los libros por usuario. |
| IAM | Da permiso a Lambda para usar DynamoDB. |
| Amplify Hosting | Puede publicar el frontend estatico. |

## Modelo de datos

Tabla DynamoDB: `book-tracker-books`

Clave primaria:

- Partition key: `userId`
- Sort key: `bookId`

Campos principales:

- `title`
- `author`
- `genre`
- `totalPages`
- `pagesRead`
- `createdAt`
- `updatedAt`

## Seguridad

La API usa un autorizador JWT de Cognito. Cada solicitud debe incluir:

```http
Authorization: Bearer TOKEN_DE_COGNITO
```

El backend toma el `sub` del usuario autenticado y lo usa como `userId`, por eso cada usuario solo consulta sus propios libros.

## Diagrama textual

```text
Usuario
  |
  v
Frontend estatico
  |
  +--> Cognito: registro, login, confirmacion
  |
  +--> API Gateway: llamadas HTTP con JWT
          |
          v
        Lambda
          |
          v
       DynamoDB
```
