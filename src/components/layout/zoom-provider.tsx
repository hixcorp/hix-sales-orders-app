'use client'
import React, { useEffect, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api'
import dynamic from 'next/dynamic';
import { api_url } from '@/lib/utils';

interface ZoomProviderProps {
  children: ReactNode;
}

declare global {
  interface CSSStyleDeclaration {
    zoom: string;
  }
}

const isServer = () => typeof window === `undefined`;

const ZoomProvider: React.FC<ZoomProviderProps> = ({ children }) => {
  
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  useEffect(() => {
    if (isServer()) return 
      const handleZoom = async (newScaleFactor: number) => {
        if (newScaleFactor < 0.5 || newScaleFactor > 3) return; // Limit zoom range
        setScaleFactor(newScaleFactor);
        document.body.style.zoom = newScaleFactor.toString()
        // await invoke("zoom_window", { scaleFactor: newScaleFactor });
        // await fetch(`${api_url}/current_database`)
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

    if (typeof window !== 'undefined'){
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('wheel', handleWheel);
      };
    }
    
    
  }, [scaleFactor]);

  return <div>{children}</div>;
};

export default dynamic(()=> Promise.resolve(ZoomProvider),{
  ssr:false
});
