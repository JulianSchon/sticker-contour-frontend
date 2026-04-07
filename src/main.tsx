import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// In wordpress mode, notify the parent of our document height so the iframe
// can resize to fit without scrollbars.
if (import.meta.env.VITE_MODE === 'wordpress') {
  let lastHeight = 0;
  let rafId: ReturnType<typeof requestAnimationFrame> | null = null;

  const sendHeight = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const height = document.documentElement.offsetHeight;
      if (height !== lastHeight) {
        lastHeight = height;
        window.parent.postMessage({ type: 'nimstick_resize', height }, '*');
      }
    });
  };

  window.addEventListener('load', sendHeight);
  new ResizeObserver(sendHeight).observe(document.documentElement);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
