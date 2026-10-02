package ir.shopet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.auth.TokenService;
import ir.shopet.catalog.Category;
import ir.shopet.catalog.CategoryRepository;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.user.UserRepository;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "app.seed-demo-data=false",
        "app.admin-phone=09990000000",
        "app.otp.expose-code=true",
        "app.upload-dir=target/test-uploads",
        "app.order.expiry-check-interval=1h"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    protected static final String ADMIN_PHONE = "09990000000";
    private static final AtomicInteger PHONE_SEQ = new AtomicInteger();
    private static final AtomicInteger SLUG_SEQ = new AtomicInteger();

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JsonMapper json;
    @Autowired
    protected CategoryRepository categories;
    @Autowired
    protected ProductRepository products;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected TokenService tokenService;

    protected static String newPhone() {
        return "0915" + String.format("%07d", PHONE_SEQ.incrementAndGet());
    }

    /** Logs in through the real OTP flow and returns the JWT. */
    protected String login(String phone) throws Exception {
        String otp = body(perform(post("/api/auth/otp/request"), null, Map.of("phone", phone)));
        String code = JsonPath.read(otp, "$.devCode");
        String result = body(perform(post("/api/auth/otp/verify"), null, Map.of("phone", phone, "code", code)));
        return JsonPath.read(result, "$.token");
    }

    protected String loginNewCustomer() throws Exception {
        return login(newPhone());
    }

    protected String adminToken() {
        return tokenService.issue(users.findByPhone(ADMIN_PHONE).orElseThrow());
    }

    protected Category newCategory() {
        int n = SLUG_SEQ.incrementAndGet();
        return categories.save(new Category("دسته " + n, "cat-" + n + "-" + System.nanoTime(), null, n));
    }

    protected Product newProduct(String name, long price, Long discountPrice, int stock, PetType petType) {
        Product p = new Product();
        p.setName(name);
        p.setBrand("برند تست");
        p.setPetType(petType);
        p.setCategory(newCategory());
        p.setPrice(price);
        p.setDiscountPrice(discountPrice);
        p.setStock(stock);
        return products.save(p);
    }

    protected ResultActions perform(MockHttpServletRequestBuilder request, String token, Object body)
            throws Exception {
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    protected ResultActions getJson(String url, String token) throws Exception {
        return perform(get(url), token, null);
    }

    protected ResultActions postJson(String url, String token, Object body) throws Exception {
        return perform(post(url), token, body);
    }

    protected ResultActions putJson(String url, String token, Object body) throws Exception {
        return perform(put(url), token, body);
    }

    protected ResultActions deleteJson(String url, String token) throws Exception {
        return perform(delete(url), token, null);
    }

    protected static String body(ResultActions actions) throws Exception {
        return actions.andReturn().getResponse().getContentAsString();
    }

    protected long createAddress(String token) throws Exception {
        String res = body(postJson("/api/me/addresses", token, Map.of(
                "title", "خانه", "receiverName", "مشتری تست", "receiverPhone", "09121111111",
                "province", "تهران", "city", "تهران", "postalCode", "1234567890", "addressLine", "خیابان تست، پلاک ۱")));
        return ((Number) JsonPath.read(res, "$.id")).longValue();
    }
}
