import { test, expect } from '@playwright/test';

test('design tab: build a design and hand off to the contour page', async ({ page }) => {
  await page.goto('/');

  // Open the Design tab (t.tabDesign = "Design" in both EN and SV)
  await page.getByRole('button', { name: /^Design$/i }).click();

  // Layers panel is visible (t.edLayers = "Lager" SV / "Layers" EN)
  await expect(page.getByText(/^(Lager|Layers)$/i).first()).toBeVisible();

  // Add text via the Text tool (t.edToolText = "Text")
  await page.getByRole('button', { name: /^Text$/i }).first().click();
  await page.getByPlaceholder(/lägg till text|add text/i).fill('HELLO');
  await page.getByRole('button', { name: /lägg till text|add text/i }).click();

  // Continue to cut setup — flattens the design and hands off to the contour page
  // (t.edContinue = "Fortsätt till skärval" SV / "Continue to cut setup" EN)
  await page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i }).click();

  // We should now be on the contour flow: the cut-shape selector + download CTA appear.
  // (Shape labels: "Kontur"/"Contour"; download CTA: "Ladda ner PDF"/"Download PDF".)
  await expect(page.getByText(/^(Kontur|Contour)$/i).first()).toBeVisible();
  const cta = page.getByRole('button', { name: /ladda ner pdf|download pdf|spara design|save design/i });
  await expect(cta.first()).toBeVisible();
});
