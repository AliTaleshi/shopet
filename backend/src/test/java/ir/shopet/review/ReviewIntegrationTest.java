package ir.shopet.review;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;
import ir.shopet.order.OrderService;
import ir.shopet.payment.PaymentService;

class ReviewIntegrationTest extends IntegrationTest {

    @Autowired
    OrderService orderService;
    @Autowired
    PaymentService paymentService;

    private String buyer(Product product) throws Exception {
        String token = loginNewCustomer();
        long addressId = createAddress(token);
        putJson("/api/cart/items/" + product.getId(), token, Map.of("quantity", 1));
        long orderId = ((Number) JsonPath.read(body(postJson("/api/orders", token, Map.of("addressId", addressId))), "$.id")).longValue();
        String redirect = JsonPath.read(body(postJson("/api/orders/" + orderId + "/pay", token, null)), "$.redirectUrl");
        getJson("/api/payments/callback?authority=" + redirect.substring(redirect.lastIndexOf('/') + 1) + "&status=OK", null);
        return token;
    }

    @Test
    void onlyBuyersCanReviewOnceAndRatingIsAggregated() throws Exception {
        Product product = newProduct("اسنک سگ", 100_000, null, 10, PetType.DOG);
        String stranger = loginNewCustomer();

        getJson("/api/products/" + product.getId() + "/reviews/eligibility", stranger)
                .andExpect(jsonPath("$.canReview").value(false));
        postJson("/api/products/" + product.getId() + "/reviews", stranger, Map.of("rating", 5))
                .andExpect(status().isForbidden());

        String first = buyer(product);
        String second = buyer(product);
        getJson("/api/products/" + product.getId() + "/reviews/eligibility", first)
                .andExpect(jsonPath("$.canReview").value(true));

        postJson("/api/products/" + product.getId() + "/reviews", first, Map.of("rating", 5, "comment", "عالی بود"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorName").value("کاربر شاپت"));
        postJson("/api/products/" + product.getId() + "/reviews", first, Map.of("rating", 1))
                .andExpect(status().isConflict());
        postJson("/api/products/" + product.getId() + "/reviews", second, Map.of("rating", 4))
                .andExpect(status().isCreated());
        postJson("/api/products/" + product.getId() + "/reviews", second, Map.of("rating", 9))
                .andExpect(status().isBadRequest());

        getJson("/api/products/" + product.getId(), null)
                .andExpect(jsonPath("$.ratingCount").value(2))
                .andExpect(jsonPath("$.ratingAvg").value(4.5));
        getJson("/api/products/" + product.getId() + "/reviews", null)
                .andExpect(jsonPath("$.totalElements").value(2));
        getJson("/api/products/" + product.getId() + "/reviews/eligibility", null)
                .andExpect(jsonPath("$.canReview").value(false));
    }
}
