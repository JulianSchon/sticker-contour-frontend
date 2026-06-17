import { useEffect, useMemo, useState } from 'react';
import { type IText, type FabricObject } from 'fabric';
import { useFabricEditor } from '../../hooks/useFabricEditor.ts';
import { useFlattenedFile } from './useFlattenedFile.ts';
import { useContour } from '../../hooks/useContour.ts';
import { EditorCanvas } from './EditorCanvas.tsx';
import { EditorToolbar } from './EditorToolbar.tsx';
import { ToolRail } from './ToolRail.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { UploadPanel } from './panels/UploadPanel.tsx';
import { TextPanel } from './panels/TextPanel.tsx';
import { BackgroundPanel } from './panels/BackgroundPanel.tsx';
import { DownloadButton } from '../DownloadButton.tsx';
import { MaterialFinishPicker, type Material, type Finish } from '../MaterialFinishPicker.tsx';
import { toContourParams } from '../../lib/cutParams.ts';
import { exportDimensions, cmToPx } from '../../lib/printSize.ts';
import { DEFAULT_ARTBOARD, DEFAULT_CUT, type ArtboardSize, type CutSettings, type EditorTool } from '../../types/editor.ts';
import { shouldBumpForLayerKind } from './changeTrigger.ts';

const DISPLAY_WIDTH = 520;

export function DesignEditor() {
  const [size, setSize] = useState<ArtboardSize>(DEFAULT_ARTBOARD);
  const [cut, setCut] = useState<CutSettings>(DEFAULT_CUT);
  const [tool, setTool] = useState<EditorTool>('uploads');
  const [material, setMaterial] = useState<Material>('vinyl');
  const [finish, setFinish] = useState<Finish>('glossy');
  const [version, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  const displayHeight = useMemo(
    () => Math.round(DISPLAY_WIDTH * (size.hCm / size.wCm)),
    [size],
  );

  const editor = useFabricEditor(DISPLAY_WIDTH, displayHeight);

  useEffect(() => {
    if (!editor.canvas) return;
    const c = editor.canvas;
    const onChange = (e: { target?: unknown }) => {
      const layer = (e?.target as { _layer?: { kind?: string } } | undefined)?._layer;
      if (!shouldBumpForLayerKind(layer?.kind)) return; // body sync must not trigger another sync
      bump();
    };
    c.on('object:added', onChange);
    c.on('object:modified', onChange);
    c.on('object:removed', onChange);
    return () => {
      c.off('object:added', onChange);
      c.off('object:modified', onChange);
      c.off('object:removed', onChange);
    };
  }, [editor.canvas]);

  useEffect(() => {
    const { dpi, widthPx } = exportDimensions(size.wCm, size.hCm);
    const borderPx = cmToPx(cut.borderMm / 10, dpi)
      * (DISPLAY_WIDTH / widthPx);
    if (cut.mode === 'diecut') {
      editor.syncStickerBody(cut.body, cut.bodyColor, Math.max(2, Math.round(borderPx)));
    } else {
      editor.syncStickerBody('none', cut.bodyColor, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut, size, version]);

  const file = useFlattenedFile(editor.canvas, DISPLAY_WIDTH, size, version);
  const params = useMemo(() => toContourParams(cut), [cut]);
  const { data: contour } = useContour(file, params);

  const applyToSelectedText = (mutate: (t: IText) => void) => {
    const active = editor.canvas?.getActiveObject() as FabricObject | undefined;
    if (active && active.type === 'i-text') {
      mutate(active as unknown as IText);
      editor.canvas?.renderAll();
      bump();
    }
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-nim-black">
      <EditorToolbar size={size} cut={cut} onSizeChange={setSize} onCutChange={setCut} />
      <div className="flex">
        <ToolRail active={tool} onChange={setTool} />

        <div className="w-56 bg-nim-black border-r border-white/10 p-3">
          {tool === 'uploads' && <UploadPanel onImage={f => void editor.addImageFromFile(f)} />}
          {tool === 'text' && (
            <TextPanel
              hasSelection={editor.selectedId !== null}
              onAddText={editor.addText}
              onFontChange={family => applyToSelectedText(t => t.set('fontFamily', family))}
              onColorChange={color => applyToSelectedText(t => t.set('fill', color))}
            />
          )}
          {tool === 'background' && <BackgroundPanel onColor={c => { editor.setBackgroundColor(c); bump(); }} />}
          {(tool === 'templates' || tool === 'elements') && (
            <p className="text-xs text-white/30">—</p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] p-6">
          <EditorCanvas
            canvasElRef={editor.canvasElRef}
            displayWidth={DISPLAY_WIDTH}
            displayHeight={displayHeight}
            contour={contour ?? null}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-t border-white/10">
        <MaterialFinishPicker
          material={material}
          finish={finish}
          onMaterialChange={setMaterial}
          onFinishChange={setFinish}
        />
        <div className="flex items-end">
          <DownloadButton
            file={file}
            params={params}
            widthCm={size.wCm}
            heightCm={size.hCm}
            material={material}
            finish={finish}
          />
        </div>
      </div>
    </div>
  );
}
