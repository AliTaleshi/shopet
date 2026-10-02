package ir.shopet.cart;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;

@Service
public class CartService {

    public static final int MAX_QUANTITY_PER_ITEM = 20;

    private final CartItemRepository cartItems;
    private final ProductRepository products;

    public CartService(CartItemRepository cartItems, ProductRepository products) {
        this.cartItems = cartItems;
        this.products = products;
    }

    public record MergeItem(Long productId, int quantity) {
    }

    @Transactional(readOnly = true)
    public CartDto get(Long userId) {
        return CartDto.of(cartItems.findByUserIdOrderByIdAsc(userId));
    }

    @Transactional
    public CartDto setQuantity(Long userId, Long productId, int quantity) {
        if (quantity <= 0) {
            cartItems.findByUserIdAndProductId(userId, productId).ifPresent(cartItems::delete);
            return CartDto.of(cartItems.findByUserIdOrderByIdAsc(userId));
        }
        Product product = products.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("محصول پیدا نشد."));
        if (quantity > MAX_QUANTITY_PER_ITEM) {
            throw ApiException.badRequest("حداکثر تعداد مجاز برای هر کالا " + MAX_QUANTITY_PER_ITEM + " عدد است.");
        }
        if (quantity > product.getStock()) {
            throw ApiException.badRequest("موجودی «" + product.getName() + "» کافی نیست.");
        }
        cartItems.findByUserIdAndProductId(userId, productId)
                .ifPresentOrElse(item -> item.setQuantity(quantity),
                        () -> cartItems.save(new CartItem(userId, product, quantity)));
        return CartDto.of(cartItems.findByUserIdOrderByIdAsc(userId));
    }

    /** Merges a guest (browser) cart into the user's cart; quantities are capped by stock and silently skipped when unavailable. */
    @Transactional
    public CartDto merge(Long userId, List<MergeItem> items) {
        for (MergeItem item : items) {
            if (item.productId() == null || item.quantity() <= 0) {
                continue;
            }
            products.findById(item.productId()).filter(Product::isActive).ifPresent(product -> {
                var existing = cartItems.findByUserIdAndProductId(userId, product.getId());
                int desired = existing.map(CartItem::getQuantity).orElse(0) + item.quantity();
                int capped = Math.min(Math.min(desired, product.getStock()), MAX_QUANTITY_PER_ITEM);
                if (capped <= 0) {
                    return;
                }
                existing.ifPresentOrElse(e -> e.setQuantity(capped),
                        () -> cartItems.save(new CartItem(userId, product, capped)));
            });
        }
        return CartDto.of(cartItems.findByUserIdOrderByIdAsc(userId));
    }

    @Transactional
    public void clear(Long userId) {
        cartItems.deleteByUserId(userId);
    }
}
