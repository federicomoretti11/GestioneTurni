import { test, expect } from '@playwright/test'

test('redirect a /login se non autenticato', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/login/)
})

test('mostra errore con credenziali errate', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'nonesiste@test.com')
  await page.fill('input[type="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Email o password non validi')).toBeVisible()
})

test('login manager con credenziali corrette reindirizza al calendario', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL ?? 'manager@test.com')
  await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD ?? 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/manager\/calendario/)
})
