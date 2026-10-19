import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { Caption } from "../components/Caption";
import { Clip } from "../components/Clip";
import { Highlight } from "../components/Highlight";
import { HoloPanel } from "../components/HoloPanel";
import { Voice } from "../components/Voice";

// Scene 3: Sofía boards the 142; the routes screen floats over the bus front,
// showing this bus has free seats (38/90) and the express is nearly full.
// The 6 s clip is slowed down to fit the voice line.
export const Boarding: React.FC = () => {
  return (
    <AbsoluteFill>
      <Clip file="clips/clip3_abordando.mp4" playbackRate={0.85} />
      <HoloPanel side="right" enterAt={8}>
        <Img
          name="Routes"
          src={staticFile("screen2_innobus_routes_transit.jpg")}
          style={{ width: "100%", height: "100%" }}
        />
        {/* "Asientos libres (38/90 pax)" on the 142 Troncal. */}
        <Highlight at={100} left="7%" top="67.5%" width="50%" height="6.5%" />
      </HoloPanel>
      <Voice line="3_abordando" from={6} />
      <Sequence from={9} durationInFrames={91} name="Caption 1">
        <Caption side="left">El bus llega justo cuando la app dijo.</Caption>
      </Sequence>
      <Sequence from={100} durationInFrames={105} name="Caption 2">
        <Caption side="left">Treinta y ocho de noventa: va sentada.</Caption>
      </Sequence>
    </AbsoluteFill>
  );
};
