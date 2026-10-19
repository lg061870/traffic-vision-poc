import { interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../font";

const DESTINATION = "Coronado Centro";

// Types "Coronado Centro" into the home screen's search bar, covering the
// "¿A dónde querés ir hoy?" placeholder. Goes on top of
// transit_home_passengers_no_adulto.jpg; typing runs from `from` to `to`.
export const SearchTyping: React.FC<{
  from: number;
  to: number;
  fontSize: number;
}> = ({ from, to, fontSize }) => {
  const frame = useCurrentFrame();
  const typed = Math.floor(
    interpolate(frame, [from, to], [0, DESTINATION.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const caretVisible = Math.floor(frame / 12) % 2 === 0;

  if (frame < from - 3) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "18%",
        top: "5.9%",
        width: "68%",
        height: "3.7%",
        background: "white",
        display: "flex",
        alignItems: "center",
        fontFamily,
        fontSize,
        fontWeight: 600,
        color: "#111827",
      }}
    >
      {DESTINATION.slice(0, typed)}
      <span
        style={{
          width: 2,
          height: fontSize + 2,
          marginLeft: 1,
          background: "#2563eb",
          opacity: caretVisible ? 1 : 0,
        }}
      />
    </div>
  );
};
