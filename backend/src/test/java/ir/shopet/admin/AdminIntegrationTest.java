package ir.shopet.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;
import ir.shopet.catalog.Category;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;

class AdminIntegrationTest extends IntegrationTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    private Map<String, Object> productBody(Category category) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "غذای خرگوش");
        body.put("description", "توضیحات");
        body.put("brand", "ورسل لاگا");
        body.put("petType", "SMALL_PET");
        body.put("categoryId", category.getId());
        body.put("price", 250_000);
        body.put("discountPrice", 200_000);
        body.put("stock", 7);
        body.put("active", true);
        return body;
    }

    @Test
    void adminEndpointsRequireAdminRole() throws Exception {
        getJson("/api/admin/dashboard", null).andExpect(status().isUnauthorized());
        getJson("/api/admin/dashboard", loginNewCustomer()).andExpect(status().isForbidden());
        getJson("/api/admin/dashboard", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").isNumber());
    }

    @Test
    void productCrudWithImages() throws Exception {
        String admin = adminToken();
        Category category = newCategory();
        Map<String, Object> body = productBody(category);

        String created = body(postJson("/api/admin/products", admin, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.finalPrice").value(200_000)));
        long id = ((Number) JsonPath.read(created, "$.id")).longValue();

        body.put("discountPrice", 300_000);
        putJson("/api/admin/products/" + id, admin, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("قیمت با تخفیف باید کمتر از قیمت اصلی باشد."));
        body.put("name", "");
        putJson("/api/admin/products/" + id, admin, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").value("نام محصول الزامی است"));

        String uploaded = body(mvc.perform(multipart("/api/admin/products/" + id + "/images")
                        .file(new MockMultipartFile("files", "a.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1)));
        String url = JsonPath.read(uploaded, "$.images[0].url");
        long imageId = ((Number) JsonPath.read(uploaded, "$.images[0].id")).longValue();
        getJson(url, null).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        getJson("/api/products?size=60", null).andExpect(status().isOk());

        mvc.perform(multipart("/api/admin/products/" + id + "/images")
                        .file(new MockMultipartFile("files", "fake.png", "image/png", "not an image".getBytes()))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());

        deleteJson("/api/admin/products/" + id + "/images/" + imageId, admin)
                .andExpect(jsonPath("$.images.length()").value(0));
        getJson(url, null).andExpect(status().isNotFound());

        deleteJson("/api/admin/products/" + id, admin).andExpect(status().isNoContent());
        assertThat(products.findById(id)).isEmpty();
    }

    @Test
    void failedMultiUploadLeavesNoOrphanFiles() throws Exception {
        Product product = newProduct("آپلود ناموفق", 100_000, null, 1, PetType.CAT);
        Path uploads = Path.of("target/test-uploads");
        long before;
        try (var files = Files.list(uploads)) {
            before = files.count();
        }
        mvc.perform(multipart("/api/admin/products/" + product.getId() + "/images")
                        .file(new MockMultipartFile("files", "ok.png", "image/png", PNG))
                        .file(new MockMultipartFile("files", "bad.png", "image/png", "not an image".getBytes()))
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isBadRequest());
        try (var files = Files.list(uploads)) {
            assertThat(files.count()).isEqualTo(before);
        }
        getJson("/api/admin/products/" + product.getId(), adminToken()).andExpect(jsonPath("$.images.length()").value(0));
    }

    @Test
    void zeroPriceIsRejected() throws Exception {
        Map<String, Object> body = productBody(newCategory());
        body.put("price", 0);
        body.put("discountPrice", null);
        postJson("/api/admin/products", adminToken(), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.price").value("قیمت باید بیشتر از صفر باشد"));
    }

    @Test
    void orderedProductCannotBeDeletedAndOrderStatusFollowsWorkflow() throws Exception {
        String admin = adminToken();
        Product product = newProduct("کنسرو", 100_000, null, 5, PetType.CAT);
        String customer = loginNewCustomer();
        long addressId = createAddress(customer);
        putJson("/api/cart/items/" + product.getId(), customer, Map.of("quantity", 2));
        long orderId = ((Number) JsonPath.read(body(postJson("/api/orders", customer, Map.of("addressId", addressId))), "$.id")).longValue();

        deleteJson("/api/admin/products/" + product.getId(), admin).andExpect(status().isConflict());

        putJson("/api/admin/orders/" + orderId + "/status", admin, Map.of("status", "SHIPPED"))
                .andExpect(status().isBadRequest());
        String redirect = JsonPath.read(body(postJson("/api/orders/" + orderId + "/pay", customer, null)), "$.redirectUrl");
        getJson("/api/payments/callback?authority=" + redirect.substring(redirect.lastIndexOf('/') + 1) + "&status=OK", null);

        putJson("/api/admin/orders/" + orderId + "/status", admin, Map.of("status", "PROCESSING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("PROCESSING"))
                .andExpect(jsonPath("$.customerPhone").isString());
        putJson("/api/admin/orders/" + orderId + "/status", admin, Map.of("status", "CANCELLED"))
                .andExpect(status().isOk());
        Product reloaded = products.findById(product.getId()).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(5);
        assertThat(reloaded.getSoldCount()).isZero();

        getJson("/api/admin/orders?status=CANCELLED", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].order.status").value("CANCELLED"));
    }

    @Test
    void categoryAndCouponManagement() throws Exception {
        String admin = adminToken();
        String slug = "toys-" + System.nanoTime();
        long categoryId = ((Number) JsonPath.read(body(postJson("/api/admin/categories", admin,
                Map.of("name", "اسباب‌بازی جدید", "slug", slug, "sortOrder", 3))
                .andExpect(status().isCreated())), "$.id")).longValue();
        postJson("/api/admin/categories", admin, Map.of("name", "تکراری", "slug", slug, "sortOrder", 1))
                .andExpect(status().isConflict());
        postJson("/api/admin/categories", admin, Map.of("name", "نامک بد", "slug", "بد", "sortOrder", 1))
                .andExpect(status().isBadRequest());

        newProductInCategory(categoryId);
        deleteJson("/api/admin/categories/" + categoryId, admin).andExpect(status().isConflict());

        String code = "SALE" + (System.nanoTime() % 100000);
        postJson("/api/admin/coupons", admin, Map.of("code", code, "type", "PERCENT", "value", 150,
                "minOrderAmount", 0, "active", true)).andExpect(status().isBadRequest());
        String coupon = body(postJson("/api/admin/coupons", admin, Map.of("code", code.toLowerCase(), "type", "PERCENT",
                "value", 15, "minOrderAmount", 0, "active", true))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code)));
        postJson("/api/admin/coupons", admin, Map.of("code", code, "type", "FIXED", "value", 1000,
                "minOrderAmount", 0, "active", true)).andExpect(status().isConflict());
        long couponId = ((Number) JsonPath.read(coupon, "$.id")).longValue();
        deleteJson("/api/admin/coupons/" + couponId, admin).andExpect(status().isNoContent());

        getJson("/api/admin/users?q=0915", admin).andExpect(status().isOk()).andExpect(jsonPath("$.content").isArray());
        getJson("/api/admin/reviews", admin).andExpect(status().isOk());
    }

    private void newProductInCategory(long categoryId) {
        Product p = new Product();
        p.setName("محصول دسته");
        p.setPetType(PetType.DOG);
        p.setCategory(categories.findById(categoryId).orElseThrow());
        p.setPrice(1000);
        products.save(p);
    }
}
