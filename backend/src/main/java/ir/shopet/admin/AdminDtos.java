package ir.shopet.admin;

import java.time.Instant;
import java.util.List;

import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.catalog.PetType;
import ir.shopet.common.ApiException;
import ir.shopet.coupon.Coupon;
import ir.shopet.coupon.CouponType;
import ir.shopet.order.OrderDto;
import ir.shopet.order.OrderStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record ProductRequest(
            @NotBlank(message = "نام محصول الزامی است") @Size(max = 200, message = "نام محصول طولانی است") String name,
            @Size(max = 5000, message = "توضیحات طولانی است") String description,
            @Size(max = 100, message = "نام برند طولانی است") String brand,
            @NotNull(message = "نوع حیوان الزامی است") PetType petType,
            @NotNull(message = "دسته‌بندی الزامی است") Long categoryId,
            @Positive(message = "قیمت باید بیشتر از صفر باشد") long price,
            @Positive(message = "قیمت با تخفیف باید بیشتر از صفر باشد") Long discountPrice,
            @PositiveOrZero(message = "موجودی نامعتبر است") int stock,
            boolean active) {
    }

    public record CategoryRequest(
            @NotBlank(message = "نام دسته‌بندی الزامی است") @Size(max = 100) String name,
            @NotBlank(message = "نامک الزامی است") @Pattern(regexp = "^[a-z0-9-]{2,100}$", message = "نامک فقط شامل حروف کوچک انگلیسی، عدد و خط تیره است") String slug,
            @Size(max = 500) String description,
            int sortOrder) {
    }

    public record CouponRequest(
            @NotBlank(message = "کد تخفیف الزامی است") @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "کد تخفیف فقط شامل حروف انگلیسی و عدد (۳ تا ۳۰ کاراکتر) است") String code,
            @NotNull(message = "نوع تخفیف الزامی است") CouponType type,
            @Positive(message = "مقدار تخفیف باید مثبت باشد") long value,
            @PositiveOrZero long minOrderAmount,
            @Positive(message = "سقف تخفیف باید مثبت باشد") Long maxDiscount,
            @Min(value = 1, message = "سقف استفاده باید حداقل ۱ باشد") Integer usageLimit,
            Instant expiresAt,
            boolean active) {
    }

    public record CouponDto(Long id, String code, CouponType type, long value, long minOrderAmount, Long maxDiscount,
            Integer usageLimit, int usedCount, Instant expiresAt, boolean active, Instant createdAt) {

        public static CouponDto of(Coupon c) {
            return new CouponDto(c.getId(), c.getCode(), c.getType(), c.getValue(), c.getMinOrderAmount(),
                    c.getMaxDiscount(), c.getUsageLimit(), c.getUsedCount(), c.getExpiresAt(), c.isActive(),
                    c.getCreatedAt());
        }
    }

    public record StatusRequest(@NotNull(message = "وضعیت الزامی است") OrderStatus status) {
    }

    public record AdminOrderDto(OrderDto order, String customerPhone, String customerName) {
    }

    public record Dashboard(
            long productCount,
            long userCount,
            long orderCount,
            long pendingPaymentCount,
            long toProcessCount,
            long revenue,
            List<OrderDto> recentOrders,
            List<ProductSummary> lowStock) {
    }

    /** Percent coupons must be between 1 and 100. */
    public static void validateCoupon(CouponRequest r) {
        if (r.type() == CouponType.PERCENT && r.value() > 100) {
            throw ApiException.badRequest("درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.");
        }
    }
}
