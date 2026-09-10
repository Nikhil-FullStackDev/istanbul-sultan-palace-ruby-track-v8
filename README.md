# Istanbul — full rulebook audit (v8)

Base-game Istanbul (Rüdiger Dorn / Pegasus / AEG). Digital tabletop: the engine
runs money, rubies, cart capacity, decks, dice and turn flow; grey markers
(wheelbarrow goods, Post Office mail indicators, Palace requirement Rubies) sit on
the board art.

Every one of the 16 Place actions was checked against the Alderac rulebook (and,
where the rulebook only gives an example, against the tile art) and corrected.

`index.html` loads `board.js` / `board.css` with a `?v=` query so a plain reload
picks up changes — do one hard refresh (`Ctrl`/`Cmd`+`Shift`+`R`) the first time.

## Good colours

This build's colour convention (from the wheelbarrow rows, the Mosque tiles and
the Demand tiles — pixel-checked): **blue = Ring, red = Fabric, green = Spice,
yellow = Fruit.** The data had green/yellow (spice/fruit) swapped in the Demand
tiles *and* the Mosque abilities — both fixed.

## Tile fixes

| Place | Fix |
|---|---|
| **Sultan's Palace** | L of 10 good boxes + Ruby space. 4 Rubies cover boxes 8, 9, 10 and the Ruby space; taken leftmost-first, exposing Spice → Fruit → Any. Initial cost = boxes 1–7 = **2 Ring, 2 Fabric, 1 Spice, 1 Fruit, 1 good of any type** (the rulebook example exactly). The "any" good now **prompts you to pick** which good to hand over. |
| **Gemstone Dealer** | 12 numbered Ruby spaces (12–23); pay the biggest uncovered number, prices rise 12 → 23. Atomic purchase with rollback; can't-afford keeps the turn. |
| **Post Office** | Pays out the 4 uncovered rewards. Grid re-read off the tile art (zoomed): **I = Fabric / Spice, II = 2 Lira / 1 Lira, III = Ring / Fruit, IV = 2 Lira / 1 Lira** (columns I & III bottom goods were previously swapped). Advance = leftmost top-row indicator down; when all four are down, all reset to top. |
| **Small / Large Market** | Large Market now uses its own **5 dark Demand tiles** (Ring-heavy). All 10 tile compositions re-read from the art. You may only sell the goods depicted, up to the depicted count — and the sell form now matches the tile you see. |
| **Small / Great Mosque** | Small Mosque holds the **Fabric + Spice** colour stacks, Great holds **Ring + Fruit** (deck layout + tile art); each stack is 2/3/4/5. Player-count trim fixed (**2 players remove the 3- and 5-tiles**; 3 players remove the 5s). Ruby = own one tile of **each** of a Mosque's two colours, any counts. The next top card now updates correctly after a purchase. |
| **Mosque abilities** | Spice tile → Warehouse "+1 good for 2 Lira"; Fruit tile → "recall an Assistant for 2 Lira" (these were swapped). The recall is now offered **any time on your turn**, not only at the Great Mosque. |
| **Police Station / Family** | Family members are **drawn on the board** (they start on the Police Station). The action is only available when your Family member is actually there. Doing it puts you in **tile-pick mode** — every Place except the Police Station highlights; **click one** to send the Family Member there and carry out that Place's action (no encounters, the merchant does not move). Every target action type works (dice, market sell, mosque tile, Caravansary, Fountain, purchases…). |
| **Tea House / Black Market** | The **Red (Fabric) Mosque tile** die modification (turn a die to "4" or re-roll both, 1×) works at **both** Places, is triggered by owning the tile, and is reusable every visit. |
| **Movement** | Landing on your own Assistant now **rejoins it to your stack** — no longer immediately re-dropped. Moving to a Place with no Assistant to leave (and none waiting) ends the turn with no action. |
| **Wainwright** | Ruby for the 3rd wheelbarrow extension is **per-player**. |
| **Player count / setup** | Start a 2 / 3 / 4-player game from the buttons in the game panel. Each new game **shuffles the 16 Place tiles** and shows a **board code**; paste a friend's code + Join to get the identical board. |

## Dice modification (Tea House / Black Market) — Red (Fabric) Mosque tile

Straight from the rulebook Red-tile text: *"At the Tea House and the Black Market,
you may turn 1 die to '4' after the roll **or** re-roll both dice (1×)."*

- The panel appears **only if you own a Fabric Mosque tile** (`hasAbility(p,'red')`).
  With no Fabric tile the roll resolves immediately.
- Panel: **Use Fabric Mosque tile** → then **Re-roll both dice** / **Turn the lower
  die to 4** (or **Back**) — or **Keep this roll**.
- One modification per roll (you can't re-roll *and* turn a die). The tile is a
  **permanent, reusable** ability — nothing is spent, and it works every visit to
  either Place. Generic Bonus cards no longer touch the dice.

## Bonus cards

The deck is the real **26 cards / 10 types** (matches rulebook p.5 exactly;
`makeBonusDeck` builds one unique instance per copy, and the deck + discard pile +
every player's hand always partition to exactly these 26 — verified over ~750
random turns):

| Card | Copies |
|---|---|
| Gain 1 good of your choice | 4 |
| Take 5 Lira | 4 |
| Move your Merchant 3 or 4 Places this turn | 4 |
| Return 1 Assistant to your Merchant stack | 2 |
| Send your Family member to the Police Station (take the reward) | 2 |
| Do not move — use an Assistant at your current Place again | 2 |
| Sultan's Palace: carry out the action twice | 2 |
| Post Office: carry out the action twice | 2 |
| Gemstone Dealer: carry out the action twice | 2 |
| Small Market: sell any goods for the demanded count | 2 |

Every Bonus-card type now has its **own face art**
(`assets/cards-review/cards/caravansary-bonus-cards/icon-bonus-card-01…10.png`,
mapped by `BONUS_IMAGE` / `bonusImage()`), so cards read at a glance with no
caption. It shows in the Hand, the discard piles, and the Caravansary picker.

Each player board has **one "Hand"** holding every card the player owns — Bonus
cards and Mosque tiles together (Mosque tiles are badged **M**). Playable Bonus
cards are highlighted there and listed in the turn panel; click to play. Context
is enforced (place cards only at that place, move cards only in the movement
phase, etc.).

**Caravansary**: the **top 2 cards of the deck are revealed face-up**, and the
**entire face-up discard pile** is shown. You **take 1 card** into your hand — a
revealed deck card *or* **any** card from the discard pile. Revealed deck cards
you don't keep go onto the discard pile; if you take a discard card, the revealed
deck cards go back on the deck. Net +1 card, everything visible.
(Rulebook is "top of the discard pile only" — this build lets you pick any card
in the pile since it's all face-up anyway; the deck part is still just the top 2.)

**Choosing a good** is always done by **clicking a good icon**, never by typing —
at the Black Market (Fabric / Spice / Fruit), for the "Gain 1 good of your choice"
Bonus card (any of the four), and for the Spice Mosque tile's "+1 good for 2 Lira"
at a Warehouse. The icons are the wheelbarrow good markers.

## Confirmed correct against the rulebook

Fountain ("return any number of Assistants", no encounter, no Assistant needed),
Black Market blue-goods table (7–8 → 1, 9–10 → 2, 11–12 → 3), Tea House payout,
the three Warehouses, the four Mosque-tile
abilities (Fabric = dice, Ring = 5th Assistant, Spice = Warehouse +1 good,
Fruit = recall), the 2-Lira-per-merchant encounter fee, catching Family
members (→ Police Station, 3 Lira or 1 Bonus card), Market payout table
(1→2, 2→5, 3→9, 4→14, 5→20), and the win target (5 Rubies; 6 for two players).

## Also fixed

- **`New game` was leaking turn state** — if you started a new game while a
  Caravansary "discard one" choice was open, `caravanChoice` stayed set and
  *every* subsequent action silently did nothing. `newGame` and `nextTurn` now
  clear `caravanChoice` / `caravanPendingCards` / `marketQuantities` / `teaTarget`.
- **The Red (Fabric) Mosque tile did nothing** (build …i briefly routed dice
  modification through discarding a generic Bonus card, which is not a rulebook
  mechanic). Restored to the rulebook: owning the Fabric tile shows the dice panel
  at the Tea House **and** Black Market, reusable, tile not consumed.
- **Player board card hands merged** — the separate "Hand — Bonus" and
  "Hand — Mosque" strips are now a single **"Hand"** holding both card kinds.
- **Caravansary picker / Bonus-card art** — the 10 Bonus-card types now each have
  their own face image (previously every card shared one placeholder, so two
  different draws looked identical). The 26-card deck was audited — complete, no
  duplicates, no missing types.
- **Black Market log dropped the chosen good** — you pick 1 non-Ring good
  (Fabric / Spice / Fruit), then the roll adds Rings (7–8 → 1, 9–10 → 2,
  11–12 → 3). The chosen good *was* granted but only the Rings were logged, so it
  looked ignored. Now `blackMarketPayout` logs both, and reports the **actual**
  amounts — each good has its own wheelbarrow track capped at `cartCapacity`, so a
  full track takes fewer and the log says so.
- **Good choices are icon pickers, not text prompts** — the Black Market select
  and the `window.prompt` in the "Gain 1 good" Bonus card / Spice Mosque tile are
  replaced by clickable good-icon buttons (`chooseGood()` / `#good-choice-ui`).
- **Caravansary — reveal top 2, keep 1** — the deck's top 2 are shown face-up
  (plus the discard-pile top); you keep 1 and the rest are discarded
  (`caravanReveal()` / `caravanKeep()`). Covers the rulebook's "take from the
  discard pile" option and removes the blind draw.
- **Police Station action was a dead end** — the old flow set `familyActionTarget`
  from a dropdown but then hid the "Do action" button, so you could never resolve
  it. Rebuilt: click "Do action" → **tile-pick mode** (all Places but the Police
  Station highlight) → click a tile → the merchant is temporarily run as if it
  stood on the target (`p._realPos` remembers the real spot, restored on finish),
  so every target action type resolves through its normal UI.

## Audit pass (build …r)

- **Post Office columns I & III bottom rewards were swapped** — fixed to the tile
  art (Spice / Fruit, not Fruit / Spice).
- **"Move 3 or 4 Places" Bonus card** let you still move 1–2 — now restricted to
  exactly distance **3–4** (`reachableWithinTwo` uses `minDist` when the card is up).
- **Browser pop-ups → in-page modal** (`modalChoice()`): the Family-card reward
  (3 Lira / Bonus card, with icons), the recall-Assistant Place choice, the
  Sultan's Palace "pay 1 good of any type" (good icons), and the hand-card discard
  confirm. No more `window.confirm` / `window.prompt` anywhere.

## Audit pass 2 (build …s)

- **Family-member encounters now happen in phase 4** — after your action, on the
  tile you moved to (`pendingFamilyCatch` → resolved in `finishAction`). Was
  firing during the move, before the action.
- **Merchant encounter fee** — you now get a **modal**: *Pay X Lira* or
  *Decline — end turn* (rulebook: "if you cannot **or do not want to** pay").
  Declining still commits the move + the Assistant you left, then ends the turn.
- **Assistant is left the moment you move** (was deferred to after the action, and
  was silently skipped if you ended the turn without acting).
- **Every wheelbarrow now matches player 1's** — `mirrorPlayerBoardLayout()` copies
  player 0's editable grid + slot-locks onto every other player at game start, so
  2/3/4-player boards look identical. Each player keeps their own Ruby slots.
- **Caravansary** — you can now take **any** card from the face-up discard pile,
  not just the top (see above).
- **4-player** verified end-to-end: Mosque stacks stay full `[2,3,4,5]`, all four
  players can buy Rubies, win trigger + final round work, boards render identically.

Known minor deviations still left as-is (no scoring impact): you may not decline
to *leave* an Assistant (only the fee); the Black Market good is chosen before the
roll; the Yellow Mosque recall is offered any phase; the Sultan's Palace
player-count ruby markers (👤2/3 vs 👤4/5) are not modelled (fixed "cost = boxes
1–7", matching the rulebook's worked example); final-tiebreak adds goods + card
count after Lira; `resolveCore` keeps a now-dead `police` branch stub.

## Audit pass 3 (build …t)

- **Player-count control** — the game panel now has **New game with · 2 / 3 / 4
  players** buttons; the current count is highlighted. The game boots at 2 players.
  Picking a count starts a fresh game and renders **that many wheelbarrows**, all
  mirrored from player 1's layout.

## Random boards + shareable code (build …u)

- **The 16 Place tiles are shuffled** on every new game (seeded `mulberry32` RNG),
  keeping the setup constraints (Fountain in a centre cell; Tea House & Black
  Market ≥3 apart, different row *and* column). Tile art, attached card decks, and
  the Palace / Gemstone / Post Office overlays all follow their Place by name.
- **Board code** — a short base-36 token packs `{seed, playerCount}`. It's shown
  in the setup row with a **Copy** button.
- **Join** — paste a code + click **Join** (or press Enter) to rebuild the
  **identical** board and player count (`makeGameCode` / `parseGameCode`). Play
  stays local — everyone sets up the same board, then takes turns on their device.
- Verified: two "4 players" clicks give different layouts; joining a saved code
  reproduces its layout + seed exactly; invalid codes are rejected; 390 random
  turns across freshly-shuffled 2/3/4-player boards with 0 errors, deck 26/26.

## Test status

All 16 tile actions, every Mosque ability, all 10 Bonus-card types and the
Red-tile dice flow were driven through in 2/3/4-player games (≈600 turns of
random play + targeted per-tile tests, including a full game to a win) with no
console errors and no broken assets. The Red-tile flow was also verified through
the real UI (Chrome): no tile → roll auto-resolves; with tile → *Use Fabric
Mosque tile* → *Re-roll* / *Turn the lower die to 4*, reusable across turns, at
both the Tea House and the Black Market.

Current build: **`20260909u`** — the stamp under the page title must read that.
Hard-refresh (`Ctrl`/`Cmd`+`Shift`+`R`) once after updating so the browser drops
the cached `index.html`.

## Still not implemented (additive content, does not affect any tile)

- **Governor & Smuggler** roaming tokens (encounter phase: draw a Bonus card /
  gain any good, then re-roll their positions).
- The 2-player neutral-merchant / neutral-assistant variants.
- Per-player Post Office mail indicators (the base game's 4 indicators are shared —
  this build matches that).
