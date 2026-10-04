package ir.shopet.payment;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.common.ApiException;
import ir.shopet.config.AppProperties;
import ir.shopet.order.OrderService;
import ir.shopet.order.OrderStatus;
import ir.shopet.order.PurchaseOrder;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository payments;
    private final OrderService orderService;
    private final PaymentGateway gateway;
    private final AppProperties props;

    public PaymentService(PaymentRepository payments, OrderService orderService, List<PaymentGateway> gateways,
            AppProperties props) {
        this.payments = payments;
        this.orderService = orderService;
        this.props = props;
        this.gateway = gateways.stream()
                .filter(g -> g.name().equals(props.payment().gateway()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Unknown payment gateway: " + props.payment().gateway()));
    }

    public record CallbackResult(Long orderId, boolean success) {
    }

    /** Starts a payment for a pending order and returns the URL the customer should be redirected to. */
    @Transactional
    public String start(Long userId, Long orderId) {
        PurchaseOrder order = orderService.lockOrder(orderId);
        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("سفارش پیدا نشد.");
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.badRequest("این سفارش در انتظار پرداخت نیست.");
        }
        if (order.getTotal() == 0) {
            // Fully covered by a discount: nothing to charge, and gateways reject zero amounts.
            orderService.markPaid(order);
            return resultUrl(new CallbackResult(order.getId(), true));
        }
        PaymentGateway.InitResult init = gateway.initiate(order.getId(), order.getTotal(),
                props.baseUrl() + "/api/payments/callback");
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setGateway(gateway.name());
        payment.setAmount(order.getTotal());
        payment.setAuthority(init.authority());
        payments.save(payment);
        return init.redirectUrl();
    }

    @Transactional
    public CallbackResult handleCallback(Map<String, String> params) {
        String authority = gateway.extractAuthority(params);
        Payment payment = authority == null ? null : payments.findByAuthorityForUpdate(authority).orElse(null);
        if (payment == null) {
            return new CallbackResult(null, false);
        }
        PurchaseOrder order = orderService.lockOrder(payment.getOrderId());
        if (payment.getStatus() != PaymentStatus.INITIATED) {
            // Repeated callback (e.g. page refresh): report the already-recorded outcome.
            return new CallbackResult(order.getId(), payment.getStatus() == PaymentStatus.SUCCESS);
        }
        PaymentGateway.VerifyResult result = gateway.verify(payment, params);
        payment.setCompletedAt(Instant.now());
        if (result.success() && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setRefId(result.refId());
            orderService.markPaid(order);
            return new CallbackResult(order.getId(), true);
        }
        if (result.success()) {
            log.warn("Payment {} succeeded for order {} in status {}; needs manual refund", payment.getId(),
                    order.getId(), order.getStatus());
        }
        payment.setStatus(PaymentStatus.FAILED);
        return new CallbackResult(order.getId(), false);
    }

    @Transactional(readOnly = true)
    public Payment requireByAuthority(String authority) {
        return payments.findByAuthority(authority).orElseThrow(() -> ApiException.notFound("پرداخت پیدا نشد."));
    }

    public String resultUrl(CallbackResult result) {
        String url = props.baseUrl() + "/payment/result?status=" + (result.success() ? "success" : "failed");
        return result.orderId() == null ? url : url + "&orderId=" + result.orderId();
    }
}
