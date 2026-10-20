import { useEffect, useRef, useState } from "react";
import { useGame, useUi } from "../hooks";
import { BADGES, MISSIONS, MOMS, SAREES, TEMPLES, isFestivalDay, missionsFor, unlock, type Profile } from "../../game/visit/rules";
import type { MiniGame } from "../../game/visit/VisitDirector";

const today = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ title: choose a mom and a temple
export function VisitMenu({ onBack }: { onBack: () => void }) {
  const game = useGame();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mom, setMom] = useState("devotional");
  const [temple, setTemple] = useState("city");
  const [, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    void game.saves.loadVisitProfile().then((p) => {
      if (!live) return;
      if (p.missions.day !== today()) p.missions = { day: today(), ids: missionsFor(today()), done: [] };
      setProfile(p);
    });
    return () => {
      live = false;
    };
  }, [game]);
  if (!profile) return <p className="muted">Loading your temple diary...</p>;
  const save = (p: Profile) => {
    void game.saves.saveVisitProfile(p);
    setTick((n) => n + 1);
  };
  const buy = (kind: "mom" | "temple" | "saree", id: string) => {
    if (unlock(profile, kind, id)) save(profile);
  };
  const saree = profile.sareeChoice[mom] ?? "default";
  const fest = isFestivalDay(today());
  return (
    <div className="visit-menu" data-testid="visit-menu">
      <p className="subtitle">Moms at Temples · one visit, from home to darshan and back</p>
      <div className="visit-row">
        <span className="kumkum" data-testid="kumkum">Kumkum: {profile.kumkum}</span>
        {fest && <span className="festival-tag">Festival day: points and penalties doubled, 108 rounds unlocked</span>}
      </div>
      <h4 className="section">Choose your mom</h4>
      <div className="visit-cards">
        {MOMS.map((m) => {
          const owned = profile.unlockedMoms.includes(m.id);
          return (
            <button key={m.id} className={`visit-card ${mom === m.id ? "selected" : ""}`} data-testid={`mom-${m.id}`} onClick={() => (owned ? setMom(m.id) : buy("mom", m.id))} disabled={!owned && profile.kumkum < m.cost}>
              <b>{m.name}</b>
              <span className="small">{m.passive}</span>
              {!owned && <span className="small cost">Unlock: {m.cost} kumkum</span>}
            </button>
          );
        })}
      </div>
      <h4 className="section">Choose the temple</h4>
      <div className="visit-cards">
        {TEMPLES.map((t) => {
          const owned = profile.unlockedTemples.includes(t.id);
          return (
            <button key={t.id} className={`visit-card ${temple === t.id ? "selected" : ""}`} data-testid={`temple-${t.id}`} onClick={() => (owned ? setTemple(t.id) : buy("temple", t.id))} disabled={!owned && profile.kumkum < t.cost}>
              <b>{t.name}</b>
              <span className="small">Crowd: {t.crowd} · {t.rule}</span>
              <span className="small">Best: {profile.personalBest[t.id] ?? 0}</span>
              {!owned && <span className="small cost">Unlock: {t.cost} kumkum</span>}
            </button>
          );
        })}
      </div>
      <h4 className="section">Saree</h4>
      <div className="visit-sarees">
        {SAREES.map((s) => {
          const owned = profile.unlockedSarees.includes(s.id);
          const color = s.color || MOMS.find((m) => m.id === mom)?.saree;
          return (
            <button
              key={s.id}
              className={`saree ${saree === s.id ? "selected" : ""}`}
              title={s.name}
              style={{ background: color }}
              data-testid={`saree-${s.id}`}
              disabled={!owned && profile.kumkum < s.cost}
              onClick={() => {
                if (!owned && !unlock(profile, "saree", s.id)) return;
                profile.sareeChoice[mom] = s.id;
                save(profile);
              }}
            >
              {owned ? "" : s.cost}
            </button>
          );
        })}
      </div>
      <details className="visit-details">
        <summary>Daily missions and badges</summary>
        <ul>
          {profile.missions.ids.map((id) => {
            const m = MISSIONS.find((x) => x.id === id)!;
            return (
              <li key={id}>
                {profile.missions.done.includes(id) ? "✓ " : ""}
                {m.text} <span className="muted small">(+{m.reward})</span>
              </li>
            );
          })}
        </ul>
        <ul>
          {BADGES.map((b) => (
            <li key={b.id} className={profile.badges.includes(b.id) ? "" : "muted"}>
              {profile.badges.includes(b.id) ? "★" : "☆"} {b.name} <span className="small">- {b.how}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="visit-row">
        <button className="primary" data-testid="start-visit" onClick={() => void game.startVisit(mom, temple)}>
          Start the visit
        </button>
        <button onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ HUD
export function VisitHud() {
  const ui = useUi();
  const v = ui.visit;
  if (!v) return null;
  const last = v.lastAction;
  return (
    <div className="visit-hud" data-testid="visit-hud">
      <div className="visit-score">
        <div className="punya" data-testid="punya">
          {v.punya} <span className="small">Punya</span>
        </div>
        <div className="meter blessings" title="Blessings multiply the final score">
          <span>Blessings ×{v.multiplier}</span>
          <div className="bar">
            <div style={{ width: `${v.blessings}%` }} />
          </div>
        </div>
        <div className="meter stress" title="At 100 the visit ends">
          <span>Stress</span>
          <div className="bar">
            <div style={{ width: `${v.stress}%` }} data-testid="stress-bar" />
          </div>
        </div>
        {v.streak.category && v.streak.count > 0 && (
          <div className={`streak ${v.streak.count >= 3 ? "hot" : ""}`}>
            {v.streak.category} ×{v.streak.count}
            {v.streak.count >= 3 ? " - next one doubles!" : ""}
          </div>
        )}
        {v.festival && <div className="festival-tag small">Festival day</div>}
      </div>
      <div className="visit-objective" data-testid="visit-objective">
        <b>{v.templeName}</b> · {v.momName}
        <div>{v.objective}</div>
        <div className="small muted">{v.info}</div>
        {v.pradakshina > 0 && <div className="small">Pradakshina: {v.pradakshina} rounds</div>}
      </div>
      {last && (
        // keyed by the action: each new score remounts and replays the fade-up animation
        <div key={last.key} className={`visit-flash ${last.points >= 0 ? "good" : "bad"} ${last.combo ? "combo" : ""}`} data-testid="visit-flash">
          {last.combo && <b>COMBO ×2 </b>}
          {`${last.points > 0 ? "+" : ""}${last.points} ${last.label}`}
        </div>
      )}
      {v.queue && (
        <div className="queue-panel" data-testid="queue-panel">
          <div className="lanes">
            {v.queue.lanes.map((l, i) => (
              <div key={i} className={`lane ${i === v.queue!.lane ? "mine" : ""}`}>
                <b>{l.label}</b>
                <span className="small">{l.speed.toFixed(2)} m/s</span>
              </div>
            ))}
          </div>
          <div className="bar">
            <div style={{ width: `${(v.queue.progress / Math.max(0.1, v.queue.length)) * 100}%` }} />
          </div>
          <div className="small">{v.queue.hints.join(" · ") || "W shuffle · A/D switch lanes · hold R pray"}</div>
        </div>
      )}
      {v.guide && (
        <div className="drive-guide" data-testid="drive-guide">
          <span className="arrow" style={{ transform: `rotate(${-v.guide.bearing}rad)` }}>
            ▲
          </span>
          <span>
            Temple gate <b data-testid="drive-distance">{v.guide.distance}</b> m{v.guide.distance <= 100 ? " · park here" : ""}
          </span>
        </div>
      )}
      {v.driving && <div className="drive-hint small">W/S drive · A/D steer · Space brake · H horn · E get out</div>}
    </div>
  );
}

// ------------------------------------------------------------------ mini-games
export function MiniGamePanel() {
  const ui = useUi();
  const game = useGame();
  const m = ui.visit?.mini;
  if (!m) return null;
  const done = (r: Record<string, unknown>) => game.visit?.finishMini(r);
  return (
    <div className="minigame" role="dialog" aria-label={m.title} data-testid={`minigame-${m.kind}`}>
      <h3>{m.title}</h3>
      <Mini key={`${m.kind}-${m.title}`} m={m} done={done} />
      <p className="muted small">Esc gives up.</p>
    </div>
  );
}

function useCountdown(seconds: number, onEnd: () => void): number {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(id);
        end.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds]);
  return left;
}

function Timer({ left, total }: { left: number; total: number }) {
  return (
    <div className="mini-timer">
      <div style={{ width: `${(left / total) * 100}%` }} />
    </div>
  );
}

function Mini({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  switch (m.kind) {
    case "bag":
      return <BagGame m={m} done={done} />;
    case "tithi":
      return <TithiGame m={m} done={done} />;
    case "hide":
    case "seek":
      return <Options options={m.data.spots as string[]} onPick={(i) => done({ ok: true, choice: i })} note={m.kind === "hide" ? "Remember it: you will be asked at the exit." : undefined} />;
    case "choice":
      return <Options options={m.data.options as string[]} onPick={(i) => done({ ok: true, choice: i })} />;
    case "coconut":
      return <CoconutGame m={m} done={done} />;
    case "lamps":
      return <LampsGame m={m} done={done} />;
    case "sloka":
      return <SlokaGame m={m} done={done} />;
    case "archana":
      return <ArchanaGame m={m} done={done} />;
    case "darshan":
      return <DarshanGame m={m} done={done} />;
    case "prayer":
      return <PrayerGame m={m} done={done} />;
    case "gossip":
      return <GossipGame m={m} done={done} />;
    case "photo":
      return <PhotoGame m={m} done={done} />;
  }
}

function Options({ options, onPick, note }: { options: string[]; onPick: (i: number) => void; note?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(n - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [options, onPick]);
  return (
    <div className="mini-options">
      {options.map((o, i) => (
        <button key={i} className="option" data-testid={`mini-option-${i}`} onClick={() => onPick(i)}>
          <kbd>{i + 1}</kbd> {o}
        </button>
      ))}
      {note && <p className="small">{note}</p>}
    </div>
  );
}

function BagGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const items = m.data.items as Array<{ id: string; label: string }>;
  const total = m.data.seconds as number;
  const [bag, setBag] = useState<string[]>([]);
  const bagRef = useRef(bag);
  useEffect(() => {
    bagRef.current = bag;
  }, [bag]);
  const left = useCountdown(total, () => done({ ok: true, packed: bagRef.current, honked: true }));
  return (
    <div>
      <Timer left={left} total={total} />
      <p className="small">Click what goes into the temple bag. The auto honks when the bar runs out!</p>
      <div className="bag-grid">
        {items.map((it) => (
          <button key={it.id} className={`bag-item ${bag.includes(it.id) ? "in" : ""}`} data-testid={`bag-${it.id}`} onClick={() => setBag((b) => (b.includes(it.id) ? b.filter((x) => x !== it.id) : [...b, it.id]))}>
            {it.label}
          </button>
        ))}
      </div>
      <button className="primary" data-testid="bag-done" onClick={() => done({ ok: true, packed: bag })}>
        Done - zip it up
      </button>
    </div>
  );
}

function TithiGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(false), 1600);
    return () => window.clearTimeout(t);
  }, []);
  const total = m.data.seconds as number;
  const left = useCountdown(total + 1.6, () => done({ ok: false, choice: null }));
  if (shown)
    return (
      <div className="calendar-card" data-testid="calendar-card">
        Today: <b>{m.data.shown as string}</b>
      </div>
    );
  return (
    <div>
      <Timer left={left} total={total + 1.6} />
      <Options options={m.data.options as string[]} onPick={(i) => done({ ok: true, choice: (m.data.options as string[])[i] })} />
    </div>
  );
}

function CoconutGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const speed = m.data.speed as number;
  const [x, setX] = useState(0);
  const xr = useRef(0);
  const fired = useRef(false);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const v = 0.5 + 0.5 * Math.sin(((t - t0) / 1000) * speed * Math.PI);
      xr.current = v;
      setX(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  const strike = () => {
    if (fired.current) return;
    fired.current = true;
    done({ ok: Math.abs(xr.current - 0.5) < 0.08 });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "KeyE") {
        e.preventDefault();
        strike();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <div>
      <div className="timing-bar">
        <div className="green" />
        <div className="marker" style={{ left: `${x * 100}%` }} />
      </div>
      <button className="primary" data-testid="coconut-strike" onClick={strike}>
        Smash! <kbd>Space</kbd>
      </button>
    </div>
  );
}

function LampsGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const n = m.data.lamps as number;
  const [lit, setLit] = useState<boolean[]>(() => Array(n).fill(false));
  const [matches, setMatches] = useState(m.data.matches as number);
  const [msg, setMsg] = useState<string | null>(null);
  // which strikes catch (about 7 in 10), decided once when the stand is set up
  const [luck] = useState(() => Array.from({ length: 24 }, () => Math.random() < 0.72));
  const light = (i: number) => {
    if (lit[i] || matches <= 0) return;
    const used = (m.data.matches as number) - matches;
    setMatches((x) => x - 1);
    if (luck[used]) {
      setLit((l) => l.map((v, j) => (j === i ? true : v)));
      setMsg(null);
    } else setMsg("The match fizzled out!");
  };
  const count = lit.filter(Boolean).length;
  return (
    <div>
      <p>
        Wishes: <b>{m.data.wishes as number}</b> · Lamps lit: <b data-testid="lamps-lit">{count}</b> · Matchsticks left: <b>{matches}</b>
      </p>
      <div className="lamp-row">
        {lit.map((on, i) => (
          <button key={i} className={`lamp ${on ? "on" : ""}`} data-testid={`lamp-${i}`} onClick={() => light(i)} aria-label={`lamp ${i + 1}`}>
            {on ? "🔥" : "🪔"}
          </button>
        ))}
      </div>
      {msg && <p className="small warn">{msg}</p>}
      <button className="primary" data-testid="lamps-done" onClick={() => done({ ok: true, lit: count })}>
        Done
      </button>
    </div>
  );
}

function SlokaGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const total = m.data.seconds as number;
  const left = useCountdown(total, () => done({ ok: false }));
  const options = m.data.options as string[];
  return (
    <div>
      <Timer left={left} total={total} />
      <Options options={options} onPick={(i) => done({ ok: options[i] === m.data.right })} />
    </div>
  );
}

function ArchanaGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const [nak, setNak] = useState<string | null>(null);
  const per = m.data.seconds as number;
  return nak === null ? (
    <ArchanaStep key="n" label="Nakshatra?" options={m.data.nakshatras as string[]} seconds={per} onPick={(v) => (v ? setNak(v) : done({ ok: false }))} />
  ) : (
    <ArchanaStep key="g" label="Gotra?" options={m.data.gotras as string[]} seconds={per} onPick={(v) => done({ ok: !!v, nakshatra: nak, gotra: v })} />
  );
}

function ArchanaStep({ label, options, seconds, onPick }: { label: string; options: string[]; seconds: number; onPick: (v: string | null) => void }) {
  const left = useCountdown(seconds, () => onPick(null));
  return (
    <div>
      <p>
        <b>{label}</b>
      </p>
      <Timer left={left} total={seconds} />
      <Options options={options} onPick={(i) => onPick(options[i]!)} />
    </div>
  );
}

function DarshanGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const need = m.data.seconds as number;
  const crowd = m.data.crowd as string;
  const nudge = crowd === "high" ? 1.0 : crowd === "medium" ? 0.7 : 0.45;
  const [view, setView] = useState({ held: 0, off: 0, holding: false });
  const st = useRef({ held: 0, off: 0, holding: false, started: false, steer: 0, out: 0, over: false });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        st.current.holding = true;
        st.current.started = true;
      }
      if (e.code === "KeyA" || e.code === "ArrowLeft") st.current.steer = -1;
      if (e.code === "KeyD" || e.code === "ArrowRight") st.current.steer = 1;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") st.current.holding = false;
      if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(e.code)) st.current.steer = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      const s = st.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      if (s.over) return;
      // the crowd shoves the view sideways; steer back with A/D
      s.off += (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 4.3) * 0.4) * nudge * dt * 1.4 + s.steer * dt * 1.6;
      s.off = Math.max(-1, Math.min(1, s.off));
      const centred = Math.abs(s.off) < 0.35;
      if (s.holding && centred) s.held += dt;
      if (s.started && !centred) s.out += dt;
      else s.out = 0;
      setView({ held: s.held, off: s.off, holding: s.holding });
      if (s.held >= need) {
        s.over = true;
        done({ ok: true });
        return;
      }
      if ((s.started && !s.holding && s.held > 0.2) || s.out > 0.9) {
        s.over = true;
        done({ ok: false });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [need, nudge, done]);
  return (
    <div>
      <p className="small">Hold Space to keep your eyes on the deity; A/D to hold your place against the crowd. Let go too early and you're pushed on.</p>
      <div className="darshan-view">
        <div className="deity" style={{ left: `${50 + view.off * 40}%` }}>
          🛕
        </div>
        <div className="window" />
      </div>
      <Timer left={need - view.held} total={need} />
      <p className="small">{view.holding ? "Darshan..." : "Hold Space"}</p>
    </div>
  );
}

function PrayerGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const names = m.data.names as string[];
  const needed = m.data.needed as string[];
  const total = m.data.seconds as number;
  const [chosen, setChosen] = useState<string[]>([]);
  const ref = useRef(chosen);
  useEffect(() => {
    ref.current = chosen;
  }, [chosen]);
  const finish = () => done({ ok: needed.every((n) => ref.current.includes(n)) });
  const left = useCountdown(total, finish);
  return (
    <div>
      <Timer left={left} total={total} />
      <div className="mini-options">
        {names.map((n) => (
          <label key={n} className="setting">
            <input type="checkbox" checked={chosen.includes(n)} onChange={() => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]))} data-testid={`pray-${n}`} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <button className="primary" data-testid="pray-done" onClick={finish}>
        Amen - done
      </button>
    </div>
  );
}

function GossipGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const rounds = m.data.rounds as Array<{ them: string; good: string; bad: string }>;
  const [i, setI] = useState(0);
  const [good, setGood] = useState(0);
  const r = rounds[i]!;
  const [order] = useState(() => rounds.map(() => Math.random() < 0.5));
  const opts = order[i] ? [r.good, r.bad] : [r.bad, r.good];
  const pick = (k: number) => {
    const g = opts[k] === r.good ? good + 1 : good;
    if (i + 1 >= rounds.length) done({ ok: g === rounds.length });
    else {
      setGood(g);
      setI(i + 1);
    }
  };
  return (
    <div>
      <p className="gossip-line">“{r.them}”</p>
      <Options key={i} options={opts} onPick={pick} />
    </div>
  );
}

function PhotoGame({ m, done }: { m: MiniGame; done: (r: Record<string, unknown>) => void }) {
  const n = m.data.faces as number;
  const [eyes, setEyes] = useState<boolean[]>(() => Array(n).fill(true));
  const ref = useRef(eyes);
  useEffect(() => {
    ref.current = eyes;
  }, [eyes]);
  const fired = useRef(false);
  useEffect(() => {
    // everyone blinks now and then; there are moments when all eyes are open
    const id = window.setInterval(() => setEyes((e) => e.map((open) => (open ? Math.random() > 0.12 : Math.random() > 0.55))), 160);
    return () => window.clearInterval(id);
  }, []);
  const snap = () => {
    if (fired.current) return;
    fired.current = true;
    done({ ok: ref.current.every(Boolean) });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        snap();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <div>
      <div className="photo-faces">
        {eyes.map((open, i) => (
          <span key={i} className="face" data-testid={`face-${i}`} data-open={open}>
            {open ? "😃" : "😑"}
          </span>
        ))}
      </div>
      <button className="primary" data-testid="photo-snap" onClick={snap}>
        Click! <kbd>Space</kbd>
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ score screen
export function VisitScore() {
  const game = useGame();
  const ui = useUi();
  const s = ui.visit?.summary;
  if (!s) return null;
  const again = () => {
    const v = game.visit;
    if (v) void game.startVisit(v.run.momId, v.run.templeId);
  };
  return (
    <div className="minigame visit-score-screen" role="dialog" data-testid="visit-score">
      <h2>{s.ended === "stress" ? "Amma has lost it! The visit ends early." : "Home again, blessed."}</h2>
      <table className="score-table">
        <tbody>
          <tr>
            <td>Punya points</td>
            <td>{s.score.punya}</td>
          </tr>
          <tr>
            <td>Blessings multiplier</td>
            <td>×{s.score.multiplier}</td>
          </tr>
          <tr>
            <td>Stress cap</td>
            <td>×{s.score.stressCap.toFixed(2)}</td>
          </tr>
          <tr className="total">
            <td>Final score</td>
            <td data-testid="final-score">{s.score.total}</td>
          </tr>
          <tr>
            <td>Kumkum earned</td>
            <td data-testid="kumkum-earned">+{s.kumkumEarned}</td>
          </tr>
          <tr>
            <td>Personal best ({TEMPLES.find((t) => t.id === s.templeId)?.name})</td>
            <td>
              {s.personalBest}
              {s.newBest ? " - new best!" : ""}
            </td>
          </tr>
        </tbody>
      </table>
      {s.score.fullyBlessed && <p className="festival-tag">Fully Blessed!</p>}
      {s.badges.length > 0 && <p>Badges: {s.badges.map((b) => BADGES.find((x) => x.id === b)?.name).join(", ")}</p>}
      {s.missionsCompleted.length > 0 && <p>Missions: {s.missionsCompleted.map((id) => MISSIONS.find((x) => x.id === id)?.text).join(" · ")}</p>}
      <div className="visit-row">
        <button className="primary" data-testid="visit-again" onClick={again}>
          Visit again
        </button>
        <button
          data-testid="visit-title"
          onClick={() => {
            game.exitVisit();
            game.enterTitle();
          }}
        >
          Back to the title
        </button>
      </div>
    </div>
  );
}
