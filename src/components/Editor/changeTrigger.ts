/** Whether a fabric canvas mutation should trigger a re-flatten / version bump.
 *  Sticker-body (background) mutations must NOT — they are produced by the
 *  body-sync effect and would cause an infinite loop. */
export function shouldBumpForLayerKind(kind: string | undefined): boolean {
  return kind !== 'background';
}
