package ir.shopet.wishlist;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ir.shopet.catalog.CatalogDtos.ProductSummary;
import ir.shopet.common.CurrentUser;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public List<ProductSummary> list(@AuthenticationPrincipal Jwt jwt) {
        return wishlistService.list(CurrentUser.id(jwt));
    }

    @GetMapping("/ids")
    public List<Long> ids(@AuthenticationPrincipal Jwt jwt) {
        return wishlistService.productIds(CurrentUser.id(jwt));
    }

    @PutMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        wishlistService.add(CurrentUser.id(jwt), productId);
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        wishlistService.remove(CurrentUser.id(jwt), productId);
    }
}
