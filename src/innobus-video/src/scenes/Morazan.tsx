import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "../components/Caption";
import { Clip } from "../components/Clip";
import { Highlight } from "../components/Highlight";
import { HoloPanel } from "../components/HoloPanel";
import { SearchTyping } from "../components/SearchTyping";
import { Voice } from "../components/Voice";

// Scene 2: in Parque Morazán, Sofía opens INNOBUS (splash), types her
// destination, and sees her bus is 3 minutes away with free seats.
export const Morazan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Clip file="clips/clip2_morazan.mp4" playbackRate={0.9} />
      <HoloPanel side="right" enterAt={12} sweeps={[108]}>
        <Img
          name="Splash"
          src={staticFile("screen0_innobus_splash.jpg")}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <AbsoluteFill
          style={{
            opacity: interpolate(frame, [3.6 * fps, 4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Img
            name="Search"
            src={staticFile("transit_home_passengers_no_adulto.jpg")}
            style={{ width: "100%", height: "100%" }}
          />
          <SearchTyping from={138} to={180} fontSize={13} />
          {/* The nearby-stop card: bus SJB-2267 in 3 min, free seats. */}
          <Highlight at={6.6 * fps} left="12%" top="73.5%" width="76%" height="16.5%" />
        </AbsoluteFill>
      </HoloPanel>
      <Voice line="2_morazan" from={8} />
      <Sequence from={11} durationInFrames={127} name="Caption 1">
        <Caption side="left">
          En lugar de hacer fila a ciegas, Sofía abre INNOBUS.
        </Caption>
      </Sequence>
      <Sequence from={138} durationInFrames={52} name="Caption 2">
        <Caption side="left">Escribe Coronado Centro,</Caption>
      </Sequence>
      <Sequence from={190} durationInFrames={135} name="Caption 3">
        <Caption side="left">
          y ve que su bus pasa en tres minutos, con asientos libres.
        </Caption>
      </Sequence>
    </AbsoluteFill>
  );
};
