package ir.shopet.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String publicUrl,
        String adminPhone,
        boolean seedDemoData,
        String uploadDir,
        Jwt jwt,
        Otp otp,
        Shipping shipping,
        OrderSettings order,
        Payment payment) {

    public record Jwt(String secret, Duration ttl) {
    }

    public record Otp(boolean exposeCode, Duration ttl, Duration resendInterval, int maxAttempts) {
    }

    public record Shipping(long cost, long freeThreshold) {
    }

    public record OrderSettings(Duration unpaidTimeout, Duration expiryCheckInterval) {
    }

    public record Payment(String gateway) {
    }

    /** Base URL used to build absolute links (empty means same-origin relative links). */
    public String baseUrl() {
        if (publicUrl == null || publicUrl.isBlank()) {
            return "";
        }
        return publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
    }
}
