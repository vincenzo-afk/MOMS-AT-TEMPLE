import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGame, useGameState, useUi } from "../hooks";
import { LOCATIONS, RECORD_TEXT } from "../../data/text";
import { countItem } from "../../game/inventory/inventory";
import { ItemIcon } from "./ItemIcon";
import { CommunityPanel, ContainerPanel, DecorPanel, MapPanel, NoticesPanel, StoragePanel } from "./WorldPanels";
import { MiniGamePanel, VisitScore } from "./Visit";
import { SKILL_NAMES, skillLevel } from "../../data/farming";
import type { SkillId } from "../../game/core/types";

export function Panels() {
  const ui = useUi();
  switch (ui.panel) {
    case "dialogue":
      return <DialoguePanel />;
    case "inventory":
      return <InventoryPanel />;
    case "journal":
      return <JournalPanel />;
    case "record":
      return <RecordPanel />;
    case "craft":
      return <CraftPanel />;
    case "shop":
      return <ShopPanel />;
    case "reading":
      return <ReadingPanel />;
    case "inspect":
      return <InspectPanel />;
    case "storage":
      return <StoragePanel />;
    case "decor":
      return <DecorPanel />;
    case "notices":
      return <NoticesPanel />;
    case "map":
      return <MapPanel />;
    case "community":
      return <CommunityPanel />;
    case "minigame":
      return <MiniGamePanel />;
    case "visitScore":
      return <VisitScore />;
    case "container":
      return <ContainerPanel />;
    default:
      return null;
  }
}

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

// ------------------------------------------------------------------ dialogue
function DialoguePanel() {
  const game = useGame();
  useGameState(); // re-render on state changes
  const conv = game.session.conversation;
  if (!conv) return null;
  // a fresh body per shown node: line and reveal state start over without resetting state in effects
  return <DialogueBody key={conv.seq} />;
}

function DialogueBody() {
  const game = useGame();
  useGameState();
  const conv = game.session.conversation;
  const [line, setLine] = useState(0);
  // characters revealed so far, tagged with the line they belong to (a new line starts from zero)
  const [reveal, setReveal] = useState({ line: 0, n: 0 });
  const firstOption = useRef<HTMLButtonElement>(null);
  const lines = conv?.node.lines ?? [];
  const text = lines[line] ?? "";
  const shown = game.settings.typewriter === false ? Infinity : reveal.line === line ? reveal.n : 0;
  const typing = shown < text.length;
  useEffect(() => {
    if (!typing) return;
    const t = window.setInterval(() => setReveal((r) => ({ line, n: (r.line === line ? r.n : 0) + 2 })), 22);
    return () => window.clearInterval(t);
  }, [typing, line]);
  const onLast = line >= lines.length - 1;
  const hasOptions = (conv?.node.options.length ?? 0) > 0;
  const topics = conv && onLast && !hasOptions && !typing ? game.session.topicsFor(conv.npcId) : [];

  const advance = (opt?: number) => {
    if (!conv) return;
    if (typing) {
      setReveal({ line, n: Infinity }); // first press finishes the line
      return;
    }
    if (!onLast) {
      setLine((l) => l + 1);
      return;
    }
    const next = game.session.choose(opt ?? 0);
    // An option may have opened another panel (e.g. a shop); only close if we're still in dialogue.
    if (!next && game.ui.get().panel === "dialogue") game.closePanel();
  };
  const ask = (topicId: string) => {
    if (!conv) return;
    game.session.askTopic(conv.npcId, topicId);
  };

  useEffect(() => {
    if (onLast && !typing) firstOption.current?.focus();
  }, [onLast, typing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!conv) return;
      const n = Number(e.key);
      if (onLast && !typing && hasOptions && n >= 1 && n <= conv.node.options.length) {
        e.preventDefault();
        advance(n - 1);
      } else if ((e.code === "Space" || e.code === "Enter" || e.code === "KeyE") && (typing || !onLast || !hasOptions)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!conv) return null;
  const npc = game.session.defs.npcs.get(conv.npcId);
  return (
    <div className="dialogue" role="dialog" aria-label={`Conversation with ${npc?.name}`} data-testid="dialogue">
      <div className="dialogue-speaker">
        {npc?.name} <span className="role">{npc?.role}</span>
      </div>
      <p className="dialogue-text" data-testid="dialogue-text" aria-label={text}>
        {text.slice(0, shown)}
        {typing && <span className="caret">▍</span>}
      </p>
      <div className="dialogue-options">
        {typing || !onLast ? (
          <button ref={firstOption} className="option continue" onClick={() => advance()}>
            Continue <kbd>Space</kbd>
          </button>
        ) : hasOptions ? (
          conv.node.options.map((o, i) => (
            <button key={i} ref={i === 0 ? firstOption : undefined} className="option" onClick={() => advance(i)} data-testid={`option-${i}`}>
              <kbd>{i + 1}</kbd> {o.label}
            </button>
          ))
        ) : (
          <>
            {topics.length > 0 && (
              <div className="topics" data-testid="topics">
                <span className="muted small">Ask about:</span>
                {topics.map((t) => (
                  <button key={t.id} className="topic" onClick={() => ask(t.id)} data-testid={`topic-${t.id}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <button ref={firstOption} className="option continue" onClick={() => advance()} data-testid="goodbye">
              Goodbye <kbd>Space</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ inventory
function InventoryPanel() {
  const game = useGame();
  const s = useGameState();
  const [sel, setSel] = useState<number | null>(null);
  const stack = sel !== null ? s.inventory[sel] : null;
  const def = stack ? game.session.defs.items.get(stack.itemId) : null;
  return (
    <Frame title="Inventory" testId="inventory">
      <div className="inv-grid">
        {s.inventory.map((slot, i) => {
          const d = slot ? game.session.defs.items.get(slot.itemId) : null;
          return (
            <button key={i} className={`slot ${sel === i ? "selected" : ""} ${slot ? "" : "empty"}`} onClick={() => setSel(i)} aria-label={d ? `${d.name} x${slot!.quantity}` : "Empty slot"} data-testid={slot ? `slot-${slot.itemId}` : undefined}>
              {d && (
                <>
                  <ItemIcon def={d} />
                  <span className="qty">{slot!.quantity}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="inv-detail">
        {def ? (
          <>
            <h3>
              <ItemIcon def={def} small /> {def.name}
            </h3>
            <div className="meta">
              {def.category} · stack {stack!.quantity}/{def.maxStack}
              {def.questProtected ? " · keep for a task" : ""}
            </div>
            <p>{def.description}</p>
            {def.use && (
              <button className="primary" data-testid="use-item" onClick={() => game.session.applyItem(sel!)}>
                {def.use.label}
              </button>
            )}
          </>
        ) : (
          <p className="muted">Select an item to see its details. {s.inventory.filter(Boolean).length}/{s.inventory.length} slots used.</p>
        )}
      </div>
    </Frame>
  );
}

// ------------------------------------------------------------------ journal
function JournalPanel() {
  const game = useGame();
  const s = useGameState();
  const entries = Object.entries(s.quests);
  const active = entries.filter(([, q]) => q.status === "active");
  const done = entries.filter(([, q]) => q.status === "completed");
  return (
    <Frame title="Journal" wide testId="journal">
      {entries.length === 0 && <p className="muted">No tasks yet. Talk to the people of the settlement.</p>}
      {active.map(([id, q]) => {
        const d = game.session.questDef(id);
        return (
          <article key={id} className="quest">
            <h3>{d.title}</h3>
            <p className="muted">{d.description}</p>
            <ol className="objectives">
              {d.objectives.map((o, i) => (
                <li key={o.id} className={i < q.objectiveIndex ? "done" : i === q.objectiveIndex ? "current" : "future"}>
                  {i <= q.objectiveIndex ? o.text : "…"}
                  {i === q.objectiveIndex && <span className="where"> — {LOCATIONS[o.locationId]}</span>}
                </li>
              ))}
            </ol>
            <div className="rewards">Rewards: {d.rewards.map((r) => (r.type === "coins" ? `${r.amount} coins` : r.type === "relationship" ? `${game.session.defs.npcs.get(r.npcId)?.name}'s trust` : "a change in the settlement")).join(", ")}</div>
          </article>
        );
      })}
      {s.talkLog.length > 0 && (
        <details className="talklog" data-testid="talklog">
          <summary className="section">Recent conversations</summary>
          <ol>
            {[...s.talkLog].reverse().slice(0, 30).map((t, i) => (
              <li key={i}>
                <span className="muted small">Day {t.day} · {game.session.defs.npcs.get(t.npcId)?.name}:</span> {t.text}
              </li>
            ))}
          </ol>
        </details>
      )}
      <h4 className="section">Skills</h4>
      <p className="muted small">
        {(Object.keys(SKILL_NAMES) as SkillId[]).map((k) => `${SKILL_NAMES[k]} ${skillLevel(s.skills[k])}`).join(" · ")}
      </p>
      {done.length > 0 && <h4 className="section">Completed</h4>}
      {done.map(([id, q]) => (
        <article key={id} className="quest done">
          <h3>✓ {game.session.questDef(id).title}</h3>
          <span className="muted">Day {q.completedDay}</span>
        </article>
      ))}
    </Frame>
  );
}

// ------------------------------------------------------------------ Living Record
function RecordPanel() {
  const game = useGame();
  const s = useGameState();
  const byId = new Map(s.record.map((e) => [e.id, e]));
  return (
    <Frame title="The Living Record" wide testId="record">
      {s.record.length === 0 ? (
        <p className="muted">The settlement has not yet recorded anything you have done. Significant contributions will be remembered here.</p>
      ) : (
        <ol className="timeline">
          {s.record.map((e) => {
            const t = RECORD_TEXT[e.descriptionKey] ?? { title: e.descriptionKey, body: "" };
            const effects = s.record.filter((x) => x.causeEventIds.includes(e.id));
            return (
              <li key={e.id} className={`event type-${e.type}`} data-testid={`record-${e.id}`}>
                <div className="when">
                  Day {e.worldDay} · {String(Math.floor(e.worldMinute / 60)).padStart(2, "0")}:{String(e.worldMinute % 60).padStart(2, "0")}
                </div>
                <h3>{t.title}</h3>
                <div className="meta">
                  {e.type} · {LOCATIONS[e.locationId] ?? e.locationId}
                  {e.previousState && e.resultingState ? ` · ${e.previousState} → ${e.resultingState}` : ""}
                </div>
                <p>{t.body}</p>
                {e.causeEventIds.length > 0 && (
                  <div className="links">Because: {e.causeEventIds.map((c) => RECORD_TEXT[byId.get(c)?.descriptionKey ?? ""]?.title ?? c).join("; ")}</div>
                )}
                {effects.length > 0 && <div className="links">Led to: {effects.map((x) => RECORD_TEXT[x.descriptionKey]?.title ?? x.id).join("; ")}</div>}
                <button className="link-btn" onClick={() => game.showOnMap(e.id)}>
                  Show on map
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Frame>
  );
}

// ------------------------------------------------------------------ crafting
function CraftPanel() {
  const game = useGame();
  const ui = useUi();
  const s = useGameState();
  const recipes = game.session.recipesForStation(ui.stationId ?? "");
  return (
    <Frame title={ui.stationId === "st_festival_station" ? "Festival table" : ui.stationId === "st_casting" ? "Casting furnace" : "Workbench"} testId="craft">
      {recipes.map((r) => {
        const known = game.session.isRecipeKnown(r.id);
        const check = game.session.canCraft(r.id);
        return (
          <div key={r.id} className={`recipe ${known ? "" : "unknown"}`}>
            <div>
              <h3>{known ? r.name : "Unknown technique"}</h3>
              {known ? (
                <ul className="inputs">
                  {r.inputs.map((i) => {
                    const have = countItem(s.inventory, i.itemId);
                    return (
                      <li key={i.itemId} className={have >= i.quantity ? "ok" : "short"}>
                        <ItemIcon def={game.session.defs.items.get(i.itemId)} small /> {game.session.defs.items.get(i.itemId)?.name} {have}/{i.quantity}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">Someone in the settlement could teach you this.</p>
              )}
            </div>
            {known && (
              <button
                className="primary"
                disabled={!check.ok}
                title={check.ok ? "" : check.reason}
                data-testid={`craft-${r.id}`}
                onClick={() => {
                  const res = game.session.craft(r.id);
                  if (res.ok) {
                    game.closePanel();
                    game.playCraft(r.craftSeconds, `Making ${r.name.toLowerCase()}...`);
                  }
                }}
              >
                Make
              </button>
            )}
          </div>
        );
      })}
    </Frame>
  );
}

// ------------------------------------------------------------------ trading
function ShopPanel() {
  const game = useGame();
  const ui = useUi();
  const s = useGameState();
  const shop = ui.shopId ? game.session.defs.shops.get(ui.shopId) : undefined;
  const [msg, setMsg] = useState<string | null>(null);
  if (!shop) return null;
  const name = game.session.defs.npcs.get(shop.npcId)?.name;
  return (
    <Frame title={`${name}'s stall`} testId="shop">
      <div className="coins-line">You have {s.coins} coins</div>
      <h4 className="section">For sale</h4>
      {game.session.shopStock(shop.id).map((o) => (
        <div key={o.itemId} className="trade-row">
          <span>
            <ItemIcon def={game.session.defs.items.get(o.itemId)} small /> {game.session.defs.items.get(o.itemId)?.name}
            {o.special && <span className="small special"> · today</span>}
          </span>
          <span className="price">{o.price} ◎</span>
          <button
            className="primary"
            data-testid={`buy-${o.itemId}`}
            onClick={() => {
              const r = game.session.buy(shop.id, o.itemId);
              setMsg(r.ok ? `Bought ${game.session.defs.items.get(o.itemId)?.name}.` : r.reason);
            }}
          >
            Buy
          </button>
        </div>
      ))}
      <h4 className="section">{name} buys</h4>
      {shop.buys.map((o) => (
        <div key={o.itemId} className="trade-row">
          <span>
            <ItemIcon def={game.session.defs.items.get(o.itemId)} small /> {game.session.defs.items.get(o.itemId)?.name} <span className="muted">(you have {countItem(s.inventory, o.itemId)})</span>
          </span>
          <span className="price">{o.price} ◎</span>
          <button
            onClick={() => {
              const r = game.session.sell(shop.id, o.itemId);
              setMsg(r.ok ? "Sold." : r.reason);
            }}
          >
            Sell
          </button>
        </div>
      ))}
      {msg && <p className="muted">{msg}</p>}
    </Frame>
  );
}

// ------------------------------------------------------------------ reading / inspecting
function ReadingPanel() {
  const game = useGame();
  const ui = useUi();
  const d = ui.readingId ? game.session.defs.discoveries.get(ui.readingId) : undefined;
  if (!d) return null;
  return (
    <Frame title={d.title} testId="reading">
      {d.reading.map((p, i) => (
        <p key={i} className={i === 0 ? "muted" : "inscription"}>
          {p}
        </p>
      ))}
      <p className="muted small">Recorded in the Living Record.</p>
    </Frame>
  );
}

function InspectPanel() {
  const ui = useUi();
  return (
    <Frame title="You look closely" testId="inspect">
      {ui.inspectText.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </Frame>
  );
}
