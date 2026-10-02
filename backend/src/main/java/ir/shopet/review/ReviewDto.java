package ir.shopet.review;

import java.time.Instant;

public record ReviewDto(Long id, Long productId, int rating, String comment, String authorName, Instant createdAt) {

    public static ReviewDto of(Review r) {
        String name = r.getUser().getFullName();
        return new ReviewDto(r.getId(), r.getProductId(), r.getRating(), r.getComment(),
                name == null || name.isBlank() ? "کاربر شاپت" : name, r.getCreatedAt());
    }
}
