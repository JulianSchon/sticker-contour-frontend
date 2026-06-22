import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MockupCarousel } from './MockupCarousel.tsx';
import type { MockupScene } from '../lib/mockupScenes.ts';
import type { ContourPreviewResponse, ContourParams } from '../types/contour.ts';

const SCENES: MockupScene[] = [
  { id: 'a', labelKey: 'mockLaptop', photo: '/mockups/a.jpg', photoW: 100, photoH: 100,
    corners: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] },
  { id: 'b', labelKey: 'mockBottle', photo: '/mockups/b.jpg', photoW: 100, photoH: 100,
    corners: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] },
];

const contour: ContourPreviewResponse = {
  kissSvgPath: 'M0 0 H10 V10 H0 Z', perfSvgPath: null,
  width: 10, height: 10, originalWidth: 10, originalHeight: 10, pad: 0,
};
const params = { cutMode: 'perf', kissOffset: 0, perfOffset: 6, threshold: 50,
  smoothing: 2, enclose: false, shapeType: 'contour', shapeSize: 100,
  shapeOffsetX: 0, shapeOffsetY: 0 } as ContourParams;

const baseProps = { imageDataUrl: 'data:image/png;base64,AAAA', contour, params, finish: 'glossy' as const };

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

describe('MockupCarousel', () => {
  it('renders nothing when there is no image', () => {
    const { container } = render(<MockupCarousel {...baseProps} imageDataUrl={null} scenes={SCENES} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when there is no contour', () => {
    const { container } = render(<MockupCarousel {...baseProps} contour={null} scenes={SCENES} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first scene photo initially', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/a.jpg');
  });

  it('advances to the next scene when the next arrow is clicked', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.click(screen.getByLabelText('next'));
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
  });

  it('wraps around from the last scene to the first', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.click(screen.getByLabelText('prev'));
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
  });

  it('renders one dot per scene', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    expect(screen.getAllByTestId('mockup-dot')).toHaveLength(2);
  });

  it('drops a scene whose photo fails to load', () => {
    render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.error(screen.getByTestId('mockup-photo'));
    const photo = screen.getByTestId('mockup-photo') as HTMLImageElement;
    expect(photo.getAttribute('src')).toBe('/mockups/b.jpg');
    expect(screen.getAllByTestId('mockup-dot')).toHaveLength(1);
  });

  it('renders nothing once every scene photo has failed', async () => {
    const { container } = render(<MockupCarousel {...baseProps} scenes={SCENES} />);
    fireEvent.error(screen.getByTestId('mockup-photo'));
    // Flush state so the component re-renders with scene 'b' before firing the second error.
    await act(async () => {});
    fireEvent.error(screen.getByTestId('mockup-photo'));
    expect(container.firstChild).toBeNull();
  });
});
