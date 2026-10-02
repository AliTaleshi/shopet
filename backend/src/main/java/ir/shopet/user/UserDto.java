package ir.shopet.user;

import java.time.Instant;

public record UserDto(Long id, String phone, String fullName, Role role, Instant createdAt) {

    public static UserDto of(User user) {
        return new UserDto(user.getId(), user.getPhone(), user.getFullName(), user.getRole(), user.getCreatedAt());
    }
}
