package ir.shopet.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;
import ir.shopet.common.ApiException;
import ir.shopet.coupon.Coupon;
import ir.shopet.coupon.CouponRepository;
import ir.shopet.coupon.CouponType;
import ir.shopet.payment.PaymentRepository;
import ir.shopet.payment.PaymentService;
import ir.shopet.payment.PaymentStatus;

class CheckoutIntegrationTest extends IntegrationTest {

    @Autowired
    CouponRepository coupons;
    @Autowired
    OrderService orderService;
    @Autowired
    OrderExpiryJob expiryJob;
    @Autowired
    OrderRepository orders;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    PaymentService paymentService;
    @Autowired
    PaymentRepository payments;

    private Coupon coupon(CouponType type, long value, long minOrder, Long maxDiscount) {
        Coupon c = new Coupon();
        c.setCode("T" + System.nanoTime());
        c.setType(type);
        c.setValue(value);
        c.setMinOrderAmount(minOrder);
        c.setMaxDiscount(maxDiscount);
        return coupons.save(c);
    }

    private long placeOrder(String token, long addressId, String couponCode) throws Exception {
        var body = couponCode == null ? Map.of("addressId", addressId)
                : Map.of("addressId", addressId, "couponCode", couponCode);
        String res = body(postJson("/api/orders", token, body).andExpect(status().isCreated()));
        return ((Number) JsonPath.read(res, "$.id")).longValue();
    }

    private String pay(String token, long orderId, boolean success) throws Exception {
        String redirect = JsonPath.read(body(postJson("/api/orders/" + orderId + "/pay", token, null)
                .andExpect(status().isOk())), "$.redirectUrl");
        String authority = redirect.substring(redirect.lastIndexOf('/') + 1);
        getJson(redirect, null).andExpect(status().isOk());
        return getJson("/api/payments/callback?authority=" + authority + "&status=" + (success ? "OK" : "NOK"), null)
                .andExpect(status().isFound())
                .andReturn().getResponse().getHeader("Location");
    }

    @Test
    void fullPurchaseFlowWithCouponAndMockPayment() throws Exception {
        Product product = newProduct("غذای گربه", 400_000, 300_000L, 10, PetType.CAT);
        Coupon coupon = coupon(CouponType.PERCENT, 10, 0, 50_000L);
        String token = loginNewCustomer();
        long addressId = createAddress(token);

        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemsTotal").value(600_000))
                .andExpect(jsonPath("$.count").value(2));

        postJson("/api/checkout/preview", token, Map.of("couponCode", coupon.getCode().toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.discount").value(50_000))       // 10% = 60,000 capped at 50,000
                .andExpect(jsonPath("$.shippingCost").value(50_000))   // below free-shipping threshold
                .andExpect(jsonPath("$.total").value(600_000));

        long orderId = placeOrder(token, addressId, coupon.getCode());
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(8);
        getJson("/api/cart", token).andExpect(jsonPath("$.count").value(0));
        getJson("/api/orders/" + orderId, token)
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(300_000))
                .andExpect(jsonPath("$.receiverName").value("مشتری تست"));

        // A failed payment leaves the order payable.
        assertThat(pay(token, orderId, false)).isEqualTo("/payment/result?status=failed&orderId=" + orderId);
        getJson("/api/orders/" + orderId, token).andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));

        assertThat(pay(token, orderId, true)).isEqualTo("/payment/result?status=success&orderId=" + orderId);
        getJson("/api/orders/" + orderId, token)
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAt").exists());
        assertThat(products.findById(product.getId()).orElseThrow().getSoldCount()).isEqualTo(2);
        assertThat(coupons.findById(coupon.getId()).orElseThrow().getUsedCount()).isEqualTo(1);

        // Paid orders cannot be paid again or cancelled by the customer.
        postJson("/api/orders/" + orderId + "/pay", token, null).andExpect(status().isBadRequest());
        postJson("/api/orders/" + orderId + "/cancel", token, null).andExpect(status().isBadRequest());
        getJson("/api/orders", token).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void repeatedCallbackIsIdempotent() throws Exception {
        Product product = newProduct("اسباب‌بازی", 100_000, null, 5, PetType.DOG);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 1));
        long orderId = placeOrder(token, addressId, null);

        String redirect = JsonPath.read(body(postJson("/api/orders/" + orderId + "/pay", token, null)), "$.redirectUrl");
        String callback = "/api/payments/callback?authority=" + redirect.substring(redirect.lastIndexOf('/') + 1) + "&status=OK";
        getJson(callback, null).andExpect(header().string("Location", "/payment/result?status=success&orderId=" + orderId));
        getJson(callback.replace("OK", "NOK"), null)
                .andExpect(header().string("Location", "/payment/result?status=success&orderId=" + orderId));
        assertThat(products.findById(product.getId()).orElseThrow().getSoldCount()).isEqualTo(1);

        getJson("/api/payments/callback?authority=UNKNOWN&status=OK", null)
                .andExpect(header().string("Location", "/payment/result?status=failed"));
    }

    @Test
    void freeShippingAboveThresholdAndFixedCouponMinimum() throws Exception {
        Product product = newProduct("آکواریوم", 1_200_000, null, 3, PetType.FISH);
        Coupon coupon = coupon(CouponType.FIXED, 100_000, 2_000_000, null);
        String token = loginNewCustomer();
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 1));

        postJson("/api/checkout/preview", token, Map.of())
                .andExpect(jsonPath("$.shippingCost").value(0))
                .andExpect(jsonPath("$.total").value(1_200_000));
        postJson("/api/checkout/preview", token, Map.of("couponCode", coupon.getCode()))
                .andExpect(status().isBadRequest());
        postJson("/api/checkout/preview", token, Map.of("couponCode", "NOPE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("کد تخفیف معتبر نیست."));
    }

    @Test
    void cartRejectsMoreThanStockAndMergeCapsAtStock() throws Exception {
        Product product = newProduct("قلاده", 100_000, null, 3, PetType.DOG);
        String token = loginNewCustomer();
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 4)).andExpect(status().isBadRequest());

        postJson("/api/cart/merge", token, Map.of("items", List.of(
                Map.of("productId", product.getId(), "quantity", 10),
                Map.of("productId", 999_999, "quantity", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].quantity").value(3));

        deleteJson("/api/cart/items/" + product.getId(), token).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void orderFailsWhenStockRanOutAfterAddingToCart() throws Exception {
        Product product = newProduct("ظرف غذا", 100_000, null, 2, PetType.CAT);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 2));
        product.setStock(1);
        products.save(product);

        postJson("/api/orders", token, Map.of("addressId", addressId)).andExpect(status().isConflict());
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(1);
        getJson("/api/cart", token).andExpect(jsonPath("$.items[0].available").value(false));
    }

    @Test
    void customerCancelRestoresStock() throws Exception {
        Product product = newProduct("تشک", 500_000, null, 4, PetType.DOG);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 3));
        long orderId = placeOrder(token, addressId, null);
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(1);

        String other = loginNewCustomer();
        postJson("/api/orders/" + orderId + "/cancel", other, null).andExpect(status().isNotFound());
        getJson("/api/orders/" + orderId, other).andExpect(status().isNotFound());

        postJson("/api/orders/" + orderId + "/cancel", token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(4);
    }

    @Test
    void unpaidOrdersExpireAndReleaseStock() throws Exception {
        Product product = newProduct("قفس", 700_000, null, 2, PetType.BIRD);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 2));
        long orderId = placeOrder(token, addressId, null);

        jdbc.update("update orders set created_at = ? where id = ?",
                java.sql.Timestamp.from(Instant.now().minus(2, ChronoUnit.HOURS)), orderId);
        expiryJob.run();

        assertThat(orders.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(2);
    }

    @Test
    void concurrentCheckoutsNeverOversell() throws Exception {
        Product product = newProduct("محصول محدود", 100_000, null, 5, PetType.CAT);
        int buyers = 4;
        List<Callable<Boolean>> tasks = new ArrayList<>();
        for (int i = 0; i < buyers; i++) {
            String token = loginNewCustomer();
            long addressId = createAddress(token);
            putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 2)).andExpect(status().isOk());
            Long userId = currentUserId(token);
            tasks.add(() -> {
                try {
                    orderService.create(userId, addressId, null);
                    return true;
                } catch (ApiException e) {
                    return false;
                }
            });
        }
        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        int succeeded = 0;
        for (Future<Boolean> f : pool.invokeAll(tasks)) {
            if (f.get()) {
                succeeded++;
            }
        }
        pool.shutdown();
        assertThat(succeeded).isEqualTo(2);
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(1);
    }

    @Test
    void couponUsageIsReservedAtCheckoutAndReleasedOnCancel() throws Exception {
        Coupon coupon = coupon(CouponType.FIXED, 10_000, 0, null);
        coupon.setUsageLimit(1);
        coupons.save(coupon);
        Product product = newProduct("کوپن محدود", 200_000, null, 10, PetType.CAT);

        String first = loginNewCustomer();
        long firstAddress = createAddress(first);
        putJson("/api/cart/items/" + product.getId(), first, Map.of("quantity", 1));
        long firstOrder = placeOrder(first, firstAddress, coupon.getCode());
        assertThat(coupons.findById(coupon.getId()).orElseThrow().getUsedCount()).isEqualTo(1);

        // The only use is taken by an unpaid order, so nobody else can use the coupon meanwhile.
        String second = loginNewCustomer();
        long secondAddress = createAddress(second);
        putJson("/api/cart/items/" + product.getId(), second, Map.of("quantity", 1));
        postJson("/api/orders", second, Map.of("addressId", secondAddress, "couponCode", coupon.getCode()))
                .andExpect(status().isBadRequest());

        postJson("/api/orders/" + firstOrder + "/cancel", first, null).andExpect(status().isOk());
        assertThat(coupons.findById(coupon.getId()).orElseThrow().getUsedCount()).isZero();
        placeOrder(second, secondAddress, coupon.getCode());
    }

    @Test
    void doubleSubmittedCheckoutCreatesOnlyOneOrder() throws Exception {
        Product product = newProduct("دوبار کلیک", 100_000, null, 10, PetType.DOG);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 3));
        Long userId = currentUserId(token);

        Callable<Boolean> submit = () -> {
            try {
                orderService.create(userId, addressId, null);
                return true;
            } catch (ApiException e) {
                return false;
            }
        };
        ExecutorService pool = Executors.newFixedThreadPool(2);
        int succeeded = 0;
        for (Future<Boolean> f : pool.invokeAll(List.of(submit, submit))) {
            succeeded += f.get() ? 1 : 0;
        }
        pool.shutdown();
        assertThat(succeeded).isEqualTo(1);
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(7);
    }

    @Test
    void concurrentGatewayCallbacksKeepThePaymentSuccessful() throws Exception {
        Product product = newProduct("پرداخت هم‌زمان", 100_000, null, 10, PetType.CAT);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 2));
        long orderId = placeOrder(token, addressId, null);
        String redirect = JsonPath.read(body(postJson("/api/orders/" + orderId + "/pay", token, null)), "$.redirectUrl");
        String authority = redirect.substring(redirect.lastIndexOf('/') + 1);

        Callable<Boolean> callback = () -> paymentService.handleCallback(Map.of("authority", authority, "status", "OK"))
                .success();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (Future<Boolean> f : pool.invokeAll(List.of(callback, callback))) {
            assertThat(f.get()).isTrue();
        }
        pool.shutdown();
        assertThat(payments.findByAuthority(authority).orElseThrow().getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(orders.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(products.findById(product.getId()).orElseThrow().getSoldCount()).isEqualTo(2);
    }

    @Test
    void ordersBeingPaidAreNotExpired() throws Exception {
        Product product = newProduct("در حال پرداخت", 100_000, null, 3, PetType.BIRD);
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 1));
        long orderId = placeOrder(token, addressId, null);
        jdbc.update("update orders set created_at = ? where id = ?",
                java.sql.Timestamp.from(Instant.now().minus(2, ChronoUnit.HOURS)), orderId);
        postJson("/api/orders/" + orderId + "/pay", token, null).andExpect(status().isOk());

        expiryJob.run();
        assertThat(orders.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);

        // Once the payment attempt is older than the grace period, the order expires as usual.
        jdbc.update("update payments set created_at = ? where order_id = ?",
                java.sql.Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)), orderId);
        expiryJob.run();
        assertThat(orders.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    private Long currentUserId(String token) throws Exception {
        return ((Number) JsonPath.read(body(getJson("/api/me", token)), "$.id")).longValue();
    }
}
