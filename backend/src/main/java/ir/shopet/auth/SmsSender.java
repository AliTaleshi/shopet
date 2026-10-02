package ir.shopet.auth;

/** Sends text messages. Replace {@link LoggingSmsSender} with a real provider (e.g. Kavenegar) in production. */
public interface SmsSender {

    void sendOtp(String phone, String code);
}
