package ir.shopet.order;

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
import ir.shopet.payment.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api")
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    public OrderController(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    public record PreviewRequest(@Size(max = 30) String couponCode) {
    }

    public record CreateOrderRequest(
            @NotNull(message = "آدرس ارسال را انتخاب کنید") Long addressId,
            @Size(max = 30) String couponCode) {
    }

    public record PayResponse(String redirectUrl) {
    }

    @PostMapping("/checkout/preview")
    public CheckoutSummary preview(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PreviewRequest request) {
        return orderService.preview(CurrentUser.id(jwt), request.couponCode());
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(CurrentUser.id(jwt), request.addressId(), request.couponCode());
    }

    @GetMapping("/orders")
    public PageResponse<OrderDto> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return orderService.list(CurrentUser.id(jwt), page, size);
    }

    @GetMapping("/orders/{id}")
    public OrderDto get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return orderService.get(CurrentUser.id(jwt), id);
    }

    @PostMapping("/orders/{id}/cancel")
    public OrderDto cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return orderService.cancelByCustomer(CurrentUser.id(jwt), id);
    }

    @PostMapping("/orders/{id}/pay")
    public PayResponse pay(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return new PayResponse(paymentService.start(CurrentUser.id(jwt), id));
    }
}
