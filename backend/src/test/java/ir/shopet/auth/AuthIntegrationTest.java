package ir.shopet.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;
import ir.shopet.common.ApiException;

class AuthIntegrationTest extends IntegrationTest {

    @Autowired
    AuthService authService;
    @Autowired
    JwtEncoder jwtEncoder;

    @Test
    void firstLoginCreatesCustomerAndProfileCanBeCompleted() throws Exception {
        String phone = newPhone();
        String otp = body(postJson("/api/auth/otp/request", null, Map.of("phone", phone))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresInSeconds").value(120)));
        String code = JsonPath.read(otp, "$.devCode");

        String login = body(postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newUser").value(true))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER")));
        String token = JsonPath.read(login, "$.token");

        putJson("/api/me", token, Map.of("fullName", "سارا محمدی"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("سارا محمدی"));
        getJson("/api/me", token).andExpect(jsonPath("$.phone").value(phone));
    }

    @Test
    void persianDigitsAndInternationalFormatAreNormalized() throws Exception {
        postJson("/api/auth/otp/request", null, Map.of("phone", "+98 915 ۷۷۷ ۶۶۵۵"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("09157776655"));
    }

    @Test
    void invalidPhoneIsRejected() throws Exception {
        postJson("/api/auth/otp/request", null, Map.of("phone", "12345"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("شماره موبایل معتبر نیست."));
    }

    @Test
    void resendIsThrottled() throws Exception {
        String phone = newPhone();
        postJson("/api/auth/otp/request", null, Map.of("phone", phone)).andExpect(status().isOk());
        postJson("/api/auth/otp/request", null, Map.of("phone", phone)).andExpect(status().isTooManyRequests());
    }

    @Test
    void wrongCodesAreCountedAndCodeIsLockedAfterMaxAttempts() throws Exception {
        String phone = newPhone();
        String otp = body(postJson("/api/auth/otp/request", null, Map.of("phone", phone)));
        String code = JsonPath.read(otp, "$.devCode");
        String wrong = code.equals("11111") ? "22222" : "11111";

        for (int i = 0; i < 5; i++) {
            postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", wrong))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value("کد وارد شده صحیح نیست."));
        }
        // Even the right code is refused once the attempts are used up.
        postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", code))
                .andExpect(status().isBadRequest());
        assertThat(users.findByPhone(phone)).isEmpty();
    }

    @Test
    void codeCannotBeReused() throws Exception {
        String phone = newPhone();
        String code = JsonPath.read(body(postJson("/api/auth/otp/request", null, Map.of("phone", phone))), "$.devCode");
        postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", code)).andExpect(status().isOk());
        postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", code)).andExpect(status().isBadRequest());
    }

    @Test
    void protectedEndpointsRequireValidToken() throws Exception {
        getJson("/api/me", null).andExpect(status().isUnauthorized());
        getJson("/api/me", "not-a-token").andExpect(status().isUnauthorized());
        getJson("/api/cart", null).andExpect(status().isUnauthorized());
    }

    @Test
    void parallelWrongGuessesCannotExceedTheAttemptLimit() throws Exception {
        String phone = newPhone();
        String code = JsonPath.read(body(postJson("/api/auth/otp/request", null, Map.of("phone", phone))), "$.devCode");
        String wrong = code.equals("11111") ? "22222" : "11111";

        Callable<Void> guess = () -> {
            try {
                authService.verifyOtp(phone, wrong);
            } catch (ApiException expected) {
                // every guess is wrong
            }
            return null;
        };
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (Future<Void> f : pool.invokeAll(Collections.nCopies(16, guess))) {
            f.get();
        }
        pool.shutdown();

        postJson("/api/auth/otp/verify", null, Map.of("phone", phone, "code", code))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("تعداد تلاش‌ها بیش از حد مجاز است؛ کد جدید درخواست کنید."));
    }

    @Test
    void tokensFromAnotherIssuerAreRejected() throws Exception {
        var admin = users.findByPhone(ADMIN_PHONE).orElseThrow();
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("someone-else")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(600))
                .subject(String.valueOf(admin.getId()))
                .claim("roles", List.of("ADMIN"))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        getJson("/api/admin/dashboard", token).andExpect(status().isUnauthorized());
    }

    @Test
    void addressesAcceptPersianDigits() throws Exception {
        String token = loginNewCustomer();
        postJson("/api/me/addresses", token, Map.of(
                "title", "محل کار", "receiverName", "رضا", "receiverPhone", "۰۹۱۲۳۴۵۶۷۸۹",
                "province", "فارس", "city", "شیراز", "postalCode", "۷۱۳۴۵۶۷۸۹۰", "addressLine", "بلوار زند"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receiverPhone").value("09123456789"))
                .andExpect(jsonPath("$.postalCode").value("7134567890"));
    }

    @Test
    void malformedJsonGetsAPersianError() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/otp/request")
                        .contentType("application/json").content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("درخواست نامعتبر است."));
    }

    @Test
    void adminPhoneIsPromotedAtStartup() {
        assertThat(users.findByPhone(ADMIN_PHONE)).get()
                .extracting(u -> u.getRole().name()).isEqualTo("ADMIN");
    }
}
