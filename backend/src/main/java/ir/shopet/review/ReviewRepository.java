package ir.shopet.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    interface RatingStats {
        Double getAvg();

        Long getCount();
    }

    @Query("select avg(r.rating) as avg, count(r) as count from Review r where r.productId = :productId")
    RatingStats stats(@Param("productId") Long productId);
}
