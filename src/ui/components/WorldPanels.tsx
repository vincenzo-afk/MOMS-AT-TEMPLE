import { useEffect, useState, type ReactNode } from "react";
import { useGame, useGameState, useUi } from "../hooks";
import { LOCATIONS, NOTICE_HINTS, RECORD_TEXT } from "../../data/text";
import { ANCHORS, INTERACTABLES, NAV_EDGES, NAV_NODES, PLACEMENTS, REGIONS, WORLD_BOUNDS } from "../../data/level";
import { SKILL_NAMES, skillLevel } from "../../data/farming";
import { scheduleAt } from "../../game/npc/NpcSystem";
import type { ItemStack, SkillId } from "../../game/core/types";

function Frame({ title, children, wide, testId }: { title: string; children: ReactNode; wide?: boolean; testId?: string }) {
  const game = useGame();
  return (
    <div className="panel-backdrop" onMouseDown={(e) => e.target === e.currentTarget && game.closePanel()}>
      <section className={`panel ${wide ? "wide" : ""}`} role="dialog" aria-label={title} data-testid={testId}>
        <header className="panel-head">
          <h2>{title}</h2>
          <button className="close" onClick={() => game.closePanel()} aria-label="Close">
            Esc ✕
          </button>
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}

function Slot({ stack, onClick, testId }: { stack: ItemStack | null; onClick?: () => void; testId?: string }) {
  const game = useGame();
  const d = stack ? game.session.defs.items.get(stack.itemId) : null;
  return (
    <button className={`slot ${stack ? "" : "empty"}`} onClick={onClick} disabled={!stack} title={d ? `${d.name} — ${d.description}` : "Empty"} aria-label={d ? `${d.name} x${stack!.quantity}` : "Empty slot"} data-testid={testId}>
      {d && (
        <>
          <span className={`icon cat-${d.category}`}>{d.icon}</span>
          <span className="qty">{stack!.quantity}</span>
        </>
      )}
    </button>
  );
}

// ------------------------------------------------------------------ storage chest
export function StoragePanel() {
  const game = useGame();
  const s = useGameState();
  const [msg, setMsg] = useState<string | null>(null);
  const move = (i: number, fromStorage: boolean) => {
    const r = game.session.transfer(i, fromStorage);
    setMsg(r.ok ? null : r.reason);
  };
  return (
    <Frame title="Storage chest" wide testId="storage">
      <p className="muted small">Click an item to move the whole stack between your bag and the chest.</p>
      <div className="two-col">
        <div>
          <h4 className="section">Your bag</h4>
          <div className="inv-grid">
            {s.inventory.map((st, i) => (
              <Slot key={i} stack={st} onClick={() => move(i, false)} testId={st ? `bag-${st.itemId}` : undefined} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="section">Chest</h4>
          <div className="inv-grid">
            {s.storage.map((st, i) => (
              <Slot key={i} stack={st} onClick={() => move(i, true)} testId={st ? `chest-${st.itemId}` : undefined} />
            ))}
          </div>
        </div>
      </div>
      {msg && <p className="warn">{msg}</p>}
    </Frame>
  );
}

// ------------------------------------------------------------------ world containers
export function ContainerPanel() {
  const game = useGame();
  const ui = useUi();
  const s = useGameState();
  const def = ui.containerId ? game.session.defs.containers.get(ui.containerId) : undefined;
  if (!def) return null;
  const owner = def.ownerNpcId ? game.session.defs.npcs.get(def.ownerNpcId) : undefined;
  const permitted = !owner || (def.id === "ct_granary_crate" && s.flags.granary_key);
  const slots = s.containers[def.id] ?? [];
  return (
    <Frame title={def.label[0]!.toUpperCase() + def.label.slice(1)} wide testId="container">
      {owner && !permitted && <p className="warn">This belongs to {owner.name}. Taking from it while anyone can see you is theft.</p>}
      {owner && permitted && <p className="muted small">{owner.name} said you may take from this.</p>}
      <div className="two-col">
        <div>
          <h4 className="section">Inside</h4>
          <div className="inv-grid">
            {slots.map((st, i) => (
              <Slot key={i} stack={st} onClick={() => game.takeFromContainer(def.id, i)} testId={st ? `take-${st.itemId}` : undefined} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="section">Your bag</h4>
          <div className="inv-grid">
            {s.inventory.map((st, i) => (
              <Slot key={i} stack={st} onClick={() => game.session.putIntoContainer(def.id, i)} />
            ))}
          </div>
        </div>
      </div>
      <p className="muted small">Click an item to move it.</p>
    </Frame>
  );
}

// ------------------------------------------------------------------ home decoration
export function DecorPanel() {
  const game = useGame();
  const s = useGameState();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Frame title="Your house" testId="decor">
      {[...game.session.defs.decorSlots.values()].map((slot) => {
        const placed = s.decor[slot.id];
        const owned = slot.accepts.filter((id) => s.inventory.some((x) => x?.itemId === id));
        return (
          <div key={slot.id} className="trade-row decor-row">
            <span>
              <strong>{slot.label}</strong>
              <br />
              <span className="muted small">{placed ? game.session.itemName(placed) : `Empty — takes ${slot.accepts.map((a) => game.session.itemName(a).toLowerCase()).join(" or ")}`}</span>
            </span>
            <span />
            {placed ? (
              slot.consumes ? (
                <span className="muted small">drawn</span>
              ) : (
                <button onClick={() => setMsg(((r) => (r.ok ? null : r.reason))(game.session.removeDecor(slot.id)))}>Take back</button>
              )
            ) : (
              <button
                className="primary"
                disabled={!owned.length}
                data-testid={`place-${slot.id}`}
                onClick={() => {
                  const r = game.session.placeDecor(slot.id, owned[0]!);
                  setMsg(r.ok ? null : r.reason);
                }}
              >
                Place
              </button>
            )}
          </div>
        );
      })}
      {msg && <p className="warn">{msg}</p>}
    </Frame>
  );
}

// ------------------------------------------------------------------ notice board
export function NoticesPanel() {
  const game = useGame();
  const s = useGameState();
  const avail = game.session.availableQuests();
  const active = Object.entries(s.quests).filter(([, q]) => q.status === "active");
  return (
    <Frame title="Notice board" testId="notices">
      {avail.length === 0 && <p className="muted">No new requests posted. Check back after helping the people you know.</p>}
      {avail.map((q) => {
        const npc = game.session.defs.npcs.get(q.giverNpcId);
        return (
          <article key={q.id} className="notice">
            <h3>{q.title}</h3>
            <p>{NOTICE_HINTS[q.id]}</p>
            <div className="muted small">Ask: {npc?.name}</div>
          </article>
        );
      })}
      {active.length > 0 && <p className="muted small">You have {active.length} task(s) in progress — see your journal (J).</p>}
      {s.flags.rota_restored && (
        <article className="notice rota">
          <h3>Channel keepers' rota</h3>
          <p className="inscription">Copied fresh from the old palm leaves by Elder Ponnan: each household clears the channels in its month. Thai — the temple street. Maasi — the west street. Aadi — the east lane.</p>
        </article>
      )}
    </Frame>
  );
}

// ------------------------------------------------------------------ map
const MAP = 560;
const toMap = (x: number, z: number): [number, number] => [((x + WORLD_BOUNDS) / (WORLD_BOUNDS * 2)) * MAP, ((z + WORLD_BOUNDS) / (WORLD_BOUNDS * 2)) * MAP];
const regionCenter = (id: string): [number, number] | null => {
  const r = REGIONS.find((g) => g.id === id);
  return r ? toMap((r.min[0] + r.max[0]) / 2, (r.min[1] + r.max[1]) / 2) : null;
};
const LANDMARKS: Record<string, { label: string; r: number }> = {
  ENV_Temple_Main_A: { label: "Temple", r: 7 },
  ENV_Gopuram_Entrance_A: { label: "", r: 4 },
  ENV_Temple_Tank_Large_A: { label: "", r: 9 },
  PRP_Well_A: { label: "Well", r: 3 },
  ENV_Workshop_A: { label: "", r: 3 },
  ENV_Market_Stall_A: { label: "", r: 2 },
  ENV_Market_Stall_B: { label: "", r: 2 },
  ENV_House_Village_A: { label: "", r: 3 },
  ENV_House_Village_B: { label: "", r: 3 },
  ENV_House_Thatch_A: { label: "", r: 3 },
  ENV_Field_Hut_A: { label: "", r: 2.5 },
  ENV_Ruin_Mandapa_Base_A: { label: "", r: 3 },
  ENV_Notice_Board_A: { label: "", r: 1.5 },
};

export function MapPanel() {
  const game = useGame();
  const ui = useUi();
  const s = useGameState();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(t);
  }, []);
  const p = game.player.position;
  const [px, pz] = toMap(p.x, p.z);
  const tracked = Object.entries(s.quests).find(([, q]) => q.status === "active");
  const obj = tracked ? game.session.currentObjective(tracked[0]) : undefined;
  const objPos = obj ? regionCenter(obj.locationId) : null;
  const focusEvent = ui.mapFocus ? s.record.find((e) => e.id === ui.mapFocus) : undefined;
  const focusPos = focusEvent ? regionCenter(focusEvent.locationId) : null;
  return (
    <Frame title="Map of the settlement" wide testId="map">
      <svg className="map" viewBox={`0 0 ${MAP} ${MAP}`} role="img" aria-label="Settlement map">
        <rect width={MAP} height={MAP} className="map-bg" />
        {REGIONS.map((r) => {
          const [x0, z0] = toMap(r.min[0], r.min[1]);
          const [x1, z1] = toMap(r.max[0], r.max[1]);
          return <rect key={r.id} x={x0} y={z0} width={x1 - x0} height={z1 - z0} className={`map-region r-${r.id}`} />;
        })}
        {NAV_EDGES.map(([a, b]) => {
          const [x0, z0] = toMap(...NAV_NODES[a]!);
          const [x1, z1] = toMap(...NAV_NODES[b]!);
          return <line key={a + b} x1={x0} y1={z0} x2={x1} y2={z1} className="map-road" />;
        })}
        {(() => {
          const [a, b] = toMap(-46, -46);
          const [c] = toMap(46, 46);
          return <rect x={a} y={b} width={c - a} height={c - a} className="map-wall" />;
        })()}
        {PLACEMENTS.filter((pl) => LANDMARKS[pl.asset]).map((pl, i) => {
          const [x, z] = toMap(pl.pos[0], pl.pos[2]);
          const lm = LANDMARKS[pl.asset]!;
          return (
            <g key={i}>
              <rect x={x - lm.r} y={z - lm.r} width={lm.r * 2} height={lm.r * 2} className={`map-bld ${pl.asset.includes("Temple_Main") ? "temple" : ""}`} />
              {lm.label && (
                <text x={x} y={z - lm.r - 3} className="map-label small">
                  {lm.label}
                </text>
              )}
            </g>
          );
        })}
        {INTERACTABLES.filter((it) => it.kind === "restoration").map((it) => {
          const r = game.session.defs.restorations.get(it.refId);
          if (!r) return null;
          const done = s.restorations[r.id] === r.restoredState;
          const [x, z] = toMap(it.pos[0], it.pos[2]);
          return (
            <g key={it.id} className={`map-rest ${done ? "done" : "todo"}`}>
              <circle cx={x} cy={z} r={4.5} />
              <text x={x} y={z + 2.5}>{done ? "✓" : "!"}</text>
            </g>
          );
        })}
        {REGIONS.map((r) => {
          const c = regionCenter(r.id)!;
          return (
            <text key={`l-${r.id}`} x={c[0]} y={c[1]} className="map-label">
              {LOCATIONS[r.id]}
            </text>
          );
        })}
        {[...game.npcs.npcs.values()]
          .filter((n) => n.present && !n.def.group)
          .map((n) => {
            const [x, z] = toMap(n.object.position.x, n.object.position.z);
            return (
              <g key={n.def.id} className="map-npc">
                <circle cx={x} cy={z} r={3.2} />
                <text x={x + 5} y={z + 3}>
                  {n.def.name}
                </text>
              </g>
            );
          })}
        {objPos && <circle cx={objPos[0]} cy={objPos[1]} r={9} className="map-objective" />}
        {focusPos && <circle cx={focusPos[0]} cy={focusPos[1]} r={13} className="map-focus" />}
        <g transform={`translate(${px} ${pz}) rotate(${(-game.player.yaw * 180) / Math.PI + 180})`} className="map-player">
          <path d="M0,-7 L5,5 L0,2 L-5,5 Z" />
        </g>
      </svg>
      <div className="map-legend muted small">
        <span className="lg player">▲ You</span> <span className="lg npc">● People</span> <span className="lg obj">◯ Current objective{obj ? `: ${obj.text}` : ""}</span>
        {focusEvent && <span className="lg focus">◯ {RECORD_TEXT[focusEvent.descriptionKey]?.title}</span>}
      </div>
    </Frame>
  );
}

// ------------------------------------------------------------------ community & skills
const bond = (v: number) => (v >= 60 ? "Close friend" : v >= 35 ? "Friend" : v >= 15 ? "Acquaintance" : "Stranger");

export function CommunityPanel() {
  const game = useGame();
  const s = useGameState();
  const hour = game.session.hourOfDay;
  return (
    <Frame title="Community" wide testId="community">
      <h4 className="section">Skills</h4>
      <div className="skills">
        {(Object.keys(SKILL_NAMES) as SkillId[]).map((k) => {
          const xp = s.skills[k];
          const lvl = skillLevel(xp);
          const next = 10 * (lvl + 1) ** 2;
          const prev = 10 * lvl ** 2;
          return (
            <div key={k} className="skill">
              <span>
                {SKILL_NAMES[k]} <strong>Lv {lvl}</strong>
              </span>
              <div className="meter">
                <div style={{ width: `${Math.min(100, ((xp - prev) / (next - prev)) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <h4 className="section">People</h4>
      <div className="people">
        {[...game.session.defs.npcs.values()]
          .filter((n) => !n.group && game.session.isNpcPresent(n.id))
          .map((n) => {
            const v = s.relationships[n.id] ?? 0;
            const e = scheduleAt(n, hour, game.session);
            const a = ANCHORS[e.anchorId]!;
            const region = REGIONS.find((r) => a.pos[0] >= r.min[0] && a.pos[0] <= r.max[0] && a.pos[2] >= r.min[1] && a.pos[2] <= r.max[1]);
            return (
              <article key={n.id} className="person" data-testid={`person-${n.id}`}>
                <h3>{n.name}</h3>
                <div className="muted small">{n.role}</div>
                <div className="meter warm">
                  <div style={{ width: `${Math.max(2, v)}%` }} />
                </div>
                <div className="small">
                  {bond(v)} · now {e.activity === "home" ? "at home" : `at ${region ? LOCATIONS[region.id] : "work"}`}
                </div>
              </article>
            );
          })}
      </div>
    </Frame>
  );
}
