package ir.shopet.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import ir.shopet.catalog.CatalogDtos.ProductDetail;
import ir.shopet.catalog.Category;
import ir.shopet.catalog.CategoryRepository;
import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductImage;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.ApiException;
import ir.shopet.order.OrderRepository;
import ir.shopet.storage.FileStorageService;

@Service
public class AdminProductService {

    public static final int MAX_IMAGES = 8;

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final OrderRepository orders;
    private final FileStorageService storage;

    public AdminProductService(ProductRepository products, CategoryRepository categories, OrderRepository orders,
            FileStorageService storage) {
        this.products = products;
        this.categories = categories;
        this.orders = orders;
        this.storage = storage;
    }

    @Transactional
    public ProductDetail create(AdminDtos.ProductRequest request) {
        Product product = new Product();
        apply(product, request);
        return ProductDetail.of(products.save(product));
    }

    @Transactional
    public ProductDetail update(Long id, AdminDtos.ProductRequest request) {
        Product product = get(id);
        apply(product, request);
        return ProductDetail.of(product);
    }

    @Transactional
    public void delete(Long id) {
        Product product = get(id);
        if (orders.isProductOrdered(id)) {
            throw ApiException.conflict("این محصول در سفارش‌ها ثبت شده و قابل حذف نیست؛ به‌جای آن غیرفعالش کنید.");
        }
        product.getImages().forEach(image -> storage.deleteAfterCommit(image.getFileName()));
        products.delete(product);
    }

    @Transactional
    public ProductDetail addImages(Long id, List<MultipartFile> files) {
        Product product = get(id);
        if (files == null || files.isEmpty()) {
            throw ApiException.badRequest("هیچ فایلی انتخاب نشده است.");
        }
        if (product.getImages().size() + files.size() > MAX_IMAGES) {
            throw ApiException.badRequest("هر محصول حداکثر " + MAX_IMAGES + " تصویر می‌تواند داشته باشد.");
        }
        int order = product.getImages().stream().mapToInt(ProductImage::getSortOrder).max().orElse(-1);
        for (MultipartFile file : files) {
            ProductImage image = new ProductImage();
            image.setProduct(product);
            image.setFileName(storage.store(file));
            image.setSortOrder(++order);
            product.getImages().add(image);
        }
        products.flush();
        return ProductDetail.of(product);
    }

    @Transactional
    public ProductDetail deleteImage(Long id, Long imageId) {
        Product product = get(id);
        ProductImage image = product.getImages().stream()
                .filter(i -> i.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("تصویر پیدا نشد."));
        product.getImages().remove(image);
        products.flush();
        storage.deleteAfterCommit(image.getFileName());
        return ProductDetail.of(product);
    }

    private Product get(Long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("محصول پیدا نشد."));
    }

    private void apply(Product product, AdminDtos.ProductRequest r) {
        if (r.discountPrice() != null && r.discountPrice() >= r.price()) {
            throw ApiException.badRequest("قیمت با تخفیف باید کمتر از قیمت اصلی باشد.");
        }
        Category category = categories.findById(r.categoryId())
                .orElseThrow(() -> ApiException.badRequest("دسته‌بندی انتخاب‌شده وجود ندارد."));
        product.setName(r.name().trim());
        product.setDescription(r.description());
        product.setBrand(r.brand() == null || r.brand().isBlank() ? null : r.brand().trim());
        product.setPetType(r.petType());
        product.setCategory(category);
        product.setPrice(r.price());
        product.setDiscountPrice(r.discountPrice());
        product.setStock(r.stock());
        product.setActive(r.active());
    }
}
