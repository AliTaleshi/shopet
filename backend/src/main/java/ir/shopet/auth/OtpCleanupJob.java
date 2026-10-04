package ir.shopet.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Deletes old one-time codes; anyone can request codes, so the table would otherwise grow without bound. */
@Component
public class OtpCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(OtpCleanupJob.class);
    static final Duration RETENTION = Duration.ofDays(1);

    private final OtpCodeRepository otpCodes;

    public OtpCleanupJob(OtpCodeRepository otpCodes) {
        this.otpCodes = otpCodes;
    }

    @Scheduled(fixedDelay = 1, initialDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    public void run() {
        int deleted = otpCodes.deleteCreatedBefore(Instant.now().minus(RETENTION));
        if (deleted > 0) {
            log.info("Deleted {} expired OTP codes", deleted);
        }
    }
}
