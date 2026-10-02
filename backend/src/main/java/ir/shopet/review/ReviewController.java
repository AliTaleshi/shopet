package ir.shopet.review;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ir.shopet.common.CurrentUser;
import ir.shopet.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    public record ReviewRequest(
            @Min(value = 1, message = "امتیاز باید بین ۱ تا ۵ باشد") @Max(value = 5, message = "امتیاز باید بین ۱ تا ۵ باشد") int rating,
            @Size(max = 1000, message = "متن نظر حداکثر ۱۰۰۰ کاراکتر است") String comment) {
    }

    @GetMapping
    public PageResponse<ReviewDto> list(@PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return reviewService.list(productId, page, size);
    }

    /** GET under /api/products/** is public, so anonymous callers simply get a negative answer. */
    @GetMapping("/eligibility")
    public ReviewService.Eligibility eligibility(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        if (jwt == null) {
            return new ReviewService.Eligibility(false, false, false);
        }
        return reviewService.eligibility(CurrentUser.id(jwt), productId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId,
            @Valid @RequestBody ReviewRequest request) {
        return reviewService.create(CurrentUser.id(jwt), productId, request.rating(), request.comment());
    }
}
