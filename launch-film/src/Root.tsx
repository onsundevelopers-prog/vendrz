import React from "react";
import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { VIDEO } from "./theme";
import { N4MAMaster } from "./N4MAMaster";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";
import { Scene08 } from "./scenes/Scene08";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

// The footage files are screen recordings: decoded frames are big and the
// default OffthreadVideo cache (~200MB) thrashes at 1080p, producing
// "No frame found at position" compositor errors. 512MB is well under the
// 16GB on this machine while giving the cache real room.
const VIDEO_CACHE = 512 * 1024 * 1024;

export const RemotionRoot: React.FC = () => {
  const fps = VIDEO.fps;
  const common = {
    fps,
    width: VIDEO.width,
    height: VIDEO.height,
    offthreadVideoCacheSizeInBytes: VIDEO_CACHE,
  };
  return (
    <>
      <Composition id="N4MAMaster" component={N4MAMaster} durationInFrames={1800} {...common} />
      <Composition id="S1-Problem" component={Scene01} durationInFrames={120} {...common} />
      <Composition id="S2-Introducing" component={Scene02} durationInFrames={180} {...common} />
      <Composition id="S3-AllInOnePlace" component={Scene03} durationInFrames={240} {...common} />
      <Composition id="S4-AIUnderstands" component={Scene04} durationInFrames={270} {...common} />
      <Composition id="S5-TheAI" component={Scene05} durationInFrames={270} {...common} />
      <Composition id="S6-Action" component={Scene06} durationInFrames={270} {...common} />
      <Composition id="S7-Overview" component={Scene07} durationInFrames={240} {...common} />
      <Composition id="S8-Ending" component={Scene08} durationInFrames={210} {...common} />
    </>
  );
};
