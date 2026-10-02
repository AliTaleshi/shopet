package ir.shopet.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.JsonPath;

import ir.shopet.IntegrationTest;

class AuthIntegrationTest extends IntegrationTest {

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
    void adminPhoneIsPromotedAtStartup() {
        assertThat(users.findByPhone(ADMIN_PHONE)).get()
                .extracting(u -> u.getRole().name()).isEqualTo("ADMIN");
    }
}
