import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Expand,
  Eye,
  Flower2,
  Globe2,
  Heart,
  Leaf,
  LocateFixed,
  Map,
  Minus,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Settings2,
  Shell,
  Sparkles,
  Sprout,
  Star,
  Sun,
  TreePine,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { Engine, type GameState } from "./game/Engine";
import {
  DISCOVERIES,
  MAX_DECORATIONS,
  REGIONS,
  SAVE_KEY,
  freshProgress,
  loadProgress,
  type DecorationType,
  type Progress,
  type Region,
} from "./game/world";
import { RegionArt } from "./components/RegionArt";
import { ProjectLogo } from "./components/ProjectLogo";
import type { CameraMode } from "./game/camera";

type Modal = "help" | "discoveries" | "parents" | null;
const regionIcons = { forest: TreePine, desert: Sun, ocean: Waves };

function DiscoveryIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const icons: Record<string, typeof Star> = {
    star: Star,
    mushroom: Sprout,
    butterfly: Flower2,
    cactus: TreePine,
    crystal: Sparkles,
    shell: Shell,
    fish: Waves,
  };
  const Icon = icons[icon] || Star;
  return <Icon size={size} strokeWidth={1.6} />;
}

function Dialog({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const elements = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, [tabindex="0"]',
        ) || [],
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <div className="modal-eyebrow">
          <Sparkles size={15} /> A LITTLE MOMENT
        </div>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description" className="modal-subtitle">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const viewport = useRef<HTMLDivElement>(null);
  const gameCard = useRef<HTMLElement>(null);
  const engine = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [game, setGame] = useState<GameState>({
    cameraMode: "planet",
    region: "forest",
    moving: false,
    swimming: false,
    zoom: 23.5,
    position: REGIONS.forest.spawn.toArray(),
  });
  const [modal, setModal] = useState<Modal>(null);
  const [paused, setPaused] = useState(false);
  const [decoration, setDecoration] = useState<DecorationType | null>(null);
  const [showDecorations, setShowDecorations] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    text: string;
    icon?: string;
  } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const keyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lookTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const firstPerson = game.cameraMode === "first-person";
  const RegionIcon = regionIcons[game.region];
  const regionalFound = DISCOVERIES.filter(
    (d) => d.region === game.region && progress.found.includes(d.id),
  ).length;

  const chime = useCallback(() => {
    if (
      !progressRef.current.sound ||
      !audio.current ||
      audio.current.state !== "running"
    )
      return;
    const context = audio.current;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, context.currentTime + index * 0.1);
      gain.gain.linearRampToValueAtTime(
        0.045,
        context.currentTime + index * 0.1 + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + index * 0.1 + 0.65,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + index * 0.1 + 0.7);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, []);

  const notify = useCallback((title: string, text: string, icon?: string) => {
    clearTimeout(toastTimeout.current);
    setToast({ title, text, icon });
    toastTimeout.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    if (!viewport.current) return;
    try {
      engine.current = new Engine(viewport.current, progressRef.current, {
        state: setGame,
        ready: () => setReady(true),
        error: setError,
        found: (id) => {
          setProgress((current) => ({
            ...current,
            found: current.found.includes(id)
              ? current.found
              : [...current.found, id],
          }));
          const item = DISCOVERIES.find((d) => d.id === id)!;
          notify(`You found ${item.name.toLowerCase()}!`, item.fact, item.icon);
          chime();
        },
        decorate: (item) => {
          setProgress((current) => ({
            ...current,
            decorations: [...current.decorations, item],
          }));
          chime();
        },
      });
    } catch (cause) {
      console.error("Mini World could not start:", cause);
      setError(
        "This little world needs a browser with 3D graphics. Please enable hardware acceleration or try a newer browser.",
      );
    }
    return () => {
      engine.current?.dispose();
      engine.current = null;
    };
  }, [chime, notify]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [progress]);
  useEffect(() => {
    engine.current?.setPaused(paused || modal !== null);
  }, [paused, modal]);
  useEffect(() => {
    engine.current?.setDecoration(decoration);
  }, [decoration]);
  useEffect(() => {
    const resumeAudio = () => {
      if (!progressRef.current.sound) return;
      try {
        if (!audio.current || audio.current.state === "closed")
          audio.current = new AudioContext();
        void audio.current.resume().catch(() => {});
      } catch {
        /* Play remains available without audio. */
      }
    };
    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    return () => {
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, []);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || modal !== null || paused) return;
      if (firstPerson) engine.current?.overview();
      else if (expanded) setExpanded(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [expanded, firstPerson, modal, paused]);
  useEffect(
    () => () => {
      clearTimeout(toastTimeout.current);
      clearTimeout(keyTimeout.current);
      clearTimeout(lookTimeout.current);
      void audio.current?.close();
      audio.current = null;
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModal(null);
    setResetConfirm(false);
  }, []);
  const toggleSound = async () => {
    const sound = !progress.sound;
    if (sound) {
      try {
        audio.current ||= new AudioContext();
        await audio.current.resume();
      } catch {
        notify(
          "Sound is unavailable",
          "You can still enjoy every part of your little world.",
        );
        return;
      }
    }
    setProgress((current) => ({ ...current, sound }));
    progressRef.current = { ...progressRef.current, sound };
    if (sound) chime();
  };

  const travel = (region: Region) => {
    setPaused(false);
    setDecoration(null);
    setShowDecorations(false);
    engine.current?.travel(region);
    chime();
    notify(
      `Hello, ${REGIONS[region].name}!`,
      region === "ocean"
        ? "Sunny can swim! Tap the water to make a splash."
        : "Tap anywhere on the land. Sunny will follow.",
    );
  };

  const directionButton = (
    direction: string,
    x: number,
    y: number,
    icon: ReactNode,
  ) => (
    <button
      key={direction}
      className={`direction direction-${direction}`}
      aria-label={`Move ${direction}`}
      disabled={paused || !ready}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        engine.current?.setInput(x, y);
      }}
      onPointerUp={() => engine.current?.setInput(0, 0)}
      onPointerCancel={() => engine.current?.setInput(0, 0)}
      onLostPointerCapture={() => engine.current?.setInput(0, 0)}
      onClick={(event) => {
        if (event.detail !== 0) return;
        engine.current?.setInput(x, y);
        clearTimeout(keyTimeout.current);
        keyTimeout.current = setTimeout(
          () => engine.current?.setInput(0, 0),
          350,
        );
      }}
    >
      {icon}
    </button>
  );

  const chooseCamera = (mode: CameraMode) => {
    setToast(null);
    engine.current?.setCameraMode(mode);
  };
  const lookButton = (side: "left" | "right") => {
    const direction = side === "left" ? 1 : -1;
    return (
      <button
        aria-label={`Look ${side}`}
        title={`Look ${side}`}
        disabled={paused}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          engine.current?.setLookInput(direction);
        }}
        onPointerUp={() => engine.current?.setLookInput(0)}
        onPointerCancel={() => engine.current?.setLookInput(0)}
        onLostPointerCapture={() => engine.current?.setLookInput(0)}
        onClick={(event) => {
          if (event.detail !== 0) return;
          engine.current?.setLookInput(direction);
          clearTimeout(lookTimeout.current);
          lookTimeout.current = setTimeout(
            () => engine.current?.setLookInput(0),
            300,
          );
        }}
      >
        {side === "left" ? <RotateCcw size={19} /> : <RotateCw size={19} />}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          aria-label="Mini World home"
          onClick={() => {
            closeModal();
            engine.current?.overview();
          }}
        >
          <ProjectLogo />
          <span className="brand-wordmark">
            mini world<span className="brand-dot">.</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={`nav-button ${modal !== "discoveries" ? "active" : ""}`}
            onClick={closeModal}
          >
            <Compass size={18} /> Let's explore
          </button>
          <button
            className={`nav-button ${modal === "discoveries" ? "active" : ""}`}
            onClick={() => setModal("discoveries")}
          >
            <Star size={17} /> My discoveries{" "}
            <span className="nav-count">{progress.found.length}</span>
          </button>
        </nav>
        <div className="header-actions">
          <button
            className={`icon-button sound-button ${progress.sound ? "sound-on" : ""}`}
            aria-label={progress.sound ? "Turn sound off" : "Turn sound on"}
            onClick={toggleSound}
          >
            {progress.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <span className="header-divider" />
          <button className="parent-button" onClick={() => setModal("parents")}>
            <Settings2 size={17} />
            <span>Grown-up corner</span>
          </button>
        </div>
      </header>

      <main>
        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              <span /> YOUR POCKET-SIZED HAPPY PLACE
            </div>
            <h1>
              Little world. <span>Endless wonder.</span>
            </h1>
            <p>No hurry. No rules. Just a whole world of possibilities.</p>
          </div>
          <div className="explorer-profile">
            <div className="profile-image">
              <img
                src={`${import.meta.env.BASE_URL}sunny-face.png`}
                alt="Sunny, your yellow starry-eyed explorer"
              />
            </div>
            <div>
              <span>YOUR LITTLE EXPLORER</span>
              <strong>
                Sunny <Sun size={15} />
              </strong>
              <p>Ready for an adventure!</p>
            </div>
          </div>
        </section>

        <div className="play-layout">
          <section
            ref={gameCard}
            className={`game-card ${expanded ? "expanded" : ""}`}
            aria-label="Mini World game"
          >
            <div
              className="world-stage"
              data-region={game.region}
              data-moving={game.moving}
              data-swimming={game.swimming}
              data-jumping={game.jumping || false}
              data-zoom={game.zoom.toFixed(2)}
              data-position={game.position.join(",")}
              data-camera-mode={game.cameraMode}
              data-look-direction={game.lookDirection?.join(",")}
              data-camera-clearance={game.cameraClearance?.toFixed(3)}
            >
              <div className="world-sky">
                <span className="sky-star star-one">✦</span>
                <span className="sky-star star-two">✧</span>
                <span className="sky-star star-three">+</span>
                <span className="sky-orbit" />
              </div>
              <div className="stage-top">
                <span className="live-badge">
                  <i /> YOUR LITTLE WORLD
                </span>
                <div
                  className="camera-switcher"
                  role="group"
                  aria-label="Camera view"
                >
                  <button
                    className="view-button"
                    aria-pressed={game.cameraMode === "planet"}
                    onClick={() => chooseCamera("planet")}
                    disabled={!ready || paused}
                    title="See the whole little planet"
                  >
                    <Globe2 size={15} />
                    <span>Little planet</span>
                  </button>
                  <button
                    className="view-button"
                    aria-pressed={game.cameraMode === "follow"}
                    onClick={() => chooseCamera("follow")}
                    disabled={!ready || paused}
                    title="Stay close to Sunny"
                  >
                    <LocateFixed size={15} />
                    <span>Follow Sunny</span>
                  </button>
                  <button
                    className="view-button"
                    aria-label="Sunny's eyes (POV)"
                    aria-pressed={firstPerson}
                    onClick={() => chooseCamera("first-person")}
                    disabled={!ready || paused}
                    title="See the world through Sunny's eyes"
                  >
                    <Eye size={16} />
                    <span>POV</span>
                  </button>
                </div>
              </div>
              <div
                ref={viewport}
                className={`canvas-container ${decoration ? "decorating" : ""}`}
              />
              {!ready && !error && (
                <div className="loading-state">
                  <ProjectLogo />
                  <strong>A little world is growing…</strong>
                  <span>Getting everything ready for Sunny</span>
                </div>
              )}
              {error && (
                <div className="game-error">
                  <Globe2 size={40} />
                  <h3>A little help, please</h3>
                  <p>{error}</p>
                  <button
                    className="primary-button"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              )}
              {ready && !error && (
                <>
                  {game.playerScreen?.visible && !paused && (
                    <button
                      className="sunny-location"
                      style={{
                        left: `${game.playerScreen.x}%`,
                        top: `${game.playerScreen.y}%`,
                      }}
                      onClick={() => engine.current?.center()}
                      aria-label="Get closer to Sunny"
                    >
                      <span />
                      Sunny
                    </button>
                  )}
                  {!firstPerson && (
                    <div className="floating-note">
                      <span className="note-dot" />
                      {game.swimming
                        ? "Just keep swimming!"
                        : game.moving
                          ? "Off on a little adventure…"
                          : "A little adventure starts here"}
                      <svg viewBox="0 0 60 37" aria-hidden="true">
                        <path d="M6 4c-10 20 31 25 43 12m-10 0 11-1-3 10" />
                      </svg>
                    </div>
                  )}
                  {!firstPerson && (
                    <div className="zoom-controls">
                      <button
                        aria-label="Zoom in"
                        onClick={() => engine.current?.zoom(-1)}
                        disabled={game.zoom < 9.4}
                      >
                        <Plus size={20} />
                      </button>
                      <div className="zoom-track">
                        <span
                          style={{
                            bottom: `${((28 - game.zoom) / (28 - 9.3)) * 100}%`,
                          }}
                        />
                      </div>
                      <button
                        aria-label="Zoom out"
                        onClick={() => engine.current?.zoom(1)}
                        disabled={game.zoom > 27.9}
                      >
                        <Minus size={20} />
                      </button>
                    </div>
                  )}
                  {firstPerson && (
                    <>
                      <div className="pov-caption">
                        <span>
                          <Eye size={14} /> THROUGH SUNNY'S EYES
                        </span>
                        <p>
                          {game.swimming
                            ? "A little splash. A whole new view."
                            : "Big wonders, from a little explorer's view."}
                        </p>
                      </div>
                      <div className="pov-reticle" aria-hidden="true">
                        <span />
                      </div>
                      <div
                        className="pov-look"
                        role="group"
                        aria-label="Look around"
                      >
                        {lookButton("left")}
                        <span>LOOK</span>
                        {lookButton("right")}
                      </div>
                    </>
                  )}
                  <div className="stage-bottom">
                    <div className="tap-hint">
                      <MousePointer2 size={15} />
                      <span>
                        {firstPerson
                          ? "Drag to look. Tap the ground to wander."
                          : "Tap to wander. Drag to look around."}
                      </span>
                    </div>
                    <div className="stage-tools">
                      <button
                        className="stage-icon"
                        onClick={() => engine.current?.center()}
                        aria-label="Find Sunny"
                        title="Find Sunny"
                      >
                        <LocateFixed size={19} />
                      </button>
                      <button
                        className="stage-icon"
                        onClick={() => setExpanded(!expanded)}
                        aria-label={
                          expanded ? "Exit big screen" : "Enter big screen"
                        }
                        title="Big screen"
                      >
                        {expanded ? <X size={19} /> : <Expand size={18} />}
                      </button>
                    </div>
                  </div>
                  <div
                    className="touch-controls"
                    aria-label="Movement controls"
                  >
                    <div className="direction-pad">
                      {directionButton("up", 0, 1, <ArrowUp size={19} />)}
                      {directionButton("left", -1, 0, <ArrowLeft size={19} />)}
                      <span className="pad-center" />
                      {directionButton("right", 1, 0, <ArrowRight size={19} />)}
                      {directionButton("down", 0, -1, <ArrowDown size={19} />)}
                    </div>
                    <button
                      className="jump-button"
                      aria-label={game.swimming ? "Splash" : "Jump"}
                      onClick={() => {
                        engine.current?.jump();
                        chime();
                      }}
                      disabled={paused}
                    >
                      {game.swimming ? (
                        <Waves size={24} />
                      ) : (
                        <Sparkles size={24} />
                      )}
                    </button>
                  </div>
                  {showDecorations && (
                    <div className="decoration-tray">
                      <div>
                        <strong>A little touch of you</strong>
                        <button
                          aria-label="Close decorations"
                          onClick={() => {
                            setShowDecorations(false);
                            setDecoration(null);
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <p>
                        {progress.decorations.length >= MAX_DECORATIONS
                          ? "Your garden is full. Undo one to make space."
                          : decoration
                            ? "Now tap your planet to place it!"
                            : "Pick something. Make it your own."}
                      </p>
                      <div className="decoration-options">
                        {(["flower", "tree", "shell"] as DecorationType[]).map(
                          (kind) => {
                            const Icon =
                              kind === "flower"
                                ? Flower2
                                : kind === "tree"
                                  ? TreePine
                                  : Shell;
                            return (
                              <button
                                key={kind}
                                className={
                                  decoration === kind ? "selected" : ""
                                }
                                aria-pressed={decoration === kind}
                                disabled={
                                  progress.decorations.length >= MAX_DECORATIONS
                                }
                                onClick={() => setDecoration(kind)}
                              >
                                <Icon size={23} />
                                <span>
                                  {kind === "flower"
                                    ? "Flowers"
                                    : kind === "tree"
                                      ? "Tree"
                                      : "Seashell"}
                                </span>
                              </button>
                            );
                          },
                        )}
                        <button
                          aria-label="Undo last decoration"
                          disabled={!progress.decorations.length}
                          onClick={() => {
                            engine.current?.undoDecoration();
                            setProgress((p) => ({
                              ...p,
                              decorations: p.decorations.slice(0, -1),
                            }));
                          }}
                        >
                          <RotateCcw size={21} />
                          <span>Undo</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {paused && (
                    <div className="pause-overlay">
                      <div>
                        <span className="pause-sun">
                          <Sun size={38} />
                        </span>
                        <h2>A little breather.</h2>
                        <p>Your world will be right here.</p>
                        <button
                          className="primary-button"
                          onClick={() => setPaused(false)}
                        >
                          <Play size={17} fill="currentColor" /> Keep exploring
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {toast && (
                <div className="discovery-toast" role="status">
                  <div className="toast-icon">
                    {toast.icon ? (
                      <DiscoveryIcon icon={toast.icon} size={25} />
                    ) : (
                      <Sparkles size={24} />
                    )}
                  </div>
                  <div>
                    <strong>{toast.title}</strong>
                    <p>{toast.text}</p>
                  </div>
                  <button
                    aria-label="Dismiss message"
                    onClick={() => setToast(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
            <div className="game-footer">
              <div className={`region-symbol ${game.region}`}>
                <RegionIcon size={24} strokeWidth={1.5} />
              </div>
              <div className="current-region">
                <div>
                  <h2>{REGIONS[game.region].name}</h2>
                  <span
                    className={`activity-pill ${game.swimming ? "swimming" : ""}`}
                  >
                    {game.swimming ? "Swimming" : "Exploring"}
                  </span>
                </div>
                <p>{REGIONS[game.region].description}</p>
              </div>
              <button
                className="region-progress"
                aria-label={`Find a little wonder. ${regionalFound} of 3 found here`}
                title="Follow a sparkle"
                disabled={!ready || paused}
                onClick={() => {
                  setDecoration(null);
                  setShowDecorations(false);
                  engine.current?.setDecoration(null);
                  if (engine.current?.findWonder()) {
                    notify(
                      "Follow that sparkle!",
                      "Sunny is on the way to a little surprise.",
                    );
                  } else {
                    notify(
                      "Every wonder found!",
                      "Try another place, or make this one your own.",
                    );
                  }
                }}
              >
                <span>
                  <Star size={15} />
                  {regionalFound} <i>/ 3</i>
                </span>
                <p>little surprises</p>
              </button>
            </div>
          </section>

          <aside className="sidebar" aria-label="Places to explore">
            <section className="destinations">
              <div className="section-heading">
                <span className="small-icon">
                  <Map size={19} />
                </span>
                <h2>Where shall we go?</h2>
              </div>
              <p className="section-description">
                A new adventure, just a tap away.
              </p>
              <div className="region-list">
                {(Object.keys(REGIONS) as Region[]).map((region) => {
                  const active = game.region === region;
                  const Icon = regionIcons[region];
                  return (
                    <button
                      key={region}
                      className={`destination ${region} ${active ? "selected" : ""}`}
                      onClick={() => travel(region)}
                      aria-label={`Explore ${REGIONS[region].name}`}
                      aria-pressed={active}
                      disabled={!ready || !!error}
                    >
                      <RegionArt region={region} className="destination-art" />
                      <span className="destination-copy">
                        <strong>{REGIONS[region].name}</strong>
                        <span>{REGIONS[region].tag}</span>
                        <span className="destination-status">
                          {active ? (
                            <>
                              <span className="here-dot" /> YOU ARE HERE
                            </>
                          ) : (
                            <>
                              <Icon size={12} /> LET'S GO
                            </>
                          )}
                        </span>
                      </span>
                      <span className="destination-arrow">
                        {active ? (
                          <Check size={15} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="sunny-card">
              <div className="sunny-card-text">
                <span>
                  SMALL EXPLORER.
                  <br />
                  BIG IMAGINATION.
                </span>
                <h2>Hello, I'm Sunny!</h2>
                <p>
                  Let's find something
                  <br />
                  wonderful together.
                </p>
                <button
                  onClick={() => {
                    engine.current?.center();
                    engine.current?.jump();
                    notify(
                      "Sunny says hello!",
                      "A curious heart and a whole world to explore.",
                    );
                    chime();
                  }}
                >
                  Say hello <span>↗</span>
                </button>
              </div>
              <img
                src={`${import.meta.env.BASE_URL}sunny.png`}
                alt="Sunny in a golden suit, diamond eyes and a white planet emblem"
              />
              <span className="sunny-sparkle">✧</span>
              <span className="sunny-dot" />
            </section>
            <button
              className="discovery-summary"
              onClick={() => setModal("discoveries")}
            >
              <span className="discovery-summary-icon">
                <Star size={22} />
              </span>
              <span>
                <strong>A pocketful of wonders</strong>
                <span>
                  {progress.found.length} of {DISCOVERIES.length} discoveries
                  found
                </span>
              </span>
              <ChevronRight size={18} />
            </button>
          </aside>
        </div>

        <section className="play-toolbar" aria-label="Play tools">
          <div className="keyboard-help">
            <span className="key-cluster">
              <kbd>W</kbd>
              <span>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd>
              </span>
            </span>
            <span>
              Little keys, big adventures.
              <small>Arrow keys work too · Space to hop</small>
            </span>
          </div>
          <div className="toolbar-actions">
            <button
              className={showDecorations ? "tool-active" : ""}
              onClick={() => {
                setShowDecorations(!showDecorations);
                setDecoration(null);
                engine.current?.setDecoration(null);
                setToast(null);
              }}
              disabled={!ready}
            >
              <Flower2 size={17} /> Decorate
            </button>
            <span />
            <button onClick={() => setPaused(!paused)} disabled={!ready}>
              {paused ? <Play size={17} /> : <Pause size={17} />}
              <span>{paused ? "Resume" : "Take a break"}</span>
            </button>
            <span />
            <button onClick={() => setModal("help")}>
              <CircleHelp size={18} />
              <span>How to play</span>
            </button>
          </div>
        </section>
        <footer className="site-footer">
          <span>
            <Heart size={13} /> Made for little hands & big imaginations.
          </span>
          <span>
            <span className="safe-dot" /> No scores. No rush. Just joy.
          </span>
        </footer>
      </main>

      {modal === "help" && (
        <Dialog
          title="Big adventures. Little steps."
          subtitle="There's no right or wrong way to explore. Just follow your curiosity."
          close={closeModal}
        >
          <div className="help-grid">
            <div>
              <MousePointer2 />
              <h3>Tap & wander</h3>
              <p>
                Tap anywhere on the planet and Sunny will walk there. Tap the
                sea to swim!
              </p>
            </div>
            <div>
              <Globe2 />
              <h3>A whole new view</h3>
              <p>
                Choose Little planet, Follow Sunny, or POV. In POV, drag to look
                around or use Q / E. Move with the arrows, WASD, or the pad.
                Press Escape to return to the planet.
              </p>
            </div>
            <div>
              <Star />
              <h3>Find little wonders</h3>
              <p>
                Walk up to a floating treasure to add it to your discoveries.
                There are nine to find.
              </p>
            </div>
            <div>
              <Flower2 />
              <h3>Make it yours</h3>
              <p>
                Choose Decorate, pick a flower, tree, or shell, and tap a spot
                on the planet.
              </p>
            </div>
          </div>
          <div className="help-note">
            <Heart size={19} />
            <p>
              Sunny always stays safe. No losing, no timers, and no deep water
              to worry about.
            </p>
          </div>
          <button className="primary-button full-width" onClick={closeModal}>
            Let's explore <ArrowRight size={18} />
          </button>
        </Dialog>
      )}
      {modal === "discoveries" && (
        <Dialog
          title="A pocketful of wonders."
          subtitle={`${progress.found.length} little ${progress.found.length === 1 ? "memory" : "memories"} collected. A whole world still to explore.`}
          close={closeModal}
          wide
        >
          <div className="collection-progress">
            <span
              style={{
                width: `${(progress.found.length / DISCOVERIES.length) * 100}%`,
              }}
            />
          </div>
          <div className="collection-grid">
            {DISCOVERIES.map((item) => {
              const found = progress.found.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`collection-item ${found ? "found" : ""}`}
                >
                  <span className={`collection-icon ${item.region}`}>
                    <DiscoveryIcon icon={item.icon} size={32} />
                    {found && (
                      <span className="found-check">
                        <Check size={11} />
                      </span>
                    )}
                  </span>
                  <h3>{found ? item.name : "A little mystery"}</h3>
                  <p>
                    {found
                      ? item.fact
                      : `Waiting in ${REGIONS[item.region].name}`}
                  </p>
                </div>
              );
            })}
          </div>
          {progress.found.length === DISCOVERIES.length && (
            <div className="all-found">
              <Sparkles /> You found every little wonder! Now make the world
              your own.
            </div>
          )}
          <p className="saved-note">
            <Leaf size={14} />
            {saveError
              ? "Progress cannot be saved in this browser session."
              : "Little memories are saved on this device, automatically."}
          </p>
        </Dialog>
      )}
      {modal === "parents" && (
        <Dialog
          title="A little peace of mind."
          subtitle="A gentle space to play, imagine, and discover together."
          close={closeModal}
        >
          <div className="parent-note">
            <Heart size={23} />
            <div>
              <strong>Made for curious little people.</strong>
              <p>
                No ads, purchases, chat, scores, or time limits. Everything
                stays on this device.
              </p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <strong>Happy little sounds</strong>
              <p>Soft chimes for discoveries and play.</p>
            </div>
            <button
              className={`toggle ${progress.sound ? "on" : ""}`}
              role="switch"
              aria-checked={progress.sound}
              aria-label="Happy little sounds"
              onClick={toggleSound}
            >
              <span />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>Saved with care</strong>
              <p>
                {saveError
                  ? "Saving is unavailable in this browser."
                  : `${progress.found.length} discoveries · ${progress.decorations.length} decorations`}
              </p>
            </div>
            <Leaf size={23} />
          </div>
          <div className="reset-section">
            {resetConfirm ? (
              <>
                <p>
                  Start a fresh adventure? This removes all discoveries and
                  decorations on this device.
                </p>
                <div>
                  <button
                    className="secondary-button"
                    onClick={() => setResetConfirm(false)}
                  >
                    Keep our world
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      const next = {
                        ...freshProgress(),
                        sound: progress.sound,
                      };
                      setProgress(next);
                      engine.current?.reset();
                      setDecoration(null);
                      setShowDecorations(false);
                      closeModal();
                      notify(
                        "A fresh little beginning",
                        "Your world is ready for a brand-new adventure.",
                      );
                    }}
                  >
                    Yes, start fresh
                  </button>
                </div>
              </>
            ) : (
              <button
                className="text-button"
                onClick={() => setResetConfirm(true)}
              >
                <RotateCcw size={15} /> Start a fresh adventure
              </button>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
