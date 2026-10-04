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

    /** Loads the coupon with a row lock so its usage limit can be checked and reserved atomically. */
    public Coupon requireForUpdate(String code) {
        return coupons.findByCodeForUpdate(normalize(code))
                .orElseThrow(() -> ApiException.badRequest("کد تخفیف معتبر نیست."));
    }

    /** Takes one use of the coupon; the caller must hold the row lock and have validated the limit. */
    public void reserve(Coupon coupon) {
        coupon.setUsedCount(coupon.getUsedCount() + 1);
    }

    /** Gives back the use reserved by a cancelled order. */
    @Transactional
    public void release(Long couponId) {
        coupons.releaseUsage(couponId);
    }
}
