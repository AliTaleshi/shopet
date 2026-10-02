import { expect, test, type Page } from '@playwright/test'
import { randomPhone } from '../helpers'

async function loginThroughUi(page: Page, phone: string, name?: string) {
  await page.getByLabel('شماره موبایل').fill(phone)
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click()
  const code = (await page.getByTestId('dev-code').locator('b').textContent())!.trim()
  await page.getByLabel('کد تأیید').fill(code)
  await page.getByRole('button', { name: 'ورود', exact: true }).click()
  // Random numbers are always new users, who are asked for their name.
  await expect(page.getByText('تکمیل اطلاعات')).toBeVisible()
  if (name) {
    await page.getByLabel('نام و نام خانوادگی').fill(name)
    await page.getByRole('button', { name: 'ذخیره و ادامه' }).click()
  } else {
    await page.getByRole('button', { name: 'بعداً' }).click()
  }
  await expect(page.getByRole('button', { name: 'حساب کاربری' })).toBeVisible()
}

async function addAddress(page: Page) {
  await page.getByRole('button', { name: 'آدرس جدید' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('عنوان (مثلاً خانه)').fill('خانه')
  await dialog.getByLabel('نام و نام خانوادگی گیرنده').fill('سارا رضایی')
  await dialog.getByLabel('موبایل گیرنده').fill('۰۹۱۲۱۲۳۴۵۶۷')
  await dialog.getByLabel('کد پستی ۱۰ رقمی').fill('1234567890')
  await dialog.getByLabel('استان').fill('تهران')
  await dialog.getByLabel('شهر').fill('تهران')
  await dialog.getByLabel('نشانی کامل').fill('خیابان ولیعصر، کوچه گل‌ها، پلاک ۷')
  await dialog.getByRole('button', { name: 'ذخیره آدرس' }).click()
  await expect(dialog).toBeHidden()
}

test('guest browses, buys with a coupon after OTP login, and sees the paid order', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /دوست کوچولوی شما/ })).toBeVisible()

  // Search from the header (Persian text, Arabic-keyboard "ي" is normalized by the backend).
  await page.getByRole('textbox', { name: 'جستجو' }).first().fill('غذای خشک گربه')
  await page.getByRole('textbox', { name: 'جستجو' }).first().press('Enter')
  await expect(page).toHaveURL(/\/products\?q=/)
  await expect(page.getByRole('heading', { name: /نتایج جستجو/ })).toBeVisible()

  // Filter by pet type and open a product.
  await page.goto('/products?petType=DOG&sort=price_desc')
  const card = page.getByTestId('product-card').filter({ hasText: 'غذای خشک سگ بالغ' })
  await card.getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('غذای خشک سگ بالغ')

  // Add 2 to the guest cart.
  await page.getByRole('button', { name: 'افزودن به سبد' }).click()
  await page.getByRole('button', { name: 'افزایش تعداد' }).click()
  await expect(page.getByTestId('quantity')).toHaveText('۲')
  await expect(page.getByTestId('cart-count')).toContainText('۲')

  await page.getByRole('link', { name: 'سبد خرید' }).click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await page.getByRole('button', { name: 'ورود و ادامه خرید' }).click()

  // OTP login as a new user; the guest cart is merged into the account.
  await expect(page).toHaveURL(/\/login/)
  await loginThroughUi(page, randomPhone(), 'سارا رضایی')
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText(/کالاهای سفارش/)).toContainText('۲')

  await addAddress(page)
  await expect(page.getByRole('radio')).toBeChecked()

  // Coupons: invalid then valid.
  await page.getByRole('textbox', { name: 'کد تخفیف' }).fill('NOPE')
  await page.getByRole('button', { name: 'اعمال' }).click()
  await expect(page.getByText('کد تخفیف معتبر نیست.')).toBeVisible()
  await page.getByRole('textbox', { name: 'کد تخفیف' }).fill('welcome10')
  await page.getByRole('button', { name: 'اعمال' }).click()
  await expect(page.getByText('کد WELCOME10 اعمال شد')).toBeVisible()
  const total = await page.getByTestId('checkout-total').textContent()

  // Pay on the simulated bank page.
  await page.getByRole('button', { name: 'ثبت سفارش و پرداخت' }).click()
  await expect(page).toHaveTitle('درگاه پرداخت آزمایشی')
  await page.getByRole('link', { name: 'پرداخت موفق' }).click()

  await expect(page.getByText('پرداخت با موفقیت انجام شد')).toBeVisible()
  await expect(page.getByTestId('cart-count').locator('.MuiBadge-badge')).toHaveClass(/MuiBadge-invisible/)
  await page.getByRole('link', { name: 'مشاهده سفارش' }).click()
  await expect(page.getByText('پرداخت‌شده').first()).toBeVisible()
  await expect(page.getByText('WELCOME10')).toBeVisible()
  await expect(page.getByText(total!.trim()).first()).toBeVisible()

  await page.getByRole('tab', { name: 'سفارش‌ها' }).click()
  await expect(page.getByTestId('order-row')).toHaveCount(1)
})

test('failed payment can be retried later, or the order cancelled to release stock', async ({ page, request }) => {
  const product = await (await request.get('/api/products', { params: { q: 'چرخ ورزشی همستر' } })).json()
  const stockBefore: number = product.content[0].stock

  await page.goto(`/products/${product.content[0].id}`)
  await page.getByRole('button', { name: 'افزودن به سبد' }).click()
  await page.goto('/checkout')
  await loginThroughUi(page, randomPhone())
  await expect(page).toHaveURL(/\/checkout/)
  await addAddress(page)
  await page.getByRole('button', { name: 'ثبت سفارش و پرداخت' }).click()

  await page.getByRole('link', { name: 'انصراف از پرداخت' }).click()
  await expect(page.getByText('پرداخت ناموفق بود')).toBeVisible()
  const reserved = await (await request.get(`/api/products/${product.content[0].id}`)).json()
  expect(reserved.stock).toBe(stockBefore - 1)

  await page.getByRole('link', { name: 'پرداخت مجدد' }).click()
  await expect(page.getByText('این سفارش هنوز پرداخت نشده است.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'لغو سفارش' }).click()
  await expect(page.getByText('لغو‌شده').first()).toBeVisible()

  const released = await (await request.get(`/api/products/${product.content[0].id}`)).json()
  expect(released.stock).toBe(stockBefore)
})

test('wishlist requires login and keeps liked products', async ({ page }) => {
  await page.goto('/products?petType=BIRD')
  await page.getByTestId('product-card').first().getByRole('button', { name: 'افزودن به علاقه‌مندی‌ها' }).click()
  await expect(page).toHaveURL(/\/login/)
  await loginThroughUi(page, randomPhone())

  await page.goto('/products?petType=BIRD')
  await expect(page.getByRole('button', { name: 'حساب کاربری' })).toBeVisible()
  const first = page.getByTestId('product-card').first()
  const name = (await first.locator('.MuiTypography-body2').first().textContent())!.trim()
  await first.getByRole('button', { name: 'افزودن به علاقه‌مندی‌ها' }).click()
  await expect(first.getByRole('button', { name: 'حذف از علاقه‌مندی‌ها' })).toBeVisible()

  await page.goto('/account/wishlist')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card')).toContainText(name)
})

test('customers cannot open the admin panel', async ({ page }) => {
  await page.goto('/login')
  await loginThroughUi(page, randomPhone())
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)
})
