/** Ensure the given font families are loaded before rasterizing canvas text.
 *  Failures are swallowed — a missing web font must never block export. */
export async function ensureFontsLoaded(
  families: string[],
  sizePx: number,
  fontSet: FontFaceSet = document.fonts,
): Promise<void> {
  await Promise.all(
    families.map(family =>
      fontSet.load(`${sizePx}px "${family}"`).catch(() => undefined),
    ),
  );
  await fontSet.ready.catch(() => undefined);
}
