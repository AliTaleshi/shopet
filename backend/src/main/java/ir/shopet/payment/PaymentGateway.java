package ir.shopet.payment;

import java.util.Map;

/**
 * Payment provider SPI. Implementations follow the common Iranian gateway flow:
 * request a payment (get an authority + redirect URL), the customer pays on the
 * bank page, the bank redirects back to our callback, and we verify the payment.
 */
public interface PaymentGateway {

    /** Identifier matched against {@code app.payment.gateway}. */
    String name();

    InitResult initiate(long orderId, long amount, String callbackUrl);

    /** Extracts the payment authority from the gateway's callback parameters. */
    String extractAuthority(Map<String, String> callbackParams);

    VerifyResult verify(Payment payment, Map<String, String> callbackParams);

    record InitResult(String authority, String redirectUrl) {
    }

    record VerifyResult(boolean success, String refId) {
    }
}
