import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL ?? 'manager@test.com')
  await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD ?? 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/manager\/calendario/)
})

test('mostra la griglia calendario', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('text=Calendario Turni')).toBeVisible()
})

test('switch tra vista settimanale e mensile', async ({ page }) => {
  await page.click('button:has-text("mese")')
  await expect(page.locator('button:has-text("mese")')).toHaveClass(/bg-blue-600/)
  await page.click('button:has-text("settimana")')
  await expect(page.locator('button:has-text("settimana")')).toHaveClass(/bg-blue-600/)
})
