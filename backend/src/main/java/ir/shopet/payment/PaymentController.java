package ir.shopet.payment;

import java.net.URI;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import ir.shopet.common.ApiException;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /** Gateway callback: verifies the payment then sends the customer back to the shop. */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam Map<String, String> params) {
        PaymentService.CallbackResult result = paymentService.handleCallback(params);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(paymentService.resultUrl(result))).build();
    }

    /** Simulated bank page used by the mock gateway. */
    @GetMapping(value = "/mock/{authority}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> mockGatewayPage(@PathVariable String authority) {
        Payment payment = paymentService.requireByAuthority(authority);
        if (!MockPaymentGateway.NAME.equals(payment.getGateway())) {
            throw ApiException.notFound("پرداخت پیدا نشد.");
        }
        String a = HtmlUtils.htmlEscape(payment.getAuthority());
        String amount = String.format("%,d", payment.getAmount());
        String html = """
                <!doctype html>
                <html lang="fa" dir="rtl">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>درگاه پرداخت آزمایشی</title>
                <style>
                  body{font-family:Vazirmatn,Tahoma,sans-serif;background:#eef2f7;margin:0;display:flex;
                       min-height:100vh;align-items:center;justify-content:center;color:#1f2937}
                  .card{background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:32px;
                        width:min(420px,calc(100%% - 32px));text-align:center}
                  h1{font-size:20px;margin:0 0 8px}
                  .muted{color:#6b7280;font-size:14px}
                  .amount{font-size:28px;font-weight:700;margin:24px 0;color:#0f766e}
                  a{display:block;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:12px}
                  .ok{background:#0f766e;color:#fff}
                  .nok{background:#fee2e2;color:#b91c1c}
                </style>
                </head>
                <body>
                <div class="card">
                  <h1>درگاه پرداخت آزمایشی شاپت</h1>
                  <div class="muted">سفارش شماره %d</div>
                  <div class="amount">%s تومان</div>
                  <div class="muted">این یک درگاه شبیه‌سازی‌شده است و مبلغی از حساب شما کسر نمی‌شود.</div>
                  <a id="pay-success" class="ok" href="/api/payments/callback?authority=%s&amp;status=OK">پرداخت موفق</a>
                  <a id="pay-cancel" class="nok" href="/api/payments/callback?authority=%s&amp;status=NOK">انصراف از پرداخت</a>
                </div>
                </body>
                </html>
                """.formatted(payment.getOrderId(), amount, a, a);
        return ResponseEntity.ok().contentType(new MediaType("text", "html", java.nio.charset.StandardCharsets.UTF_8))
                .body(html);
    }
}
