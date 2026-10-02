package ir.shopet.payment;

import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Component;

import ir.shopet.config.AppProperties;

/** Simulated bank gateway: redirects to a local page where the customer chooses success or failure. */
@Component
public class MockPaymentGateway implements PaymentGateway {

    public static final String NAME = "mock";

    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public MockPaymentGateway(AppProperties props) {
        this.props = props;
    }

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public InitResult initiate(long orderId, long amount, String callbackUrl) {
        String authority = "MOCK" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        return new InitResult(authority, props.baseUrl() + "/api/payments/mock/" + authority);
    }

    @Override
    public String extractAuthority(Map<String, String> callbackParams) {
        return callbackParams.get("authority");
    }

    @Override
    public VerifyResult verify(Payment payment, Map<String, String> callbackParams) {
        boolean ok = "OK".equals(callbackParams.get("status"));
        return new VerifyResult(ok, ok ? String.valueOf(100_000_000L + random.nextLong(900_000_000L)) : null);
    }
}
