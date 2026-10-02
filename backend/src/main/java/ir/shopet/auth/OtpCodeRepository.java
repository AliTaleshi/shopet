package ir.shopet.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findTopByPhoneOrderByCreatedAtDesc(String phone);
}
