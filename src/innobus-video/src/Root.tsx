import { Composition, Folder } from "remotion";
import { AppFlow } from "./AppFlow";
import { Arrival } from "./scenes/Arrival";
import { Boarding } from "./scenes/Boarding";
import { Closing } from "./scenes/Closing";
import { Morazan } from "./scenes/Morazan";
import { Riding } from "./scenes/Riding";
import { RushHour } from "./scenes/RushHour";
import { SofiaVideo } from "./SofiaVideo";

// 1280x720 to match the Flow clips.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SofiaInnobus"
        component={SofiaVideo}
        durationInFrames={1400}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AppFlow"
        component={AppFlow}
        durationInFrames={810}
        fps={30}
        width={1280}
        height={720}
      />
      <Folder name="Escenas">
        <Composition id="HoraPico" component={RushHour} durationInFrames={290} fps={30} width={1280} height={720} />
        <Composition id="ParqueMorazan" component={Morazan} durationInFrames={330} fps={30} width={1280} height={720} />
        <Composition id="Abordando" component={Boarding} durationInFrames={210} fps={30} width={1280} height={720} />
        <Composition id="ABordo" component={Riding} durationInFrames={240} fps={30} width={1280} height={720} />
        <Composition id="Llegada" component={Arrival} durationInFrames={255} fps={30} width={1280} height={720} />
        <Composition id="Cierre" component={Closing} durationInFrames={150} fps={30} width={1280} height={720} />
      </Folder>
    </>
  );
};
