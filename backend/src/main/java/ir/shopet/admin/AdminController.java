package ir.shopet.admin;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import ir.shopet.admin.AdminDtos.AdminOrderDto;
import ir.shopet.admin.AdminDtos.CategoryRequest;
import ir.shopet.admin.AdminDtos.CouponDto;
import ir.shopet.admin.AdminDtos.CouponRequest;
import ir.shopet.admin.AdminDtos.Dashboard;
import ir.shopet.admin.AdminDtos.ProductRequest;
import ir.shopet.admin.AdminDtos.StatusRequest;
import ir.shopet.catalog.CatalogDtos.CategoryDto;
import ir.shopet.catalog.CatalogDtos.ProductDetail;
import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.catalog.CatalogService;
import ir.shopet.catalog.ProductFilter;
import ir.shopet.common.PageResponse;
import ir.shopet.order.OrderStatus;
import ir.shopet.review.ReviewDto;
import ir.shopet.review.ReviewService;
import ir.shopet.user.UserDto;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AdminProductService productService;
    private final CatalogService catalogService;
    private final ReviewService reviewService;

    public AdminController(AdminService adminService, AdminProductService productService,
            CatalogService catalogService, ReviewService reviewService) {
        this.adminService = adminService;
        this.productService = productService;
        this.catalogService = catalogService;
        this.reviewService = reviewService;
    }

    @GetMapping("/dashboard")
    public Dashboard dashboard() {
        return adminService.dashboard();
    }

    // ---- products ----

    @GetMapping("/products")
    public PageResponse<ProductSummary> products(ProductFilter filter,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return catalogService.search(filter, page, size, false);
    }

    @GetMapping("/products/{id}")
    public ProductDetail product(@PathVariable Long id) {
        return catalogService.product(id, false);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDetail createProduct(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/products/{id}")
    public ProductDetail updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id) {
        productService.delete(id);
    }

    @PostMapping(value = "/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductDetail uploadImages(@PathVariable Long id, @RequestPart("files") List<MultipartFile> files) {
        return productService.addImages(id, files);
    }

    @DeleteMapping("/products/{id}/images/{imageId}")
    public ProductDetail deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        return productService.deleteImage(id, imageId);
    }

    // ---- categories ----

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.categories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest request) {
        return adminService.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return adminService.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        adminService.deleteCategory(id);
    }

    // ---- orders ----

    @GetMapping("/orders")
    public PageResponse<AdminOrderDto> orders(@RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return adminService.orders(status, page, size);
    }

    @GetMapping("/orders/{id}")
    public AdminOrderDto order(@PathVariable Long id) {
        return adminService.order(id);
    }

    @PutMapping("/orders/{id}/status")
    public AdminOrderDto changeStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return adminService.changeStatus(id, request.status());
    }

    // ---- coupons ----

    @GetMapping("/coupons")
    public List<CouponDto> coupons() {
        return adminService.coupons();
    }

    @PostMapping("/coupons")
    @ResponseStatus(HttpStatus.CREATED)
    public CouponDto createCoupon(@Valid @RequestBody CouponRequest request) {
        return adminService.createCoupon(request);
    }

    @PutMapping("/coupons/{id}")
    public CouponDto updateCoupon(@PathVariable Long id, @Valid @RequestBody CouponRequest request) {
        return adminService.updateCoupon(id, request);
    }

    @DeleteMapping("/coupons/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCoupon(@PathVariable Long id) {
        adminService.deleteCoupon(id);
    }

    // ---- users & reviews ----

    @GetMapping("/users")
    public PageResponse<UserDto> users(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return adminService.users(q, PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/reviews")
    public PageResponse<ReviewDto> reviews(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return reviewService.listAll(page, size);
    }

    @DeleteMapping("/reviews/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable Long id) {
        reviewService.delete(id);
    }
}
