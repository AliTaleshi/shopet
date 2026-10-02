package ir.shopet.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Development SMS sender that only logs the code. */
@Component
public class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public void sendOtp(String phone, String code) {
        log.info("OTP for {}: {}", phone, code);
    }
}
