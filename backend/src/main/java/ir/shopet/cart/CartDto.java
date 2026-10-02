package ir.shopet.cart;

import java.util.List;

import ir.shopet.catalog.PetType;

public record CartDto(List<Line> items, long itemsTotal, int count) {

    public record Line(
            Long productId,
            String name,
            String imageUrl,
            PetType petType,
            long price,
            long unitPrice,
            int quantity,
            int stock,
            boolean available,
            long lineTotal) {
    }

    public static CartDto of(List<CartItem> items) {
        List<Line> lines = items.stream().map(item -> {
            var p = item.getProduct();
            String image = p.getImages().isEmpty() ? null : p.getImages().getFirst().url();
            boolean available = p.isActive() && p.getStock() >= item.getQuantity();
            return new Line(p.getId(), p.getName(), image, p.getPetType(), p.getPrice(), p.effectivePrice(), item.getQuantity(),
                    p.getStock(), available, p.effectivePrice() * item.getQuantity());
        }).toList();
        long total = lines.stream().mapToLong(Line::lineTotal).sum();
        int count = lines.stream().mapToInt(Line::quantity).sum();
        return new CartDto(lines, total, count);
    }
}
