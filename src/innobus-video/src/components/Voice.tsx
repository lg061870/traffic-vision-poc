import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";

// One narration line from public/voz (see scripts/generate-voice.py),
// starting at frame `from` of the scene.
export const Voice: React.FC<{ line: string; from: number }> = ({
  line,
  from,
}) => {
  return (
    <Sequence from={from} name={`Voz ${line}`} layout="none">
      <Audio src={staticFile(`voz/${line}.mp3`)} />
    </Sequence>
  );
};
