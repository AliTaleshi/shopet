package ir.shopet.order;

import ir.shopet.cart.CartDto;

public record CheckoutSummary(
        CartDto cart,
        long itemsTotal,
        long discount,
        long shippingCost,
        long total,
        String couponCode) {
}
