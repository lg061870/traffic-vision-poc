import { AbsoluteFill, Sequence } from "remotion";
import { Caption } from "../components/Caption";
import { Clip } from "../components/Clip";
import { Voice } from "../components/Voice";

// Scene 5: Sofía arrives in downtown Coronado, the church behind her.
export const Arrival: React.FC = () => {
  return (
    <AbsoluteFill>
      <Clip file="clips/clip5_llegada.mp4" />
      <Voice line="5_llegada" from={10} />
      <Sequence from={13} durationInFrames={107} name="Caption 1">
        <Caption>Llegó a Coronado a tiempo, sentada y segura.</Caption>
      </Sequence>
      <Sequence from={120} durationInFrames={120} name="Caption 2">
        <Caption>Así se transforma el transporte público con INNOBUS.</Caption>
      </Sequence>
    </AbsoluteFill>
  );
};
