import { test, expect } from '@playwright/test';

test('design is default, build a design and hand off to the cut dialog', async ({ page }) => {
  await page.goto('/');

  // Design is the default view — the Layers panel is visible without navigating.
  await expect(page.getByText(/^(Lager|Layers)$/i).first()).toBeVisible();

  // Add text via the Text tool (t.edToolText = "Text")
  await page.getByRole('button', { name: /^Text$/i }).first().click();
  await page.getByPlaceholder(/lägg till text|add text/i).fill('HELLO');
  await page.getByRole('button', { name: /lägg till text|add text/i }).click();

  // Continue to cut setup — flattens the design and hands off to the cut dialog
  // (t.edContinue = "Fortsätt till skärval" SV / "Continue to cut setup" EN)
  await page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i }).click();

  // We should now be on the cut dialog: the download/save CTA is present
  // (the editor's "Continue" button is gone). Upload/size/shape are no longer here.
  await expect(page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i })).toHaveCount(0);
  const cta = page.getByRole('button', { name: /ladda ner pdf|download pdf|spara design|save design/i });
  await expect(cta.first()).toBeVisible();
});
