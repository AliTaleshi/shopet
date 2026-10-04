package ir.shopet.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.common.ApiException;
import ir.shopet.common.Texts;
import ir.shopet.config.AppProperties;
import ir.shopet.user.User;
import ir.shopet.user.UserDto;
import ir.shopet.user.UserRepository;

@Service
public class AuthService {

    private final OtpCodeRepository otpCodes;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final SmsSender smsSender;
    private final TokenService tokenService;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public AuthService(OtpCodeRepository otpCodes, UserRepository users, PasswordEncoder passwordEncoder,
            SmsSender smsSender, TokenService tokenService, AppProperties props) {
        this.otpCodes = otpCodes;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.smsSender = smsSender;
        this.tokenService = tokenService;
        this.props = props;
    }

    public record OtpRequestResult(String phone, long expiresInSeconds, long resendInSeconds, String devCode) {
    }

    public record LoginResult(String token, UserDto user, boolean newUser) {
    }

    @Transactional
    public OtpRequestResult requestOtp(String rawPhone) {
        String phone = requirePhone(rawPhone);
        otpCodes.lockPhone(phone);
        AppProperties.Otp otp = props.otp();
        Instant now = Instant.now();
        otpCodes.findTopByPhoneOrderByCreatedAtDesc(phone).ifPresent(last -> {
            Instant nextAllowed = last.getCreatedAt().plus(otp.resendInterval());
            if (now.isBefore(nextAllowed)) {
                long wait = Duration.between(now, nextAllowed).toSeconds() + 1;
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "لطفاً " + wait + " ثانیه دیگر برای دریافت کد جدید تلاش کنید.");
            }
        });

        String code = String.valueOf(10000 + random.nextInt(90000));
        OtpCode entity = new OtpCode();
        entity.setPhone(phone);
        entity.setCodeHash(passwordEncoder.encode(code));
        entity.setExpiresAt(now.plus(otp.ttl()));
        otpCodes.save(entity);
        smsSender.sendOtp(phone, code);

        return new OtpRequestResult(phone, otp.ttl().toSeconds(), otp.resendInterval().toSeconds(),
                otp.exposeCode() ? code : null);
    }

    /** Wrong attempts must be persisted even though the request fails, hence noRollbackFor. */
    @Transactional(noRollbackFor = ApiException.class)
    public LoginResult verifyOtp(String rawPhone, String rawCode) {
        String phone = requirePhone(rawPhone);
        otpCodes.lockPhone(phone);
        String code = Texts.toLatinDigits(rawCode == null ? "" : rawCode.trim());
        OtpCode otp = otpCodes.findTopByPhoneOrderByCreatedAtDesc(phone)
                .filter(o -> !o.isConsumed())
                .orElseThrow(() -> ApiException.badRequest("ابتدا کد تأیید را درخواست کنید."));
        if (Instant.now().isAfter(otp.getExpiresAt())) {
            throw ApiException.badRequest("کد تأیید منقضی شده است؛ کد جدید درخواست کنید.");
        }
        if (otp.getAttempts() >= props.otp().maxAttempts()) {
            throw ApiException.badRequest("تعداد تلاش‌ها بیش از حد مجاز است؛ کد جدید درخواست کنید.");
        }
        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            throw ApiException.badRequest("کد وارد شده صحیح نیست.");
        }
        otp.setConsumed(true);

        boolean[] created = {false};
        User user = users.findByPhone(phone).orElseGet(() -> {
            created[0] = true;
            return users.save(new User(phone));
        });
        boolean newUser = created[0] || user.getFullName() == null || user.getFullName().isBlank();
        return new LoginResult(tokenService.issue(user), UserDto.of(user), newUser);
    }

    private String requirePhone(String rawPhone) {
        String phone = Texts.normalizeMobile(rawPhone);
        if (phone == null) {
            throw ApiException.badRequest("شماره موبایل معتبر نیست.");
        }
        return phone;
    }
}
