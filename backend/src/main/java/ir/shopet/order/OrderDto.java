package ir.shopet.order;

import java.time.Instant;
import java.util.List;

public record OrderDto(
        Long id,
        Long userId,
        OrderStatus status,
        long itemsTotal,
        long discountAmount,
        long shippingCost,
        long total,
        String couponCode,
        String receiverName,
        String receiverPhone,
        String province,
        String city,
        String postalCode,
        String addressLine,
        List<Item> items,
        Instant createdAt,
        Instant paidAt,
        List<OrderStatus> allowedNextStatuses) {

    public record Item(Long productId, String productName, long unitPrice, int quantity, long lineTotal) {
    }

    public static OrderDto of(PurchaseOrder o) {
        List<Item> items = o.getItems().stream()
                .map(i -> new Item(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(),
                        i.getUnitPrice() * i.getQuantity()))
                .toList();
        return new OrderDto(o.getId(), o.getUserId(), o.getStatus(), o.getItemsTotal(), o.getDiscountAmount(),
                o.getShippingCost(), o.getTotal(), o.getCouponCode(), o.getReceiverName(), o.getReceiverPhone(),
                o.getProvince(), o.getCity(), o.getPostalCode(), o.getAddressLine(), items, o.getCreatedAt(),
                o.getPaidAt(), List.copyOf(o.getStatus().allowedNext()));
    }
}
