package ir.shopet.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findTopByPhoneOrderByCreatedAtDesc(String phone);

    /**
     * Serializes OTP requests and verifications for one phone number until the transaction ends, so concurrent
     * requests can't bypass the resend throttle or the wrong-attempt limit.
     */
    @Query(value = "select 1 from (select pg_advisory_xact_lock(hashtext(:phone))) lock", nativeQuery = true)
    Integer lockPhone(@Param("phone") String phone);

    @Modifying
    @Query("delete from OtpCode o where o.createdAt < :before")
    int deleteCreatedBefore(@Param("before") Instant before);
}
