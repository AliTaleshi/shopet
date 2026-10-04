package ir.shopet.review;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;
import ir.shopet.common.PageResponse;
import ir.shopet.order.OrderRepository;
import ir.shopet.order.OrderStatus;
import ir.shopet.user.UserRepository;

@Service
public class ReviewService {

    private final ReviewRepository reviews;
    private final ProductRepository products;
    private final OrderRepository orders;
    private final UserRepository users;

    public ReviewService(ReviewRepository reviews, ProductRepository products, OrderRepository orders,
            UserRepository users) {
        this.reviews = reviews;
        this.products = products;
        this.orders = orders;
        this.users = users;
    }

    public record Eligibility(boolean canReview, boolean alreadyReviewed, boolean purchased) {
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> list(Long productId, int page, int size) {
        return PageResponse.of(reviews.findByProductIdOrderByCreatedAtDesc(productId,
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 50))).map(ReviewDto::of));
    }

    @Transactional(readOnly = true)
    public Eligibility eligibility(Long userId, Long productId) {
        boolean already = reviews.existsByProductIdAndUserId(productId, userId);
        boolean purchased = orders.hasPurchased(userId, productId, OrderStatus.PAID_STATUSES);
        return new Eligibility(purchased && !already, already, purchased);
    }

    /** The product row is locked so concurrent reviews can't overwrite each other's rating aggregate. */
    @Transactional
    public ReviewDto create(Long userId, Long productId, int rating, String comment) {
        Product product = products.findByIdForUpdate(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("محصول پیدا نشد."));
        if (!orders.hasPurchased(userId, productId, OrderStatus.PAID_STATUSES)) {
            throw ApiException.forbidden("فقط خریداران این محصول می‌توانند نظر ثبت کنند.");
        }
        if (reviews.existsByProductIdAndUserId(productId, userId)) {
            throw ApiException.conflict("شما قبلاً برای این محصول نظر ثبت کرده‌اید.");
        }
        Review review = new Review();
        review.setProductId(productId);
        review.setUser(users.getReferenceById(userId));
        review.setRating(rating);
        review.setComment(comment == null || comment.isBlank() ? null : comment.trim());
        reviews.saveAndFlush(review);
        refreshRating(product);
        return ReviewDto.of(reviews.findById(review.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> listAll(int page, int size) {
        return PageResponse.of(reviews.findAllByOrderByCreatedAtDesc(
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100))).map(ReviewDto::of));
    }

    @Transactional
    public void delete(Long reviewId) {
        Review review = reviews.findById(reviewId).orElseThrow(() -> ApiException.notFound("نظر پیدا نشد."));
        Product product = products.findByIdForUpdate(review.getProductId()).orElse(null);
        reviews.delete(review);
        reviews.flush();
        if (product != null) {
            refreshRating(product);
        }
    }

    private void refreshRating(Product product) {
        ReviewRepository.RatingStats stats = reviews.stats(product.getId());
        long count = stats.getCount() == null ? 0 : stats.getCount();
        double avg = stats.getAvg() == null ? 0 : stats.getAvg();
        product.setRatingCount((int) count);
        product.setRatingAvg(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
    }
}
