package ir.shopet.seed;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;

class DemoImagesIntegrationTest extends IntegrationTest {

    @Autowired
    DataSeeder seeder;
    @Autowired
    TransactionTemplate tx;

    @Test
    void demoProductsGetTheirBundledPhotoOnlyOnce() throws Exception {
        Files.deleteIfExists(Path.of("target/test-uploads", DataSeeder.DEMO_IMAGES_MARKER));
        Product product = newProduct("غذای خشک توله سگ ۲ کیلوگرمی", 1_180_000, null, 30, PetType.DOG);

        tx.executeWithoutResult(s -> seeder.attachDemoImagesOnce());

        String body = body(getJson("/api/products/" + product.getId(), null)
                .andExpect(jsonPath("$.images.length()").value(1)));
        getJson(JsonPath.read(body, "$.images[0].url"), null)
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"));

        // Once done, an image an admin removes is not added back on the next startup.
        long imageId = ((Number) JsonPath.read(body, "$.images[0].id")).longValue();
        deleteJson("/api/admin/products/" + product.getId() + "/images/" + imageId, adminToken())
                .andExpect(jsonPath("$.images.length()").value(0));
        tx.executeWithoutResult(s -> seeder.attachDemoImagesOnce());
        getJson("/api/products/" + product.getId(), null).andExpect(jsonPath("$.images.length()").value(0));
    }
}
