import {
  Activity,
  Apple,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CircleUser,
  Clipboard,
  Download,
  Dumbbell,
  Gauge,
  HeartPulse,
  Home,
  Info,
  MessageCircle,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Trash2,
  Wallet,
  Waves,
  X,
  Zap
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  budgetItems,
  dailyChecklist,
  defaultNotes,
  lifeAreas,
  macroTargets,
  meals,
  prehab,
  summerGoals,
  summerProfile,
  workouts
} from "./data/appData";
import { useLocalStorage } from "./hooks/useLocalStorage";

type View = "dashboard" | "workouts" | "nutrition" | "prehab" | "lifestyle" | "assistant" | "settings";
type ChatMessage = { role: "user" | "assistant"; content: string };
type TimerMode = "exercise" | "rest";
type WorkoutSet = { id: string; weight: string; reps: string; done: boolean };
type WorkoutExercise = { id: string; name: string; note: string; sets: WorkoutSet[] };
type WorkoutPlan = {
  id: string;
  day: string;
  focus: string;
  tag: "Training" | "Recovery";
  exercises: WorkoutExercise[];
};

type AppState = {
  checked: Record<string, boolean>;
  water: number;
  sleep: number;
  bodyWeight: string;
  notes: string;
  customTasks: string[];
  workoutPlans: WorkoutPlan[];
  restSeconds: number;
  exerciseSeconds: number;
};

const initialState: AppState = {
  checked: {},
  water: 2,
  sleep: 8,
  bodyWeight: "180",
  notes: defaultNotes,
  customTasks: ["Text a friend about weekend plans", "Prep rice and protein for tomorrow"],
  workoutPlans: createInitialWorkoutPlans(),
  restSeconds: 90,
  exerciseSeconds: 45
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Ultimatum context is loaded: training split, nutrition targets, meal timing, iliopsoas guardrails, summer goals, budget, checklist, and live notes. Ask me what to do next."
  }
];

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "prehab", label: "Prehab", icon: HeartPulse },
  { id: "lifestyle", label: "Lifestyle", icon: Trophy },
  { id: "assistant", label: "AI Assistant", icon: Bot },
  { id: "settings", label: "Settings", icon: Settings }
];

const supplementStack = [
  ["Creatine monohydrate", "5g daily"],
  ["Whey protein", "Use to hit protein"],
  ["Fish oil", "2-3g EPA/DHA"],
  ["Magnesium glycinate", "300mg before sleep"]
];

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [state, setState] = useLocalStorage<AppState>("ultimatum-state", initialState);
  const [taskInput, setTaskInput] = useState("");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [installCopyStatus, setInstallCopyStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("ultimatum-chat", initialMessages);
  const [activeTimer, setActiveTimer] = useState<{ mode: TimerMode; remaining: number; running: boolean }>({
    mode: "rest",
    remaining: initialState.restSeconds,
    running: false
  });

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    setState((current) => hydrateState(current));
  }, [setState]);

  useEffect(() => {
    if (!activeTimer.running) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveTimer((current) => {
        if (!current.running) {
          return current;
        }

        if (current.remaining <= 1) {
          return { ...current, remaining: 0, running: false };
        }

        return { ...current, remaining: current.remaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTimer.running]);

  const appState = hydrateState(state);
  const completedCount = dailyChecklist.filter((item) => appState.checked[item]).length;
  const todayWorkout = getWorkoutForToday(appState.workoutPlans);
  const progress = Math.round((completedCount / dailyChecklist.length) * 100);
  const readiness = Math.min(99, Math.round(progress * 0.55 + appState.sleep * 5 + Math.min(appState.water, 3.5) * 4));

  const toggleCheck = (item: string) => {
    setState((current) => ({
      ...current,
      checked: { ...current.checked, [item]: !current.checked[item] }
    }));
  };

  const addTask = (event: FormEvent) => {
    event.preventDefault();

    if (!taskInput.trim()) {
      return;
    }

    setState((current) => ({
      ...current,
      customTasks: [taskInput.trim(), ...current.customTasks]
    }));
    setTaskInput("");
  };

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();

    if (!chatInput.trim() || isChatLoading) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: chatInput.trim() };

    setMessages((current) => [...current, userMessage]);
    setChatInput("");
    setChatError("");
    setIsChatLoading(true);

    try {
      const content = await getChatAnswer(userMessage.content, appState, todayWorkout.focus);
      setMessages((current) => [...current, { role: "assistant", content }]);
    } catch (error) {
      const fallback = answerFromContext(userMessage.content, appState, todayWorkout.focus);
      const errorText = error instanceof Error ? error.message : "Claude chat failed.";

      setChatError(`${errorText} Showing local app fallback.`);
      setMessages((current) => [...current, { role: "assistant", content: fallback }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const runInstall = async () => {
    if (!installPrompt) {
      setIsInstallGuideOpen(true);
      return;
    }

    const promptEvent = installPrompt as Event & { prompt: () => Promise<void> };
    await promptEvent.prompt();
    setInstallPrompt(null);
  };

  const copyInstallUrl = async () => {
    const appUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(appUrl);
      setInstallCopyStatus("Copied");
    } catch {
      setInstallCopyStatus(appUrl);
    }

    window.setTimeout(() => setInstallCopyStatus(""), 2200);
  };

  const logWorkout = () => {
    setState((current) => ({
      ...current,
      checked: { ...current.checked, "Move or train": true }
    }));
    setView("workouts");
  };

  const startPrompt = (prompt: string) => {
    setChatInput(prompt);
    setChatError("");
    setView("assistant");
  };

  const resetLocalState = () => {
    setState(initialState);
    setMessages(initialMessages);
    setChatInput("");
    setChatError("");
  };

  return (
    <div className="app-shell">
      <header className="top-app-bar">
        <strong>{summerProfile.title}</strong>
        <div className="topbar-actions">
          <span className="status-chip">{isClaudeChatEnabled() ? "Claude linked" : "Local AI fallback"}</span>
          <button className="topbar-install" type="button" title="Install Ultimatum" onClick={runInstall}>
            <Download size={18} />
            <span>Install</span>
          </button>
          <button type="button" title="Notifications" onClick={() => setIsNotificationsOpen(true)}>
            <Bell size={20} />
          </button>
          <button type="button" title="Profile and settings" onClick={() => setView("settings")}>
            <CircleUser size={21} />
          </button>
        </div>
      </header>

      <aside className="side-rail" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-icon">
            <Waves size={23} />
          </div>
          <div>
            <h1>{summerProfile.title}</h1>
            <p>Elite performance</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
              type="button"
              title={item.label}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="rail-actions">
          <button className="primary-pill" onClick={logWorkout} type="button">
            <Plus size={18} />
            Log workout
          </button>
          <button className="ghost-pill" onClick={() => startPrompt("Analyze today's plan and tell me the next best move.")} type="button">
            <Bot size={18} />
            Ask Ultimatum
          </button>
        </div>
      </aside>

      <main className={view === "assistant" ? "main-canvas assistant-mode" : "main-canvas"}>
        {view !== "assistant" && (
          <section className="screen-heading">
            <p>{getViewKicker(view)}</p>
            <div>
              <h2>{getViewTitle(view)}</h2>
              <span>{getViewSubtitle(view, todayWorkout.focus)}</span>
            </div>
          </section>
        )}

        {view === "dashboard" && (
          <Dashboard
            state={appState}
            setState={setState}
            todayWorkout={todayWorkout}
            readiness={readiness}
            progress={progress}
            completedCount={completedCount}
            toggleCheck={toggleCheck}
            setView={setView}
            startPrompt={startPrompt}
          />
        )}
        {view === "workouts" && (
          <Workouts
            state={appState}
            setState={setState}
            todayWorkout={todayWorkout}
            activeTimer={activeTimer}
            setActiveTimer={setActiveTimer}
            startPrompt={startPrompt}
          />
        )}
        {view === "nutrition" && <Nutrition startPrompt={startPrompt} />}
        {view === "prehab" && <Prehab startPrompt={startPrompt} />}
        {view === "lifestyle" && (
          <Lifestyle
            state={appState}
            setState={setState}
            taskInput={taskInput}
            setTaskInput={setTaskInput}
            addTask={addTask}
            startPrompt={startPrompt}
          />
        )}
        {view === "assistant" && (
          <Assistant
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            isChatLoading={isChatLoading}
            chatError={chatError}
            startPrompt={startPrompt}
          />
        )}
        {view === "settings" && (
          <SettingsPanel
            installPrompt={installPrompt}
            runInstall={runInstall}
            openInstallGuide={() => setIsInstallGuideOpen(true)}
            resetLocalState={resetLocalState}
            startPrompt={startPrompt}
          />
        )}
      </main>

      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        installPrompt={installPrompt}
        copyStatus={installCopyStatus}
        onClose={() => setIsInstallGuideOpen(false)}
        onCopyUrl={copyInstallUrl}
        onInstall={runInstall}
      />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        todayWorkout={todayWorkout}
        appState={appState}
        setView={setView}
        startPrompt={startPrompt}
      />
    </div>
  );
}

function Dashboard({
  state,
  setState,
  todayWorkout,
  readiness,
  progress,
  completedCount,
  toggleCheck,
  setView,
  startPrompt
}: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  todayWorkout: ReturnType<typeof getWorkoutForToday>;
  readiness: number;
  progress: number;
  completedCount: number;
  toggleCheck: (item: string) => void;
  setView: (view: View) => void;
  startPrompt: (prompt: string) => void;
}) {
  return (
    <section className="bento-grid dashboard-bento">
      <article className="panel readiness-card span-4 glow-active">
        <PanelTitle label="Daily readiness" icon={Gauge} />
        <div className="gauge-wrap" style={{ "--score": readiness } as CSSProperties}>
          <svg viewBox="0 0 132 132" aria-label={`Readiness ${readiness}`}>
            <circle className="gauge-track" cx="66" cy="66" r="58" />
            <circle className="gauge-progress" cx="66" cy="66" r="58" />
          </svg>
          <div>
            <strong>{readiness}</strong>
            <span>{readiness > 82 ? "Excellent" : readiness > 68 ? "Ready" : "Manage load"}</span>
          </div>
        </div>
        <div className="split-stats">
          <MetricMini label="Sleep" value={`${state.sleep}h`} />
          <MetricMini label="Water" value={`${state.water}L`} />
        </div>
      </article>

      <article className="panel span-8 hero-data-card">
        <img src="/assets/summer-os-banner.png" alt="Summer training planner with ultimate frisbee and meal prep" />
        <div className="hero-data-copy">
          <p>Today protocol</p>
          <h3>{todayWorkout.focus}</h3>
          <span>{summerProfile.tagline}</span>
          <div className="inline-actions">
            <button type="button" onClick={() => setView("workouts")}>
              <Dumbbell size={18} />
              View session
            </button>
            <button type="button" onClick={() => startPrompt("Coach me through today's workout and recovery priorities.")}>
              <Bot size={18} />
              Coach me
            </button>
          </div>
        </div>
      </article>

      <article className="panel span-4">
        <PanelTitle label="Daily checklist" icon={Target} meta={`${completedCount}/${dailyChecklist.length}`} />
        <div className="thin-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="check-stack">
          {dailyChecklist.map((item) => (
            <button className={state.checked[item] ? "check-item done" : "check-item"} key={item} onClick={() => toggleCheck(item)} type="button">
              <span>{state.checked[item] && <Check size={13} />}</span>
              {item}
            </button>
          ))}
        </div>
      </article>

      <article className="panel span-4">
        <PanelTitle label="Live inputs" icon={Activity} />
        <label className="field-line">
          <span>Body weight</span>
          <input
            value={state.bodyWeight}
            inputMode="decimal"
            onChange={(event) => setState((current) => ({ ...current, bodyWeight: event.target.value }))}
          />
          <small>lb</small>
        </label>
        <Stepper label="Water" value={`${state.water}L`} onMinus={() => setState((c) => ({ ...c, water: Math.max(0, c.water - 0.5) }))} onPlus={() => setState((c) => ({ ...c, water: c.water + 0.5 }))} />
        <Stepper label="Sleep" value={`${state.sleep}h`} onMinus={() => setState((c) => ({ ...c, sleep: Math.max(0, c.sleep - 0.5) }))} onPlus={() => setState((c) => ({ ...c, sleep: c.sleep + 0.5 }))} />
      </article>

      <article className="panel span-4">
        <PanelTitle label="Macro targets" icon={Apple} />
        <div className="target-stack">
          {macroTargets.slice(0, 4).map((target, index) => (
            <TargetBar key={target.label} label={target.label} value={`${target.value} ${target.unit}`} percent={[100, 78, 72, 62][index]} kind={target.accent} />
          ))}
        </div>
      </article>

      <article className="panel span-5">
        <PanelTitle label="Next exercises" icon={Dumbbell} meta={todayWorkout.day} />
        <div className="exercise-list">
          {todayWorkout.exercises.slice(0, 6).map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              name={exercise.name}
              detail={`${exercise.sets.length} sets x ${exercise.sets[0]?.reps || "?"} reps`}
              note={exercise.note}
            />
          ))}
        </div>
      </article>

      <article className="panel span-3">
        <PanelTitle label="Open loops" icon={CalendarDays} />
        <div className="compact-list">
          {state.customTasks.slice(0, 4).map((task) => (
            <span key={task}>{task}</span>
          ))}
        </div>
        <button className="full-ghost" type="button" onClick={() => setView("lifestyle")}>
          Manage plan
        </button>
      </article>
    </section>
  );
}

function Workouts({
  state,
  setState,
  todayWorkout,
  activeTimer,
  setActiveTimer,
  startPrompt
}: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  todayWorkout: WorkoutPlan;
  activeTimer: { mode: TimerMode; remaining: number; running: boolean };
  setActiveTimer: Dispatch<SetStateAction<{ mode: TimerMode; remaining: number; running: boolean }>>;
  startPrompt: (prompt: string) => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(todayWorkout.id);
  const [newExerciseName, setNewExerciseName] = useState("");
  const selectedPlan = state.workoutPlans.find((plan) => plan.id === selectedPlanId) ?? todayWorkout;
  const completedSets = selectedPlan.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.done).length;
  const totalSets = selectedPlan.exercises.flatMap((exercise) => exercise.sets).length;
  const volume = selectedPlan.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce((setSum, set) => {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        return setSum + (Number.isFinite(weight) && Number.isFinite(reps) ? weight * reps : 0);
      }, 0),
    0
  );

  const updatePlan = (updater: (plan: WorkoutPlan) => WorkoutPlan) => {
    setState((current) => {
      const hydrated = hydrateState(current);
      return {
        ...hydrated,
        workoutPlans: hydrated.workoutPlans.map((plan) => (plan.id === selectedPlan.id ? updater(plan) : plan))
      };
    });
  };

  const updateExercise = (exerciseId: string, patch: Partial<WorkoutExercise>) => {
    updatePlan((plan) => ({
      ...plan,
      exercises: plan.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, ...patch } : exercise))
    }));
  };

  const updateSet = (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => {
    updatePlan((plan) => ({
      ...plan,
      exercises: plan.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set))
            }
          : exercise
      )
    }));
  };

  const addSet = (exerciseId: string) => {
    updatePlan((plan) => ({
      ...plan,
      exercises: plan.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const previous = exercise.sets[exercise.sets.length - 1] ?? { weight: "", reps: "", done: false };
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              id: createId("set"),
              weight: previous.weight,
              reps: previous.reps,
              done: false
            }
          ]
        };
      })
    }));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    updatePlan((plan) => ({
      ...plan,
      exercises: plan.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
          : exercise
      )
    }));
  };

  const removeExercise = (exerciseId: string) => {
    updatePlan((plan) => ({
      ...plan,
      exercises: plan.exercises.filter((exercise) => exercise.id !== exerciseId)
    }));
  };

  const addExercise = (event: FormEvent) => {
    event.preventDefault();

    if (!newExerciseName.trim()) {
      return;
    }

    updatePlan((plan) => ({
      ...plan,
      exercises: [
        ...plan.exercises,
        {
          id: createId("exercise"),
          name: newExerciseName.trim(),
          note: "Custom movement",
          sets: [createWorkoutSet(0, "0", "8")]
        }
      ]
    }));
    setNewExerciseName("");
  };

  const startTimer = (mode: TimerMode) => {
    setActiveTimer({
      mode,
      remaining: mode === "rest" ? state.restSeconds : state.exerciseSeconds,
      running: true
    });
  };

  return (
    <section className="workout-layout">
      <aside className="workout-control-stack">
        <div className="panel workout-summary">
          <PanelTitle label="Current session" icon={Zap} meta={selectedPlan.day} />
          <select className="select-line" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
            {state.workoutPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.day} - {plan.focus}
              </option>
            ))}
          </select>
          <label className="stack-field">
            <span>Session focus</span>
            <input value={selectedPlan.focus} onChange={(event) => updatePlan((plan) => ({ ...plan, focus: event.target.value }))} />
          </label>
          <p>{completedSets}/{totalSets || 0} sets complete. Total planned volume: {Math.round(volume).toLocaleString()} lb.</p>
          <button
            className="primary-pill"
            type="button"
            onClick={() =>
              setState((current) => ({
                ...hydrateState(current),
                checked: { ...hydrateState(current).checked, "Move or train": true }
              }))
            }
          >
            <Check size={17} />
            Mark trained
          </button>
          <button className="ghost-pill" type="button" onClick={() => startPrompt("Modify today's workout around hip safety and athletic power.")}>
            <Bot size={17} />
            Modify with AI
          </button>
        </div>

        <div className="panel timer-panel">
          <PanelTitle label="Gym timers" icon={Timer} meta={activeTimer.mode} />
          <div className="timer-display">{formatSeconds(activeTimer.remaining)}</div>
          <div className="timer-controls">
            <button type="button" onClick={() => setActiveTimer((current) => ({ ...current, running: !current.running }))}>
              {activeTimer.running ? <Pause size={18} /> : <Play size={18} />}
              {activeTimer.running ? "Pause" : "Resume"}
            </button>
            <button type="button" onClick={() => startTimer("exercise")}>Exercise</button>
            <button type="button" onClick={() => startTimer("rest")}>Rest</button>
          </div>
          <div className="timer-settings">
            <label>
              <span>Exercise seconds</span>
              <input
                value={state.exerciseSeconds}
                inputMode="numeric"
                onChange={(event) =>
                  setState((current) => ({
                    ...hydrateState(current),
                    exerciseSeconds: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>
            <label>
              <span>Rest seconds</span>
              <input
                value={state.restSeconds}
                inputMode="numeric"
                onChange={(event) =>
                  setState((current) => ({
                    ...hydrateState(current),
                    restSeconds: Math.max(1, Number(event.target.value) || 1)
                  }))
                }
              />
            </label>
          </div>
        </div>
      </aside>

      <div className="session-board panel">
        <PanelTitle label="Session manager" icon={Dumbbell} meta={selectedPlan.tag} />
        <form className="add-form exercise-add-form" onSubmit={addExercise}>
          <input value={newExerciseName} onChange={(event) => setNewExerciseName(event.target.value)} placeholder="Add exercise" />
          <button type="submit" title="Add exercise">
            <Plus size={18} />
          </button>
        </form>
        <div className="exercise-manager">
          {selectedPlan.exercises.map((exercise, exerciseIndex) => (
            <article className="exercise-card" key={exercise.id}>
              <div className="exercise-card-head">
                <div className="sequence-dot">{exerciseIndex + 1}</div>
                <div className="exercise-title-edit">
                  <input value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} />
                  <input value={exercise.note} onChange={(event) => updateExercise(exercise.id, { note: event.target.value })} />
                </div>
                <button type="button" title="Remove exercise" onClick={() => removeExercise(exercise.id)}>
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="sets-grid">
                <span>Set</span>
                <span>Weight</span>
                <span>Reps</span>
                <span>Done</span>
                <span />
                {exercise.sets.map((set, setIndex) => (
                  <div className={set.done ? "set-row done" : "set-row"} key={set.id}>
                    <strong>{setIndex + 1}</strong>
                    <input
                      aria-label={`${exercise.name} set ${setIndex + 1} weight`}
                      value={set.weight}
                      inputMode="decimal"
                      onChange={(event) => updateSet(exercise.id, set.id, { weight: event.target.value })}
                    />
                    <input
                      aria-label={`${exercise.name} set ${setIndex + 1} reps`}
                      value={set.reps}
                      inputMode="numeric"
                      onChange={(event) => updateSet(exercise.id, set.id, { reps: event.target.value })}
                    />
                    <button type="button" title="Toggle set done" onClick={() => updateSet(exercise.id, set.id, { done: !set.done })}>
                      {set.done && <Check size={15} />}
                    </button>
                    <button type="button" title="Remove set" onClick={() => removeSet(exercise.id, set.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="full-ghost compact" type="button" onClick={() => addSet(exercise.id)}>
                <Plus size={16} />
                Add set
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="week-strip">
        {state.workoutPlans.map((workout) => (
          <button className={workout.id === selectedPlan.id ? "week-card active" : "week-card"} key={workout.id} onClick={() => setSelectedPlanId(workout.id)} type="button">
            <span>{workout.day}</span>
            <strong>{workout.focus}</strong>
            <small>{workout.tag}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function Nutrition({ startPrompt }: { startPrompt: (prompt: string) => void }) {
  return (
    <section className="nutrition-layout">
      <div className="nutrition-side">
        <article className="panel">
          <PanelTitle label="Daily targets" icon={Apple} meta="3,400 kcal" />
          <div className="target-stack">
            <TargetBar label="Protein" value="180g" percent={100} kind="ocean" />
            <TargetBar label="Carbs" value="430g" percent={82} kind="grass" />
            <TargetBar label="Fats" value="80g" percent={68} kind="sun" />
          </div>
        </article>
        <article className="panel">
          <PanelTitle label="Rest day adjustments" icon={RefreshCcw} />
          <div className="callout dark">
            Drop 200-300 kcal by reducing rice portions or removing the pre-workout meal.
          </div>
          <CheckLine text="Keep protein identical" />
          <CheckLine text="Reduce carbs by 50-80g" />
          <CheckLine text="Shift carbs earlier in the day" />
        </article>
        <article className="panel">
          <PanelTitle label="Supplement stack" icon={Sparkles} />
          <div className="table-list">
            {supplementStack.map(([name, dose]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{dose}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel meal-board">
        <PanelTitle label="Training day timeline" icon={CalendarDays} meta="High volume phase" />
        <div className="meal-timeline">
          {meals.map((meal, index) => (
            <article className={index === 3 ? "meal-item active" : "meal-item"} key={`${meal.time}-${meal.label}`}>
              <div className="meal-icon">{index === 3 ? <Zap size={19} /> : <Apple size={18} />}</div>
              <div className="meal-content">
                <div>
                  <strong>{meal.meal}</strong>
                  <span>{meal.time}</span>
                </div>
                <p>{meal.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <button className="full-ghost" type="button" onClick={() => startPrompt("Build tomorrow's meals around my macro targets and training window.")}>
          Ask AI to plan meals
        </button>
      </article>
    </section>
  );
}

function Prehab({ startPrompt }: { startPrompt: (prompt: string) => void }) {
  return (
    <section className="prehab-layout">
      <article className="panel risk-panel">
        <PanelTitle label="Iliopsoas safety" icon={ShieldAlert} meta="Pain rule" />
        <h3>Do not train through acute flares.</h3>
        <p>Keep pain at or below 3/10. Stop any movement that crosses 4/10, and avoid deep hip flexion under load during symptoms.</p>
        <button className="primary-pill" type="button" onClick={() => startPrompt("My hip feels tight today. Build a safer training and prehab plan.")}>
          <Bot size={17} />
          Injury check-in
        </button>
      </article>

      <div className="prehab-grid">
        {prehab.map((item, index) => (
          <article className="panel protocol-card" key={item.title}>
            <div className="sequence-dot">{index + 1}</div>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <article className="panel avoid-card">
        <PanelTitle label="Avoid or modify" icon={HeartPulse} />
        <div className="avoid-grid">
          {["Deep squats", "Long forward lunges", "Deep leg press", "Hanging leg raises", "Full sit-ups", "Aggressive hip flexor stretches"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>
    </section>
  );
}

function Lifestyle({
  state,
  setState,
  taskInput,
  setTaskInput,
  addTask,
  startPrompt
}: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  taskInput: string;
  setTaskInput: (value: string) => void;
  addTask: (event: FormEvent) => void;
  startPrompt: (prompt: string) => void;
}) {
  return (
    <section className="lifestyle-layout">
      <div className="life-metrics">
        {lifeAreas.map((area) => (
          <article className="panel metric-tile" key={area.label}>
            <span>{area.label}</span>
            <strong>{area.value}</strong>
            <p>{area.detail}</p>
          </article>
        ))}
      </div>

      <article className="panel">
        <PanelTitle label="Season commitments" icon={Trophy} />
        <div className="commitment-list">
          {summerGoals.map((goal) => (
            <CheckLine key={goal} text={goal} />
          ))}
        </div>
      </article>

      <article className="panel">
        <PanelTitle label="Money guardrails" icon={Wallet} />
        <div className="table-list">
          {budgetItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.amount}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel task-panel">
        <PanelTitle label="Open loops" icon={CalendarDays} />
        <form className="add-form" onSubmit={addTask}>
          <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="Add a task" />
          <button type="submit" title="Add task">
            <Plus size={18} />
          </button>
        </form>
        <div className="task-stack">
          {state.customTasks.map((task, index) => (
            <div className="task-row" key={`${task}-${index}`}>
              <span>{task}</span>
              <button
                type="button"
                title="Complete task"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    customTasks: current.customTasks.filter((_, taskIndex) => taskIndex !== index)
                  }))
                }
              >
                <Check size={15} />
              </button>
            </div>
          ))}
        </div>
      </article>

      <label className="panel notes-panel">
        <PanelTitle label="Life notes" icon={MessageCircle} />
        <textarea value={state.notes} onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))} />
        <button className="full-ghost" type="button" onClick={() => startPrompt("Turn my notes and open loops into a practical plan for this week.")}>
          Turn notes into plan
        </button>
      </label>
    </section>
  );
}

function Assistant({
  messages,
  chatInput,
  setChatInput,
  sendChat,
  isChatLoading,
  chatError,
  startPrompt
}: {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChat: (event: FormEvent) => void;
  isChatLoading: boolean;
  chatError: string;
  startPrompt: (prompt: string) => void;
}) {
  return (
    <section className="assistant-screen">
      <div className="assistant-stream">
        {messages.map((message, index) => (
          <article className={`chat-bubble-row ${message.role}`} key={`${message.role}-${index}`}>
            <div className="chat-avatar">{message.role === "assistant" ? <Bot size={20} /> : <CircleUser size={20} />}</div>
            <div>
              <p>{message.role === "assistant" ? "Ultimatum AI" : "You"}</p>
              <ChatMarkdown content={message.content} />
            </div>
          </article>
        ))}
        {isChatLoading && (
          <article className="chat-bubble-row assistant">
            <div className="chat-avatar"><Bot size={20} /></div>
            <div>
              <p>Ultimatum AI</p>
              <ChatMarkdown content="Thinking with your app context..." />
            </div>
          </article>
        )}
      </div>

      <div className="assistant-composer">
        <div className="prompt-chips">
          <button type="button" onClick={() => startPrompt("Analyze my meal timing for today.")}>Analyze meal</button>
          <button type="button" onClick={() => startPrompt("Do an injury-safe hip check-in.")}>Injury check-in</button>
          <button type="button" onClick={() => startPrompt("Give me the highest leverage tip for today.")}>Tip of the day</button>
        </div>
        {chatError && <p className="chat-error">{chatError}</p>}
        <form className="chat-form" onSubmit={sendChat}>
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Message Ultimatum AI..."
            disabled={isChatLoading}
          />
          <button type="submit" title="Send" disabled={isChatLoading}>
            <Send size={18} />
          </button>
        </form>
        <small>Guidance is based on your app profile. Consult a professional for serious or recurring pain.</small>
      </div>
    </section>
  );
}

function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-bubble markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function SettingsPanel({
  installPrompt,
  runInstall,
  openInstallGuide,
  resetLocalState,
  startPrompt
}: {
  installPrompt: Event | null;
  runInstall: () => Promise<void>;
  openInstallGuide: () => void;
  resetLocalState: () => void;
  startPrompt: (prompt: string) => void;
}) {
  return (
    <section className="settings-grid">
      <article className="panel">
        <PanelTitle label="PWA install" icon={Sparkles} meta={installPrompt ? "Available" : "Ready"} />
        <p className="muted-copy">Install Ultimatum from the browser when the prompt is available, or open phone setup steps for Safari and Chrome.</p>
        <button className="primary-pill" onClick={installPrompt ? runInstall : openInstallGuide} type="button">
          <Download size={17} />
          {installPrompt ? "Install app" : "Phone install setup"}
        </button>
        <button className="ghost-pill panel-secondary-action" onClick={openInstallGuide} type="button">
          <Info size={17} />
          Show install steps
        </button>
      </article>
      <article className="panel">
        <PanelTitle label="Claude connection" icon={Bot} meta={isClaudeChatEnabled() ? "Enabled" : "Fallback"} />
        <p className="muted-copy">Claude chat uses `/api/chat` and keeps `ANTHROPIC_API_KEY` server-side. Local fallback remains available if the endpoint fails.</p>
        <button className="ghost-pill" type="button" onClick={() => startPrompt("Confirm what context you can see from Ultimatum right now.")}>
          Test context
        </button>
      </article>
      <article className="panel danger-zone">
        <PanelTitle label="Local data" icon={RefreshCcw} />
        <p className="muted-copy">Reset checklist, live inputs, tasks, notes, and chat history on this device.</p>
        <button className="ghost-pill danger" type="button" onClick={resetLocalState}>
          Reset local state
        </button>
      </article>
    </section>
  );
}

function InstallGuideModal({
  isOpen,
  installPrompt,
  copyStatus,
  onClose,
  onCopyUrl,
  onInstall
}: {
  isOpen: boolean;
  installPrompt: Event | null;
  copyStatus: string;
  onClose: () => void;
  onCopyUrl: () => void;
  onInstall: () => Promise<void>;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
      <section className="modal-panel install-guide">
        <div className="modal-header">
          <div>
            <p>Install Ultimatum</p>
            <h3 id="install-guide-title">Add the app to your phone</h3>
          </div>
          <button className="icon-button" type="button" title="Close install guide" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="install-actions">
          {installPrompt && (
            <button className="primary-pill" type="button" onClick={onInstall}>
              <Download size={17} />
              Install now
            </button>
          )}
          <button className="ghost-pill" type="button" onClick={onCopyUrl}>
            <Clipboard size={17} />
            {copyStatus === "Copied" ? "Copied URL" : "Copy app URL"}
          </button>
        </div>
        {copyStatus && copyStatus !== "Copied" && <p className="copy-fallback">{copyStatus}</p>}

        <div className="install-step-grid">
          <article>
            <strong>iPhone or iPad</strong>
            <ol>
              <li>Open the hosted app in Safari.</li>
              <li>Tap Share.</li>
              <li>Choose Add to Home Screen, then Add.</li>
            </ol>
          </article>
          <article>
            <strong>Android Chrome</strong>
            <ol>
              <li>Open the hosted app in Chrome.</li>
              <li>Tap the three-dot menu.</li>
              <li>Choose Install app or Add to Home screen.</li>
            </ol>
          </article>
          <article>
            <strong>Desktop</strong>
            <ol>
              <li>Open Ultimatum on the hosted HTTPS URL.</li>
              <li>Use the install icon in the address bar.</li>
              <li>Launch it from your apps list.</li>
            </ol>
          </article>
        </div>

        <p className="modal-note">
          Phone installs need the hosted HTTPS version. Localhost works for testing on your computer, but your phone needs the deployed URL.
        </p>
      </section>
    </div>
  );
}

function NotificationsModal({
  isOpen,
  onClose,
  todayWorkout,
  appState,
  setView,
  startPrompt
}: {
  isOpen: boolean;
  onClose: () => void;
  todayWorkout: WorkoutPlan;
  appState: AppState;
  setView: (view: View) => void;
  startPrompt: (prompt: string) => void;
}) {
  if (!isOpen) {
    return null;
  }

  const openView = (nextView: View) => {
    setView(nextView);
    onClose();
  };

  const completedSets = todayWorkout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
  const totalSets = todayWorkout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
      <section className="modal-panel notification-panel">
        <div className="modal-header">
          <div>
            <p>Today</p>
            <h3 id="notifications-title">Ultimatum alerts</h3>
          </div>
          <button className="icon-button" type="button" title="Close notifications" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="notification-list">
          <article>
            <span>Training</span>
            <strong>{todayWorkout.day}: {todayWorkout.focus}</strong>
            <p>{completedSets}/{totalSets} sets complete.</p>
            <button type="button" onClick={() => openView("workouts")}>Open workout</button>
          </article>
          <article>
            <span>Recovery</span>
            <strong>Hip safety check</strong>
            <p>Keep flexor work controlled before any heavy pulling or sprinting.</p>
            <button type="button" onClick={() => openView("prehab")}>Open prehab</button>
          </article>
          <article>
            <span>Life system</span>
            <strong>{appState.customTasks.length} open tasks</strong>
            <p>Turn notes and loops into a sharper plan when your day feels scattered.</p>
            <button
              type="button"
              onClick={() => {
                startPrompt("Look at my open tasks, notes, training plan, and nutrition context. Tell me the next three highest leverage moves.");
                onClose();
              }}
            >
              Ask AI
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

function PanelTitle({ label, icon: Icon, meta }: { label: string; icon: typeof Home; meta?: string }) {
  return (
    <div className="panel-title">
      <span><Icon size={17} /> {label}</span>
      {meta && <strong>{meta}</strong>}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="stepper-row">
      <span>{label}</span>
      <button type="button" onClick={onMinus}>-</button>
      <strong>{value}</strong>
      <button type="button" onClick={onPlus}>+</button>
    </div>
  );
}

function TargetBar({ label, value, percent, kind }: { label: string; value: string; percent: number; kind: string }) {
  return (
    <div className="target-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <i>
        <b className={kind} style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}

function ExerciseRow({ name, detail, note }: { name: string; detail: string; note?: string }) {
  return (
    <div className="exercise-row">
      <div>
        <strong>{name}</strong>
        <span>{note || "Progressive overload"}</span>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <div className="check-line">
      <Check size={15} />
      <span>{text}</span>
    </div>
  );
}

function getWorkoutForToday(workoutPlans: WorkoutPlan[]) {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
  return workoutPlans.find((workout) => workout.day === day) ?? workoutPlans[0];
}

function getViewTitle(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Performance Dashboard",
    workouts: "Today's Workout",
    nutrition: "Nutrition & Timing",
    prehab: "Prehab & Recovery",
    lifestyle: "Lifestyle Hub",
    assistant: "AI Assistant",
    settings: "Settings"
  };

  return titles[view];
}

function getViewKicker(view: View) {
  const labels: Record<View, string> = {
    dashboard: "Command center",
    workouts: "Training output",
    nutrition: "Performance fueling",
    prehab: "Injury management",
    lifestyle: "Life systems",
    assistant: "AI",
    settings: "Configuration"
  };

  return labels[view];
}

function getViewSubtitle(view: View, todayFocus: string) {
  const subtitles: Record<View, string> = {
    dashboard: `Today's protocol: ${todayFocus}`,
    workouts: "Structured lifting, athletic power, and pain-aware substitutions.",
    nutrition: "Macros, meal timing, and supplement reminders for the lean bulk.",
    prehab: "Hip-safe rules and return-to-training guardrails.",
    lifestyle: "Goals, money, tasks, notes, and weekly rhythm.",
    assistant: "Ask with full app context.",
    settings: "PWA install, Claude connection, and local data controls."
  };

  return subtitles[view];
}

function answerFromContext(input: string, state: AppState, todayFocus: string) {
  const question = input.toLowerCase();
  const checked = dailyChecklist.filter((item) => state.checked[item]);
  const open = dailyChecklist.filter((item) => !state.checked[item]);

  if (question.includes("hip") || question.includes("iliopsoas") || question.includes("pain")) {
    return "Hip context: keep training at 3/10 pain or lower, stop above 4/10, avoid deep hip flexion during flares, and prioritize bridges, resisted hip extension, dead bugs, side-lying abduction, and short-lever Copenhagens. If it is actively flaring, make today recovery-first.";
  }

  if (question.includes("eat") || question.includes("meal") || question.includes("protein") || question.includes("macro")) {
    return "Food context: your training-day target is 3,400 kcal, 180g protein, 430g carbs, 80g fat, and 3.5L water. Around workouts, bias carbs before and after training; keep protein steady even on rest days.";
  }

  if (question.includes("workout") || question.includes("train") || question.includes("lift")) {
    return `Training context: today is ${todayFocus}. The weekly split is upper strength, lower strength, recovery/prehab, upper hypertrophy, light reset, athletic power, full rest. Progressive overload matters, but the hip pain rule comes first.`;
  }

  if (question.includes("today") || question.includes("checklist") || question.includes("priority")) {
    return `Today context: completed ${checked.length}/${dailyChecklist.length}. Still open: ${open.join(", ") || "nothing, clean day"}. Your live inputs say ${state.water}L water, ${state.sleep}h sleep, and ${state.bodyWeight} lb body weight.`;
  }

  if (question.includes("money") || question.includes("budget") || question.includes("spend")) {
    return "Budget context: food and meal prep is the big weekly anchor, with guardrails for gas, fun money, and supplements. The app is set up for a $1,200 summer runway target until you replace it with real numbers.";
  }

  if (question.includes("install") || question.includes("pwa") || question.includes("download")) {
    return "PWA context: once hosted, this app can be installed from the browser because it has a manifest and service worker. Use the install button when the browser exposes the install prompt.";
  }

  return "I can use the current app context for this. Right now the biggest useful levers are: protect the hip, hit protein and water, keep the workout split consistent, add one real-life summer action, and close the most annoying open loop in the planner.";
}

async function getChatAnswer(input: string, state: AppState, todayFocus: string) {
  if (!isClaudeChatEnabled()) {
    return answerFromContext(input, state, todayFocus);
  }

  const response = await fetch(import.meta.env.VITE_CHAT_API_URL || "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input,
      appContext: buildAppContext(state, todayFocus)
    })
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || `Claude chat request failed with status ${response.status}.`);
  }

  return String(data?.message || "").trim() || answerFromContext(input, state, todayFocus);
}

function isClaudeChatEnabled() {
  return import.meta.env.VITE_USE_CLAUDE_CHAT === "true";
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function hydrateState(state: AppState): AppState {
  return {
    ...initialState,
    ...state,
    checked: state.checked ?? {},
    customTasks: state.customTasks ?? initialState.customTasks,
    workoutPlans: normalizeWorkoutPlans(state.workoutPlans),
    restSeconds: state.restSeconds || initialState.restSeconds,
    exerciseSeconds: state.exerciseSeconds || initialState.exerciseSeconds
  };
}

function normalizeWorkoutPlans(plans?: WorkoutPlan[]) {
  if (!Array.isArray(plans) || plans.length === 0) {
    return createInitialWorkoutPlans();
  }

  return plans.map((plan) => ({
    ...plan,
    id: plan.id || createId("plan"),
    tag: plan.tag || "Training",
    exercises: Array.isArray(plan.exercises)
      ? plan.exercises.map((exercise) => ({
          ...exercise,
          id: exercise.id || createId("exercise"),
          note: exercise.note || "Standard loading",
          sets:
            Array.isArray(exercise.sets) && exercise.sets.length > 0
              ? exercise.sets.map((set, index) => ({
                  id: set.id || createId("set"),
                  weight: set.weight ?? "",
                  reps: set.reps ?? String(index + 1),
                  done: Boolean(set.done)
                }))
              : [createWorkoutSet(0, "0", "8")]
        }))
      : []
  }));
}

function createInitialWorkoutPlans(): WorkoutPlan[] {
  return workouts.map((workout) => ({
    id: workout.day.toLowerCase(),
    day: workout.day,
    focus: workout.focus,
    tag: workout.tag,
    exercises: workout.exercises.map((exercise, exerciseIndex) => {
      const parsed = parseExerciseDetail(exercise.detail);
      return {
        id: `${workout.day.toLowerCase()}-${exerciseIndex}`,
        name: exercise.name,
        note: exercise.note || exercise.detail,
        sets: Array.from({ length: parsed.sets }, (_, setIndex) =>
          createWorkoutSet(setIndex, parsed.weight, parsed.reps)
        )
      };
    })
  }));
}

function parseExerciseDetail(detail: string) {
  const setsMatch = detail.match(/(\d+)\s*x/i);
  const repsMatch = detail.match(/x\s*([\d-]+)/i);

  return {
    sets: Math.max(1, Number(setsMatch?.[1]) || 3),
    reps: repsMatch?.[1] || "8",
    weight: "0"
  };
}

function createWorkoutSet(index: number, weight: string, reps: string): WorkoutSet {
  return {
    id: createId(`set-${index}`),
    weight,
    reps,
    done: false
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function buildAppContext(state: AppState, todayFocus: string) {
  return {
    profile: summerProfile,
    todayFocus,
    liveInputs: {
      checked: dailyChecklist.filter((item) => state.checked[item]),
      open: dailyChecklist.filter((item) => !state.checked[item]),
      waterLiters: state.water,
      sleepHours: state.sleep,
      bodyWeight: state.bodyWeight,
      notes: state.notes,
      customTasks: state.customTasks
    },
    macroTargets,
    meals,
    workouts: state.workoutPlans,
    prehab,
    summerGoals,
    budgetItems
  };
}

export default App;
