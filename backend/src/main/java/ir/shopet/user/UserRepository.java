package ir.shopet.user;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhone(String phone);

    Page<User> findByPhoneContainingOrFullNameContainingIgnoreCase(String phone, String fullName, Pageable pageable);
}
