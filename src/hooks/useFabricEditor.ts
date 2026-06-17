import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, IText } from 'fabric';
import { DEFAULT_FONT } from '../lib/editorFonts.ts';

export interface FabricLayer {
  id: string;
  kind: 'image' | 'text' | 'background';
  label: string;
}

interface UseFabricEditor {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  canvas: Canvas | null;
  layers: FabricLayer[];
  selectedId: string | null;
  addText: (value: string) => void;
  addImageFromFile: (file: File) => Promise<void>;
  setBackgroundColor: (color: string) => void;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  selectLayer: (id: string) => void;
}

let idCounter = 0;
const nextId = () => `obj_${++idCounter}`;

export function useFabricEditor(displayWidth: number, displayHeight: number): UseFabricEditor {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [layers, setLayers] = useState<FabricLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasElRef.current) return;
    const c = new Canvas(canvasElRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: 'rgba(0,0,0,0)',
      preserveObjectStacking: true,
    });
    setCanvas(c);
    return () => { void c.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canvas) return;
    canvas.setDimensions({ width: displayWidth, height: displayHeight });
    canvas.renderAll();
  }, [canvas, displayWidth, displayHeight]);

  const rebuildLayers = useCallback((c: Canvas) => {
    const objs = c.getObjects();
    const next: FabricLayer[] = objs.map(o => {
      const holder = o as unknown as { _layer?: FabricLayer };
      if (!holder._layer) holder._layer = { id: nextId(), kind: 'image', label: 'Object' };
      return holder._layer;
    });
    setLayers([...next].reverse());
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const onSel = () => {
      const active = canvas.getActiveObject() as unknown as { _layer?: FabricLayer } | null;
      setSelectedId(active?._layer?.id ?? null);
    };
    const onClear = () => setSelectedId(null);
    canvas.on('selection:created', onSel);
    canvas.on('selection:updated', onSel);
    canvas.on('selection:cleared', onClear);
    return () => {
      canvas.off('selection:created', onSel);
      canvas.off('selection:updated', onSel);
      canvas.off('selection:cleared', onClear);
    };
  }, [canvas]);

  const addText = useCallback((value: string) => {
    if (!canvas) return;
    const text = new IText(value || 'Your text', {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: DEFAULT_FONT,
      fontSize: 48,
      fill: '#111111',
    });
    (text as unknown as { _layer: FabricLayer })._layer = { id: nextId(), kind: 'text', label: value || 'Text' };
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    rebuildLayers(canvas);
  }, [canvas, rebuildLayers]);

  const addImageFromFile = useCallback(async (file: File) => {
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    const img = await FabricImage.fromURL(url);
    URL.revokeObjectURL(url);
    const maxW = canvas.getWidth() * 0.8;
    if (img.width && img.width > maxW) img.scaleToWidth(maxW);
    img.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center' });
    (img as unknown as { _layer: FabricLayer })._layer = { id: nextId(), kind: 'image', label: file.name };
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    rebuildLayers(canvas);
  }, [canvas, rebuildLayers]);

  const setBackgroundColor = useCallback((color: string) => {
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
  }, [canvas]);

  const findById = useCallback((id: string) => {
    return canvas?.getObjects().find(o => (o as unknown as { _layer?: FabricLayer })._layer?.id === id) ?? null;
  }, [canvas]);

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    rebuildLayers(canvas);
  }, [canvas, rebuildLayers]);

  const bringForward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.bringObjectForward(active); canvas.renderAll(); rebuildLayers(canvas); }
  }, [canvas, rebuildLayers]);

  const sendBackward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.sendObjectBackwards(active); canvas.renderAll(); rebuildLayers(canvas); }
  }, [canvas, rebuildLayers]);

  const selectLayer = useCallback((id: string) => {
    if (!canvas) return;
    const obj = findById(id);
    if (obj) { canvas.setActiveObject(obj); canvas.renderAll(); }
  }, [canvas, findById]);

  return {
    canvasElRef, canvas, layers, selectedId,
    addText, addImageFromFile, setBackgroundColor,
    deleteSelected, bringForward, sendBackward, selectLayer,
  };
}
