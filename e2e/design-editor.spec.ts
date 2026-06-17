import { test, expect } from '@playwright/test';

test('design tab loads the editor and adds text', async ({ page }) => {
  await page.goto('/');

  // Click the Design tab (t.tabDesign = "Design" in both EN and SV)
  await page.getByRole('button', { name: /^Design$/i }).click();

  // Layers panel is visible (t.edLayers = "Lager" in SV, "Layers" in EN)
  await expect(page.getByText(/^(Lager|Layers)$/i).first()).toBeVisible();

  // Click the Text tool in the tool rail (t.edToolText = "Text" in both EN and SV)
  await page.getByRole('button', { name: /^Text$/i }).first().click();

  // Fill in the text input (placeholder t.edAddText = "Lägg till text" SV / "Add text" EN)
  await page.getByPlaceholder(/lägg till text|add text/i).fill('HELLO');

  // Click the add-text button (label is "+ Lägg till text" or "+ Add text")
  await page.getByRole('button', { name: /lägg till text|add text/i }).click();

  // The Download CTA is present (t.downloadPdf = "Ladda ner PDF" SV / "Download PDF" EN)
  const cta = page.getByRole('button', { name: /ladda ner pdf|download pdf|spara design|save design/i });
  await expect(cta.first()).toBeVisible();
});
