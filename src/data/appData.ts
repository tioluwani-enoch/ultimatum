export type WorkoutDay = {
  day: string;
  focus: string;
  tag: "Training" | "Recovery";
  exercises: Array<{ name: string; detail: string; note?: string }>;
};

export type Meal = {
  time: string;
  label: string;
  meal: string;
  detail: string;
};

export const summerProfile = {
  title: "Ultimate Summer OS",
  tagline: "Training, food, money, time, recovery, and the real-life stuff in one place.",
  stats: {
    age: "18M",
    height: "6'1\"",
    weight: "180 lb",
    training: "4x/week",
    goal: "Lean bulk + athletic power"
  }
};

export const macroTargets = [
  { label: "Daily calories", value: "3,400", unit: "kcal", accent: "sun" },
  { label: "Protein", value: "180", unit: "g", accent: "ocean" },
  { label: "Carbs", value: "430", unit: "g", accent: "grass" },
  { label: "Fats", value: "80", unit: "g", accent: "ember" },
  { label: "Target gain", value: "0.5", unit: "lb/wk", accent: "rose" },
  { label: "Hydration", value: "3.5", unit: "L/day", accent: "ocean" }
];

export const dailyChecklist = [
  "Hit 180g protein",
  "Drink 3.5L water",
  "Move or train",
  "Do hip-safe prehab",
  "Log one win",
  "Sleep plan before 11"
];

export const meals: Meal[] = [
  {
    time: "7:00 - 8:00 AM",
    label: "Meal 1",
    meal: "Breakfast: protein + complex carbs",
    detail: "4 eggs, oats with fruit and honey, milk. About 750 kcal, 50g protein, 90g carbs."
  },
  {
    time: "11:00 AM - 12:00 PM",
    label: "Meal 2",
    meal: "Lunch: largest meal",
    detail: "Chicken breast, rice or pasta, vegetables, olive oil. About 950 kcal, 55g protein, 120g carbs."
  },
  {
    time: "3:00 - 3:30 PM",
    label: "Pre-workout",
    meal: "Carb-forward, moderate protein",
    detail: "Rice or pasta with tuna/chicken, banana, peanut butter. Eat 90-120 minutes before training."
  },
  {
    time: "5:00 - 7:00 PM",
    label: "Training",
    meal: "Gym window",
    detail: "Sip water throughout. Add banana or sports drink if the session runs past 90 minutes."
  },
  {
    time: "7:00 - 7:30 PM",
    label: "Post-workout",
    meal: "Fast protein + carbs",
    detail: "Whey shake and banana, or dinner if it is ready first. Aim around 40g protein and 60g carbs."
  },
  {
    time: "8:00 - 8:30 PM",
    label: "Meal 3",
    meal: "Dinner: protein + moderate carbs",
    detail: "Salmon or lean beef, sweet potato, salad with olive oil. About 800 kcal and 50g protein."
  },
  {
    time: "10:00 - 10:30 PM",
    label: "Pre-sleep",
    meal: "Slow protein",
    detail: "Cottage cheese or Greek yogurt. About 250 kcal and 30g protein."
  }
];

export const workouts: WorkoutDay[] = [
  {
    day: "Mon",
    focus: "Upper body: strength and power",
    tag: "Training",
    exercises: [
      { name: "Barbell bench press", detail: "4 x 4-6 heavy" },
      { name: "Weighted pull-ups or lat pulldown", detail: "4 x 5-6" },
      { name: "Overhead press", detail: "3 x 6-8" },
      { name: "Single-arm dumbbell row", detail: "3 x 8" },
      { name: "Face pulls", detail: "3 x 15", note: "Rear delt and rotator cuff health" },
      { name: "Tricep dips or close-grip press", detail: "3 x 8-10" }
    ]
  },
  {
    day: "Tue",
    focus: "Lower body: strength",
    tag: "Training",
    exercises: [
      { name: "Trap bar deadlift", detail: "4 x 5", note: "Preferred over conventional" },
      { name: "Barbell squat", detail: "4 x 5-6", note: "Keep above parallel" },
      { name: "Romanian deadlift", detail: "3 x 8" },
      { name: "Hip thrust", detail: "3 x 10-12", note: "Safe alternative" },
      { name: "Lying leg curl", detail: "3 x 10-12" },
      { name: "Standing calf raise", detail: "4 x 15" },
      { name: "Double-leg bridge", detail: "2 x 15 before lifting", note: "Prehab activation" }
    ]
  },
  {
    day: "Wed",
    focus: "Light mobility + prehab",
    tag: "Recovery",
    exercises: [
      { name: "Walk", detail: "20-30 minutes" },
      { name: "Double-leg bridge", detail: "3 x 15" },
      { name: "Dead bug", detail: "3 x 10 each side" },
      { name: "Gentle mobility", detail: "Pain-free range only" }
    ]
  },
  {
    day: "Thu",
    focus: "Upper body: hypertrophy",
    tag: "Training",
    exercises: [
      { name: "Incline dumbbell press", detail: "4 x 10-12" },
      { name: "Seated cable row", detail: "4 x 10-12" },
      { name: "Dumbbell shoulder press", detail: "3 x 12" },
      { name: "Wide-grip lat pulldown", detail: "3 x 12" },
      { name: "Lateral raises", detail: "3 x 15" },
      { name: "Bayesian curl or EZ bar curl", detail: "3 x 12" },
      { name: "Cable tricep pushdown", detail: "3 x 12-15" }
    ]
  },
  {
    day: "Sat",
    focus: "Athletic power day",
    tag: "Training",
    exercises: [
      { name: "Box jumps", detail: "4 x 5", note: "Step down, land soft" },
      { name: "Broad jumps", detail: "3 x 5" },
      { name: "DB RDL to jump shrug", detail: "3 x 6" },
      { name: "Pallof press", detail: "3 x 12 each side" },
      { name: "Dead bug", detail: "3 x 10 each side" },
      { name: "Copenhagen plank", detail: "3 x 15-20s each side" },
      { name: "Landmine rotation", detail: "3 x 8 each side" },
      { name: "Single-leg balance", detail: "2 x 30s each" }
    ]
  }
];

export const prehab = [
  {
    title: "Pain rule",
    detail: "Train at 3/10 pain or lower. Stop any exercise that pushes above 4/10."
  },
  {
    title: "Avoid during flares",
    detail:
      "Deep squats, long-stride forward lunges, deep leg press, hanging leg raises, full sit-ups, aggressive hip flexor stretching."
  },
  {
    title: "Base protocol",
    detail:
      "Double-leg bridge, resisted hip extension, side-lying hip abduction, dead bug, Copenhagen plank, then single-leg bridge once pain-free."
  },
  {
    title: "Return rule",
    detail: "After a flare, restart with prehab and low load. Do not jump straight back to full lower-body volume."
  }
];

export const lifeAreas = [
  { label: "Summer wins", value: "12", detail: "Trips, games, lifts, projects, friendships" },
  { label: "Money runway", value: "$1,200", detail: "Target spending guardrail for the season" },
  { label: "Deep work", value: "8h", detail: "Weekly build / learning block" },
  { label: "Social reps", value: "3", detail: "Plans, invites, or check-ins per week" }
];

export const summerGoals = [
  "Play or practice ultimate twice per week",
  "Add 5-8 lb lean mass without sacrificing speed",
  "Host one intentional hangout every week",
  "Ship one portfolio-quality project",
  "Keep Sunday as reset day"
];

export const budgetItems = [
  { label: "Food and meal prep", amount: "$95/wk" },
  { label: "Gas / rides", amount: "$35/wk" },
  { label: "Fun money", amount: "$45/wk" },
  { label: "Gear / supplements", amount: "$60/mo" }
];

export const defaultNotes =
  "Current priority: build the summer around strength, ultimate, good food, enough sleep, and memories that are not just screen time.";
