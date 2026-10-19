import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SearchTyping } from "./components/SearchTyping";

// App screens are 768x1376; the phone screen is drawn at this size.
const SCREEN_HEIGHT = 620;
const SCREEN_WIDTH = Math.round((SCREEN_HEIGHT * 768) / 1376);

type Tap = { x: string; y: string; at: number };
type Step = { file: string; at: number; tap?: Tap };

// The app from splash to fleet telemetry. `at` is when the screen slides in;
// `tap` marks the button that leads to the next screen (percent of screen).
const STEPS: Step[] = [
  { file: "screen0_innobus_splash.jpg", at: 0 },
  {
    file: "transit_home_passengers_no_adulto.jpg",
    at: 90,
    tap: { x: "50%", y: "7.7%", at: 118 },
  },
  {
    file: "screen2_innobus_routes_transit.jpg",
    at: 225,
    tap: { x: "27%", y: "60.5%", at: 312 },
  },
  {
    file: "screen3_innobus_details_transit.jpg",
    at: 330,
    tap: { x: "81%", y: "60.5%", at: 418 },
  },
  { file: "screen1_innobus_home_transit.jpg", at: 435 },
  {
    file: "screen4_innobus_onboard_transit.jpg",
    at: 540,
    tap: { x: "73%", y: "79%", at: 638 },
  },
  { file: "screen5_innobus_fleet_transit.jpg", at: 655 },
];

const SLIDE = 16;

// A screen sliding in from the right over the previous one, which drifts left.
const Screen: React.FC<{ step: Step; nextAt?: number }> = ({
  step,
  nextAt,
}) => {
  const frame = useCurrentFrame();
  if (frame < step.at || (nextAt !== undefined && frame > nextAt + SLIDE)) {
    return null;
  }
  const enter =
    step.at === 0
      ? 0
      : interpolate(frame, [step.at, step.at + SLIDE], [100, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
  const leave =
    nextAt === undefined
      ? 0
      : interpolate(frame, [nextAt, nextAt + SLIDE], [0, -30], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });

  return (
    <AbsoluteFill style={{ translate: `${enter + leave}% 0px` }}>
      <Img
        src={staticFile(step.file)}
        style={{ width: "100%", height: "100%" }}
      />
      {step.file === "transit_home_passengers_no_adulto.jpg" ? (
        <SearchTyping from={130} to={185} fontSize={14} />
      ) : null}
    </AbsoluteFill>
  );
};

// Finger tap: a dot that presses in, then a ripple ring.
const TapMark: React.FC<{ tap: Tap }> = ({ tap }) => {
  const frame = useCurrentFrame();
  const t = frame - tap.at;
  if (t < -8 || t > 20) {
    return null;
  }
  const dot = interpolate(t, [-8, 0, 6, 12], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(t, [0, 20], [0.4, 2.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <div style={{ position: "absolute", left: tap.x, top: tap.y }}>
      <div
        style={{
          position: "absolute",
          width: 34,
          height: 34,
          left: -17,
          top: -17,
          borderRadius: "50%",
          background: "rgba(15, 23, 42, 0.35)",
          border: "2px solid rgba(255,255,255,0.9)",
          opacity: dot,
          scale: t < 0 ? 1.2 - 0.2 * dot : 1,
        }}
      />
      {t >= 0 ? (
        <div
          style={{
            position: "absolute",
            width: 34,
            height: 34,
            left: -17,
            top: -17,
            borderRadius: "50%",
            border: "3px solid rgba(37, 99, 235, 0.8)",
            scale: ripple,
            opacity: interpolate(t, [0, 20], [1, 0], {
              extrapolateRight: "clamp",
            }),
          }}
        />
      ) : null}
    </div>
  );
};

export const AppFlow: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 45%, #16304d 0%, #0a1626 70%)",
        justifyContent: "center",
        alignItems: "center",
        opacity: interpolate(frame, [790, 810], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      {/* Soft cyan glow behind the phone. */}
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          padding: 10,
          borderRadius: 48,
          background: "#0b1220",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.55), 0 0 0 2px #2a3550 inset, 0 0 40px rgba(56,189,248,0.25)",
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 24], [0.94, 1], {
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            position: "relative",
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            borderRadius: 38,
            overflow: "hidden",
            background: "white",
          }}
        >
          {STEPS.map((step, i) => (
            <Screen key={step.file} step={step} nextAt={STEPS[i + 1]?.at} />
          ))}
          {STEPS.map((step) =>
            step.tap ? <TapMark key={step.file} tap={step.tap} /> : null,
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
