package ir.shopet.catalog;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.catalog.CatalogDtos.CategoryDto;
import ir.shopet.catalog.CatalogDtos.ProductDetail;
import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.common.ApiException;
import ir.shopet.common.PageResponse;

@Service
@Transactional(readOnly = true)
public class CatalogService {

    public static final int MAX_PAGE_SIZE = 60;

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CatalogService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    public List<CategoryDto> categories() {
        return categories.findAllByOrderBySortOrderAscIdAsc().stream().map(CategoryDto::of).toList();
    }

    public PageResponse<ProductSummary> search(ProductFilter filter, int page, int size, boolean onlyActive) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), filter.toSort());
        return PageResponse.of(products.findAll(filter.toSpecification(onlyActive), pageable).map(ProductSummary::of));
    }

    public ProductDetail product(Long id, boolean onlyActive) {
        Product product = products.findById(id)
                .filter(p -> !onlyActive || p.isActive())
                .orElseThrow(() -> ApiException.notFound("محصول پیدا نشد."));
        return ProductDetail.of(product);
    }
}
