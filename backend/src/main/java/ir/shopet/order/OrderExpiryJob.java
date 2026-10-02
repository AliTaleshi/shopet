package ir.shopet.order;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import ir.shopet.config.AppProperties;

/** Cancels orders that were not paid in time so their reserved stock is released. */
@Component
public class OrderExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(OrderExpiryJob.class);

    private final OrderRepository orders;
    private final OrderService orderService;
    private final AppProperties props;

    public OrderExpiryJob(OrderRepository orders, OrderService orderService, AppProperties props) {
        this.orders = orders;
        this.orderService = orderService;
        this.props = props;
    }

    @Scheduled(fixedDelayString = "${app.order.expiry-check-interval}", initialDelayString = "${app.order.expiry-check-interval}")
    public void run() {
        Instant before = Instant.now().minus(props.order().unpaidTimeout());
        int cancelled = 0;
        for (Long id : orders.findIdsByStatusCreatedBefore(OrderStatus.PENDING_PAYMENT, before)) {
            try {
                if (orderService.expireIfUnpaid(id, before)) {
                    cancelled++;
                }
            } catch (RuntimeException e) {
                log.warn("Could not expire order {}", id, e);
            }
        }
        if (cancelled > 0) {
            log.info("Cancelled {} unpaid orders", cancelled);
        }
    }
}
