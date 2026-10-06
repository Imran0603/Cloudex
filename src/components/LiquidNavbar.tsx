import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useScroll, useMotionValueEvent, animate } from 'motion/react';
import { Home, Image as ImageIcon, Folder } from 'lucide-react';
import { useCloud } from '../context/CloudContext';
import { useScrollContainer } from '../context/ScrollContext';
import { TabType } from '../types/cloud';
import { spring, springSnappy, springSquishy, springGlass } from '../motion';
import { Glass } from './Glass';

export const LiquidNavbar: React.FC = () => {
  const { activeTab, setActiveTab, triggerHaptic, isSelectMode, resetActiveTabToRoot } = useCloud();
  const { activeScrollRef } = useScrollContainer();
  const { scrollY } = useScroll({ container: activeScrollRef });

  const navRef = useRef<HTMLDivElement>(null);
  const navY = useMotionValue(0);
  const navOpacity = useMotionValue(1);

  const isHiddenRef = useRef<boolean>(false);
  const lastYRef = useRef<number>(0);
  const accumulatedDistanceRef = useRef<number>(0);
  const lastDirectionRef = useRef<'up' | 'down' | null>(null);

  // Helper to safely set hidden state
  const setNavHidden = (hidden: boolean) => {
    if (isHiddenRef.current === hidden) return;
    isHiddenRef.current = hidden;
    const targetY = hidden ? 140 : 0;
    const targetOpacity = hidden ? 0.4 : 1;
    animate(navY, targetY, spring);
    animate(navOpacity, targetOpacity, spring);
  };

  // Reset state on tab switch or mount (rule 4)
  useEffect(() => {
    const container = activeScrollRef.current;
    const currentScrollTop = container ? container.scrollTop : 0;
    lastYRef.current = currentScrollTop;
    accumulatedDistanceRef.current = 0;
    lastDirectionRef.current = null;
    setNavHidden(false);
  }, [activeTab, activeScrollRef]);

  // Handle select mode transition
  useEffect(() => {
    if (isSelectMode) {
      setNavHidden(true);
    } else {
      setNavHidden(false);
    }
  }, [isSelectMode]);

  // Strict State Machine Scroll Listener
  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (isSelectMode) return;

    const container = activeScrollRef.current;
    const scrollHeight = container ? container.scrollHeight : 0;
    const clientHeight = container ? container.clientHeight : window.innerHeight;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);

    // If content is shorter than screen, always keep nav visible
    if (maxScroll <= 0) {
      setNavHidden(false);
      return;
    }

    // Ignore rubber-band overscroll
    if (latest < 0 || latest > maxScroll) return;

    const prev = lastYRef.current;
    const delta = latest - prev;
    lastYRef.current = latest;

    // Ignore deltas < 2px (jitter threshold)
    if (Math.abs(delta) < 2) return;

    const currentDirection: 'up' | 'down' = delta > 0 ? 'down' : 'up';

    // If sign changes, reset accumulator
    if (currentDirection !== lastDirectionRef.current) {
      accumulatedDistanceRef.current = Math.abs(delta);
      lastDirectionRef.current = currentDirection;
    } else {
      accumulatedDistanceRef.current += Math.abs(delta);
    }

    const isNearBottom = maxScroll - latest < 40;

    // Show when scrolling UP with accumulated distance > 12px, OR y <= 80, OR near bottom (maxScroll - y < 40)
    if (
      (currentDirection === 'up' && accumulatedDistanceRef.current > 12) ||
      latest <= 80 ||
      isNearBottom
    ) {
      setNavHidden(false);
    }
    // Hide when scrolling DOWN with accumulated distance > 24px AND y > 80
    else if (
      currentDirection === 'down' &&
      accumulatedDistanceRef.current > 24 &&
      latest > 80 &&
      !isNearBottom
    ) {
      setNavHidden(true);
    }
  });

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'library', label: 'Library', icon: Folder },
  ];

  const content = (
    <Glass
      ref={navRef}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        x: '-50%',
        y: navY,
        opacity: navOpacity,
        zIndex: 110,
      }}
      className="h-16 w-[min(360px,calc(100vw-40px))] rounded-[32px] p-1.5 flex items-center justify-between shadow-2xl pointer-events-auto"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (activeTab === tab.id) {
                // If user presses current tab again -> auto back to initial menu!
                resetActiveTabToRoot(tab.id);
              } else {
                setActiveTab(tab.id);
              }
            }}
            whileTap={{ scale: 0.98, filter: 'brightness(0.96)' }}
            transition={springSquishy}
            className="relative flex-1 h-full rounded-[28px] flex flex-col items-center justify-center gap-1 focus:outline-none cursor-pointer touch-manipulation"
            aria-label={tab.label}
          >
            {/* Sliding glass capsule with subtle glow */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                transition={springGlass}
                className="absolute inset-0 rounded-[28px] bg-white/[0.18] border-[0.5px] border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_16px_rgba(0,0,0,0.4)]"
              />
            )}

            <motion.div
              animate={isActive ? { scale: 1.06, y: -1 } : { scale: 1, y: 0 }}
              transition={springGlass}
              className="z-10"
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-[#8E8E93]'
                }`}
              />
            </motion.div>
            <span
              className={`text-[11px] font-medium leading-none tracking-tight z-10 transition-colors duration-200 ${
                isActive ? 'text-white font-semibold' : 'text-[#8E8E93]'
              }`}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </Glass>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
