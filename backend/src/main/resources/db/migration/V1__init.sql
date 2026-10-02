CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    phone       VARCHAR(11)  NOT NULL UNIQUE,
    full_name   VARCHAR(100),
    role        VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
    id          BIGSERIAL PRIMARY KEY,
    phone       VARCHAR(11)  NOT NULL,
    code_hash   VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0,
    consumed    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone_created ON otp_codes (phone, created_at DESC);

CREATE TABLE addresses (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title           VARCHAR(50)  NOT NULL,
    receiver_name   VARCHAR(100) NOT NULL,
    receiver_phone  VARCHAR(11)  NOT NULL,
    province        VARCHAR(50)  NOT NULL,
    city            VARCHAR(50)  NOT NULL,
    postal_code     VARCHAR(10)  NOT NULL,
    address_line    VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON addresses (user_id);

CREATE TABLE categories (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    description  VARCHAR(500),
    sort_order   INT          NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200)  NOT NULL,
    description     TEXT,
    brand           VARCHAR(100),
    pet_type        VARCHAR(20)   NOT NULL,
    category_id     BIGINT        NOT NULL REFERENCES categories (id),
    price           BIGINT        NOT NULL CHECK (price >= 0),
    discount_price  BIGINT        CHECK (discount_price >= 0),
    sort_price      BIGINT        GENERATED ALWAYS AS (COALESCE(discount_price, price)) STORED,
    stock          INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    rating_avg      NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count    INT           NOT NULL DEFAULT 0,
    sold_count      INT           NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_pet_type ON products (pet_type);

CREATE TABLE product_images (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT       NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    file_name   VARCHAR(255) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images (product_id);

CREATE TABLE cart_items (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    quantity    INT    NOT NULL CHECK (quantity > 0),
    UNIQUE (user_id, product_id)
);

CREATE TABLE wishlist_items (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id  BIGINT      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);

CREATE TABLE coupons (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(30) NOT NULL UNIQUE,
    type              VARCHAR(10) NOT NULL,
    value             BIGINT      NOT NULL CHECK (value > 0),
    min_order_amount  BIGINT      NOT NULL DEFAULT 0,
    max_discount      BIGINT,
    usage_limit       INT,
    used_count        INT         NOT NULL DEFAULT 0,
    expires_at        TIMESTAMPTZ,
    active            BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users (id),
    status           VARCHAR(20)  NOT NULL,
    items_total      BIGINT       NOT NULL,
    discount_amount  BIGINT       NOT NULL DEFAULT 0,
    shipping_cost    BIGINT       NOT NULL DEFAULT 0,
    total            BIGINT       NOT NULL,
    coupon_code      VARCHAR(30),
    receiver_name    VARCHAR(100) NOT NULL,
    receiver_phone   VARCHAR(11)  NOT NULL,
    province         VARCHAR(50)  NOT NULL,
    city             VARCHAR(50)  NOT NULL,
    postal_code      VARCHAR(10)  NOT NULL,
    address_line     VARCHAR(500) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    paid_at          TIMESTAMPTZ
);
CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status, created_at);

CREATE TABLE order_items (
    id            BIGSERIAL PRIMARY KEY,
    order_id      BIGINT       NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id    BIGINT       NOT NULL REFERENCES products (id),
    product_name  VARCHAR(200) NOT NULL,
    unit_price    BIGINT       NOT NULL,
    quantity      INT          NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

CREATE TABLE payments (
    id            BIGSERIAL PRIMARY KEY,
    order_id      BIGINT      NOT NULL REFERENCES orders (id),
    gateway       VARCHAR(30) NOT NULL,
    amount        BIGINT      NOT NULL,
    authority     VARCHAR(64) NOT NULL UNIQUE,
    status        VARCHAR(20) NOT NULL,
    ref_id        VARCHAR(64),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);
CREATE INDEX idx_payments_order ON payments (order_id);
