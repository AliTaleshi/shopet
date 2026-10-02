package ir.shopet.coupon;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.common.ApiException;

@Service
public class CouponService {

    private final CouponRepository coupons;

    public CouponService(CouponRepository coupons) {
        this.coupons = coupons;
    }

    public static String normalize(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }

    public Coupon require(String code) {
        return coupons.findByCodeIgnoreCase(normalize(code))
                .orElseThrow(() -> ApiException.badRequest("کد تخفیف معتبر نیست."));
    }

    @Transactional
    public void incrementUsage(String code) {
        coupons.findByCodeIgnoreCase(normalize(code)).ifPresent(c -> c.setUsedCount(c.getUsedCount() + 1));
    }
}
