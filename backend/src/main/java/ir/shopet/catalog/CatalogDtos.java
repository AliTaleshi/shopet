package ir.shopet.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryDto(Long id, String name, String slug, String description, int sortOrder) {

        public static CategoryDto of(Category c) {
            return new CategoryDto(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getSortOrder());
        }
    }

    public record ImageDto(Long id, String url) {

        public static ImageDto of(ProductImage image) {
            return new ImageDto(image.getId(), image.url());
        }
    }

    public record ProductSummary(
            Long id,
            String name,
            String brand,
            PetType petType,
            Long categoryId,
            String categoryName,
            long price,
            Long discountPrice,
            long finalPrice,
            int stock,
            boolean active,
            String imageUrl,
            BigDecimal ratingAvg,
            int ratingCount) {

        public static ProductSummary of(Product p) {
            String image = p.getImages().isEmpty() ? null : p.getImages().getFirst().url();
            return new ProductSummary(p.getId(), p.getName(), p.getBrand(), p.getPetType(), p.getCategory().getId(),
                    p.getCategory().getName(), p.getPrice(), p.getDiscountPrice(), p.effectivePrice(), p.getStock(),
                    p.isActive(), image, p.getRatingAvg(), p.getRatingCount());
        }
    }

    public record ProductDetail(
            Long id,
            String name,
            String description,
            String brand,
            PetType petType,
            Long categoryId,
            String categoryName,
            long price,
            Long discountPrice,
            long finalPrice,
            int stock,
            boolean active,
            List<ImageDto> images,
            BigDecimal ratingAvg,
            int ratingCount,
            int soldCount,
            Instant createdAt) {

        public static ProductDetail of(Product p) {
            return new ProductDetail(p.getId(), p.getName(), p.getDescription(), p.getBrand(), p.getPetType(),
                    p.getCategory().getId(), p.getCategory().getName(), p.getPrice(), p.getDiscountPrice(),
                    p.effectivePrice(), p.getStock(), p.isActive(), p.getImages().stream().map(ImageDto::of).toList(),
                    p.getRatingAvg(), p.getRatingCount(), p.getSoldCount(), p.getCreatedAt());
        }
    }
}
