package ir.shopet.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import ir.shopet.auth.LoggingSmsSender;
import ir.shopet.auth.SmsSender;
import ir.shopet.payment.MockPaymentGateway;

/** Warns loudly when demo-only settings are active, since they are unsafe for a public deployment. */
@Component
public class StartupChecks {

    private static final Logger log = LoggerFactory.getLogger(StartupChecks.class);

    private final AppProperties props;
    private final SmsSender smsSender;

    public StartupChecks(AppProperties props, SmsSender smsSender) {
        this.props = props;
        this.smsSender = smsSender;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warnAboutDemoSettings() {
        if (props.otp().exposeCode()) {
            log.warn("DEMO MODE: OTP codes are returned by the API (OTP_EXPOSE_CODE=true). Anyone can log in as any "
                    + "number, including the admin. Disable it for real users.");
        }
        if (smsSender instanceof LoggingSmsSender) {
            log.warn("No SMS provider configured: OTP codes are only written to this log.");
        }
        if (MockPaymentGateway.NAME.equals(props.payment().gateway())) {
            log.warn("Mock payment gateway is active: orders can be marked paid without real payment.");
        }
    }
}
