package ir.shopet.catalog;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ir.shopet.catalog.CatalogDtos.CategoryDto;
import ir.shopet.catalog.CatalogDtos.ProductDetail;
import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.common.PageResponse;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.categories();
    }

    @GetMapping("/products")
    public PageResponse<ProductSummary> products(ProductFilter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return catalogService.search(filter, page, size, true);
    }

    @GetMapping("/products/{id}")
    public ProductDetail product(@PathVariable Long id) {
        return catalogService.product(id, true);
    }
}
