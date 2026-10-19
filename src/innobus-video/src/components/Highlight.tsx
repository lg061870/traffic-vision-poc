import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Pulsing glow ring around a part of an app screen, from frame `at` on.
// Position and size are percentages of the screen.
export const Highlight: React.FC<{
  at: number;
  left: string;
  top: string;
  width: string;
  height: string;
}> = ({ at, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at;
  if (t < 0) {
    return null;
  }
  const appear = interpolate(t, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });
  const pulse = 0.6 + 0.4 * Math.sin((t / fps) * 6);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        borderRadius: 12,
        border: "2.5px solid #22d3ee",
        boxShadow: `0 0 ${10 + pulse * 14}px rgba(34, 211, 238, ${pulse})`,
        opacity: appear,
        scale: 1.08 - appear * 0.08,
      }}
    />
  );
};
