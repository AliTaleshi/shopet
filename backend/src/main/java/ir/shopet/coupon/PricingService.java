package ir.shopet.coupon;

import java.time.Instant;

import org.springframework.stereotype.Service;

import ir.shopet.common.ApiException;
import ir.shopet.config.AppProperties;

/** Pure pricing rules: coupon discounts and shipping cost. */
@Service
public class PricingService {

    private final AppProperties.Shipping shipping;

    public PricingService(AppProperties props) {
        this.shipping = props.shipping();
    }

    public record Totals(long itemsTotal, long discount, long shipping, long total) {
    }

    /** Returns the discount for the coupon or throws a user-facing error explaining why it can't be applied. */
    public long discount(Coupon coupon, long itemsTotal, Instant now) {
        if (!coupon.isActive()) {
            throw ApiException.badRequest("کد تخفیف فعال نیست.");
        }
        if (coupon.getExpiresAt() != null && now.isAfter(coupon.getExpiresAt())) {
            throw ApiException.badRequest("مهلت استفاده از این کد تخفیف به پایان رسیده است.");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw ApiException.badRequest("ظرفیت استفاده از این کد تخفیف تکمیل شده است.");
        }
        if (itemsTotal < coupon.getMinOrderAmount()) {
            throw ApiException.badRequest("حداقل مبلغ سفارش برای این کد تخفیف "
                    + String.format("%,d", coupon.getMinOrderAmount()) + " تومان است.");
        }
        long discount = switch (coupon.getType()) {
            case PERCENT -> itemsTotal * coupon.getValue() / 100;
            case FIXED -> coupon.getValue();
        };
        if (coupon.getMaxDiscount() != null) {
            discount = Math.min(discount, coupon.getMaxDiscount());
        }
        return Math.min(discount, itemsTotal);
    }

    /** Shipping is free once the discounted amount reaches the threshold; an empty cart has no shipping. */
    public long shipping(long itemsTotal, long amountAfterDiscount) {
        if (itemsTotal <= 0) {
            return 0;
        }
        return amountAfterDiscount >= shipping.freeThreshold() ? 0 : shipping.cost();
    }

    public Totals totals(long itemsTotal, long discount) {
        long afterDiscount = itemsTotal - discount;
        long shippingCost = shipping(itemsTotal, afterDiscount);
        return new Totals(itemsTotal, discount, shippingCost, afterDiscount + shippingCost);
    }
}
