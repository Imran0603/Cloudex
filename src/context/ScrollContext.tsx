import React, { createContext, useContext, useRef, RefObject } from 'react';
import { useCloud } from './CloudContext';

interface ScrollContextType {
  homeScrollRef: RefObject<HTMLDivElement | null>;
  galleryScrollRef: RefObject<HTMLDivElement | null>;
  libraryScrollRef: RefObject<HTMLDivElement | null>;
  activeScrollRef: RefObject<HTMLDivElement | null>;
}

const ScrollContext = createContext<ScrollContextType | null>(null);

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab } = useCloud();
  const homeScrollRef = useRef<HTMLDivElement | null>(null);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);
  const libraryScrollRef = useRef<HTMLDivElement | null>(null);

  const activeScrollRef =
    activeTab === 'home'
      ? homeScrollRef
      : activeTab === 'gallery'
      ? galleryScrollRef
      : libraryScrollRef;

  return (
    <ScrollContext.Provider
      value={{
        homeScrollRef,
        galleryScrollRef,
        libraryScrollRef,
        activeScrollRef,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScrollContainer = () => {
  const ctx = useContext(ScrollContext);
  if (!ctx) {
    throw new Error('useScrollContainer must be used within ScrollProvider');
  }
  return ctx;
};
