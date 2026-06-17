interface Props {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  displayWidth: number;
  displayHeight: number;
}

/** Renders the Fabric design canvas. Cut-contour preview/refinement happens on
 *  the dedicated contour page after the design is handed off (flattened). */
export function EditorCanvas({ canvasElRef, displayWidth, displayHeight }: Props) {
  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      <canvas ref={canvasElRef} width={displayWidth} height={displayHeight} className="absolute inset-0" />
    </div>
  );
}
