# Book Tracker Serverless

Aplicacion web sencilla para registrar libros y controlar progreso de lectura usando arquitectura serverless en AWS.

## Arquitectura

- Frontend estatico en `frontend/`
- AWS Cognito para registro, login y confirmacion por correo
- Amazon API Gateway HTTP API para exponer endpoints
- AWS Lambda para la logica del backend
- Amazon DynamoDB para guardar los libros
- AWS IAM para permisos entre Lambda y DynamoDB
- AWS Amplify Hosting para publicar el frontend

## Requisitos

Para desarrollar y desplegar necesitas:

- Cuenta de AWS
- Node.js 20 o superior
- AWS CLI configurado con tu cuenta
- AWS SAM CLI
- Git

No compartas tus claves de AWS por chat. Configuralas localmente con AWS CLI.

## Instalar herramientas

1. Instala Node.js LTS desde `https://nodejs.org/`
2. Instala AWS CLI desde `https://aws.amazon.com/cli/`
3. Instala AWS SAM CLI desde `https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html`
4. Configura AWS CLI:

```bash
aws configure
```

Usa una region como `us-east-1` para mantenerlo simple.

## Desplegar backend en AWS

Desde la carpeta raiz del proyecto:

```bash
sam build
sam deploy --guided
```

Valores recomendados en el asistente de SAM:

- Stack Name: `book-tracker-serverless`
- AWS Region: `us-east-1`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to configuration file: `Y`

Cuando termine, SAM mostrara outputs parecidos a:

- `Region`
- `UserPoolId`
- `UserPoolClientId`
- `ApiUrl`
- `BooksTableName`

## Configurar frontend

Abre `frontend/config.js` y reemplaza los valores:

```js
window.APP_CONFIG = {
  region: "us-east-1",
  userPoolId: "TU_USER_POOL_ID",
  userPoolWebClientId: "TU_USER_POOL_CLIENT_ID",
  apiUrl: "TU_API_URL",
};
```

Despues puedes abrir `frontend/index.html` en el navegador o publicarlo con Amplify Hosting.

## Probar flujo

1. Crea una cuenta desde la pantalla de registro.
2. Revisa tu correo y copia el codigo de confirmacion.
3. Confirma la cuenta.
4. Inicia sesion.
5. Agrega, edita y elimina libros.

## Endpoints

Todos los endpoints requieren token JWT de Cognito en el header `Authorization`.

- `GET /books`
- `POST /books`
- `GET /books/{bookId}`
- `PUT /books/{bookId}`
- `DELETE /books/{bookId}`

## Costos

Este proyecto usa servicios con capa gratuita, pero AWS puede cobrar si superas limites. Crea un presupuesto en AWS Budgets, por ejemplo de 1 o 5 USD, antes de desplegar.

## Para la entrega

Puedes explicar que la aplicacion sigue este flujo:

1. El usuario entra al frontend publicado en Amplify Hosting.
2. Cognito registra o autentica al usuario.
3. El frontend obtiene un token JWT.
4. El frontend llama a API Gateway con ese token.
5. API Gateway valida el token con Cognito.
6. Lambda procesa la solicitud.
7. Lambda lee o escribe en DynamoDB.
