import { expect, test } from '@playwright/test'
import { PNG_1X1, adminToken, apiLogin, findProduct, placePaidOrder, randomPhone, useToken } from '../helpers'

test('admin creates a product with an image and it appears in the shop', async ({ page, request }) => {
  await useToken(page, adminToken())
  const name = `توپ تنیس سگ ${Date.now()}`

  await page.goto('/admin/products')
  await page.getByRole('link', { name: 'محصول جدید' }).click()
  await page.getByLabel('نام محصول').fill(name)
  await page.getByLabel('برند').fill('کنگ')
  await page.getByLabel('قیمت (تومان)').fill('۳۵۰۰۰۰')
  await page.getByLabel('قیمت با تخفیف (اختیاری)').fill('300000')
  await page.getByLabel('موجودی').fill('12')
  await page.getByLabel('توضیحات').fill('توپ مقاوم برای بازی‌های پرتابی')
  await page.getByRole('button', { name: 'ذخیره' }).click()

  await expect(page).toHaveURL(/\/admin\/products\/\d+$/)
  const productUrl = page.url()
  await expect(page.getByRole('heading', { name: 'ویرایش محصول' })).toBeVisible()
  await page.getByTestId('image-input').setInputFiles({ name: 'ball.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(page.getByRole('button', { name: 'حذف تصویر' })).toHaveCount(1)

  // Discount price must be below the price.
  await page.getByLabel('قیمت با تخفیف (اختیاری)').fill('400000')
  await page.getByRole('button', { name: 'ذخیره' }).click()
  await expect(page.getByText('قیمت با تخفیف باید کمتر از قیمت اصلی باشد.')).toBeVisible()

  // Visible in the shop with its image and discount.
  await page.goto(`/products?q=${encodeURIComponent(name)}`)
  const card = page.getByTestId('product-card')
  await expect(card).toHaveCount(1)
  await expect(card.locator('img')).toHaveAttribute('src', /\/api\/files\/[a-f0-9]{32}\.png/)
  await expect(card.getByTestId('final-price')).toContainText('۳۰۰٬۰۰۰')
  await expect(card.getByText('۱۴٪')).toBeVisible()

  // Remove the test product so it doesn't clutter the demo shop.
  const id = Number(new URL(productUrl).pathname.split('/').pop())
  const res = await request.delete(`/api/admin/products/${id}`, { headers: { Authorization: `Bearer ${adminToken()}` } })
  expect(res.status()).toBe(204)
})

test('admin moves a paid order through the workflow and the customer can then review', async ({ page, request }) => {
  const customer = await apiLogin(request, randomPhone())
  const product = await findProduct(request, 'تونل بازی گربه')
  const orderId = await placePaidOrder(request, customer, product.id)

  await useToken(page, adminToken())
  await page.goto('/admin/orders')
  await page.getByLabel('وضعیت').click()
  await page.getByRole('option', { name: 'پرداخت‌شده' }).click()
  await page.getByRole('row').filter({ hasText: `#${orderId.toLocaleString('fa-IR', { useGrouping: false })}` }).click()

  const dialog = page.getByRole('dialog')
  for (const next of ['در حال آماده‌سازی', 'ارسال‌شده', 'تحویل‌شده']) {
    await dialog.getByRole('button', { name: `تغییر به «${next}»` }).click()
    await expect(dialog.getByText(next).first()).toBeVisible()
  }
  await expect(dialog.getByRole('button', { name: /تغییر به/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'بستن' }).click()

  // The customer sees the delivered order and leaves a review.
  await page.evaluate(() => localStorage.clear())
  await useToken(page, customer)
  await page.goto(`/account/orders/${orderId}`)
  await expect(page.getByText('تحویل‌شده').first()).toBeVisible()

  await page.goto(`/products/${product.id}`)
  await page.locator('label', { hasText: '4 Stars' }).click()
  await expect(page.getByRole('radio', { name: '4 Stars' })).toBeChecked()
  const comment = `گربه‌ام خیلی دوستش دارد! (${Date.now()})`
  await page.getByLabel('متن نظر (اختیاری)').fill(comment)
  await page.getByRole('button', { name: 'ثبت نظر' }).click()
  await expect(page.getByText(comment)).toBeVisible()
  await expect(page.getByRole('button', { name: 'ثبت نظر' })).toHaveCount(0)
})

test('admin manages coupons and categories', async ({ page }) => {
  await useToken(page, adminToken())
  const code = `E2E${Date.now() % 1_000_000}`

  await page.goto('/admin/coupons')
  await page.getByRole('button', { name: 'کد جدید' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('کد').fill(code)
  await dialog.getByLabel('درصد تخفیف').fill('150')
  await dialog.getByRole('button', { name: 'ذخیره' }).click()
  await expect(page.getByText('درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.')).toBeVisible()
  await dialog.getByLabel('درصد تخفیف').fill('15')
  await dialog.getByRole('button', { name: 'ذخیره' }).click()
  await expect(dialog).toBeHidden()
  const couponRow = page.getByRole('row').filter({ hasText: code })
  await expect(couponRow).toContainText('۱۵٪')
  page.once('dialog', (d) => d.accept())
  await couponRow.getByRole('button', { name: 'حذف' }).click()
  await expect(couponRow).toHaveCount(0)

  const slug = `e2e-${Date.now()}`
  await page.goto('/admin/categories')
  await page.getByRole('button', { name: 'دسته‌بندی جدید' }).click()
  await page.getByRole('dialog').getByLabel('نام', { exact: true }).fill('دسته آزمایشی')
  await page.getByRole('dialog').getByLabel('نامک (انگلیسی، برای آدرس)').fill(slug)
  await page.getByRole('dialog').getByRole('button', { name: 'ذخیره' }).click()
  const row = page.getByRole('row').filter({ hasText: slug })
  await expect(row).toBeVisible()

  page.once('dialog', (d) => d.accept())
  await row.getByRole('button', { name: 'حذف' }).click()
  await expect(row).toHaveCount(0)
})

test('dashboard shows store statistics', async ({ page }) => {
  await useToken(page, adminToken())
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible()
  await expect(page.getByText('آخرین سفارش‌ها')).toBeVisible()
  await expect(page.getByText('کالاهای رو به اتمام')).toBeVisible()
})
