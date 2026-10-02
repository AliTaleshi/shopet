package ir.shopet.seed;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.catalog.Category;
import ir.shopet.catalog.CategoryRepository;
import ir.shopet.catalog.PetType;
import ir.shopet.catalog.Product;
import ir.shopet.catalog.ProductRepository;
import ir.shopet.common.Texts;
import ir.shopet.config.AppProperties;
import ir.shopet.coupon.Coupon;
import ir.shopet.coupon.CouponRepository;
import ir.shopet.coupon.CouponType;
import ir.shopet.user.Role;
import ir.shopet.user.User;
import ir.shopet.user.UserRepository;

/** Ensures the configured admin exists and inserts a demo catalog into an empty database. */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final CouponRepository coupons;

    public DataSeeder(AppProperties props, UserRepository users, CategoryRepository categories,
            ProductRepository products, CouponRepository coupons) {
        this.props = props;
        this.users = users;
        this.categories = categories;
        this.products = products;
        this.coupons = coupons;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureAdmin();
        if (props.seedDemoData() && categories.count() == 0) {
            seedCatalog();
            seedCoupons();
            log.info("Demo catalog inserted");
        }
    }

    private void ensureAdmin() {
        String phone = Texts.normalizeMobile(props.adminPhone());
        if (phone == null) {
            return;
        }
        User admin = users.findByPhone(phone).orElseGet(() -> {
            User u = new User(phone);
            u.setFullName("مدیر فروشگاه");
            return u;
        });
        admin.setRole(Role.ADMIN);
        users.save(admin);
    }

    private record P(String name, String brand, PetType pet, String category, long price, Long discount, int stock,
            String description) {
    }

    private void seedCatalog() {
        List<Category> list = List.of(
                new Category("غذای خشک", "dry-food", "غذای خشک کامل و متعادل برای همه سنین", 1),
                new Category("غذای مرطوب و کنسرو", "wet-food", "پوچ و کنسروهای خوش‌طعم و مغذی", 2),
                new Category("تشویقی و اسنک", "treats", "اسنک‌های سالم برای آموزش و تشویق", 3),
                new Category("اسباب‌بازی", "toys", "سرگرمی و تحرک برای حیوان خانگی شما", 4),
                new Category("قلاده و لوازم گردش", "walking", "قلاده، بند و باکس حمل", 5),
                new Category("بهداشت و نظافت", "hygiene", "شامپو، خاک گربه و لوازم آرایش", 6),
                new Category("ظرف آب و غذا", "bowls", "ظرف‌ها و آبخوری‌های کاربردی", 7),
                new Category("جای خواب و قفس", "beds-cages", "تشک، قفس و لانه", 8),
                new Category("آکواریوم و تجهیزات", "aquarium", "آکواریوم، فیلتر و لوازم نگهداری ماهی", 9));
        Map<String, Category> bySlug = new HashMap<>();
        for (Category c : categories.saveAll(list)) {
            bySlug.put(c.getSlug(), c);
        }

        List<P> items = List.of(
                new P("غذای خشک سگ بالغ نژاد متوسط ۳ کیلوگرمی", "رویال کنین", PetType.DOG, "dry-food", 2_850_000L, 2_590_000L, 25,
                        "غذای کامل و متعادل برای سگ‌های بالغ نژاد متوسط (۱۱ تا ۲۵ کیلوگرم). حاوی پروتئین باکیفیت برای حفظ توده عضلانی و فیبرهای مفید برای سلامت گوارش."),
                new P("غذای خشک توله سگ ۲ کیلوگرمی", "رفلکس", PetType.DOG, "dry-food", 1_180_000L, null, 30,
                        "مناسب توله‌سگ‌ها تا ۱۲ ماهگی؛ غنی از کلسیم و DHA برای رشد استخوان و تکامل مغز."),
                new P("غذای خشک گربه بالغ داخل خانه ۲ کیلوگرمی", "رویال کنین", PetType.CAT, "dry-food", 2_450_000L, null, 18,
                        "فرمول ویژه گربه‌های خانگی کم‌تحرک؛ کنترل وزن و کاهش بوی مدفوع."),
                new P("غذای خشک گربه عقیم‌شده ۱.۵ کیلوگرمی", "جوسرا", PetType.CAT, "dry-food", 1_650_000L, 1_490_000L, 12,
                        "کالری کنترل‌شده برای گربه‌های عقیم‌شده همراه با ال‌کارنیتین."),
                new P("پوچ گربه با طعم مرغ در سس ۸۵ گرمی", "ویسکاس", PetType.CAT, "wet-food", 65_000L, null, 120,
                        "غذای مرطوب کامل برای گربه‌های بالغ؛ تأمین آب بدن و طعم دلپذیر."),
                new P("کنسرو سگ با گوشت گوساله ۴۰۰ گرمی", "پدیگری", PetType.DOG, "wet-food", 145_000L, 129_000L, 60,
                        "کنسرو مقوی با تکه‌های گوشت گوساله، مناسب مخلوط با غذای خشک."),
                new P("بستنی گربه (تشویقی بستنی‌ای) بسته ۴ عددی", "پت‌کیت", PetType.CAT, "treats", 98_000L, null, 80,
                        "تشویقی خامه‌ای خوش‌طعم با طعم ماهی تن؛ مناسب برای تغذیه از دست."),
                new P("استخوان جویدنی دندانی سگ بسته ۷ عددی", "پدیگری", PetType.DOG, "treats", 210_000L, 185_000L, 45,
                        "کمک به کاهش جرم و تمیزی دندان‌ها با طراحی ضربدری مخصوص."),
                new P("تشویقی پرنده میله‌ای با عسل و میوه", "ورسل لاگا", PetType.BIRD, "treats", 120_000L, null, 50,
                        "میله دانه‌ای با عسل، مناسب مرغ عشق، قناری و کاسکو."),
                new P("توپ لاستیکی مقاوم کنگ سایز متوسط", "کنگ", PetType.DOG, "toys", 690_000L, null, 15,
                        "اسباب‌بازی معروف و بسیار مقاوم؛ قابلیت پر کردن با تشویقی برای سرگرمی طولانی."),
                new P("چوب پر گربه با زنگوله", "تریکسی", PetType.CAT, "toys", 135_000L, 110_000L, 40,
                        "اسباب‌بازی تعاملی برای بازی و تحرک بیشتر گربه."),
                new P("تونل بازی گربه سه‌طرفه", "تریکسی", PetType.CAT, "toys", 480_000L, null, 10,
                        "تونل تاشو با صدای خش‌خش که حس کنجکاوی گربه را تحریک می‌کند."),
                new P("آینه و زنگوله پرنده", "ورسل لاگا", PetType.BIRD, "toys", 85_000L, null, 35,
                        "سرگرمی ساده و محبوب برای پرندگان کوچک داخل قفس."),
                new P("قلاده و قلاده‌بند سگ سایز M", "فرپلاست", PetType.DOG, "walking", 390_000L, null, 20,
                        "قلاده نایلونی مقاوم با قفل ایمن و بند ۱۲۰ سانتی‌متری."),
                new P("باکس حمل گربه و سگ کوچک", "فرپلاست", PetType.CAT, "walking", 1_350_000L, 1_190_000L, 8,
                        "باکس حمل با تهویه مناسب و درب فلزی، مناسب سفر و مراجعه به دامپزشک."),
                new P("شامپو سگ ضد کک و کنه ۲۵۰ میلی‌لیتری", "بایوگرومر", PetType.DOG, "hygiene", 260_000L, null, 30,
                        "شامپوی ملایم با عصاره‌های گیاهی برای دفع کک و کنه و نرمی موها."),
                new P("خاک گربه گرانولی ۱۰ لیتری با رایحه لوندر", "پرسیا", PetType.CAT, "hygiene", 320_000L, 289_000L, 50,
                        "جذب بالا و کلوخه‌شوندگی سریع با کنترل بو."),
                new P("ناخن‌گیر حرفه‌ای حیوانات", "تریکسی", PetType.DOG, "hygiene", 175_000L, null, 25,
                        "تیغه استیل ضدزنگ و دسته ارگونومیک برای کوتاه کردن ایمن ناخن."),
                new P("ظرف غذای استیل دوقلو", "فرپلاست", PetType.DOG, "bowls", 285_000L, null, 22,
                        "دو کاسه استیل با پایه ضدلغزش برای آب و غذا."),
                new P("آبخوری هوشمند گربه با فیلتر ۲ لیتری", "پت‌کیت", PetType.CAT, "bowls", 1_250_000L, 1_090_000L, 6,
                        "آب در گردش و تصفیه‌شده، تشویق گربه به نوشیدن آب بیشتر."),
                new P("تشک نرم سگ و گربه سایز L", "پت‌لند", PetType.DOG, "beds-cages", 890_000L, null, 9,
                        "تشک گرم و قابل شست‌وشو با لبه‌های برجسته برای آرامش بیشتر."),
                new P("قفس مرغ عشق با لوازم کامل", "ایمک", PetType.BIRD, "beds-cages", 1_480_000L, 1_350_000L, 7,
                        "قفس فلزی با ظرف آب و دان، میله‌های نشیمن و سینی کشویی."),
                new P("دان مخلوط مرغ عشق ۱ کیلوگرمی", "ورسل لاگا", PetType.BIRD, "dry-food", 230_000L, null, 40,
                        "مخلوط متعادل ارزن، کنجد و دانه‌های مغذی برای مرغ عشق."),
                new P("غذای پولکی ماهی ۱۰۰ میلی‌لیتری", "تترا", PetType.FISH, "dry-food", 190_000L, null, 55,
                        "غذای کامل برای ماهی‌های آب شیرین گرمسیری؛ تقویت رنگ و سیستم ایمنی."),
                new P("آکواریوم ۴۰ لیتری با درب و نور LED", "آکوا", PetType.FISH, "aquarium", 3_900_000L, 3_590_000L, 4,
                        "آکواریوم شیشه‌ای کامل با درب و نور LED مناسب شروع نگهداری ماهی."),
                new P("فیلتر داخلی آکواریوم ۶۰۰ لیتر بر ساعت", "سوبو", PetType.FISH, "aquarium", 540_000L, null, 14,
                        "فیلتر سه‌مرحله‌ای کم‌صدا برای آکواریوم‌های تا ۸۰ لیتر."),
                new P("غذای همستر و جوندگان ۵۰۰ گرمی", "ورسل لاگا", PetType.SMALL_PET, "dry-food", 210_000L, null, 30,
                        "مخلوط غلات، سبزیجات و دانه‌ها برای همستر، خوکچه و موش."),
                new P("چرخ ورزشی همستر بی‌صدا", "تریکسی", PetType.SMALL_PET, "toys", 360_000L, 320_000L, 12,
                        "چرخ بی‌صدا برای تحرک روزانه جوندگان کوچک."),
                new P("ترراریوم لاک‌پشت با سکوی استراحت", "آکوا", PetType.REPTILE, "beds-cages", 1_150_000L, null, 5,
                        "محیط مناسب نگهداری لاک‌پشت آبی با بخش خشکی و آبی."),
                new P("غذای لاک‌پشت آبی ۱۰۰ گرمی", "تترا", PetType.REPTILE, "dry-food", 160_000L, null, 3,
                        "غذای استیکی شناور با کلسیم و ویتامین D3 برای سلامت لاک."));

        Instant base = Instant.now().minus(items.size(), ChronoUnit.HOURS);
        int i = 0;
        for (P item : items) {
            Product p = new Product();
            p.setName(item.name());
            p.setBrand(item.brand());
            p.setPetType(item.pet());
            p.setCategory(bySlug.get(item.category()));
            p.setPrice(item.price());
            p.setDiscountPrice(item.discount());
            p.setStock(item.stock());
            p.setDescription(item.description());
            p.setCreatedAt(base.plus(i++, ChronoUnit.HOURS));
            products.save(p);
        }
    }

    private void seedCoupons() {
        Coupon welcome = new Coupon();
        welcome.setCode("WELCOME10");
        welcome.setType(CouponType.PERCENT);
        welcome.setValue(10);
        welcome.setMaxDiscount(200_000L);
        coupons.save(welcome);

        Coupon fixed = new Coupon();
        fixed.setCode("PET50");
        fixed.setType(CouponType.FIXED);
        fixed.setValue(50_000);
        fixed.setMinOrderAmount(500_000);
        coupons.save(fixed);
    }
}
