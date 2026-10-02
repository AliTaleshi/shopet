package ir.shopet.user;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ir.shopet.common.ApiException;

@Service
public class AccountService {

    private final UserRepository users;
    private final AddressRepository addresses;

    public AccountService(UserRepository users, AddressRepository addresses) {
        this.users = users;
        this.addresses = addresses;
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return UserDto.of(getUser(userId));
    }

    @Transactional
    public UserDto updateProfile(Long userId, String fullName) {
        User user = getUser(userId);
        user.setFullName(fullName.trim());
        return UserDto.of(user);
    }

    @Transactional(readOnly = true)
    public List<AddressDto> addresses(Long userId) {
        return addresses.findByUserIdOrderByCreatedAtDesc(userId).stream().map(AddressDto::of).toList();
    }

    @Transactional
    public AddressDto addAddress(Long userId, AddressDto request) {
        Address address = new Address();
        address.setUserId(userId);
        request.applyTo(address);
        return AddressDto.of(addresses.save(address));
    }

    @Transactional
    public AddressDto updateAddress(Long userId, Long addressId, AddressDto request) {
        Address address = getAddress(userId, addressId);
        request.applyTo(address);
        return AddressDto.of(address);
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        addresses.delete(getAddress(userId, addressId));
    }

    public Address getAddress(Long userId, Long addressId) {
        return addresses.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> ApiException.notFound("آدرس پیدا نشد."));
    }

    private User getUser(Long userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("کاربر پیدا نشد."));
    }
}
