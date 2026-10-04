package ir.shopet.payment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByAuthority(String authority);

    /** Locks the payment so concurrent gateway callbacks are handled one at a time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.authority = :authority")
    Optional<Payment> findByAuthorityForUpdate(@Param("authority") String authority);

    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
