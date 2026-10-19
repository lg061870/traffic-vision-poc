import {
  AbsoluteFill,
  Easing,
  interpolate,
  Interactive,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "../components/Caption";
import { Clip } from "../components/Clip";
import { Voice } from "../components/Voice";
import { fontFamily } from "../font";

// Scene 1: San José gridlocked at rush hour.
export const RushHour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Clip file="clips/clip1_hora_pico.mp4" />
      <Interactive.Div
        name="Time tag"
        style={{
          position: "absolute",
          top: 48,
          left: 60,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(8, 14, 28, 0.74)",
          color: "white",
          fontFamily,
          fontSize: 30,
          fontWeight: 800,
          opacity: interpolate(frame, [0.3 * fps, 1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(
            frame,
            [0.3 * fps, 1 * fps],
            ["-30px 0px", "0px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        5:30 p. m. · San José
      </Interactive.Div>
      <Voice line="1_hora_pico" from={8} />
      <Sequence from={11} durationInFrames={73} name="Caption 1">
        <Caption>Cinco y media de la tarde.</Caption>
      </Sequence>
      <Sequence from={84} durationInFrames={81} name="Caption 2">
        <Caption>San José colapsa en la presa de hora pico,</Caption>
      </Sequence>
      <Sequence from={165} durationInFrames={110} name="Caption 3">
        <Caption>y Sofía necesita volver a su casa en Coronado.</Caption>
      </Sequence>
    </AbsoluteFill>
  );
};
