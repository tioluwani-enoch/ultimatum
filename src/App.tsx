import {
  Activity,
  Apple,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  MessageCircle,
  Moon,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Target,
  Trophy,
  Wallet,
  Waves
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
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

type View = "dashboard" | "training" | "food" | "planner" | "life" | "chat";
type ChatMessage = { role: "user" | "assistant"; content: string };

type AppState = {
  checked: Record<string, boolean>;
  water: number;
  sleep: number;
  bodyWeight: string;
  notes: string;
  customTasks: string[];
};

const initialState: AppState = {
  checked: {},
  water: 2,
  sleep: 8,
  bodyWeight: "180",
  notes: defaultNotes,
  customTasks: ["Text a friend about weekend plans", "Prep rice and protein for tomorrow"]
};

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "Today", icon: Home },
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "food", label: "Food", icon: Apple },
  { id: "planner", label: "Planner", icon: CalendarDays },
  { id: "life", label: "Life", icon: Trophy },
  { id: "chat", label: "Chat", icon: MessageCircle }
];

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [state, setState] = useLocalStorage<AppState>("ultimate-summer-os-state", initialState);
  const [taskInput, setTaskInput] = useState("");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("ultimate-summer-os-chat", [
    {
      role: "assistant",
      content:
        "I have the app context loaded: your lean bulk targets, workout split, meal timing, hip prehab rules, summer goals, budget guardrails, and your current checklist."
    }
  ]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const completedCount = dailyChecklist.filter((item) => state.checked[item]).length;
  const todayWorkout = getWorkoutForToday();
  const progress = Math.round((completedCount / dailyChecklist.length) * 100);

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

  const sendChat = (event: FormEvent) => {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: chatInput.trim() };
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: answerFromContext(chatInput, state, todayWorkout.focus)
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setChatInput("");
  };

  const runInstall = async () => {
    if (!installPrompt) {
      return;
    }

    const promptEvent = installPrompt as Event & { prompt: () => Promise<void> };
    await promptEvent.prompt();
    setInstallPrompt(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Waves size={23} />
          </span>
          <div>
            <strong>{summerProfile.title}</strong>
            <span>{summerProfile.stats.goal}</span>
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
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="install-button" onClick={runInstall} type="button" disabled={!installPrompt}>
          <Sparkles size={17} />
          <span>{installPrompt ? "Install app" : "PWA ready"}</span>
        </button>
      </aside>

      <main className="main-surface">
        <header className="topbar">
          <div>
            <p className="eyebrow">Summer command center</p>
            <h1>{getViewTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <MetricPill icon={Activity} label="Done" value={`${completedCount}/${dailyChecklist.length}`} />
            <MetricPill icon={Moon} label="Sleep" value={`${state.sleep}h`} />
          </div>
        </header>

        {view === "dashboard" && (
          <Dashboard
            state={state}
            setState={setState}
            todayWorkout={todayWorkout}
            completedCount={completedCount}
            progress={progress}
            toggleCheck={toggleCheck}
            setView={setView}
          />
        )}
        {view === "training" && <Training state={state} setState={setState} />}
        {view === "food" && <Food />}
        {view === "planner" && (
          <Planner
            state={state}
            setState={setState}
            taskInput={taskInput}
            setTaskInput={setTaskInput}
            addTask={addTask}
          />
        )}
        {view === "life" && <Life state={state} setState={setState} />}
        {view === "chat" && (
          <Chat messages={messages} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  state,
  setState,
  todayWorkout,
  completedCount,
  progress,
  toggleCheck,
  setView
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  todayWorkout: ReturnType<typeof getWorkoutForToday>;
  completedCount: number;
  progress: number;
  toggleCheck: (item: string) => void;
  setView: (view: View) => void;
}) {
  return (
    <section className="dashboard-grid">
      <div className="hero-panel">
        <img src="/assets/summer-os-banner.png" alt="Summer training planner with ultimate frisbee and meal prep" />
        <div className="hero-copy">
          <p className="eyebrow">Today</p>
          <h2>{todayWorkout.focus}</h2>
          <p>{summerProfile.tagline}</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setView("training")}>
              <Dumbbell size={18} />
              Training
            </button>
            <button type="button" onClick={() => setView("chat")}>
              <MessageCircle size={18} />
              Chat
            </button>
          </div>
        </div>
      </div>

      <div className="panel focus-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Daily score</p>
            <h2>{progress}% locked</h2>
          </div>
          <div className="ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}>
            {completedCount}
          </div>
        </div>
        <div className="checklist">
          {dailyChecklist.map((item) => (
            <button
              className={state.checked[item] ? "check-row done" : "check-row"}
              key={item}
              type="button"
              onClick={() => toggleCheck(item)}
            >
              <span>{state.checked[item] && <Check size={14} />}</span>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="metric-grid">
        {macroTargets.map((metric) => (
          <article className={`metric-card ${metric.accent}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>
              {metric.value}
              <small>{metric.unit}</small>
            </strong>
          </article>
        ))}
      </div>

      <div className="panel controls-panel">
        <h2>Live inputs</h2>
        <div className="control-row">
          <label htmlFor="weight">Body weight</label>
          <input
            id="weight"
            value={state.bodyWeight}
            inputMode="decimal"
            onChange={(event) => setState((current) => ({ ...current, bodyWeight: event.target.value }))}
          />
          <span>lb</span>
        </div>
        <div className="stepper-row">
          <span>Water</span>
          <button type="button" onClick={() => setState((current) => ({ ...current, water: Math.max(0, current.water - 1) }))}>
            -
          </button>
          <strong>{state.water}L</strong>
          <button type="button" onClick={() => setState((current) => ({ ...current, water: current.water + 0.5 }))}>
            +
          </button>
        </div>
        <div className="stepper-row">
          <span>Sleep</span>
          <button type="button" onClick={() => setState((current) => ({ ...current, sleep: Math.max(0, current.sleep - 0.5) }))}>
            -
          </button>
          <strong>{state.sleep}h</strong>
          <button type="button" onClick={() => setState((current) => ({ ...current, sleep: current.sleep + 0.5 }))}>
            +
          </button>
        </div>
      </div>

      <div className="panel next-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Next up</p>
            <h2>{todayWorkout.day}</h2>
          </div>
          <span className={todayWorkout.tag === "Training" ? "tag hot" : "tag calm"}>{todayWorkout.tag}</span>
        </div>
        <div className="list-lines">
          {todayWorkout.exercises.slice(0, 5).map((exercise) => (
            <div className="line-item" key={exercise.name}>
              <span>{exercise.name}</span>
              <small>{exercise.detail}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Training({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  return (
    <section className="content-stack">
      <div className="module-band warning">
        <HeartPulse size={20} />
        <div>
          <strong>Iliopsoas guardrail</strong>
          <span>Use pain-free range, avoid aggressive hip flexor stretching, and keep squats near parallel.</span>
        </div>
      </div>

      <div className="workout-grid">
        {workouts.map((workout) => (
          <article className="panel workout-card" key={`${workout.day}-${workout.focus}`}>
            <div className="section-head">
              <div>
                <p className="eyebrow">{workout.day}</p>
                <h2>{workout.focus}</h2>
              </div>
              <span className={workout.tag === "Training" ? "tag hot" : "tag calm"}>{workout.tag}</span>
            </div>
            <div className="list-lines">
              {workout.exercises.map((exercise) => (
                <div className="line-item" key={exercise.name}>
                  <span>{exercise.name}</span>
                  <small>{exercise.note ? `${exercise.detail} · ${exercise.note}` : exercise.detail}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Prehab</p>
            <h2>Hip management protocol</h2>
          </div>
          <HeartPulse size={24} />
        </div>
        <div className="prehab-grid">
          {prehab.map((item) => (
            <article className="mini-card" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>
      </div>

      <label className="notes-block">
        <span>Training notes</span>
        <textarea
          value={state.notes}
          onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
        />
      </label>
    </section>
  );
}

function Food() {
  return (
    <section className="content-stack">
      <div className="macro-layout">
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Lean bulk</p>
              <h2>Nutrition targets</h2>
            </div>
            <Flame size={24} />
          </div>
          <div className="macro-bar" aria-label="Macro split">
            <span className="protein" />
            <span className="carbs" />
            <span className="fat" />
          </div>
          <div className="legend">
            <span><i className="dot protein" /> Protein 21%</span>
            <span><i className="dot carbs" /> Carbs 51%</span>
            <span><i className="dot fat" /> Fat 21%</span>
          </div>
          <div className="source-grid">
            <SourceList title="Protein" items={["Chicken / turkey", "Eggs + whites", "Greek yogurt", "Tuna / salmon", "Whey", "Cottage cheese"]} />
            <SourceList title="Carbs" items={["Oats", "Rice", "Quinoa", "Banana", "Sweet potato", "Wholegrain pasta"]} />
            <SourceList title="Fats" items={["Avocado", "Olive oil", "Nut butter", "Salmon", "Mackerel", "Nuts"]} />
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Training day</p>
              <h2>Meal timing</h2>
            </div>
            <Apple size={24} />
          </div>
          <div className="timeline">
            {meals.map((item) => (
              <article className="time-item" key={`${item.time}-${item.label}`}>
                <span>{item.time}</span>
                <strong>{item.meal}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Planner({
  state,
  setState,
  taskInput,
  setTaskInput,
  addTask
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  taskInput: string;
  setTaskInput: (value: string) => void;
  addTask: (event: FormEvent) => void;
}) {
  return (
    <section className="planner-grid">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Week</p>
            <h2>Summer rhythm</h2>
          </div>
          <CalendarDays size={24} />
        </div>
        <div className="week-grid">
          {workouts.map((workout) => (
            <article key={workout.day} className={workout.tag === "Training" ? "day-cell train" : "day-cell rest"}>
              <strong>{workout.day}</strong>
              <span>{workout.focus}</span>
            </article>
          ))}
          <article className="day-cell rest">
            <strong>Fri</strong>
            <span>Walk, stretch, reset</span>
          </article>
          <article className="day-cell rest">
            <strong>Sun</strong>
            <span>Full rest and plan</span>
          </article>
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Tasks</p>
            <h2>Open loops</h2>
          </div>
          <Target size={24} />
        </div>
        <form className="add-form" onSubmit={addTask}>
          <input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="Add a task" />
          <button type="submit" title="Add task">
            <Plus size={18} />
          </button>
        </form>
        <div className="list-lines">
          {state.customTasks.map((task, index) => (
            <div className="line-item task-item" key={`${task}-${index}`}>
              <span>{task}</span>
              <button
                type="button"
                title="Remove task"
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
      </div>
    </section>
  );
}

function Life({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  return (
    <section className="content-stack">
      <div className="life-grid">
        {lifeAreas.map((area) => (
          <article className="metric-card ocean" key={area.label}>
            <span>{area.label}</span>
            <strong>{area.value}</strong>
            <small>{area.detail}</small>
          </article>
        ))}
      </div>

      <div className="life-columns">
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Goals</p>
              <h2>Season commitments</h2>
            </div>
            <Trophy size={24} />
          </div>
          <div className="list-lines">
            {summerGoals.map((goal) => (
              <div className="line-item" key={goal}>
                <span>{goal}</span>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Money</p>
              <h2>Spending guardrails</h2>
            </div>
            <Wallet size={24} />
          </div>
          <div className="list-lines">
            {budgetItems.map((item) => (
              <div className="line-item" key={item.label}>
                <span>{item.label}</span>
                <small>{item.amount}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="notes-block">
        <span>Life notes</span>
        <textarea
          value={state.notes}
          onChange={(event) => setState((current) => ({ ...current, notes: event.target.value }))}
        />
      </label>
    </section>
  );
}

function Chat({
  messages,
  chatInput,
  setChatInput,
  sendChat
}: {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChat: (event: FormEvent) => void;
}) {
  return (
    <section className="chat-layout">
      <div className="panel context-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Context</p>
            <h2>Loaded into chat</h2>
          </div>
          <MessageCircle size={24} />
        </div>
        <div className="context-chips">
          <span>Macros</span>
          <span>Workout split</span>
          <span>Meal timing</span>
          <span>Hip prehab</span>
          <span>Summer goals</span>
          <span>Budget</span>
          <span>Checklist</span>
        </div>
      </div>

      <div className="chat-panel">
        <div className="message-stream">
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.content}
            </article>
          ))}
        </div>
        <form className="chat-form" onSubmit={sendChat}>
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask about training, food, routines, or planning"
          />
          <button type="submit" title="Send">
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

function SourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mini-card">
      <strong>{title}</strong>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </article>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return (
    <div className="metric-pill">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getWorkoutForToday() {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
  return workouts.find((workout) => workout.day === day) ?? workouts[0];
}

function getViewTitle(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Today",
    training: "Training",
    food: "Food",
    planner: "Planner",
    life: "Life",
    chat: "App chat"
  };

  return titles[view];
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

export default App;
