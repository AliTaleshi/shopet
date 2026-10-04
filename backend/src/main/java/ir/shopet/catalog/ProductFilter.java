package ir.shopet.catalog;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import ir.shopet.common.Texts;
import jakarta.persistence.criteria.Predicate;

/** Search criteria for product listings. */
public record ProductFilter(
        String q,
        Long categoryId,
        PetType petType,
        Long minPrice,
        Long maxPrice,
        Boolean inStock,
        Boolean discounted,
        String sort) {

    public Specification<Product> toSpecification(boolean onlyActive) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (onlyActive) {
                predicates.add(cb.isTrue(root.get("active")));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + escapeLike(Texts.normalizePersian(q).toLowerCase()) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern, '\\'),
                        cb.like(cb.lower(root.get("brand")), pattern, '\\')));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (petType != null) {
                predicates.add(cb.equal(root.get("petType"), petType));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("sortPrice"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("sortPrice"), maxPrice));
            }
            if (Boolean.TRUE.equals(inStock)) {
                predicates.add(cb.greaterThan(root.get("stock"), 0));
            }
            if (Boolean.TRUE.equals(discounted)) {
                predicates.add(cb.isNotNull(root.get("discountPrice")));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Makes %, _ and backslash in the search text match literally instead of acting as LIKE wildcards. */
    static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    public Sort toSort() {
        Sort primary = switch (sort == null ? "newest" : sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "sortPrice");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "sortPrice");
            case "popular" -> Sort.by(Sort.Direction.DESC, "soldCount");
            case "rating" -> Sort.by(Sort.Direction.DESC, "ratingAvg", "ratingCount");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        return primary.and(Sort.by(Sort.Direction.DESC, "id"));
    }
}
