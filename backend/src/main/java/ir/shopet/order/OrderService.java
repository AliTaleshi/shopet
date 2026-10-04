package ir.shopet.order;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.cart.CartDto;
import ir.shopet.cart.CartItem;
import ir.shopet.cart.CartItemRepository;
import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;
import ir.shopet.common.PageResponse;
import ir.shopet.config.AppProperties;
import ir.shopet.coupon.Coupon;
import ir.shopet.coupon.CouponService;
import ir.shopet.coupon.PricingService;
import ir.shopet.user.AccountService;
import ir.shopet.user.Address;
import ir.shopet.user.UserRepository;

@Service
public class OrderService {

    private final OrderRepository orders;
    private final CartItemRepository cartItems;
    private final ProductRepository products;
    private final CouponService couponService;
    private final PricingService pricing;
    private final AccountService accountService;
    private final UserRepository users;
    private final AppProperties props;

    public OrderService(OrderRepository orders, CartItemRepository cartItems, ProductRepository products,
            CouponService couponService, PricingService pricing, AccountService accountService, UserRepository users,
            AppProperties props) {
        this.orders = orders;
        this.cartItems = cartItems;
        this.products = products;
        this.couponService = couponService;
        this.pricing = pricing;
        this.accountService = accountService;
        this.users = users;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public CheckoutSummary preview(Long userId, String couponCode) {
        List<CartItem> items = cartItems.findByUserIdOrderByIdAsc(userId);
        CartDto cart = CartDto.of(items);
        String code = blankToNull(couponCode);
        long discount = 0;
        if (code != null && !items.isEmpty()) {
            Coupon coupon = couponService.require(code);
            discount = pricing.discount(coupon, cart.itemsTotal(), Instant.now());
            code = coupon.getCode();
        }
        PricingService.Totals totals = pricing.totals(cart.itemsTotal(), discount);
        return new CheckoutSummary(cart, totals.itemsTotal(), totals.discount(), totals.shipping(), totals.total(),
                discount > 0 ? code : null);
    }

    /** Creates an order from the user's cart, reserving stock and the coupon under row locks. */
    @Transactional
    public OrderDto create(Long userId, Long addressId, String couponCode) {
        users.findByIdForUpdate(userId).orElseThrow(() -> ApiException.notFound("کاربر پیدا نشد."));
        Address address = accountService.getAddress(userId, addressId);
        List<CartItem> items = cartItems.findByUserIdOrderByIdAsc(userId);
        if (items.isEmpty()) {
            throw ApiException.badRequest("سبد خرید شما خالی است.");
        }
        Map<Long, Product> locked = products
                .findAllForUpdate(items.stream().map(i -> i.getProduct().getId()).toList())
                .stream().collect(Collectors.toMap(Product::getId, Function.identity()));

        PurchaseOrder order = new PurchaseOrder();
        order.setUserId(userId);
        long itemsTotal = 0;
        for (CartItem item : items) {
            Product product = locked.get(item.getProduct().getId());
            if (product == null || !product.isActive()) {
                throw ApiException.conflict("محصول «" + item.getProduct().getName() + "» دیگر موجود نیست.");
            }
            if (product.getStock() < item.getQuantity()) {
                throw ApiException.conflict("موجودی «" + product.getName() + "» کافی نیست.");
            }
            product.setStock(product.getStock() - item.getQuantity());
            order.addItem(new OrderItem(product.getId(), product.getName(), product.effectivePrice(),
                    item.getQuantity()));
            itemsTotal += product.effectivePrice() * item.getQuantity();
        }

        long discount = 0;
        String code = blankToNull(couponCode);
        if (code != null) {
            Coupon coupon = couponService.requireForUpdate(code);
            discount = pricing.discount(coupon, itemsTotal, Instant.now());
            couponService.reserve(coupon);
            order.setCouponId(coupon.getId());
            order.setCouponCode(coupon.getCode());
        }
        PricingService.Totals totals = pricing.totals(itemsTotal, discount);
        order.setItemsTotal(totals.itemsTotal());
        order.setDiscountAmount(totals.discount());
        order.setShippingCost(totals.shipping());
        order.setTotal(totals.total());

        order.setReceiverName(address.getReceiverName());
        order.setReceiverPhone(address.getReceiverPhone());
        order.setProvince(address.getProvince());
        order.setCity(address.getCity());
        order.setPostalCode(address.getPostalCode());
        order.setAddressLine(address.getAddressLine());

        orders.save(order);
        cartItems.deleteByUserId(userId);
        return OrderDto.of(order);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDto> list(Long userId, int page, int size) {
        return PageResponse.of(orders.findByUserIdOrderByCreatedAtDesc(userId,
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 50))).map(OrderDto::of));
    }

    @Transactional(readOnly = true)
    public OrderDto get(Long userId, Long orderId) {
        return OrderDto.of(orders.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> ApiException.notFound("سفارش پیدا نشد.")));
    }

    @Transactional
    public OrderDto cancelByCustomer(Long userId, Long orderId) {
        PurchaseOrder order = lockOrder(orderId);
        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("سفارش پیدا نشد.");
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.badRequest("فقط سفارش‌های در انتظار پرداخت قابل لغو هستند.");
        }
        cancel(order);
        return OrderDto.of(order);
    }

    @Transactional
    public OrderDto changeStatus(Long orderId, OrderStatus next) {
        PurchaseOrder order = lockOrder(orderId);
        if (!order.getStatus().allowedNext().contains(next)) {
            throw ApiException.badRequest("تغییر وضعیت سفارش به این حالت مجاز نیست.");
        }
        if (next == OrderStatus.CANCELLED) {
            cancel(order);
        } else {
            order.setStatus(next);
        }
        return OrderDto.of(order);
    }

    /**
     * Cancels an unpaid order whose payment window has elapsed, unless the customer started a payment recently (they
     * may still be on the bank page). Returns true if it was cancelled.
     */
    @Transactional
    public boolean expireIfUnpaid(Long orderId, Instant createdBefore) {
        PurchaseOrder order = lockOrder(orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT || !order.getCreatedAt().isBefore(createdBefore)
                || orders.hasPaymentStartedSince(orderId, paymentGraceStart())) {
            return false;
        }
        cancel(order);
        return true;
    }

    /** Marks a locked, pending order as paid. Called by the payment flow. */
    public void markPaid(PurchaseOrder order) {
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(Instant.now());
        Map<Long, Product> locked = lockProducts(order);
        for (OrderItem item : order.getItems()) {
            Product product = locked.get(item.getProductId());
            if (product != null) {
                product.setSoldCount(product.getSoldCount() + item.getQuantity());
            }
        }
    }

    /** Payments started after this instant keep an unpaid order alive. */
    public Instant paymentGraceStart() {
        return Instant.now().minus(props.order().paymentGrace());
    }

    public PurchaseOrder lockOrder(Long orderId) {
        return orders.findByIdForUpdate(orderId).orElseThrow(() -> ApiException.notFound("سفارش پیدا نشد."));
    }

    private void cancel(PurchaseOrder order) {
        boolean wasPaid = OrderStatus.PAID_STATUSES.contains(order.getStatus());
        Map<Long, Product> locked = lockProducts(order);
        for (OrderItem item : order.getItems()) {
            Product product = locked.get(item.getProductId());
            if (product == null) {
                continue;
            }
            product.setStock(product.getStock() + item.getQuantity());
            if (wasPaid) {
                product.setSoldCount(Math.max(0, product.getSoldCount() - item.getQuantity()));
            }
        }
        order.setStatus(OrderStatus.CANCELLED);
        if (order.getCouponId() != null) {
            couponService.release(order.getCouponId());
        }
    }

    private Map<Long, Product> lockProducts(PurchaseOrder order) {
        List<Long> ids = order.getItems().stream().map(OrderItem::getProductId).distinct().toList();
        return products.findAllForUpdate(ids).stream().collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
