package ir.shopet.admin;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.admin.AdminDtos.AdminOrderDto;
import ir.shopet.admin.AdminDtos.CategoryRequest;
import ir.shopet.admin.AdminDtos.CouponDto;
import ir.shopet.admin.AdminDtos.CouponRequest;
import ir.shopet.admin.AdminDtos.Dashboard;
import ir.shopet.catalog.CatalogDtos.CategoryDto;
import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.catalog.Category;
import ir.shopet.catalog.CategoryRepository;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;
import ir.shopet.common.PageResponse;
import ir.shopet.coupon.Coupon;
import ir.shopet.coupon.CouponRepository;
import ir.shopet.coupon.CouponService;
import ir.shopet.order.OrderDto;
import ir.shopet.order.OrderRepository;
import ir.shopet.order.OrderService;
import ir.shopet.order.OrderStatus;
import ir.shopet.order.PurchaseOrder;
import ir.shopet.user.User;
import ir.shopet.user.UserDto;
import ir.shopet.user.UserRepository;

@Service
public class AdminService {

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final OrderRepository orders;
    private final OrderService orderService;
    private final CouponRepository coupons;
    private final UserRepository users;

    public AdminService(CategoryRepository categories, ProductRepository products, OrderRepository orders,
            OrderService orderService, CouponRepository coupons, UserRepository users) {
        this.categories = categories;
        this.products = products;
        this.orders = orders;
        this.orderService = orderService;
        this.coupons = coupons;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Dashboard dashboard() {
        List<OrderDto> recent = orders.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5)).map(OrderDto::of).getContent();
        List<ProductSummary> lowStock = products.findTop10ByActiveTrueAndStockLessThanOrderByStockAsc(5).stream()
                .map(ProductSummary::of).toList();
        return new Dashboard(products.count(), users.count(), orders.count(),
                orders.countByStatus(OrderStatus.PENDING_PAYMENT), orders.countByStatus(OrderStatus.PAID),
                orders.sumTotalByStatusIn(OrderStatus.PAID_STATUSES), recent, lowStock);
    }

    // ---- categories ----

    @Transactional
    public CategoryDto createCategory(CategoryRequest r) {
        if (categories.existsBySlug(r.slug())) {
            throw ApiException.conflict("این نامک قبلاً استفاده شده است.");
        }
        return CategoryDto.of(categories.save(new Category(r.name().trim(), r.slug(), r.description(), r.sortOrder())));
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest r) {
        Category category = categories.findById(id).orElseThrow(() -> ApiException.notFound("دسته‌بندی پیدا نشد."));
        if (categories.existsBySlugAndIdNot(r.slug(), id)) {
            throw ApiException.conflict("این نامک قبلاً استفاده شده است.");
        }
        category.setName(r.name().trim());
        category.setSlug(r.slug());
        category.setDescription(r.description());
        category.setSortOrder(r.sortOrder());
        return CategoryDto.of(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categories.findById(id).orElseThrow(() -> ApiException.notFound("دسته‌بندی پیدا نشد."));
        if (products.existsByCategoryId(id)) {
            throw ApiException.conflict("این دسته‌بندی دارای محصول است و قابل حذف نیست.");
        }
        categories.delete(category);
    }

    // ---- orders ----

    @Transactional(readOnly = true)
    public PageResponse<AdminOrderDto> orders(OrderStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100));
        Page<PurchaseOrder> result = status == null
                ? orders.findAllByOrderByCreatedAtDesc(pageable)
                : orders.findByStatusOrderByCreatedAtDesc(status, pageable);
        Map<Long, User> customers = users.findAllById(result.map(PurchaseOrder::getUserId).toSet()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return PageResponse.of(result.map(o -> toAdminDto(o, customers.get(o.getUserId()))));
    }

    @Transactional(readOnly = true)
    public AdminOrderDto order(Long id) {
        PurchaseOrder order = orders.findById(id).orElseThrow(() -> ApiException.notFound("سفارش پیدا نشد."));
        return toAdminDto(order, users.findById(order.getUserId()).orElse(null));
    }

    @Transactional
    public AdminOrderDto changeStatus(Long id, OrderStatus status) {
        OrderDto dto = orderService.changeStatus(id, status);
        User user = users.findById(dto.userId()).orElse(null);
        return new AdminOrderDto(dto, user == null ? null : user.getPhone(), user == null ? null : user.getFullName());
    }

    private static AdminOrderDto toAdminDto(PurchaseOrder o, User user) {
        return new AdminOrderDto(OrderDto.of(o), user == null ? null : user.getPhone(),
                user == null ? null : user.getFullName());
    }

    // ---- coupons ----

    @Transactional(readOnly = true)
    public List<CouponDto> coupons() {
        return coupons.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream().map(CouponDto::of).toList();
    }

    @Transactional
    public CouponDto createCoupon(CouponRequest r) {
        AdminDtos.validateCoupon(r);
        if (coupons.existsByCodeIgnoreCase(r.code())) {
            throw ApiException.conflict("این کد تخفیف قبلاً ثبت شده است.");
        }
        Coupon coupon = new Coupon();
        applyCoupon(coupon, r);
        return CouponDto.of(coupons.save(coupon));
    }

    @Transactional
    public CouponDto updateCoupon(Long id, CouponRequest r) {
        AdminDtos.validateCoupon(r);
        Coupon coupon = coupons.findById(id).orElseThrow(() -> ApiException.notFound("کد تخفیف پیدا نشد."));
        if (coupons.existsByCodeIgnoreCaseAndIdNot(r.code(), id)) {
            throw ApiException.conflict("این کد تخفیف قبلاً ثبت شده است.");
        }
        applyCoupon(coupon, r);
        return CouponDto.of(coupon);
    }

    @Transactional
    public void deleteCoupon(Long id) {
        coupons.delete(coupons.findById(id).orElseThrow(() -> ApiException.notFound("کد تخفیف پیدا نشد.")));
    }

    private static void applyCoupon(Coupon c, CouponRequest r) {
        c.setCode(CouponService.normalize(r.code()));
        c.setType(r.type());
        c.setValue(r.value());
        c.setMinOrderAmount(r.minOrderAmount());
        c.setMaxDiscount(r.maxDiscount());
        c.setUsageLimit(r.usageLimit());
        c.setExpiresAt(r.expiresAt());
        c.setActive(r.active());
    }

    // ---- users ----

    @Transactional(readOnly = true)
    public PageResponse<UserDto> users(String q, Pageable pageable) {
        Page<User> page = q == null || q.isBlank()
                ? users.findAll(pageable)
                : users.findByPhoneContainingOrFullNameContainingIgnoreCase(q.trim(), q.trim(), pageable);
        return PageResponse.of(page.map(UserDto::of));
    }
}
