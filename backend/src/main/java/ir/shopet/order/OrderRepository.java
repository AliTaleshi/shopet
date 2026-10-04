package ir.shopet.order;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface OrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Page<PurchaseOrder> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<PurchaseOrder> findByIdAndUserId(Long id, Long userId);

    Page<PurchaseOrder> findByStatusOrderByCreatedAtDesc(OrderStatus status, Pageable pageable);

    Page<PurchaseOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from PurchaseOrder o where o.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") Long id);

    /** Pending orders older than {@code before} with no payment started since {@code paymentSince}. */
    @Query("""
            select o.id from PurchaseOrder o
            where o.status = ir.shopet.order.OrderStatus.PENDING_PAYMENT and o.createdAt < :before
              and not exists (select p.id from Payment p where p.orderId = o.id
                              and p.status = ir.shopet.payment.PaymentStatus.INITIATED and p.createdAt > :paymentSince)
            """)
    List<Long> findExpirableIds(@Param("before") Instant before, @Param("paymentSince") Instant paymentSince);

    @Query("""
            select count(p) > 0 from Payment p
            where p.orderId = :orderId and p.status = ir.shopet.payment.PaymentStatus.INITIATED
              and p.createdAt > :since
            """)
    boolean hasPaymentStartedSince(@Param("orderId") Long orderId, @Param("since") Instant since);

    long countByStatus(OrderStatus status);

    @Query("select coalesce(sum(o.total), 0) from PurchaseOrder o where o.status in :statuses")
    long sumTotalByStatusIn(@Param("statuses") Collection<OrderStatus> statuses);

    @Query("""
            select count(i) > 0 from OrderItem i
            where i.productId = :productId and i.order.userId = :userId and i.order.status in :statuses
            """)
    boolean hasPurchased(@Param("userId") Long userId, @Param("productId") Long productId,
            @Param("statuses") Collection<OrderStatus> statuses);

    @Query("select count(i) > 0 from OrderItem i where i.productId = :productId")
    boolean isProductOrdered(@Param("productId") Long productId);
}
