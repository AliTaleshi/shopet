package ir.shopet.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ir.shopet.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/me")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    public record ProfileRequest(
            @NotBlank(message = "نام و نام خانوادگی الزامی است") @Size(max = 100, message = "نام طولانی است") String fullName) {
    }

    @GetMapping
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return accountService.me(CurrentUser.id(jwt));
    }

    @PutMapping
    public UserDto update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileRequest request) {
        return accountService.updateProfile(CurrentUser.id(jwt), request.fullName());
    }

    @GetMapping("/addresses")
    public List<AddressDto> addresses(@AuthenticationPrincipal Jwt jwt) {
        return accountService.addresses(CurrentUser.id(jwt));
    }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    public AddressDto addAddress(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AddressDto request) {
        return accountService.addAddress(CurrentUser.id(jwt), request);
    }

    @PutMapping("/addresses/{id}")
    public AddressDto updateAddress(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody AddressDto request) {
        return accountService.updateAddress(CurrentUser.id(jwt), id, request);
    }

    @DeleteMapping("/addresses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        accountService.deleteAddress(CurrentUser.id(jwt), id);
    }
}
