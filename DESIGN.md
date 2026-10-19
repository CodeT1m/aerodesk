---
version: 1
name: Aerodesk
description: An aviation planning desk with the clarity of a terminal display and the calm of a well-run journey.
colors:
  background: "#f4f8fa"
  foreground: "#10273a"
  primary: "#075d77"
  card: "#ffffff"
  border: "#cbdde5"
  muted: "#557080"
  midnight: "#071b2b"
  signal: "#81d8e4"
  amber: "#f8ddaa"
typography:
  display: "Barlow Condensed, Arial Narrow, sans-serif"
  body: "Geist, system-ui, sans-serif"
  data: "Geist Mono, ui-monospace, monospace"
rounded:
  default: "0.95rem"
  hero: "2rem"
spacing:
  page-max: "72rem"
  main-top: "2.5rem"
components:
  button: "Primary uses --primary; focus uses --ring"
  card: "Quiet white surface with a fine border and low elevation"
  navigation: "Midnight bar, visible current route, horizontal mobile links"
---

# Aerodesk design direction

The reference is an airport terminal at blue hour: clear route information, restrained signal lights, and ample space around decisions. The home page carries the expressive flight-path panel. Search, booking, membership, and Concierge use quieter panels so actions stay easy to find.

The site serves people exploring routes and testing a simulated booking. English is the current interface language. Keep real flight status visibly separate from sample fares, seats, and simulated checkout. Do not imply that a test booking reserves an airline seat.

`src/app/globals.css` is the runtime token owner. The values above mirror its light palette and stable layout values. Dark-mode semantic tokens live in `.dark`; component styles consume the semantic CSS variables. This file records intent and mapping; update it with global token changes.

Use Barlow Condensed for headings, Geist for body copy, and Geist Mono for airport codes, counts, and small operational labels. The home hero is the single signature graphic. Cyan glow marks a live signal, route point, or selected count; it should never surround routine paragraphs and cards. Amber identifies scheduled or simulated information. Motion is limited to route reveal and hover response, with reduced motion respected.

Buttons, fields, cards, and panels use the shared components under `src/components/ui`. Focus must stay visible against light and dark surfaces. Keep mobile navigation available, forms labelled, and errors specific enough to guide recovery without exposing secrets.
