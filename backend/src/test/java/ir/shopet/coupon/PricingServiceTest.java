package ir.shopet.coupon;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import ir.shopet.common.ApiException;
import ir.shopet.config.AppProperties;

class PricingServiceTest {

    private final PricingService pricing = new PricingService(new AppProperties(null, null, false, null, null, null,
            new AppProperties.Shipping(50_000, 1_000_000), new AppProperties.OrderSettings(Duration.ZERO, Duration.ZERO, Duration.ZERO),
            null));
    private final Instant now = Instant.parse("2026-01-01T00:00:00Z");

    private static Coupon coupon(CouponType type, long value) {
        Coupon c = new Coupon();
        c.setCode("X");
        c.setType(type);
        c.setValue(value);
        return c;
    }

    @Test
    void percentDiscountIsCappedByMaxDiscount() {
        Coupon c = coupon(CouponType.PERCENT, 20);
        assertThat(pricing.discount(c, 1_000_000, now)).isEqualTo(200_000);
        c.setMaxDiscount(150_000L);
        assertThat(pricing.discount(c, 1_000_000, now)).isEqualTo(150_000);
    }

    @Test
    void fixedDiscountNeverExceedsItemsTotal() {
        assertThat(pricing.discount(coupon(CouponType.FIXED, 80_000), 50_000, now)).isEqualTo(50_000);
    }

    @Test
    void rejectsInactiveExpiredExhaustedAndBelowMinimum() {
        Coupon inactive = coupon(CouponType.FIXED, 1000);
        inactive.setActive(false);
        assertThatThrownBy(() -> pricing.discount(inactive, 10_000, now)).isInstanceOf(ApiException.class);

        Coupon expired = coupon(CouponType.FIXED, 1000);
        expired.setExpiresAt(now.minusSeconds(1));
        assertThatThrownBy(() -> pricing.discount(expired, 10_000, now)).hasMessageContaining("مهلت");

        Coupon exhausted = coupon(CouponType.FIXED, 1000);
        exhausted.setUsageLimit(3);
        exhausted.setUsedCount(3);
        assertThatThrownBy(() -> pricing.discount(exhausted, 10_000, now)).hasMessageContaining("ظرفیت");

        Coupon minimum = coupon(CouponType.FIXED, 1000);
        minimum.setMinOrderAmount(500_000);
        assertThatThrownBy(() -> pricing.discount(minimum, 499_999, now)).hasMessageContaining("حداقل");
        assertThat(pricing.discount(minimum, 500_000, now)).isEqualTo(1000);
    }

    @Test
    void shippingIsFreeAboveThreshold() {
        assertThat(pricing.totals(999_999, 0)).isEqualTo(new PricingService.Totals(999_999, 0, 50_000, 1_049_999));
        assertThat(pricing.totals(1_200_000, 300_000).shipping()).isEqualTo(50_000);
        assertThat(pricing.totals(1_000_000, 0).shipping()).isZero();
        assertThat(pricing.totals(0, 0).shipping()).isZero();
    }

    @Test
    void fullDiscountStillPaysShipping() {
        // A coupon covering every item must not also waive shipping (the discounted amount is below the threshold).
        assertThat(pricing.totals(100_000, 100_000)).isEqualTo(new PricingService.Totals(100_000, 100_000, 50_000, 50_000));
    }
}
