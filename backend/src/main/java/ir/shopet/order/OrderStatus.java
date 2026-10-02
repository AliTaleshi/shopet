package ir.shopet.order;

import java.util.EnumSet;
import java.util.Set;

public enum OrderStatus {
    PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED;

    /** Statuses in which the customer has paid for the order. */
    public static final Set<OrderStatus> PAID_STATUSES = EnumSet.of(PAID, PROCESSING, SHIPPED, DELIVERED);

    public Set<OrderStatus> allowedNext() {
        return switch (this) {
            case PENDING_PAYMENT -> EnumSet.of(CANCELLED);
            case PAID -> EnumSet.of(PROCESSING, CANCELLED);
            case PROCESSING -> EnumSet.of(SHIPPED, CANCELLED);
            case SHIPPED -> EnumSet.of(DELIVERED);
            case DELIVERED, CANCELLED -> EnumSet.noneOf(OrderStatus.class);
        };
    }
}
