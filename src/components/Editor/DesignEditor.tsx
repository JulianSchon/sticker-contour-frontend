import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useFabricEditor } from '../../hooks/useFabricEditor.ts';
import { EditorCanvas, RULER } from './EditorCanvas.tsx';
import { EditorToolbar } from './EditorToolbar.tsx';
import { ToolRail } from './ToolRail.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { UploadPanel } from './panels/UploadPanel.tsx';
import { TextPanel } from './panels/TextPanel.tsx';
import { ShapePanel } from './panels/ShapePanel.tsx';
import { TemplatesPanel } from './panels/TemplatesPanel.tsx';
import { ElementsPanel } from './panels/ElementsPanel.tsx';
import { useContentLibrary } from '../../hooks/useContentLibrary.ts';
import { flattenCanvas } from '../../lib/flatten.ts';
import { exportDimensions } from '../../lib/printSize.ts';
import { useLang } from '../../lib/LangContext.ts';
import { DEFAULT_ARTBOARD, type ArtboardSize, type EditorTool } from '../../types/editor.ts';
import type { StickerTemplate } from '../../types/template.ts';
import { TemplateGuide } from './TemplateGuide.tsx';
import { TemplateFill } from './TemplateFill.tsx';
import { BgColorControl } from './BgColorControl.tsx';
import { ShieldMirror } from './ShieldMirror.tsx';
import { shieldBBoxes } from '../../lib/shieldBBox.ts';
import { replicateLeftToRight } from '../../lib/shieldReplicate.ts';

const MIN_DISPLAY = 280;
const FRAME_PAD = 48; // p-6 on the frame container (24px each side)

interface Props {
  /** Hand the flattened design off to the contour page for cut refinement. */
  onComplete: (file: File, dataUrl: string, widthCm: number, heightCm: number) => void;
  template?: StickerTemplate;
  bgColor?: string;
  onBgColorChange?: (hex: string) => void;
  onSaveTemplate?: (file: File, dataUrl: string) => Promise<void>;
  pairMode?: 'identical' | 'different';
  onPairModeChange?: (m: 'identical' | 'different') => void;
}

export interface FlattenedDesign {
  file: File;
  dataUrl: string;
  widthCm: number;
  heightCm: number;
}

export interface DesignEditorHandle {
  /** Flatten the current design, or null if the canvas is empty. */
  flatten: () => Promise<FlattenedDesign | null>;
  /** Remove all objects so the user can start a fresh design. */
  clear: () => void;
}

export const DesignEditor = forwardRef<DesignEditorHandle, Props>(function DesignEditor({ onComplete, template, bgColor, onBgColorChange, onSaveTemplate, pairMode, onPairModeChange }, ref) {
  const { t } = useLang();
  const [size, setSize] = useState<ArtboardSize>(DEFAULT_ARTBOARD);
  const [tool, setTool] = useState<EditorTool>('uploads');
  const [isFlattening, setIsFlattening] = useState(false);

  useEffect(() => {
    if (template) setSize({ wCm: template.widthMm / 10, hCm: template.heightMm / 10 });
  }, [template]);

  const shieldBoxes = useMemo(() => (template ? shieldBBoxes(template) : []), [template]);

  // Measure the available frame area and size the canvas to fill it, growing
  // with the window while preserving the artboard aspect ratio.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameBox, setFrameBox] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // Ignore measurements while the editor is hidden (clientWidth 0), so the
      // canvas doesn't collapse/rescale when we switch to the cut dialog.
      if (el.clientWidth === 0) return;
      setFrameBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = size.hCm / size.wCm;
  const displayWidth = useMemo(() => {
    const availW = frameBox.w - FRAME_PAD - RULER;
    const availH = frameBox.h - FRAME_PAD - RULER;
    return Math.max(MIN_DISPLAY, Math.floor(Math.min(availW, availH / aspect)));
  }, [frameBox, aspect]);
  const displayHeight = useMemo(() => Math.round(displayWidth * aspect), [displayWidth, aspect]);

  const editor = useFabricEditor(displayWidth, displayHeight);
  const { library, isLoading: libLoading } = useContentLibrary();
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

  const flatten = useCallback(async (): Promise<FlattenedDesign | null> => {
    if (!editor.canvas || editor.layers.length === 0) return null;
    const { widthPx } = exportDimensions(size.wCm, size.hCm);
    const { file, dataUrl } = await flattenCanvas(editor.canvas, displayWidth, widthPx);
    return { file, dataUrl, widthCm: size.wCm, heightCm: size.hCm };
  }, [editor.canvas, editor.layers.length, size, displayWidth]);

  // Expose flatten()/clear() so the cut tab can refresh from the design and the
  // sheet flow can reset the artboard for the next design.
  useImperativeHandle(ref, () => ({ flatten, clear: editor.clear }), [flatten, editor.clear]);

  const handleContinue = async () => {
    setIsFlattening(true);
    try {
      const result = await flatten();
      if (result) onComplete(result.file, result.dataUrl, result.widthCm, result.heightCm);
    } finally {
      setIsFlattening(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSaveTemplate = async () => {
    if (!onSaveTemplate) return;
    setIsSaving(true);
    try {
      const result = await flatten();
      if (!result) return;
      let file = result.file;
      let dataUrl = result.dataUrl;
      if (template && pairMode === 'identical' && shieldBoxes.length === 2) {
        const rep = await replicateLeftToRight(result.dataUrl, template.widthMm, shieldBoxes[0], shieldBoxes[1]);
        file = rep.file; dataUrl = rep.dataUrl;
      }
      await onSaveTemplate(file, dataUrl);
    } finally {
      setIsSaving(false);
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
        hideSize={!!template}
      />
      <div className="flex flex-col lg:flex-row">
        <div className="order-1">
          <ToolRail active={tool} onChange={setTool} />
        </div>

        {/* Tool content + Layers. On desktop this is the 224px left column; on
            mobile it drops below the canvas as a full-width stacked section. */}
        <div className="order-3 lg:order-2 w-full lg:w-56 bg-nim-black border-t lg:border-t-0 lg:border-r border-white/10 flex flex-col overflow-hidden">
          <div className="p-3 flex-1 overflow-y-auto max-h-[45vh] lg:max-h-none">
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
            {tool === 'templates' && (
              <TemplatesPanel
                templates={library.templates}
                isLoading={libLoading}
                onApply={editor.applyTemplate}
              />
            )}
            {tool === 'elements' && (
              <ElementsPanel
                clipart={library.clipart}
                isLoading={libLoading}
                onAdd={item => void editor.addImageFromUrl(item.url, item.name)}
              />
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
            onRemoveBg={() => { void editor.removeBackgroundSelected(); }}
            removingBg={editor.removingBg}
            bgError={editor.bgError}
          />
        </div>

        <div
          ref={frameRef}
          className="order-2 lg:order-3 relative w-full lg:w-auto lg:flex-1 flex items-center justify-center bg-[#0a0a0a] p-3 lg:p-6 h-[420px] min-h-[300px] lg:h-[70vh] lg:min-h-[420px] overflow-hidden"
        >
          <EditorCanvas
            canvasElRef={editor.canvasElRef}
            displayWidth={displayWidth}
            displayHeight={displayHeight}
            widthCm={size.wCm}
            heightCm={size.hCm}
            guides={editor.guides}
            overlay={template ? <TemplateGuide template={template} width={displayWidth} height={displayHeight} /> : undefined}
            underlay={template && bgColor ? <TemplateFill template={template} bgColor={bgColor} width={displayWidth} height={displayHeight} /> : undefined}
            midlay={template && pairMode === 'identical' && shieldBoxes.length === 2
              ? <ShieldMirror fabricCanvas={editor.canvas} widthMm={template.widthMm} leftMm={shieldBoxes[0]} rightMm={shieldBoxes[1]} displayWidth={displayWidth} displayHeight={displayHeight} />
              : undefined}
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/25 text-center max-w-xs px-6">{t.edEmptyCanvas}</p>
            </div>
          )}
          {/* Pair-mode toggle — floats at the top-centre of the artboard, the first
              choice before designing (identical = design one shield, mirror the other). */}
          {template && pairMode && onPairModeChange && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
              <div className="flex rounded-full overflow-hidden border border-white/20 bg-black/80 backdrop-blur shadow-lg text-xs font-bold">
                {(['identical', 'different'] as const).map((m) => (
                  <button key={m} onClick={() => onPairModeChange(m)}
                    className={`px-4 py-1.5 transition ${pairMode === m ? 'bg-nim-yellow text-black' : 'text-white/70 hover:text-white'}`}>
                    {m === 'identical' ? t.peltorPairIdentical : t.peltorPairDifferent}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 flex-wrap">
        {template && bgColor && onBgColorChange && (
          <div className="mr-auto">
            <BgColorControl value={bgColor} onChange={onBgColorChange} label={t.peltorBg} />
          </div>
        )}
        <p
          className="text-lg leading-tight text-nim-yellow hidden sm:block"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          {t.edContinueHint}
        </p>
        {template ? (
          <button onClick={handleSaveTemplate} disabled={!canContinue || isSaving} className="nim-btn-yellow w-full sm:w-auto">
            {isSaving ? t.edPreparing : t.peltorSave}
          </button>
        ) : (
          <button onClick={handleContinue} disabled={!canContinue} className="nim-btn-yellow w-full sm:w-auto">
            {isFlattening ? t.edPreparing : `${t.edContinue} →`}
          </button>
        )}
      </div>
    </div>
  );
});
