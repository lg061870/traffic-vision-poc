import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Interactive,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../font";

// Closing card. The logo is cropped out of the splash screen so it matches
// the app; the background is the splash navy.
export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: "#0c1b2e",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        color: "white",
      }}
    >
      <Interactive.Div
        name="Logo"
        style={{
          width: 330,
          height: 210,
          overflow: "hidden",
          position: "relative",
          maskImage:
            "radial-gradient(ellipse at center, black 55%, transparent 75%)",
          opacity: interpolate(frame, [0, 0.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 1.2 * fps], [0.9, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        <Img
          src={staticFile("screen0_innobus_splash.jpg")}
          style={{
            position: "absolute",
            width: 768,
            height: 1376,
            left: -225,
            top: -360,
          }}
        />
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: 4,
          opacity: interpolate(frame, [0.4 * fps, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        INNOBUS
      </Interactive.Div>
      <Interactive.Div
        name="Tagline"
        style={{
          marginTop: 8,
          fontSize: 32,
          fontWeight: 600,
          color: "#9fd8f0",
          opacity: interpolate(frame, [0.9 * fps, 1.7 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Monitoreo 5G en tiempo real · Ruta 142 Coronado
      </Interactive.Div>
      <Interactive.Div
        name="Event"
        style={{
          marginTop: 18,
          fontSize: 24,
          color: "#b8c4d6",
          opacity: interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Hackatón Centroamericano de Innovación
      </Interactive.Div>
      <Interactive.Div
        name="Disclaimer"
        style={{
          position: "absolute",
          bottom: 36,
          fontSize: 16,
          color: "#6b7a90",
          opacity: interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Prototipo · datos de ocupación simulados
      </Interactive.Div>
    </AbsoluteFill>
  );
};
