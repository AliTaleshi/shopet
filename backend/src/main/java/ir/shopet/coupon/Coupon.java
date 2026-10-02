package ir.shopet.coupon;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CouponType type;

    /** Percent (1..100) for PERCENT coupons, Toman amount for FIXED coupons. */
    private long value;

    private long minOrderAmount;

    private Long maxDiscount;

    private Integer usageLimit;

    private int usedCount;

    private Instant expiresAt;

    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
