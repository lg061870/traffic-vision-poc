import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";

// Full-frame Flow clip (1280x720, 24 fps). Its ambient sound stays low under
// the narration; `playbackRate` below 1 stretches a clip to fit its voice line.
export const Clip: React.FC<{ file: string; playbackRate?: number }> = ({
  file,
  playbackRate = 1,
}) => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Video
        src={staticFile(file)}
        volume={0.25}
        playbackRate={playbackRate}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};
