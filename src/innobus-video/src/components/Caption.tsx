import {
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../font";

// Horizontal band the caption sits in, so it never covers the phone.
const BANDS = {
  center: { left: 140, right: 140 },
  left: { left: 60, right: 480 },
  right: { left: 480, right: 60 },
};

// One narration line. Place it inside a <Sequence> that sets when it shows;
// it fades in and out over its own duration.
export const Caption: React.FC<{
  children: React.ReactNode;
  side?: keyof typeof BANDS;
}> = ({ children, side = "center" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <Interactive.Div
      name="Caption"
      style={{
        position: "absolute",
        left: BANDS[side].left,
        right: BANDS[side].right,
        bottom: 56,
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(
          frame,
          [0, 10, durationInFrames - 10, durationInFrames],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      }}
    >
      <div
        style={{
          padding: "12px 26px",
          borderRadius: 14,
          background: "rgba(8, 14, 28, 0.74)",
          color: "white",
          fontFamily,
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </Interactive.Div>
  );
};
