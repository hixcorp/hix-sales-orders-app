'use client'
import React, { useEffect, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api'

interface ZoomProviderProps {
  children: ReactNode;
}

const ZoomProvider: React.FC<ZoomProviderProps> = ({ children }) => {
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);

  useEffect(() => {
    const handleZoom = async (newScaleFactor: number) => {
      if (newScaleFactor < 0.5 || newScaleFactor > 3) return; // Limit zoom range
      setScaleFactor(newScaleFactor);
      await invoke("zoom_window", { scaleFactor: newScaleFactor });
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '+') {
        handleZoom(scaleFactor * 1.1); // Zoom in
      } else if (event.ctrlKey && event.key === '-') {
        handleZoom(scaleFactor / 1.1); // Zoom out
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault(); // Prevent the default zoom behavior or scrolling
        handleZoom(scaleFactor * (event.deltaY > 0 ? 0.9 : 1.1));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [scaleFactor]);

  return <div>{children}</div>;
};

export default ZoomProvider;
