package ir.shopet.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddressDto(
        Long id,
        @NotBlank(message = "عنوان آدرس الزامی است") @Size(max = 50, message = "عنوان آدرس طولانی است") String title,
        @NotBlank(message = "نام گیرنده الزامی است") @Size(max = 100, message = "نام گیرنده طولانی است") String receiverName,
        @NotBlank(message = "شماره موبایل گیرنده الزامی است") @Pattern(regexp = "^09\\d{9}$", message = "شماره موبایل گیرنده معتبر نیست") String receiverPhone,
        @NotBlank(message = "استان الزامی است") @Size(max = 50) String province,
        @NotBlank(message = "شهر الزامی است") @Size(max = 50) String city,
        @NotBlank(message = "کد پستی الزامی است") @Pattern(regexp = "^\\d{10}$", message = "کد پستی باید ۱۰ رقم باشد") String postalCode,
        @NotBlank(message = "نشانی الزامی است") @Size(max = 500, message = "نشانی طولانی است") String addressLine) {

    public static AddressDto of(Address a) {
        return new AddressDto(a.getId(), a.getTitle(), a.getReceiverName(), a.getReceiverPhone(), a.getProvince(),
                a.getCity(), a.getPostalCode(), a.getAddressLine());
    }

    void applyTo(Address a) {
        a.setTitle(title.trim());
        a.setReceiverName(receiverName.trim());
        a.setReceiverPhone(receiverPhone);
        a.setProvince(province.trim());
        a.setCity(city.trim());
        a.setPostalCode(postalCode);
        a.setAddressLine(addressLine.trim());
    }
}
