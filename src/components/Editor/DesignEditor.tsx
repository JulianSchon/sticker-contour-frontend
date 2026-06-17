import { useEffect, useMemo, useRef, useState } from 'react';
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

const MIN_DISPLAY = 280;
const FRAME_PAD = 48; // p-6 on the frame container (24px each side)

interface Props {
  /** Hand the flattened design off to the contour page for cut refinement. */
  onComplete: (file: File, dataUrl: string, widthCm: number, heightCm: number) => void;
}

export function DesignEditor({ onComplete }: Props) {
  const { t } = useLang();
  const [size, setSize] = useState<ArtboardSize>(DEFAULT_ARTBOARD);
  const [tool, setTool] = useState<EditorTool>('uploads');
  const [isFlattening, setIsFlattening] = useState(false);

  // Measure the available frame area and size the canvas to fill it, growing
  // with the window while preserving the artboard aspect ratio.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameBox, setFrameBox] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setFrameBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = size.hCm / size.wCm;
  const displayWidth = useMemo(() => {
    const availW = frameBox.w - FRAME_PAD;
    const availH = frameBox.h - FRAME_PAD;
    return Math.max(MIN_DISPLAY, Math.floor(Math.min(availW, availH / aspect)));
  }, [frameBox, aspect]);
  const displayHeight = useMemo(() => Math.round(displayWidth * aspect), [displayWidth, aspect]);

  const editor = useFabricEditor(displayWidth, displayHeight);
  const { canvas, undo, redo, deleteSelected, duplicateSelected, selectedId } = editor;

  // Keyboard shortcuts: undo/redo, delete, duplicate, arrow-nudge.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const active = canvas?.getActiveObject() as unknown as { isEditing?: boolean } | undefined;
      if (typing || active?.isEditing) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); void duplicateSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) { e.preventDefault(); deleteSelected(); }
        return;
      }
      if (canvas && selectedId && e.key.startsWith('Arrow')) {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') obj.set('left', (obj.left ?? 0) - step);
        if (e.key === 'ArrowRight') obj.set('left', (obj.left ?? 0) + step);
        if (e.key === 'ArrowUp') obj.set('top', (obj.top ?? 0) - step);
        if (e.key === 'ArrowDown') obj.set('top', (obj.top ?? 0) + step);
        obj.setCoords();
        canvas.fire('object:modified', { target: obj });
        canvas.renderAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canvas, undo, redo, deleteSelected, duplicateSelected, selectedId]);

  const handleContinue = async () => {
    if (!editor.canvas || editor.layers.length === 0) return;
    setIsFlattening(true);
    try {
      const { widthPx } = exportDimensions(size.wCm, size.hCm);
      const { file, dataUrl } = await flattenCanvas(editor.canvas, displayWidth, widthPx);
      onComplete(file, dataUrl, size.wCm, size.hCm);
    } finally {
      setIsFlattening(false);
    }
  };

  const canContinue = editor.canvas !== null && editor.layers.length > 0 && !isFlattening;
  const isEmpty = editor.layers.length === 0;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-nim-black">
      <EditorToolbar
        size={size}
        onSizeChange={setSize}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
      />
      <div className="flex">
        <ToolRail active={tool} onChange={setTool} />

        <div className="w-52 bg-nim-black border-r border-white/10 p-3">
          {tool === 'uploads' && <UploadPanel onImage={f => void editor.addImageFromFile(f)} />}
          {tool === 'text' && (
            <TextPanel
              onAddText={editor.addText}
              selected={editor.selected}
              onUpdate={editor.updateSelected}
            />
          )}
          {tool === 'shape' && (
            <ShapePanel
              onAddShape={(kind, color) => editor.addShape(kind, color)}
              onColorChange={color => editor.updateSelected({ fill: color })}
            />
          )}
          {(tool === 'templates' || tool === 'elements') && (
            <p className="text-xs text-white/30">—</p>
          )}
        </div>

        <div
          ref={frameRef}
          className="relative flex-1 flex items-center justify-center bg-[#0a0a0a] p-6 h-[70vh] min-h-[420px] overflow-hidden"
        >
          <EditorCanvas
            canvasElRef={editor.canvasElRef}
            displayWidth={displayWidth}
            displayHeight={displayHeight}
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center max-w-xs px-6">{t.edEmptyCanvas}</p>
            </div>
          )}
        </div>

        <LayersPanel
          layers={editor.layers}
          selectedId={editor.selectedId}
          selected={editor.selected}
          onSelect={editor.selectLayer}
          onDelete={() => { editor.deleteSelected(); }}
          onDuplicate={() => { void editor.duplicateSelected(); }}
          onForward={() => { editor.bringForward(); }}
          onBackward={() => { editor.sendBackward(); }}
          onUpdate={editor.updateSelected}
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
