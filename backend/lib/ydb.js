// YDB access layer. Uses the service account attached to the Cloud Function
// (see infra/main.tf) for auth via the metadata service — no keys in env vars.
//
// NOTE: hand-written against the documented ydb-sdk v5 API and NOT executed
// against a live database from this environment (no YDB instance / npm
// install was run here). Before relying on this in production: `npm install`
// in backend/, stand up the YDB tables from ydb/schema.sql, and exercise each
// function below against a real (or YDB local Docker) database — see
// docs/DEPLOY_CHECKLIST.md.
const { Driver, getCredentialsFromEnv, TypedValues } = require("ydb-sdk");

let driverPromise = null;

function getDriver() {
  if (!driverPromise) {
    const endpoint = process.env.YDB_ENDPOINT;
    const database = process.env.YDB_DATABASE;
    if (!endpoint || !database) throw new Error("YDB_ENDPOINT / YDB_DATABASE not configured");
    const driver = new Driver({ endpoint, database, authService: getCredentialsFromEnv() });
    driverPromise = driver.ready(10000).then((ready) => {
      if (!ready) throw new Error("YDB driver failed to become ready");
      return driver;
    });
  }
  return driverPromise;
}

async function withSession(fn) {
  const driver = await getDriver();
  return driver.tableClient.withSession(fn);
}

// Decodes a YDB result set into plain JS objects. Handles the scalar types
// used by our schema (utf8, uint32, double, bool, timestamp) and Optional<T>
// wrapping (nullable columns).
function decodeResultSet(resultSet) {
  if (!resultSet) return [];
  const columns = resultSet.columns || [];
  return (resultSet.rows || []).map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col.name] = decodeValue(row.items[i]);
    });
    return obj;
  });
}

function decodeValue(value) {
  if (!value) return null;
  if (value.nullFlagValue !== undefined && value.nullFlagValue !== null) return null;
  if (value.textValue !== undefined) return value.textValue;
  if (value.uint32Value !== undefined) return value.uint32Value;
  if (value.uint64Value !== undefined) return Number(value.uint64Value);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;
  // Timestamp columns come back as microseconds since epoch (uint64).
  return null;
}

const T = TypedValues;

// --- auth codes -------------------------------------------------------

async function saveAuthCode(email, code, expiresAtMs) {
  return withSession((session) =>
    session.executeQuery(
      `DECLARE $email AS Utf8; DECLARE $code AS Utf8; DECLARE $expires_at AS Uint64;
       UPSERT INTO auth_codes (email, code, expires_at, attempts) VALUES ($email, $code, $expires_at, 0);`,
      { $email: T.utf8(email), $code: T.utf8(code), $expires_at: T.uint64(expiresAtMs) }
    )
  );
}

async function getAuthCode(email) {
  const result = await withSession((session) =>
    session.executeQuery(
      `DECLARE $email AS Utf8;
       SELECT email, code, expires_at, attempts FROM auth_codes WHERE email = $email;`,
      { $email: T.utf8(email) }
    )
  );
  const rows = decodeResultSet(result.resultSets[0]);
  return rows[0] || null;
}

async function incrementAuthAttempts(email, attempts) {
  return withSession((session) =>
    session.executeQuery(
      `DECLARE $email AS Utf8; DECLARE $attempts AS Uint32;
       UPDATE auth_codes SET attempts = $attempts WHERE email = $email;`,
      { $email: T.utf8(email), $attempts: T.uint32(attempts) }
    )
  );
}

async function deleteAuthCode(email) {
  return withSession((session) =>
    session.executeQuery(`DECLARE $email AS Utf8; DELETE FROM auth_codes WHERE email = $email;`, {
      $email: T.utf8(email),
    })
  );
}

// --- users --------------------------------------------------------------

async function getOrCreateUser(email) {
  const found = await withSession((session) =>
    session.executeQuery(`DECLARE $email AS Utf8; SELECT id, email FROM users WHERE email = $email;`, {
      $email: T.utf8(email),
    })
  );
  const rows = decodeResultSet(found.resultSets[0]);
  if (rows[0]) return rows[0];

  const id = require("crypto").randomUUID();
  await withSession((session) =>
    session.executeQuery(
      `DECLARE $id AS Utf8; DECLARE $email AS Utf8; DECLARE $created_at AS Uint64;
       UPSERT INTO users (id, email, created_at) VALUES ($id, $email, $created_at);`,
      { $id: T.utf8(id), $email: T.utf8(email), $created_at: T.uint64(Date.now()) }
    )
  );
  return { id, email };
}

// --- orders ---------------------------------------------------------------

async function createOrder(order) {
  await withSession((session) =>
    session.executeQuery(
      `DECLARE $id AS Utf8; DECLARE $user_id AS Utf8?; DECLARE $email AS Utf8; DECLARE $phone AS Utf8;
       DECLARE $name AS Utf8; DECLARE $delivery_method AS Utf8; DECLARE $delivery_address AS Utf8?;
       DECLARE $total AS Uint32; DECLARE $status AS Utf8; DECLARE $created_at AS Uint64;
       UPSERT INTO orders (id, user_id, email, phone, name, delivery_method, delivery_address, total, status, payment_id, created_at)
       VALUES ($id, $user_id, $email, $phone, $name, $delivery_method, $delivery_address, $total, $status, NULL, $created_at);`,
      {
        $id: T.utf8(order.id),
        $user_id: order.userId ? T.optional(T.utf8(order.userId)) : T.optional(T.utf8, null),
        $email: T.utf8(order.email),
        $phone: T.utf8(order.phone),
        $name: T.utf8(order.name),
        $delivery_method: T.utf8(order.deliveryMethod),
        $delivery_address: order.deliveryAddress ? T.optional(T.utf8(order.deliveryAddress)) : T.optional(T.utf8, null),
        $total: T.uint32(order.total),
        $status: T.utf8("new"),
        $created_at: T.uint64(Date.now()),
      }
    )
  );

  for (const item of order.items) {
    await withSession((session) =>
      session.executeQuery(
        `DECLARE $order_id AS Utf8; DECLARE $line_id AS Utf8; DECLARE $product_id AS Utf8;
         DECLARE $title AS Utf8; DECLARE $price AS Uint32; DECLARE $qty AS Uint32; DECLARE $options_json AS Utf8;
         UPSERT INTO order_items (order_id, line_id, product_id, title, price, qty, options_json)
         VALUES ($order_id, $line_id, $product_id, $title, $price, $qty, $options_json);`,
        {
          $order_id: T.utf8(order.id),
          $line_id: T.utf8(require("crypto").randomUUID()),
          $product_id: T.utf8(item.productId),
          $title: T.utf8(item.title),
          $price: T.uint32(item.price),
          $qty: T.uint32(item.qty),
          $options_json: T.utf8(JSON.stringify(item.options || {})),
        }
      )
    );
  }
}

async function getOrder(orderId) {
  const result = await withSession((session) =>
    session.executeQuery(
      `DECLARE $id AS Utf8;
       SELECT id, user_id, email, phone, name, delivery_method, delivery_address, total, status, payment_id, created_at
       FROM orders WHERE id = $id;`,
      { $id: T.utf8(orderId) }
    )
  );
  const rows = decodeResultSet(result.resultSets[0]);
  return rows[0] || null;
}

async function setOrderPayment(orderId, paymentId) {
  return withSession((session) =>
    session.executeQuery(
      `DECLARE $id AS Utf8; DECLARE $payment_id AS Utf8;
       UPDATE orders SET payment_id = $payment_id WHERE id = $id;`,
      { $id: T.utf8(orderId), $payment_id: T.utf8(paymentId) }
    )
  );
}

async function setOrderStatus(orderId, status) {
  return withSession((session) =>
    session.executeQuery(`DECLARE $id AS Utf8; DECLARE $status AS Utf8; UPDATE orders SET status = $status WHERE id = $id;`, {
      $id: T.utf8(orderId),
      $status: T.utf8(status),
    })
  );
}

async function getOrderByPaymentId(paymentId) {
  const result = await withSession((session) =>
    session.executeQuery(
      `DECLARE $payment_id AS Utf8;
       SELECT id, user_id, email, phone, name, total, status FROM orders WHERE payment_id = $payment_id;`,
      { $payment_id: T.utf8(paymentId) }
    )
  );
  const rows = decodeResultSet(result.resultSets[0]);
  return rows[0] || null;
}

async function listOrdersByUser(userId) {
  const result = await withSession((session) =>
    session.executeQuery(
      `DECLARE $user_id AS Utf8;
       SELECT id, total, status, created_at FROM orders WHERE user_id = $user_id ORDER BY created_at DESC;`,
      { $user_id: T.utf8(userId) }
    )
  );
  return decodeResultSet(result.resultSets[0]);
}

module.exports = {
  saveAuthCode,
  getAuthCode,
  incrementAuthAttempts,
  deleteAuthCode,
  getOrCreateUser,
  createOrder,
  getOrder,
  setOrderPayment,
  setOrderStatus,
  getOrderByPaymentId,
  listOrdersByUser,
};
