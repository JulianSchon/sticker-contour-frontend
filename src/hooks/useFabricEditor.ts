import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, IText, Rect, Circle, Ellipse, Triangle } from 'fabric';
import type { FabricObject } from 'fabric';
import { DEFAULT_FONT } from '../lib/editorFonts.ts';
import type { ShapeKind } from '../types/editor.ts';

export interface FabricLayer {
  id: string;
  kind: 'image' | 'text' | 'shape';
  label: string;
}

/** Snapshot of the selected object's editable properties, so panels can show
 *  the current values and edit them. */
export interface SelectedProps {
  id: string;
  kind: FabricLayer['kind'];
  isText: boolean;
  fill: string;
  opacity: number;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: string;
  stroke?: string;
  strokeWidth?: number;
}

const SHAPE_LABELS: Record<ShapeKind, string> = {
  rectangle: 'Rectangle',
  roundedRect: 'Rounded rectangle',
  circle: 'Circle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
};

const SNAPSHOT_PROPS = ['_layer'];
const HISTORY_LIMIT = 60;

interface UseFabricEditor {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  canvas: Canvas | null;
  layers: FabricLayer[];
  selectedId: string | null;
  selected: SelectedProps | null;
  canUndo: boolean;
  canRedo: boolean;
  addText: (value: string) => void;
  addImageFromFile: (file: File) => Promise<void>;
  addShape: (kind: ShapeKind, color: string) => void;
  updateSelected: (patch: Record<string, unknown>) => void;
  duplicateSelected: () => Promise<void>;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  selectLayer: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

let idCounter = 0;
const nextId = () => `obj_${++idCounter}`;

type LayerHolder = { _layer?: FabricLayer };
const layerOf = (o: FabricObject) => (o as unknown as LayerHolder)._layer;
const setLayerOf = (o: FabricObject, layer: FabricLayer) => { (o as unknown as LayerHolder)._layer = layer; };

export function useFabricEditor(displayWidth: number, displayHeight: number): UseFabricEditor {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [layers, setLayers] = useState<FabricLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedProps | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const prevDimsRef = useRef({ w: displayWidth, h: displayHeight });
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const isRestoringRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!canvasElRef.current) return;
    const urls = objectUrlsRef.current;
    const c = new Canvas(canvasElRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: 'rgba(0,0,0,0)',
      preserveObjectStacking: true,
    });
    setCanvas(c);
    return () => {
      void c.dispose();
      urls.forEach(u => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rebuildLayers = useCallback((c: Canvas) => {
    const next: FabricLayer[] = c.getObjects().map(o => {
      let layer = layerOf(o);
      if (!layer) { layer = { id: nextId(), kind: 'image', label: 'Object' }; setLayerOf(o, layer); }
      return layer;
    });
    setLayers([...next].reverse());
  }, []);

  const refreshSelected = useCallback((c: Canvas) => {
    const a = c.getActiveObject() as FabricObject | undefined;
    if (!a) { setSelected(null); setSelectedId(null); return; }
    const layer = layerOf(a);
    const isText = a.type === 'i-text' || a.type === 'text';
    const txt = a as unknown as { fontFamily?: string; fontSize?: number; fontWeight?: string | number; fontStyle?: string; textAlign?: string };
    setSelected({
      id: layer?.id ?? '',
      kind: layer?.kind ?? 'shape',
      isText,
      fill: typeof a.fill === 'string' ? a.fill : '#000000',
      opacity: a.opacity ?? 1,
      fontFamily: isText ? txt.fontFamily : undefined,
      fontSize: isText ? txt.fontSize : undefined,
      bold: isText ? String(txt.fontWeight ?? 'normal') === 'bold' || txt.fontWeight === 700 : undefined,
      italic: isText ? txt.fontStyle === 'italic' : undefined,
      textAlign: isText ? txt.textAlign : undefined,
      stroke: typeof a.stroke === 'string' ? a.stroke : undefined,
      strokeWidth: a.strokeWidth ?? 0,
    });
    setSelectedId(layer?.id ?? null);
  }, []);

  const pushHistory = useCallback((c: Canvas) => {
    if (isRestoringRef.current) return;
    const json = JSON.stringify(c.toObject(SNAPSHOT_PROPS));
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.index = h.stack.length - 1;
    setCanUndo(h.index > 0);
    setCanRedo(false);
  }, []);

  const restore = useCallback((c: Canvas, json: string) => {
    isRestoringRef.current = true;
    void c.loadFromJSON(json).then(() => {
      c.discardActiveObject();
      c.renderAll();
      rebuildLayers(c);
      refreshSelected(c);
      isRestoringRef.current = false;
      const h = historyRef.current;
      setCanUndo(h.index > 0);
      setCanRedo(h.index < h.stack.length - 1);
    });
  }, [rebuildLayers, refreshSelected]);

  // Responsive resize: scale every object by the same factor so the design keeps
  // its position/proportions (zoom stays 1, so export math is unchanged).
  useEffect(() => {
    if (!canvas) return;
    const prev = prevDimsRef.current;
    if (prev.w !== displayWidth && prev.w > 0) {
      const r = displayWidth / prev.w;
      for (const o of canvas.getObjects()) {
        o.set({
          left: (o.left ?? 0) * r,
          top: (o.top ?? 0) * r,
          scaleX: (o.scaleX ?? 1) * r,
          scaleY: (o.scaleY ?? 1) * r,
        });
        o.setCoords();
      }
    }
    prevDimsRef.current = { w: displayWidth, h: displayHeight };
    canvas.setDimensions({ width: displayWidth, height: displayHeight });
    canvas.renderAll();
  }, [canvas, displayWidth, displayHeight]);

  // Baseline history snapshot once the canvas exists.
  useEffect(() => {
    if (!canvas) return;
    const h = historyRef.current;
    if (h.stack.length === 0) {
      h.stack.push(JSON.stringify(canvas.toObject(SNAPSHOT_PROPS)));
      h.index = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [canvas]);

  // Selection + history event wiring.
  useEffect(() => {
    if (!canvas) return;
    const onSel = () => refreshSelected(canvas);
    const onAdded = () => { if (isRestoringRef.current) return; rebuildLayers(canvas); pushHistory(canvas); };
    const onRemoved = () => { if (isRestoringRef.current) return; rebuildLayers(canvas); pushHistory(canvas); };
    const onModified = () => { if (isRestoringRef.current) return; refreshSelected(canvas); pushHistory(canvas); };
    canvas.on('selection:created', onSel);
    canvas.on('selection:updated', onSel);
    canvas.on('selection:cleared', onSel);
    canvas.on('object:added', onAdded);
    canvas.on('object:removed', onRemoved);
    canvas.on('object:modified', onModified);
    return () => {
      canvas.off('selection:created', onSel);
      canvas.off('selection:updated', onSel);
      canvas.off('selection:cleared', onSel);
      canvas.off('object:added', onAdded);
      canvas.off('object:removed', onRemoved);
      canvas.off('object:modified', onModified);
    };
  }, [canvas, refreshSelected, rebuildLayers, pushHistory]);

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
    setLayerOf(text, { id: nextId(), kind: 'text', label: value || 'Text' });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas]);

  const addImageFromFile = useCallback(async (file: File) => {
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url); // kept alive for undo/redo; revoked on dispose
    const img = await FabricImage.fromURL(url);
    const maxW = canvas.getWidth() * 0.8;
    if (img.width && img.width > maxW) img.scaleToWidth(maxW);
    img.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center' });
    setLayerOf(img, { id: nextId(), kind: 'image', label: file.name });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }, [canvas]);

  const addShape = useCallback((kind: ShapeKind, color: string) => {
    if (!canvas) return;
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const s = Math.min(cw, ch) * 0.6;
    const common = { left: cw / 2, top: ch / 2, originX: 'center' as const, originY: 'center' as const, fill: color };

    let shape: FabricObject;
    switch (kind) {
      case 'rectangle':   shape = new Rect({ ...common, width: s * 1.4, height: s }); break;
      case 'roundedRect': shape = new Rect({ ...common, width: s * 1.4, height: s, rx: s * 0.15, ry: s * 0.15 }); break;
      case 'circle':      shape = new Circle({ ...common, radius: s / 2 }); break;
      case 'ellipse':     shape = new Ellipse({ ...common, rx: s * 0.7, ry: s / 2 }); break;
      case 'triangle':    shape = new Triangle({ ...common, width: s, height: s }); break;
    }
    setLayerOf(shape, { id: nextId(), kind: 'shape', label: SHAPE_LABELS[kind] });
    canvas.add(shape);
    canvas.sendObjectToBack(shape); // shape acts as a body behind the design
    canvas.setActiveObject(shape);
    canvas.renderAll();
  }, [canvas]);

  /** Patch properties of the currently-selected object (fill, opacity, font…). */
  const updateSelected = useCallback((patch: Record<string, unknown>) => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.set(patch);
    active.setCoords();
    canvas.renderAll();
    refreshSelected(canvas);
    pushHistory(canvas);
  }, [canvas, refreshSelected, pushHistory]);

  const duplicateSelected = useCallback(async () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const clone = await active.clone(SNAPSHOT_PROPS);
    clone.set({ left: (active.left ?? 0) + 16, top: (active.top ?? 0) + 16 });
    const src = layerOf(active);
    setLayerOf(clone, { id: nextId(), kind: src?.kind ?? 'shape', label: src?.label ?? 'Copy' });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
  }, [canvas]);

  const findById = useCallback((id: string) => {
    return canvas?.getObjects().find(o => layerOf(o)?.id === id) ?? null;
  }, [canvas]);

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  const bringForward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.bringObjectForward(active); canvas.renderAll(); rebuildLayers(canvas); pushHistory(canvas); }
  }, [canvas, rebuildLayers, pushHistory]);

  const sendBackward = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.sendObjectBackwards(active); canvas.renderAll(); rebuildLayers(canvas); pushHistory(canvas); }
  }, [canvas, rebuildLayers, pushHistory]);

  const selectLayer = useCallback((id: string) => {
    if (!canvas) return;
    const obj = findById(id);
    if (obj) { canvas.setActiveObject(obj); canvas.renderAll(); }
  }, [canvas, findById]);

  const undo = useCallback(() => {
    if (!canvas) return;
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index--;
    restore(canvas, h.stack[h.index]);
  }, [canvas, restore]);

  const redo = useCallback(() => {
    if (!canvas) return;
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    restore(canvas, h.stack[h.index]);
  }, [canvas, restore]);

  return {
    canvasElRef, canvas, layers, selectedId, selected, canUndo, canRedo,
    addText, addImageFromFile, addShape, updateSelected, duplicateSelected,
    deleteSelected, bringForward, sendBackward, selectLayer, undo, redo,
  };
}
