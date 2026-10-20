# Moms at Temples — Game Design Document

Version 0.1 · Single-player mobile simulation

---

## 1. Concept

You play an Indian mom on a temple visit. Each run is one visit: leave home, enter the temple, survive the queue, get the darshan, and come home with prasadam, gossip, and your chappals. Score as many **Punya Points** as you can.

The humour comes from the very real tactics moms use. Moms are the heroes, never the joke.

**Platform:** Browser first (Phaser 3 + TypeScript + Vite). Top-down pixel world you walk around, Gather Town style, 320x240 internal resolution. Keyboard on desktop, on-screen d-pad on touch. Wraps to iOS and Android later with Capacitor.
**Session length:** 3 to 6 minutes per run.
**Loop:** short runs, unlocks between runs, daily missions to come back.

---

## 2. Core loop

1. Pick a mom (archetype) and a temple.
2. Walk the temple grounds. The six **stages** below are places on the map: things you walk up to and press A on, or tiles that trigger as you cross them. Some stages are in-world (the queue is a real corridor you shuffle through, pradakshina is actually walking around the sanctum); the rest open a dialog box with choices or a quick mini-game.
3. Actions earn or lose Punya Points and fill two meters: **Blessings** and **Stress**.
4. At the exit, the run ends. Blessings multiply the score; Stress caps it.
5. Spend earned **Kumkum** (soft currency) on unlocks. Return tomorrow for new missions.

---

## 3. Scoring system

### 3.1 Punya Points
The main score. Earned per action. Lost on penalties. Shown as a running total at the top.

### 3.2 Blessings meter (0 to 100)
Filled only by devotional actions: pradakshina, lamps, slokas, patience. At the end of the run the score is multiplied:

| Blessings | Multiplier |
|-----------|------------|
| 0 to 24   | 1.0x       |
| 25 to 49  | 1.25x      |
| 50 to 74  | 1.5x       |
| 75 to 99  | 2.0x       |
| 100       | 3.0x and the "Fully Blessed" badge |

Hustle actions never fill it. This is the tension: hustle gives points now, devotion pays at the end.

### 3.3 Stress meter (0 to 100)
Filled by queue cutting, crowd pushing, lost chappals, kids running off. At 100 the mom "loses it" and the run ends early with the score so far. Stress drains slowly during calm actions like pradakshina.

### 3.4 Combos
Three actions of the same category in a row (Devotion, Hustle, Social) trigger a 2x multiplier on the fourth action.

---

## 4. Stages and activities

Point values are starting numbers. Tune in playtesting.

### Stage 1: Getting ready (home)
Quick taps, builds the mood.

| Activity | Points | Category |
|----------|--------|----------|
| Wake up before 5 AM | 10 | Devotion |
| Pack the temple bag (flowers, coconut, kumkum, safety pins, spare chappals) | 15 | Devotion |
| Get the whole family dressed in matching pattu | 20 | Social |
| Remember today is Pournami / Sashti / Pradosham | 10 | Devotion |
| Forget the coconut | -10 | Penalty |

**Mini-game:** drag the right items into the temple bag before the auto starts honking.

### Stage 2: Arrival and chappals

| Activity | Points | Category |
|----------|--------|----------|
| Find parking within 100 m | 15 | Hustle |
| Leave chappals in the car to save 5 rupees | 10 | Hustle |
| Hide chappals in a secret bush | 25 | Hustle |
| Pay the chappal stand like a normal person | 5 | Devotion |
| Talk the guard into the side gate for the whole family | 30 | Social |

**Mini-game:** tap to pick a hiding spot. Remember it. You will be asked at the exit.

### Stage 3: The queue (the real battleground)

| Activity | Points | Category |
|----------|--------|----------|
| Pick the correct queue (free / 20 rupee / 100 rupee special) | 20 | Hustle |
| Chat with the aunty ahead and advance two spots | 15 | Social |
| Send a kid ahead to hold the place | 20 | Hustle |
| Spot a long-lost relative and merge families | 30 | Social |
| Someone cuts the line: stay calm | 10 | Devotion |
| Someone cuts the line: scold in full eye contact | 25 | Hustle, +Stress |
| Find a shortcut through the prasadam counter | 40 | Hustle |
| Child wanders off | -15 | Penalty, +Stress |

**Mini-game:** a lane-switching runner. Queues move at different speeds. Swipe to switch, tap to chat, hold to pray.

### Stage 4: Rituals

| Activity | Points | Category |
|----------|--------|----------|
| Break the coconut cleanly in one shot | 20 | Devotion |
| Coconut rolls under the railing | -10 | Penalty |
| Light the right number of lamps for the right number of wishes | 15 | Devotion |
| Pradakshina, per round | 5 | Devotion |
| Pradakshina combo at 9 rounds | +30 | Devotion |
| Pradakshina combo at 108 rounds (festival mode only) | +500 | Devotion |
| Chant the correct sloka for this deity | 20 | Devotion |
| Apply vibhuti to the whole family in under 10 seconds | 15 | Social |
| Archana with correct nakshatra and gotra, no pausing | 25 | Devotion |

**Mini-games:**
- Coconut: timing bar. Hit the green zone.
- Lamps: tap-to-light with a limited matchstick count.
- Sloka: pick the right one from four options under a timer.

### Stage 5: The darshan

| Activity | Points | Category |
|----------|--------|----------|
| Full 5-second view of the deity before the crowd pushes | 50 | Devotion |
| Pushed before the darshan | -15 | Penalty, +Stress |
| Ask the priest for extra prasadam and get it | 20 | Social |
| Receive the special tulsi or flower from the priest | 30 | Devotion |
| Pray for every family member, including the one abroad | 25 | Devotion |

**Mini-game:** hold to keep eye contact. The crowd nudges the view. Release too early and lose points.

### Stage 6: Exit and social

| Activity | Points | Category |
|----------|--------|----------|
| Find the chappals where you left them | 10 | Hustle |
| Chappals missing | -30 | Penalty, +Stress |
| Chappals missing but found a better pair | +15 | Hustle (morally grey, fun) |
| Buy prasadam for every neighbour who could not come | 20 | Social |
| Family photo in front of the gopuram, nobody blinking | 25 | Social |
| Full gossip exchange with one acquaintance | 30 | Social |
| Kids finish the annadanam meal | 20 | Social |

**Mini-game:** memory test for the chappal spot, then a photo timing tap.

---

## 5. Mom archetypes

Each unlockable mom has a passive bonus. Starts with Devotional Mom.

| Mom | Passive |
|-----|---------|
| Devotional Mom | Devotion actions +25% points |
| Hustle Mom | Hustle actions +25%, Stress fills 20% faster |
| Social Mom | Social actions +25%, one free queue merge per run |
| Instagram Mom | Photo and gopuram actions +50%, Blessings fills slower |
| Paati (Grandma) | Stress fills 50% slower, moves one lane slower in the queue |

---

## 6. Temples

Each temple changes the stage mix and crowd level. Start with three.

| Temple type | Crowd | Special rule |
|-------------|-------|--------------|
| Neighbourhood temple | Low | Short queue, no special darshan line |
| Big city temple | High | Three queue tiers, chappal theft risk high |
| Hill temple | Medium | Extra stage: climbing steps, Stress rises, Blessings rises |

**Festival mode:** any temple on a festival day. All points doubled, all penalties doubled, 108-round pradakshina unlocked.

---

## 7. Progression and retention

- **Kumkum** soft currency, earned per run from the final score.
- Unlock moms, temples, and cosmetic sarees with Kumkum.
- **Daily missions:** "Score 500 without hustle actions", "Visit the hill temple", "Find your chappals three runs in a row".
- **Badges:** Fully Blessed, Queue Ninja, Chappal Keeper, Gossip Queen, Coconut Sniper.
- **Personal best** per temple shown on the home screen.

No multiplayer in v1. Keep the architecture open for a friends leaderboard later.

---

## 8. Tone and art

- Bright, warm, hand-drawn look. Think festive kolam borders and gopuram silhouettes.
- Text in English with Tamil and Hindi flavour words. Localise later.
- Sound: temple bells, nadaswaram sting on big scores, a cheeky "aiyyo" on penalties.
- Humour is affectionate. Nothing mocks worship itself. The comedy is in logistics, crowds, and social hustle.

---

## 9. MVP scope (v1)

Build this first, nothing more:

1. One mom (Devotional Mom).
2. One temple (big city temple).
3. All six stages, each with one mini-game.
4. Punya Points, Blessings meter, Stress meter, combos.
5. End-of-run score screen with personal best.
6. Local save only.

Defer: other moms, other temples, festival mode, daily missions, badges, Kumkum store.

---

## 10. Implementation status

Built in the existing **Three.js 3D game** (not Phaser 2D; see `PLAN.md` §0 for the reasons) as the **Temple Visit** mode on the title screen. Code: `src/game/visit/` (rules, director, world, followers), content in `src/data/visit.ts`, UI in `src/ui/components/Visit.tsx`, tests in `src/game/visit/rules.test.ts` and `tests/e2e/visit.spec.ts`.

- §2 core loop: pick a mom and a temple → six stages as places in the world → exit → score → Kumkum. **Done.**
- §3 Punya, the Blessings multiplier table, Stress (ends the run at 100), combos. **Done.** "Stress caps it" is implemented as a cap of (1 - stress/200) on the final score (interpretation).
- §4 all activities in all six stages, each stage with its mini-game (bag packing, chappal hiding and memory test, the lane-switching queue runner in-world, coconut timing bar, lamps with matchsticks, sloka quiz, darshan hold, photo timing). **Done.** The driving to the temple uses a drivable auto-rickshaw.
- §5 all five moms with their passives; §6 all three temples, including the hill steps stage and festival mode. **Done** (beyond the v1 MVP).
- §7 Kumkum, unlocks (moms, temples, sarees), daily missions, badges, personal best per temple. **Done.**
- §8 sounds: bell, nadaswaram sting and "aiyyo" are **procedural placeholders** until recordings exist. Hand-drawn 2D art is replaced by the 3D art of this game.
- §9 local save (IndexedDB). **Done.** Touch controls: an on-screen stick and buttons on touch devices. The game installs as a web app (manifest, icons, offline service worker; session 5). Capacitor wrapping: not started (it needs the Android and iOS toolchains).

## 11. Open questions

- Engine: decided. Phaser 3 in the browser, wrapped with Capacitor for mobile later.
- Run length target: is 5 minutes right, or should runs be 90 seconds for a hyper-casual feel?
- Should the Stress meter end the run, or just lock out hustle actions? Ending the run is harsher but funnier.
- Monetisation, if any: cosmetics only is the safest fit for the tone.
