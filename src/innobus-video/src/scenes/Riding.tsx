import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { Caption } from "../components/Caption";
import { Clip } from "../components/Clip";
import { Highlight } from "../components/Highlight";
import { HoloPanel } from "../components/HoloPanel";
import { Voice } from "../components/Voice";

// Scene 4: Sofía seated, tracking her trip with the get-off alert.
export const Riding: React.FC = () => {
  return (
    <AbsoluteFill>
      <Clip file="clips/clip4_a_bordo.mp4" />
      <HoloPanel side="right" enterAt={15}>
        <Img
          name="Trip tracking"
          src={staticFile("screen4_innobus_onboard_transit.jpg")}
          style={{ width: "100%", height: "100%" }}
        />
        {/* "Faltan 4 paradas para tu destino en Coronado Centro". */}
        <Highlight at={105} left="5%" top="56%" width="90%" height="15%" />
      </HoloPanel>
      <Voice line="4_a_bordo" from={20} />
      <Sequence from={23} durationInFrames={82} name="Caption 1">
        <Caption side="left">INNOBUS la acompaña todo el trayecto,</Caption>
      </Sequence>
      <Sequence from={105} durationInFrames={100} name="Caption 2">
        <Caption side="left">y le avisa antes de llegar a su parada.</Caption>
      </Sequence>
    </AbsoluteFill>
  );
};
