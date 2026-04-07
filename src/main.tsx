import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// In wordpress mode, notify the parent of our document height so the iframe
// can resize to fit without scrollbars.
if (import.meta.env.VITE_MODE === 'wordpress') {
  const sendHeight = () => {
    window.parent.postMessage(
      { type: 'nimstick_resize', height: document.body.scrollHeight },
      '*'
    );
  };
  // Send on load and whenever the DOM changes size
  window.addEventListener('load', sendHeight);
  new ResizeObserver(sendHeight).observe(document.body);
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
