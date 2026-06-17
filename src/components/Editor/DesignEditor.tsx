import { useMemo, useState } from 'react';
import { useFabricEditor } from '../../hooks/useFabricEditor.ts';
import { EditorCanvas } from './EditorCanvas.tsx';
import { EditorToolbar } from './EditorToolbar.tsx';
import { ToolRail } from './ToolRail.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { UploadPanel } from './panels/UploadPanel.tsx';
import { TextPanel } from './panels/TextPanel.tsx';
import { ShapePanel } from './panels/ShapePanel.tsx';
import { flattenCanvas } from '../../lib/flatten.ts';
import { exportDimensions } from '../../lib/printSize.ts';
import { useLang } from '../../lib/LangContext.ts';
import { DEFAULT_ARTBOARD, type ArtboardSize, type EditorTool } from '../../types/editor.ts';
import type { IText } from 'fabric';

const DISPLAY_WIDTH = 520;

interface Props {
  /** Hand the flattened design off to the contour page for cut refinement. */
  onComplete: (file: File, dataUrl: string, widthCm: number, heightCm: number) => void;
}

export function DesignEditor({ onComplete }: Props) {
  const { t } = useLang();
  const [size, setSize] = useState<ArtboardSize>(DEFAULT_ARTBOARD);
  const [tool, setTool] = useState<EditorTool>('uploads');
  const [isFlattening, setIsFlattening] = useState(false);

  const displayHeight = useMemo(
    () => Math.round(DISPLAY_WIDTH * (size.hCm / size.wCm)),
    [size],
  );

  const editor = useFabricEditor(DISPLAY_WIDTH, displayHeight);

  const applyToSelectedText = (mutate: (it: IText) => void) => {
    const active = editor.canvas?.getActiveObject() as unknown as IText | undefined;
    if (active && active.type === 'i-text') {
      mutate(active);
      editor.canvas?.renderAll();
    }
  };

  const handleContinue = async () => {
    if (!editor.canvas || editor.layers.length === 0) return;
    setIsFlattening(true);
    try {
      const { widthPx } = exportDimensions(size.wCm, size.hCm);
      const { file, dataUrl } = await flattenCanvas(editor.canvas, DISPLAY_WIDTH, widthPx);
      onComplete(file, dataUrl, size.wCm, size.hCm);
    } finally {
      setIsFlattening(false);
    }
  };

  const canContinue = editor.canvas !== null && editor.layers.length > 0 && !isFlattening;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-nim-black">
      <EditorToolbar size={size} onSizeChange={setSize} />
      <div className="flex">
        <ToolRail active={tool} onChange={setTool} />

        <div className="w-56 bg-nim-black border-r border-white/10 p-3">
          {tool === 'uploads' && <UploadPanel onImage={f => void editor.addImageFromFile(f)} />}
          {tool === 'text' && (
            <TextPanel
              hasSelection={editor.selectedId !== null}
              onAddText={editor.addText}
              onFontChange={family => applyToSelectedText(it => it.set('fontFamily', family))}
              onColorChange={color => applyToSelectedText(it => it.set('fill', color))}
            />
          )}
          {tool === 'shape' && (
            <ShapePanel
              onAddShape={(kind, color) => editor.addShape(kind, color)}
              onColorChange={color => editor.setFillOnSelected(color)}
            />
          )}
          {(tool === 'templates' || tool === 'elements') && (
            <p className="text-xs text-white/30">—</p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] p-6">
          <EditorCanvas
            canvasElRef={editor.canvasElRef}
            displayWidth={DISPLAY_WIDTH}
            displayHeight={displayHeight}
          />
        </div>

        <LayersPanel
          layers={editor.layers}
          selectedId={editor.selectedId}
          onSelect={editor.selectLayer}
          onDelete={() => { editor.deleteSelected(); }}
          onForward={() => { editor.bringForward(); }}
          onBackward={() => { editor.sendBackward(); }}
        />
      </div>

      <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
        <p className="text-xs text-white/30 mr-auto">{t.edContinueHint}</p>
        <button onClick={handleContinue} disabled={!canContinue} className="nim-btn-yellow">
          {isFlattening ? t.edPreparing : `${t.edContinue} →`}
        </button>
      </div>
    </div>
  );
}
