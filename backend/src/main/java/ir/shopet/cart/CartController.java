package ir.shopet.cart;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ir.shopet.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    public record QuantityRequest(@Min(value = 0, message = "تعداد نامعتبر است") int quantity) {
    }

    public record MergeRequest(@NotNull @Size(max = 100) List<CartService.MergeItem> items) {
    }

    @GetMapping
    public CartDto get(@AuthenticationPrincipal Jwt jwt) {
        return cartService.get(CurrentUser.id(jwt));
    }

    @PutMapping("/items/{productId}")
    public CartDto setQuantity(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId,
            @Valid @RequestBody QuantityRequest request) {
        return cartService.setQuantity(CurrentUser.id(jwt), productId, request.quantity());
    }

    @DeleteMapping("/items/{productId}")
    public CartDto remove(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        return cartService.setQuantity(CurrentUser.id(jwt), productId, 0);
    }

    @PostMapping("/merge")
    public CartDto merge(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MergeRequest request) {
        return cartService.merge(CurrentUser.id(jwt), request.items());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal Jwt jwt) {
        cartService.clear(CurrentUser.id(jwt));
    }
}
