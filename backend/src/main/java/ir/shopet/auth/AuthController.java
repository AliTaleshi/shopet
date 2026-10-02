package ir.shopet.auth;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record OtpRequest(@NotBlank(message = "شماره موبایل الزامی است") String phone) {
    }

    public record VerifyRequest(
            @NotBlank(message = "شماره موبایل الزامی است") String phone,
            @NotBlank(message = "کد تأیید الزامی است") String code) {
    }

    @PostMapping("/otp/request")
    public AuthService.OtpRequestResult request(@Valid @RequestBody OtpRequest request) {
        return authService.requestOtp(request.phone());
    }

    @PostMapping("/otp/verify")
    public AuthService.LoginResult verify(@Valid @RequestBody VerifyRequest request) {
        return authService.verifyOtp(request.phone(), request.code());
    }
}
