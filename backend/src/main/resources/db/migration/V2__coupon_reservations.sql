-- Orders now reference the coupon they reserved, so the reservation can be released on cancel even if the
-- coupon's code is edited later.
ALTER TABLE orders ADD COLUMN coupon_id BIGINT REFERENCES coupons (id) ON DELETE SET NULL;

UPDATE orders o
SET coupon_id = c.id
FROM coupons c
WHERE o.coupon_code IS NOT NULL AND c.code = upper(o.coupon_code);

-- used_count now counts reservations by every order that isn't cancelled (previously only paid orders).
UPDATE coupons c
SET used_count = (SELECT count(*) FROM orders o WHERE o.coupon_id = c.id AND o.status <> 'CANCELLED');

CREATE INDEX idx_otp_created ON otp_codes (created_at);
CREATE INDEX idx_payments_order_status ON payments (order_id, status, created_at);
