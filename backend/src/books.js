const crypto = require("crypto");
const {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  },
  body: JSON.stringify(body),
});

const getUserId = (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  return claims?.sub;
};

const parseBody = (event) => {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
};

const cleanBookInput = (input) => {
  const title = String(input.title || "").trim();
  const author = String(input.author || "").trim();
  const genre = String(input.genre || "").trim();
  const totalPages = Number(input.totalPages);
  const pagesRead = Number(input.pagesRead || 0);

  if (!title) throw new Error("El titulo es obligatorio.");
  if (!author) throw new Error("El autor es obligatorio.");
  if (!genre) throw new Error("El genero es obligatorio.");
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    throw new Error("Las paginas totales deben ser un numero mayor a 0.");
  }
  if (!Number.isInteger(pagesRead) || pagesRead < 0 || pagesRead > totalPages) {
    throw new Error("Las paginas leidas deben estar entre 0 y el total.");
  }

  return { title, author, genre, totalPages, pagesRead };
};

const listBooks = async (userId) => {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: marshall({ ":userId": userId }),
    })
  );

  const books = (result.Items || []).map((item) => unmarshall(item));
  books.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return json(200, books);
};

const createBook = async (userId, event) => {
  const input = cleanBookInput(parseBody(event));
  const now = new Date().toISOString();
  const book = {
    userId,
    bookId: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(book),
    })
  );

  return json(201, book);
};

const getBook = async (userId, bookId) => {
  const result = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId, bookId }),
    })
  );

  if (!result.Item) return json(404, { message: "Libro no encontrado." });
  return json(200, unmarshall(result.Item));
};

const updateBook = async (userId, bookId, event) => {
  const input = cleanBookInput(parseBody(event));
  const result = await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId, bookId }),
      ConditionExpression: "attribute_exists(bookId)",
      UpdateExpression:
        "SET title = :title, author = :author, genre = :genre, totalPages = :totalPages, pagesRead = :pagesRead, updatedAt = :updatedAt",
      ExpressionAttributeValues: marshall({
        ":title": input.title,
        ":author": input.author,
        ":genre": input.genre,
        ":totalPages": input.totalPages,
        ":pagesRead": input.pagesRead,
        ":updatedAt": new Date().toISOString(),
      }),
      ReturnValues: "ALL_NEW",
    })
  );

  return json(200, unmarshall(result.Attributes));
};

const deleteBook = async (userId, bookId) => {
  await client.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId, bookId }),
    })
  );

  return json(200, { message: "Libro eliminado." });
};

exports.handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return json(204, {});

    const userId = getUserId(event);
    if (!userId) return json(401, { message: "No autorizado." });

    const method = event.requestContext.http.method;
    const bookId = event.pathParameters?.bookId;

    if (method === "GET" && !bookId) return listBooks(userId);
    if (method === "POST") return createBook(userId, event);
    if (method === "GET" && bookId) return getBook(userId, bookId);
    if (method === "PUT" && bookId) return updateBook(userId, bookId, event);
    if (method === "DELETE" && bookId) return deleteBook(userId, bookId);

    return json(404, { message: "Ruta no encontrada." });
  } catch (error) {
    console.error(error);
    if (error.name === "ConditionalCheckFailedException") {
      return json(404, { message: "Libro no encontrado." });
    }
    if (error instanceof SyntaxError || error.message.includes("obligatorio") || error.message.includes("paginas")) {
      return json(400, { message: error.message });
    }
    return json(500, { message: "Error interno del servidor." });
  }
};
