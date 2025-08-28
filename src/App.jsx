import React, { useEffect, useMemo, useState } from "react";

/** --------------------------------------------------------------
 *  Coelecanth – Family Seafaring RPG (with Interactive Help)
 *  - Tap a quest title (or "?" icon) to see a short how-to popup
 *  - Press "Claim" to earn XP; daily/weekly reset automatically
 * --------------------------------------------------------------*/

// ---------- Helpers ----------
const LEVELS = [
  { lvl: 1, min: 0, max: 199, title: "Deckhand" },
  { lvl: 2, min: 200, max: 399, title: "Able Seaman" },
  { lvl: 3, min: 400, max: 699, title: "Boatswain" },
  { lvl: 4, min: 700, max: 999, title: "First Mate" },
  { lvl: 5, min: 1000, max: Infinity, title: "Captain of the Deep" },
];
const todayKey = () => new Date().toISOString().slice(0, 10);
const isoWeekKey = () => {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};
const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ---------- Seafaring Data (Family-friendly, therapeutic under the hood) ----------
// Daily Quests (small chores & wellness)
const DAILY_QUESTS = [
  {
    id: "deck",
    label: "Swab the Decks",
    xp: 10,
    icon: "🧹",
    help: "Reset & breathe. Do 3 rounds of 4–6 breathing: inhale through nose 4s, exhale 6s. Keep shoulders relaxed. Optional: wipe a counter or tidy one small area while breathing.",
  },
  {
    id: "nets",
    label: "Haul the Nets",
    xp: 10,
    icon: "🎣",
    help: "Move your body for ~10 minutes. Walk, stretch, squats, or light weights. Aim to get your heart rate slightly up—just enough to feel warmed.",
  },
  {
    id: "pots",
    label: "Check the Crab Pots",
    xp: 15,
    icon: "🦀",
    help: "Do one practical chore from start to finish (dishes, trash, laundry load, inbox zero). Make it small and decisive—pull the pot, sort the catch, done.",
  },
  {
    id: "stars",
    label: "Chart the Stars",
    xp: 20,
    icon: "🌌",
    help: "Mindfulness/exposure. Spend 5–10 minutes doing a small thing that feels slightly uncomfortable but safe (say hi to a clerk, step outside, try a new route). Then note 1 thing you learned.",
  },
];

// Weekly Quests (bigger challenges & social)
const WEEKLY_QUESTS = [
  {
    id: "parley",
    label: "Parley at Port",
    xp: 25,
    icon: "🗣️",
    help: "Have a real-world conversation you wouldn’t normally have (neighbor, coworker, family friend). Keep it light; ask one curious question.",
  },
  {
    id: "market",
    label: "Trade at the Harbor Market",
    xp: 25,
    icon: "⚖️",
    help: "Do a small exchange or favor: give something away, sell a spare, swap help, or barter time. Practice clear asks and clean boundaries.",
  },
  {
    id: "catch",
    label: "Sort the Catch",
    xp: 30,
    icon: "🐟",
    help: "Declutter or organize one small zone (desk, drawer, car seat, fridge shelf). Keep or toss—don’t re-stack the same mess.",
  },
  {
    id: "crew",
    label: "Gather the Crew",
    xp: 50,
    icon: "👥",
    help: "Do a family/group activity (meal, walk, game, errand). Keep it simple and time-boxed. Focus on shared effort, not perfection.",
  },
  {
    id: "log",
    label: "Captain’s Log",
    xp: 20,
    icon: "📜",
    help: "Write 3 quick lines: (1) one win, (2) one snag, (3) next small step. Optional: a brief prayer or gratitude.",
  },
];

// Bosses (shared challenges)
const BOSSES = [
  { id: "tangle", title: "The Tangleback Eel", when: "Week 2", dc: 8, reward: 100, icon: "🪱", help: "Procrastination beast: defeat by completing all daily quests 2 consecutive days this week." },
  { id: "kraken", title: "The Chaos Kraken", when: "Week 4", dc: 12, reward: 200, icon: "🦑", help: "Overwhelm beast: defeat by finishing any 3 weekly quests." },
  { id: "leviathan", title: "The Leviathan of Discord", when: "Week 6", dc: 14, reward: 300, icon: "🐋", help: "Conflict beast: defeat by hosting 1 pleasant crew activity + 1 calm conversation about plans." },
  { id: "mirror", title: "The Abyssal Mirror", when: "Week 8", dc: 16, reward: 500, icon: "🪞", help: "Self-doubt beast: defeat by writing 3 Captain’s Log entries this week and attempting 1 stretchy action." },
];

// Loot
const LOOT = [
  { roll: "1–2", name: "Silver Hook", effect: "+10 XP (Small Gain)", bonus: 10 },
  { roll: "3–4", name: "Pearl of Resolve", effect: "+15 XP (Steady Progress)", bonus: 15 },
  { roll: "5", name: "Map Fragment of Confidence", effect: "+20 XP (Big Step)", bonus: 20 },
  { roll: "6", name: "Compass of Faith", effect: "Next roll has advantage", bonus: 0 },
];

// ---------- UI Primitives ----------
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-lg p-4 bg-white/90 backdrop-blur border border-sky-100 ${className}`}>
      {children}
    </div>
  );
}
function Button({ children, onClick, disabled, variant = "primary" }) {
  const base = "py-2 px-3 rounded-xl text-sm font-semibold transition active:scale-[.99]";
  const variants = {
    primary: "bg-sky-700 text-white disabled:bg-sky-300",
    ghost: "bg-white text-sky-700 border border-sky-200",
    success: "bg-emerald-600 text-white disabled:bg-emerald-300",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function ShareButton() {
  const url = window.location.origin;
  const title = "Coelecanth – Seafaring RPG";
  const text = "Install on your phone (Add to Home Screen) and play!";

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied! Share it anywhere.");
      }
    } catch {
      // user canceled or share not available
    }
  };

  return (
    <button
      onClick={share}
      className="text-xs px-2 py-1 rounded-md border border-sky-200 text-sky-700 bg-white hover:bg-sky-50 active:scale-[.99]"
      title="Share"
      aria-label="Share this app"
    >
      Share
    </button>
  );
}

// Simple Modal for help popups
function Modal({ open, onClose, title, body }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-sky-100">
        <div className="flex items-center justify-between p-3 border-b border-sky-100">
          <div className="font-bold text-sky-900">{title}</div>
          <button className="text-sky-700 text-sm px-2 py-1 border border-sky-200 rounded-md" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 text-sky-900 text-sm leading-relaxed whitespace-pre-wrap">{body}</div>
      </div>
    </div>
  );
}

// ---------- Feature Components ----------
function Header({ xp, level }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="text-3xl">⚓</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-sky-800/70">Coelecanth Campaign</div>
            <div className="font-extrabold text-sky-900 text-xl">Captain’s Ledger</div>
            <div className="text-sky-700 text-sm">Level {level.lvl} · {level.title}</div>
          </div>
          {/* ⬇⬇ Add Share button in the header ⬇⬇ */}
          <div className="ml-3">
            <ShareButton />
          </div>
          {/* ⬆⬆ */}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-sky-700/80">XP</div>
        <div className="text-2xl font-black text-sky-900">{xp}</div>
      </div>
    </div>
  );
}

function XPBar({ xp }) {
  const pct = Math.min(100, Math.round(((xp % 1000) / 1000) * 100));
  return (
    <div className="w-full h-3 rounded-full bg-sky-100 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${pct}%` }} />
    </div>
  );
}
function Dice({ onLoot }) {
  const [d20, setD20] = useState(null);
  const [d6, setD6] = useState(null);
  const roll = (sides) => Math.floor(Math.random() * sides) + 1;
  const rollBoth = () => {
    const r20 = roll(20); setD20(r20);
    const r6 = roll(6); setD6(r6);
    if (onLoot) onLoot(r6);
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sky-900">Bones of Fate</h3>
        <Button onClick={rollBoth}>Roll d20 + d6</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
          <div className="text-xs text-sky-600">d20</div>
          <div className="text-3xl font-black text-sky-900">{d20 ?? "—"}</div>
        </div>
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
          <div className="text-xs text-sky-600">d6 (Loot)</div>
          <div className="text-3xl font-black text-sky-900">{d6 ?? "—"}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-sky-700">
        Use dice as <i>optional overlay</i>. Quests still require real-world action.
      </div>
    </Card>
  );
}

function QuestList({ title, subtitle, quests, claimedSet, onClaim, onHelp }) {
  return (
    <Card>
      <div className="mb-2">
        <div className="text-xs uppercase tracking-widest text-sky-700/70">{subtitle}</div>
        <h3 className="font-bold text-sky-900 text-lg">{title}</h3>
      </div>
      <div className="space-y-2">
        {quests.map((q) => {
          const done = claimedSet.has(q.id);
          return (
            <div key={q.id} className="flex items-center gap-3 p-2 rounded-xl border border-sky-100 bg-sky-50">
              <div className="text-2xl leading-none">{q.icon}</div>
              <div className="flex-1 min-w-0">
                <button
                  className={`text-left font-semibold underline-offset-2 ${done ? "line-through text-sky-500" : "text-sky-900 hover:underline"}`}
                  onClick={() => onHelp(q.label, q.help)}
                  title="Tap for details"
                >
                  {q.label}
                </button>
                <div className="text-xs text-sky-700/80">{q.xp} XP</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded-md border border-sky-200 text-sky-700 bg-white"
                  onClick={() => onHelp(q.label, q.help)}
                  aria-label="Help"
                  title="Help"
                >
                  ?
                </button>
                <Button variant={done ? "ghost" : "primary"} disabled={done} onClick={() => onClaim(q)}>
                  {done ? "Claimed" : "Claim"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BossList({ bosses, defeated, onDefeat, onHelp }) {
  return (
    <Card>
      <h3 className="font-bold text-sky-900 text-lg mb-2">Sea Beasts (Bosses)</h3>
      <div className="space-y-2">
        {bosses.map((b) => {
          const dead = defeated.includes(b.id);
          return (
            <div key={b.id} className="p-3 rounded-xl border border-sky-100 bg-white flex items-center gap-3">
              <div className="text-2xl">{b.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-sky-900">
                  <button className="hover:underline underline-offset-2" onClick={() => onHelp(b.title, b.help)} title="Tap for details">
                    {b.title}
                  </button>{" "}
                  <span className="text-xs text-sky-700/70">({b.when})</span>
                </div>
                <div className="text-xs text-sky-700">DC {b.dc} · Reward {b.reward} XP</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded-md border border-sky-200 text-sky-700 bg-white"
                  onClick={() => onHelp(b.title, b.help)}
                  aria-label="Help"
                  title="Help"
                >
                  ?
                </button>
                <Button variant={dead ? "ghost" : "success"} disabled={dead} onClick={() => onDefeat(b)}>
                  {dead ? "Conquered" : "Conquer"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- Root App ----------
export default function App() {
  const [xp, setXp] = useState(() => load("cxp", 0));
  const [daily, setDaily] = useState(() => load("cdaily", { date: todayKey(), claimed: [] }));
  const [weekly, setWeekly] = useState(() => load("cweekly", { week: isoWeekKey(), claimed: [] }));
  const [bosses, setBosses] = useState(() => load("cboss", []));
  const [log, setLog] = useState(() => load("clog", []));
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTitle, setHelpTitle] = useState("");
  const [helpBody, setHelpBody] = useState("");

  // Reset daily/weekly if date/week changes
  useEffect(() => {
    const t = todayKey();
    if (daily.date !== t) setDaily({ date: t, claimed: [] });
    const w = isoWeekKey();
    if (weekly.week !== w) setWeekly({ week: w, claimed: [] });
    // eslint-disable-next-line
  }, []);

  // Persist
  useEffect(() => save("cxp", xp), [xp]);
  useEffect(() => save("cdaily", daily), [daily]);
  useEffect(() => save("cweekly", weekly), [weekly]);
  useEffect(() => save("cboss", bosses), [bosses]);
  useEffect(() => save("clog", log), [log]);

  const level = useMemo(() => LEVELS.find(L => xp >= L.min && xp <= L.max) || LEVELS[LEVELS.length - 1], [xp]);
  const claimedDaily = useMemo(() => new Set(daily.claimed), [daily]);
  const claimedWeekly = useMemo(() => new Set(weekly.claimed), [weekly]);

  const addLog = (msg) => setLog((old) => [`${new Date().toLocaleString()}: ${msg}`, ...old.slice(0, 49)]);

  const onHelp = (title, body) => { setHelpTitle(title); setHelpBody(body || "No details available."); setHelpOpen(true); };

  const claimDaily = (q) => {
    if (claimedDaily.has(q.id)) return;
    setDaily((d) => ({ ...d, claimed: [...d.claimed, q.id] }));
    setXp((v) => v + q.xp);
    addLog(`Claimed daily “${q.label}” (+${q.xp} XP).`);
  };
  const claimWeekly = (q) => {
    if (claimedWeekly.has(q.id)) return;
    setWeekly((w) => ({ ...w, claimed: [...w.claimed, q.id] }));
    setXp((v) => v + q.xp);
    addLog(`Completed weekly “${q.label}” (+${q.xp} XP).`);
  };
  const defeatBoss = (b) => {
    if (bosses.includes(b.id)) return;
    setBosses((arr) => [...arr, b.id]);
    setXp((v) => v + b.reward);
    addLog(`Conquered ${b.title} (+${b.reward} XP).`);
  };

  const handleLoot = (roll) => {
    const bonus = roll <= 2 ? 10 : roll <= 4 ? 15 : roll === 5 ? 20 : 0;
    const name = roll <= 2 ? "Silver Hook" : roll <= 4 ? "Pearl of Resolve" : roll === 5 ? "Map Fragment of Confidence" : "Compass of Faith";
    if (bonus > 0) {
      setXp((v) => v + bonus);
      addLog(`Loot: ${name} (+${bonus} XP).`);
    } else {
      addLog(`Loot: ${name} (Advantage on next roll).`);
    }
  };

  const resetAll = () => {
    if (!confirm("Reset ALL progress?")) return;
    setXp(0);
    setDaily({ date: todayKey(), claimed: [] });
    setWeekly({ week: isoWeekKey(), claimed: [] });
    setBosses([]);
    setLog([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-cyan-100 to-slate-100 text-slate-900">
      <div className="max-w-md mx-auto p-3 pb-24">
        <Header xp={xp} level={level} />
        <XPBar xp={xp} />

        <div className="mt-4 grid gap-3">
          <QuestList
            title="Daily Quests"
            subtitle={`Ship's Log · ${todayKey()}`}
            quests={DAILY_QUESTS}
            claimedSet={claimedDaily}
            onClaim={claimDaily}
            onHelp={onHelp}
          />
          <QuestList
            title="Weekly Voyages"
            subtitle={`Ledger · ${isoWeekKey()}`}
            quests={WEEKLY_QUESTS}
            claimedSet={claimedWeekly}
            onClaim={claimWeekly}
            onHelp={onHelp}
          />
          <BossList bosses={BOSSES} defeated={bosses} onDefeat={defeatBoss} onHelp={onHelp} />
          <Dice onLoot={handleLoot} />

          <Card>
            <h3 className="font-bold text-sky-900 mb-2">Spoils & Relics</h3>
            <ul className="text-sm text-sky-900 list-disc pl-5 space-y-1">
              {LOOT.map((l) => (
                <li key={l.name}><span className="font-semibold">{l.roll}</span>: {l.name} — {l.effect}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sky-900">Captain’s Chronicle</h3>
              <Button variant="ghost" onClick={resetAll}>Reset All</Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto pr-1">
              {log.length === 0 ? (
                <div className="text-sm text-sky-700">No entries yet. Claim a quest to begin thy chronicle.</div>
              ) : (
                log.map((line, i) => (
                  <div key={i} className="text-xs text-sky-900/90">{line}</div>
                ))
              )}
            </div>
          </Card>

          <div className="text-[10px] text-sky-700/70 text-center mt-2">
            🦀 Tip: Tap a quest name or “?” to see what to do.
          </div>
        </div>
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={helpTitle} body={helpBody} />
    </div>
  );
}
