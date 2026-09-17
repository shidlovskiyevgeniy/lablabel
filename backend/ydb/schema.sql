-- Run against the YDB serverless database created in infra/main.tf, e.g.:
--   yc ydb sql --database=... --execute-file=backend/ydb/schema.sql
-- or via the YQL editor in the YC console.

CREATE TABLE users (
    id Utf8,
    email Utf8,
    created_at Uint64,
    PRIMARY KEY (id)
);

CREATE TABLE auth_codes (
    email Utf8,
    code Utf8,
    expires_at Uint64,
    attempts Uint32,
    PRIMARY KEY (email)
);

CREATE TABLE orders (
    id Utf8,
    user_id Utf8,
    email Utf8,
    phone Utf8,
    name Utf8,
    delivery_method Utf8,
    delivery_address Utf8,
    total Uint32,
    status Utf8,            -- new | paid | in_production | shipped | done | cancelled
    payment_id Utf8,
    created_at Uint64,
    PRIMARY KEY (id),
    INDEX idx_user_id GLOBAL ON (user_id),
    INDEX idx_payment_id GLOBAL ON (payment_id)
);

CREATE TABLE order_items (
    order_id Utf8,
    line_id Utf8,
    product_id Utf8,
    title Utf8,
    price Uint32,
    qty Uint32,
    options_json Utf8,
    PRIMARY KEY (order_id, line_id)
);
