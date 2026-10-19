import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// App screens are 768x1376.
const SCREEN_WIDTH = 310;
const SCREEN_HEIGHT = Math.round((SCREEN_WIDTH * 1376) / 768);

// A light pass across the glass, starting at `at` (frames).
const Sweep: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at, at + 18], [-60, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });
  if (frame < at || frame > at + 18) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(115deg, transparent ${progress - 20}%, rgba(200,245,255,0.55) ${progress}%, transparent ${progress + 20}%)`,
        mixBlendMode: "screen",
      }}
    />
  );
};

// Holographic glass panel floating in the scene, holding an app screen.
// It switches on at `enterAt`, bobs gently, and gets a light sweep at each
// frame in `sweeps` (use it when the screen inside changes).
export const HoloPanel: React.FC<{
  children: React.ReactNode;
  side: "left" | "right";
  enterAt: number;
  sweeps?: number[];
}> = ({ children, side, enterAt, sweeps = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - enterAt;

  const appear = interpolate(t, [0, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const flash = interpolate(t, [0.1 * fps, 0.7 * fps], [0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bob = Math.sin((frame / fps) * 1.6) * 5;
  const tilt = side === "right" ? -7 : 7;

  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        [side]: 80,
        opacity: appear,
        transform: `perspective(1400px) translateY(${bob + (1 - appear) * 40}px) rotateY(${tilt}deg) scale(${0.92 + appear * 0.08})`,
      }}
    >
      <div
        style={{
          position: "relative",
          padding: 7,
          borderRadius: 30,
          background: "rgba(200, 235, 255, 0.14)",
          backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(170, 235, 255, 0.9)",
          boxShadow:
            "0 0 18px rgba(90, 200, 255, 0.7), 0 0 60px rgba(90, 200, 255, 0.3), inset 0 0 18px rgba(150, 230, 255, 0.35)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            borderRadius: 23,
            overflow: "hidden",
            opacity: 0.93,
          }}
        >
          <AbsoluteFill>{children}</AbsoluteFill>
          {/* Faint cyan tint so the screen reads as projected light. */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(120,210,255,0.10), rgba(120,210,255,0.02))",
            }}
          />
          {sweeps.map((at) => (
            <Sweep key={at} at={at} />
          ))}
          <AbsoluteFill style={{ background: "white", opacity: flash }} />
        </div>
      </div>
    </div>
  );
};
