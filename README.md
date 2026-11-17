# Porto Verde — Open-World Crime Game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/azkia13/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/azkia13/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the make.fun **gta6-01** bounty — built from scratch in plain Canvas/JavaScript, no libraries, no network requests, no borrowed assets.

You are **Rico Vega**, a driver-for-hire pulled back into the fixer game in the sunny coastal city of **Porto Verde**. Run five story missions for Mama Luz, steal cars, outrun the Porto Verde police, take taxi fares and package drops on the side — and become King of Porto Verde.

## What's in the game

- **Open city** — road grid, building blocks, parks, plaza, hospital, beach and pier districts, day lighting
- **On foot + driving** — walk/run, steal parked and traffic cars (E), drive with real physics
- **Traffic & pedestrians** — cars follow the roads, pedestrians wander and flee from danger
- **Wanted level (1–5 stars)** — rises on theft, hitting pedestrians and fights; police cars chase, ram and arrest; heat decays when you hide
- **Story missions (5)** — package runs, car theft, a market shakedown, a police getaway, and a final showdown with the fixer — with dialogue, markers, rewards
- **Side jobs** — taxi fares and package drops that pay cash
- **Combat** — mouse-aimed shooting, punching, enemy thugs who shoot back
- **HUD** — health, money, score, wanted stars, mission objective, clock, speed, and a live minimap
- **Win / lose** — finish the final mission to become King of Porto Verde; get busted or wasted and restart from your save
- **Sound** — fully synthesised WebAudio (engine hum, sirens, gunshots, pickup blips); M to mute, P to pause
- **Save** — progress autosaves to localStorage; press C on the menu to continue

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| E | Steal / enter car, exit car |
| Mouse + click | Aim and shoot |
| Space | Punch |
| Enter | Start mission / confirm |
| P / Esc | Pause |
| M | Mute |
| C (on menu) | Continue from save |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Node 22+ and a desktop browser. No build step, no dependencies.

## Structure

- `game/src/config.js` — tuning, palette, seeded RNG
- `game/src/world.js` — city generation and collisions
- `game/src/player.js` — Rico on foot, car entry, wanted heat
- `game/src/vehicles.js` — traffic AI, police pursuit, driving physics
- `game/src/pedestrians.js` — pedestrian AI
- `game/src/missions.js` — story missions and side jobs
- `game/src/combat.js` — shooting, punching, enemy thugs
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/render.js` — camera, city, HUD, minimap, menus
- `game/src/input.js` — keyboard + mouse
- `game/src/main.js` — boot, loop, screens, save/load, screenshot staging

MIT licensed. All city, character and story names are original.
