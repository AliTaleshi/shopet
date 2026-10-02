package ir.shopet.wishlist;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;

@Service
public class WishlistService {

    private final WishlistItemRepository items;
    private final ProductRepository products;

    public WishlistService(WishlistItemRepository items, ProductRepository products) {
        this.items = items;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<ProductSummary> list(Long userId) {
        return items.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(WishlistItem::getProduct)
                .filter(Product::isActive)
                .map(ProductSummary::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Long> productIds(Long userId) {
        return items.findProductIds(userId);
    }

    @Transactional
    public void add(Long userId, Long productId) {
        if (items.findByUserIdAndProductId(userId, productId).isPresent()) {
            return;
        }
        Product product = products.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("محصول پیدا نشد."));
        items.save(new WishlistItem(userId, product));
    }

    @Transactional
    public void remove(Long userId, Long productId) {
        items.findByUserIdAndProductId(userId, productId).ifPresent(items::delete);
    }
}
