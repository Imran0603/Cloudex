/**
 * Global Liquid / iOS-Style Animation System
 *
 * Physics Principles:
 * - Slow, relaxed, fluid, soft, natural motion with physical weight
 * - Smooth acceleration and soft deceleration
 * - Subtle overshoot (jelly effect: 1.0 -> 0.98 -> 1.01 -> 1.0)
 * - Continuous glass transitions (blur, scale, opacity, highlight)
 * - Respects prefers-reduced-motion accessibility
 */

export const easeApple: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeRelaxed = easeApple;
export const easeJelly: [number, number, number, number] = [0.2, 1.12, 0.38, 1];

// Default physically weighted UI spring (~450-550ms)
export const spring = {
  type: "spring",
  stiffness: 140,
  damping: 21,
  mass: 1.05,
} as const;

// Calm, luxurious spring for modals, sheets, and full transitions (~550-680ms)
export const springRelaxed = {
  type: "spring",
  stiffness: 115,
  damping: 19.5,
  mass: 1.15,
} as const;

// Smooth UI elements and floating controls (~450ms)
export const springSmooth = {
  type: "spring",
  stiffness: 135,
  damping: 22,
  mass: 1.05,
} as const;

// Tactile button compression and elastic return (~320-420ms)
export const springSquishy = {
  type: "spring",
  stiffness: 220,
  damping: 21,
  mass: 0.92,
} as const;

// Responsive small control spring (~280-360ms)
export const springSnappy = {
  type: "spring",
  stiffness: 240,
  damping: 24,
  mass: 0.88,
} as const;

// Bouncy indicator / morphing capsules (~400-500ms)
export const springBouncy = {
  type: "spring",
  stiffness: 160,
  damping: 18,
  mass: 0.95,
} as const;

// Interactive drag / direct manipulation
export const springInteractive = {
  type: "spring",
  stiffness: 340,
  damping: 28,
  mass: 0.8,
} as const;

// Large shared-element / spatial expansion (~600-780ms)
export const springHero = {
  type: "spring",
  stiffness: 95,
  damping: 18,
  mass: 1.2,
} as const;

// Glass morphing and floating capsule physics
export const springGlass = {
  type: "spring",
  stiffness: 130,
  damping: 20,
  mass: 1.05,
} as const;

// Subtle Jelly Spring for modal & sheet entrance
export const springJelly = {
  type: "spring",
  stiffness: 160,
  damping: 17,
  mass: 1.0,
} as const;

/**
 * Subtle Jelly / Liquid Scale Keyframes:
 * 1.0 -> 0.98 (compression) -> 1.01 (soft elastic expansion) -> 1.0 (settles naturally)
 * Extremely subtle, physical, soft glass/liquid feel. No cartoon-like bouncing.
 */
export const jellyScaleKeyframes: number[] = [0.98, 1.012, 0.998, 1.0];

export const jellyScaleTransition = {
  duration: 0.54,
  times: [0, 0.44, 0.78, 1],
  ease: easeJelly,
};

// Subtle Press Feedback for buttons, cards, icons
export const tapPress = {
  scale: 0.98,
  filter: "brightness(0.96)",
  transition: {
    type: "spring" as const,
    stiffness: 340,
    damping: 24,
    mass: 0.85,
  },
} as const;

// Gentle Card Press Feedback
export const tapCard = {
  scale: 0.985,
  filter: "brightness(0.97)",
  transition: {
    type: "spring" as const,
    stiffness: 280,
    damping: 22,
    mass: 0.95,
  },
} as const;

// Relaxed Timing Durations (Guidelines)
export const durationFast = 0.3;     // 300ms
export const durationMedium = 0.5;   // 500ms
export const durationSlow = 0.68;    // 680ms

// Continuous Opacity and Blur Transitions
export const fade = {
  duration: durationFast,
  ease: easeApple,
} as const;

export const fadeMedium = {
  duration: durationMedium,
  ease: easeApple,
} as const;

export const fadeSlow = {
  duration: durationSlow,
  ease: easeApple,
} as const;

export const stagger = 0.06;
export const staggerFast = 0.04;
export const staggerMedium = 0.08;

export const shakeKeyframes = [0, -8, 8, -6, 6, -3, 3, 0];
