import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate } from "remotion";
import { T } from "./timings";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";
import { Scene08 } from "./scenes/Scene08";

export const N4MAMaster: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#08090A" }}>
      {/* Music bed - ducked under VO */}
      <Audio
        src={staticFile("soundtrack.mp3")}
        volume={(f) => {
          const duck = interpolate(f, [T.vo1, T.vo1 + 20], [0.9, 0.26], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(f, [T.totalFrames - 30, T.totalFrames - 4], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return Math.min(duck, fadeOut) * 0.5;
        }}
      />

      {/* Voiceover */}
      <Sequence from={T.vo1}>
        <Audio src={staticFile("vo/vo1.mp3")} volume={1} />
      </Sequence>
      <Sequence from={T.vo2}>
        <Audio src={staticFile("vo/vo2.mp3")} volume={1} />
      </Sequence>
      <Sequence from={T.vo3}>
        <Audio src={staticFile("vo/vo3.mp3")} volume={1} />
      </Sequence>
      <Sequence from={T.vo4}>
        <Audio src={staticFile("vo/vo4.mp3")} volume={1} />
      </Sequence>
      <Sequence from={T.vo5}>
        <Audio src={staticFile("vo/vo5.mp3")} volume={1} />
      </Sequence>

      {/* Scenes */}
      <Sequence from={T.s1.start} durationInFrames={T.s1.dur}>
        <Scene01 />
      </Sequence>
      <Sequence from={T.s2.start} durationInFrames={T.s2.dur}>
        <Scene02 />
      </Sequence>
      <Sequence from={T.s3.start} durationInFrames={T.s3.dur}>
        <Scene03 />
      </Sequence>
      <Sequence from={T.s4.start} durationInFrames={T.s4.dur}>
        <Scene04 />
      </Sequence>
      <Sequence from={T.s5.start} durationInFrames={T.s5.dur}>
        <Scene05 />
      </Sequence>
      <Sequence from={T.s6.start} durationInFrames={T.s6.dur}>
        <Scene06 />
      </Sequence>
      <Sequence from={T.s7.start} durationInFrames={T.s7.dur}>
        <Scene07 />
      </Sequence>
      <Sequence from={T.s8.start} durationInFrames={T.s8.dur}>
        <Scene08 />
      </Sequence>
    </AbsoluteFill>
  );
};
