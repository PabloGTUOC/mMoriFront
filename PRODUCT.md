# Product

## Register

product

## Users

The author and a small circle of friends. People who already know what the app is and why it
exists, opening it on a phone or laptop as part of an ordinary day, usually right after
training or first thing in the morning. Nobody arrives here from an ad or an app store
listing, so the interface owes them no pitch.

The job: log what happened today (a training session, a weigh-in, a mood), and see it land
against the only measure the app cares about, the weeks of a life. Logging is fast and
routine. Reading is the part worth lingering on.

## Product Purpose

mMori turns a fitness log into a memento mori. Age, country, and habits produce a life
expectancy; the difference between that and today becomes a grid of weeks, lived and left.
Trainings, weigh-ins, and moods accumulate against that grid.

Success is not engagement. Success is that opening the app produces an honest, unhurried
moment of perspective, and that logging is frictionless enough to keep happening. An app
that gets used twice a week for years has succeeded; one that gets opened compulsively has
failed at its own premise.

## Brand Personality

**Grounded, wry, unhurried.**

Mortality here is context, not threat. The tone is dry rather than solemn and never
motivational; the app states what is true and lets the user draw the conclusion. It has a
sense of humour about itself (the header says so plainly) but it does not nudge, cheer,
congratulate, or shame.

Voice: plain sentences, real numbers, no exclamation marks. When the app has nothing useful
to say, it says nothing.

## Anti-references

- **Corporate fitness SaaS** (Strava, MyFitnessPal). Rounded blue cards, badge grids, chirpy
  encouragement, engagement mechanics. The opposite of this product's premise.
- **Doom-scroll morbidity.** Black-and-grey death-clock aesthetics, countdown timers styled
  as threat. Mortality without the perspective is just anxiety, and the week grid must never
  read as a threat display.
- **Generic Material dashboard.** Elevation cards, blue primary, everything floating on grey.
  Angular Material was already removed from this project deliberately; do not let its
  conventions creep back in through habit.
- **Gamified retention.** Streaks, confetti, achievement badges, re-engagement nudges. An app
  about finite time has no business manufacturing urgency about itself.

## Design Principles

1. **The week grid is the product.** Every other surface exists to feed it or to get out of
   its way. When a screen competes with it for attention, the screen is wrong.

2. **One loud surface, quiet everywhere else.** The night sky and its neon glow are the app's
   signature and stay on the header and life chart. Forms, catalogues, and logging views are
   deliberately plain. A signature that appears everywhere stops being a signature.

3. **Perspective, not alarm.** The design's job is to make a hard fact readable, not
   dramatic. Restraint in pacing, spacing, and copy is what separates memento mori from a
   doom clock.

4. **No retention theatre.** Nothing in the interface should try to increase how often it is
   opened. No streaks, no nudges, no rewards for returning.

5. **Say the number, then stop.** Where a figure exists, show it plainly and resist
   surrounding it with interpretation, encouragement, or decoration.

## Accessibility & Inclusion

No formal WCAG target: this is a private tool for a handful of people, and the visual
direction is not to be constrained by compliance work.

Two things are held anyway, because they are legibility rather than compliance: body text
stays at a contrast ratio that is comfortable to read (the neon-on-dark surfaces are the
easiest place to lose this), and animation has a `prefers-reduced-motion` path, since the
glow and chart transitions are the kind that cause trouble for people who are affected.
