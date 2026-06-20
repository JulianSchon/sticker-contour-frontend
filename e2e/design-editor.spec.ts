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

  // Go back to edit the design — the editor and the work should still be there.
  await page.getByRole('button', { name: /redigera design|edit design/i }).click();
  await expect(page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i })).toBeVisible();
  // The "HELLO" text layer persisted in the Layers panel.
  await expect(page.getByRole('button', { name: 'HELLO' })).toBeVisible();

  // Navigating via the Contour-generator tab (not just "Continue") also flattens
  // the current design and lands on the cut dialog.
  await page.getByRole('button', { name: /contour generator|kontur/i }).first().click();
  await expect(page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /ladda ner pdf|download pdf/i }).first()).toBeVisible();
});

test('WP: send a design to the sheet and open ARK', async ({ page }) => {
  await page.goto('/');

  // Build a design.
  await page.getByRole('button', { name: /^Text$/i }).first().click();
  await page.getByPlaceholder(/lägg till text|add text/i).fill('SHEET');
  await page.getByRole('button', { name: /lägg till text|add text/i }).click();
  await page.getByRole('button', { name: /fortsätt till skärval|continue to cut setup/i }).click();

  // Wait for the cut step to render (its download/save button is present in both modes).
  await page
    .getByRole('button', { name: /spara design|save design|ladda ner pdf|download pdf/i })
    .waitFor({ timeout: 15000 });

  // "Send to sheet" only exists in WordPress mode — skip otherwise.
  const sendBtn = page.getByRole('button', { name: /skicka till ark|send to sheet/i });
  if (await sendBtn.count() === 0) test.skip(true, 'standalone mode — no sheet flow');

  await sendBtn.first().click();

  // After a successful send, a prompt asks whether to add another or go to the sheet.
  await expect(
    page.getByText(/lägg till ytterligare design på ark eller gå till arket|add another design to the sheet/i)
  ).toBeVisible({ timeout: 15000 });

  // The ARK badge also appears with a count.
  await expect(page.getByRole('button', { name: /^(Ark|Sheet)\s*1$/i })).toBeVisible();

  // Choosing "go to the sheet" opens the ARK view.
  await page.getByRole('button', { name: /gå till arket|go to the sheet/i }).click();

  // ARK shows the sticker list with Save Sheet.
  await expect(page.getByRole('button', { name: /spara ark|save sheet/i })).toBeVisible();
});

test('templates and clipart libraries work', async ({ page }) => {
  await page.goto('/');

  // ── Templates ──────────────────────────────────────────────────────────────
  // Open the Templates tool (SV: "Mallar", EN: "Templates").
  // The button text is t.edToolTemplates; the title is the tooltip t.edTipTemplates.
  // We match on text content, not title.
  await page.getByRole('button', { name: /^(Mallar|Templates)$/i }).click();

  // Template buttons are rendered as <button title={tpl.name}> with an inner
  // <span>{tpl.name}</span>.  The accessible name is therefore the text "Name badge",
  // "Circle logo", or "Quote".  Click the first one.
  await page.getByRole('button', { name: /name badge|circle logo|quote/i }).first().click();

  // After applying a template the Layers panel heading becomes visible and contains
  // at least one layer button (the shapes/text from the template).
  await expect(page.getByText(/^(Lager|Layers)$/i).first()).toBeVisible();
  // At least one layer button should now be present.
  await expect(page.locator('.flex.flex-col.gap-1 button').first()).toBeVisible();

  // ── Elements (clipart) ─────────────────────────────────────────────────────
  // Open the Elements tool (SV: "Element", EN: "Elements").
  await page.getByRole('button', { name: /^Element(s)?$/i }).first().click();

  // The Star clipart button: no visible text, but the img inside has alt="Star"
  // so the button's accessible name is "Star".  Click it.
  // (.first() guards against the layer button that will appear after the click.)
  await page.getByRole('button', { name: /^Star$/i }).first().click();

  // A "Star" layer button (text content "Star") now appears in the Layers panel.
  // There are now two buttons whose accessible name is "Star": the clipart button
  // and the new layer button.  We verify the layer button specifically by checking
  // that there are at least 2 matches (clipart + layer).
  await expect(page.getByRole('button', { name: /^Star$/i })).toHaveCount(2);
});
