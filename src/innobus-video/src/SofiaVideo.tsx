import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Arrival } from "./scenes/Arrival";
import { Boarding } from "./scenes/Boarding";
import { Closing } from "./scenes/Closing";
import { Morazan } from "./scenes/Morazan";
import { Riding } from "./scenes/Riding";
import { RushHour } from "./scenes/RushHour";

// Sofía's trip on route 142, following docs/storyboard-sofia-innobus.md.
// Total: 1475 frames of scenes minus 5 fades of 15 = 1400 frames (46.7 s).
export const SofiaVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={290} name="Hora pico">
        <RushHour />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={330} name="Parque Morazán">
        <Morazan />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={210} name="Abordando">
        <Boarding />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={240} name="A bordo">
        <Riding />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={255} name="Llegada">
        <Arrival />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence durationInFrames={150} name="Cierre">
        <Closing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
