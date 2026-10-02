package ir.shopet.catalog;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.util.UriComponentsBuilder;

import ir.shopet.IntegrationTest;

class CatalogIntegrationTest extends IntegrationTest {

    private static URI url(String q, String extra) {
        return UriComponentsBuilder.fromPath("/api/products").queryParam("q", q).query(extra).encode().build().toUri();
    }

    private ResultActions getJson(URI uri, String token) throws Exception {
        return perform(get(uri), token, null);
    }

    @Test
    void searchFiltersAndSortsByEffectivePrice() throws Exception {
        String tag = "زرافه" + System.nanoTime();
        Product cheap = newProduct(tag + " ارزان", 300_000, null, 5, PetType.CAT);
        Product discounted = newProduct(tag + " تخفیفی", 900_000, 100_000L, 5, PetType.CAT);
        Product dog = newProduct(tag + " سگ", 200_000, null, 0, PetType.DOG);

        getJson(url(tag, "sort=price_asc"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[*].id").value(contains(
                        discounted.getId().intValue(), dog.getId().intValue(), cheap.getId().intValue())))
                .andExpect(jsonPath("$.content[0].finalPrice").value(100_000));

        getJson(url(tag, "petType=CAT&sort=price_desc"), null)
                .andExpect(jsonPath("$.content[*].id").value(contains(cheap.getId().intValue(), discounted.getId().intValue())));

        getJson(url(tag, "inStock=true"), null)
                .andExpect(jsonPath("$.content[*].stock").value(everyItem(greaterThan(0))))
                .andExpect(jsonPath("$.totalElements").value(2));

        getJson(url(tag, "discounted=true"), null)
                .andExpect(jsonPath("$.content[*].id").value(contains(discounted.getId().intValue())));

        getJson(url(tag, "minPrice=150000&maxPrice=250000"), null)
                .andExpect(jsonPath("$.content[*].id").value(contains(dog.getId().intValue())));
    }

    @Test
    void arabicKeyboardCharactersMatchPersianText() throws Exception {
        String tag = "تست" + System.nanoTime();
        newProduct(tag + " کیسه یونجه", 100_000, null, 1, PetType.SMALL_PET);
        getJson(url(tag + " كيسه", ""), null).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void inactiveProductsAreHiddenFromTheShop() throws Exception {
        Product p = newProduct("محصول غیرفعال " + System.nanoTime(), 100_000, null, 3, PetType.BIRD);
        p.setActive(false);
        products.save(p);

        getJson("/api/products/" + p.getId(), null).andExpect(status().isNotFound());
        getJson("/api/products?size=60", null)
                .andExpect(jsonPath("$.content[*].id").value(not(hasItem(p.getId().intValue()))));
    }

    @Test
    void productDetailAndCategories() throws Exception {
        Product p = newProduct("غذای ماهی", 50_000, null, 10, PetType.FISH);
        getJson("/api/products/" + p.getId(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("غذای ماهی"))
                .andExpect(jsonPath("$.petType").value("FISH"))
                .andExpect(jsonPath("$.images").isArray());
        getJson("/api/categories", null).andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
    }

    @Test
    void invalidFilterValueReturnsBadRequest() throws Exception {
        getJson("/api/products?petType=UNICORN", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.petType").exists());
    }
}
