# ui-hierarchy.md - Visual Design System, Layout Architecture & UI Hierarchy

## 1. Design Philosophy & Aesthetic Blueprint
Silaye blends **Haute Horlogerie / Luxury Editorial Craft** with **High-Velocity Workshop Ergonomics**. 

It departs entirely from sterile, generic SaaS templates by utilizing:
* **The "Dual Horizon" Atmosphere:** High-contrast alternating sections transitioning seamlessly from **Deep Obsidian Charcoal** (for focus, command dashboards, and pricing) to **Warm Raw Linen / Sand** (for artisanal bento cards and editorial storytelling).
* **Artisanal Tailor Gold Accents:** Muted metallic bronze/gold highlights (`#C8A97E` / `#D4AF37`) evoking measuring tapes, antique brass shears, and gold embroidery threads.
* **Typographic Contrast:** Editorial high-fashion serifs (*Instrument Serif* / *Cormorant Garamond*) juxtaposed against clinical geometric sans-serifs (*Geist* / *Plus Jakarta Sans*) and baseline-aligned Arabic numerals.

---

## 2. Color System & Semantic CSS Tokens

```css
:root {
  /* Surface Layers - Warm Raw Linen Mode (Marketing Bento & Print) */
  --surface-linen-bg: #F5F2EB;
  --surface-linen-card: #FFFFFF;
  --surface-linen-card-muted: #EDE8DE;
  --surface-linen-border: #E2DCD0;
  --surface-linen-text: #1C1917;
  --surface-linen-text-muted: #78716C;

  /* Surface Layers - Obsidian Dark Mode (Command Shell & Workshop Dashboard) */
  --surface-obsidian-bg: #0B0C0E;
  --surface-obsidian-card: #141619;
  --surface-obsidian-card-elevated: #1B1E22;
  --surface-obsidian-border: #24282F;
  --surface-obsidian-border-subtle: #1C1F24;
  --surface-obsidian-text: #F4F1EA;
  --surface-obsidian-text-muted: #8E95A0;

  /* Brand Accents & Craft Metallics */
  --accent-gold-primary: #C8A97E;
  --accent-gold-hover: #D9BE9B;
  --accent-gold-glow: rgba(200, 169, 126, 0.15);
  --accent-gold-subtle: #2C261E;

  /* Workshop Functional Semantic Indicators */
  --status-booked: #64748B;
  --status-cutting: #38BDF8;
  --status-stitching: #F59E0B;
  --status-ready: #10B981;
  --status-overdue: #EF4444;
  --status-advance-credit: #22C55E;
  --status-udhaar-pending: #F43F5E;
}

```

---

## 3. Typography Hierarchy & Font Rules

### 3.1 Font Families

* **Display & Editorial Serif:** `font-editorial` ➔ *Instrument Serif*, *Playfair Display*, or *Cormorant Garamond* (Italics used for emotional craft emphasis like *notebook*, *timeless*, *scissors*).
* **UI & Data Sans:** `font-sans` ➔ *Geist Sans*, *Plus Jakarta Sans*, or *Inter* (Used for tabular data, numbers, labels, forms, buttons).
* **Urdu Script (Body & Data):** `font-urdu-sans` ➔ *Noto Sans Arabic* / *Readex Pro* (Strictly baseline-aligned to prevent vertical clipping in measurement tables).
* **Urdu Script (Headings & Badges):** `font-urdu-serif` ➔ *Noto Nastaliq Urdu* / *Gulzar*.

### 3.2 Type Scale Specs

| Element | Font Family | Size / Leading | Weight | Tracking / Letter Spacing |
| --- | --- | --- | --- | --- |
| **Hero Display H1** | `font-editorial` | `text-5xl md:text-7xl` (`4.5rem` / `1.05`) | Regular + Italic | `-0.02em` |
| **Section Title H2** | `font-editorial` | `text-3xl md:text-5xl` (`3.0rem` / `1.15`) | Regular + Italic | `-0.01em` |
| **Bento Card H3** | `font-sans` | `text-xl md:text-2xl` (`1.5rem` / `1.3`) | SemiBold (`600`) | `-0.01em` |
| **Input / Metric Values** | `font-sans` | `text-base md:text-lg` (`1.125rem` / `1.4`) | Medium (`500`) / Bold | `0` (Tabular Numbers) |
| **Subheadings & Lead Copy** | `font-sans` | `text-base md:text-lg` (`1.125rem` / `1.6`) | Regular (`400`) | Normal |
| **Micro Labels & Tags** | `font-sans` | `text-xs` (`0.75rem` / `1.0`) | Medium / Bold | `+0.05em` Uppercase |

---

## 4. Landing Page Structure (Exact Visual Replication)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SECTION 1: OBSIDIAN HERO VIEWPORT (Dark #0B0C0E)                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Navigation: Brand Logo ("Silaye") | Links | CTA ("Open Workshop") │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Tagline: "MADE FOR BESPOKE MASTER CRAFTSMEN" (Gold micro-pill)      │ │
│ │ H1: "Your workshop deserves more than a *notebook.*"                 │ │
│ │ Subtitle: Intuitive measurement vault, queue pipeline & WhatsApp... │ │
│ │ Buttons: [Register Workshop ->]  [Watch 2-Min Demo]                 │ │
│ │ Proof Metrics: "Rs. 2.8M+ Tracked" | "98,000+ Suits" | "Zero Lost"  │ │
│ │ Interactive Terminal Floating Preview (Glass card with live queue)   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 2: THE CALM TRADE BENTO GRID (Raw Linen #F5F2EB)                │
│ H2: "Every part of the trade, in one *calm* system."                    │
│ ┌───────────────────────────────┬─────────────────────────────────────┐ │
│ │ Card 1 (Wide):               │ Card 2:                             │ │
│ │ "Every measurement, never     │ "Design/cut in a glance even after  │ │
│ │ miscalculated" (Fractional    │ six months"                         │ │
│ │ number pad preview: 42.5",    │ (Collar: Sherwani, Daman: Round,    │ │
│ │ 16.25", 24.00" chips)         │ Front Patti: Concealed)             │ │
│ ├──────────────┬────────────────┴──────┬──────────────────────────────┤ │
│ │ Card 3:      │ Card 4:               │ Card 5:                      │ │
│ │ "Assigned to │ "Financials in clear  │ "Step-by-step progress"      │ │
│ │ the right    │ light" (Live Khata:   │ (Visual Kanban state dots:   │ │
│ │ hands"       │ Rs. 14,000 pending,   │ Cutting -> Stitching ->      │ │
│ │ (Cutting/    │ Rs. 3,500 advance)    │ Pressing -> Ready)           │ │
│ │ Stitcher ID) │                       │                              │ │
│ ├──────────────┴───────────────────────┼──────────────────────────────┤ │
│ │ Card 6:                              │ Card 7:                      │ │
│ │ "Bespoke schedule, precisely"        │ "Fabric & swatches tagged"   │ │
│ │ (Trial Date vs. Final Delivery Eid)  │ (Customer swatch thumbnail)  │ │
│ ├──────────────────────────────────────┴──────────────────────────────┤ │
│ │ Card 8 (Full Width Spotlight):                                      │ │
│ │ "Professional invoices sent direct on WhatsApp"                     │ │
│ │ (Clean invoice preview: Itemized specs, Advance paid, 1-Click link) │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 3: THE PARADIGM SHIFT (Obsidian Dark #0B0C0E)                  │
│ H2: "The same craft. A *different* system."                             │
│ ┌──────────────────────────────────┬──────────────────────────────────┐ │
│ │ The Old Notebook Day (Muted Dark)│ The Silaye Way (Gold Highlight)│ │
│ │ • Illegible pencil measurements  │ • Permanent cloud measurement card│
│ │ • Fabric lost under the counter  │ • Barcoded thermal fabric tags   │ │
│ │ • Disputed advance balances      │ • Immutable digital khata ledger │ │
│ │ • 20 phone calls a day "Taiyar?" │ • Automated WhatsApp alert link  │ │
│ └──────────────────────────────────┴──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 4: MOBILE WORKSHOP SHOWCASE (Dark Obsidian #0B0C0E)            │
│ ┌──────────────────────────────────┬──────────────────────────────────┐ │
│ │ Floating Native Mobile Device    │ "The workshop, *on the move.*"   │ │
│ │ Screen (Framed iPhone mockup     │ • Fast measurement intake at body│ │
│ │ showing portable measurement pad │ • Tap-to-call & instant WhatsApp │ │
│ │ and daily delivery counter)      │ • Works offline on shop floor    │ │
│ └──────────────────────────────────┴──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 5: SOCIAL PROOF / TESTIMONIALS (Raw Linen #F5F2EB)             │
│ H2: "Words from the people *holding the scissors.*"                    │
│ ┌─────────────────────┬──────────────────────┬────────────────────────┐ │
│ │ Master Rafiq        │ Ustad Tariq Mehmood  │ Haji Muhammad Saleem   │ │
│ │ Tariq Road, Karachi │ Anarkali, Lahore     │ Saddar, Rawalpindi     │ │
│ │ "Saved 3 hours every│ "No more fabric mix- │ "Eid rush used to be   │ │
│ │ evening on khata."  │ ups during wedding." │ chaos. Now it's calm." │ │
│ └─────────────────────┴──────────────────────┴────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 6: ARTISANAL PRICING TIERS (Obsidian Dark #0B0C0E)             │
│ H2: "Pricing without *complications.*"                                 │
│ ┌─────────────────────┬──────────────────────┬────────────────────────┐ │
│ │ STARTER             │ PROFESSIONAL [BEST]  │ ENTERPRISE             │ │
│ │ Rs. 1,500 / month   │ Rs. 2,800 / month    │ Rs. 7,000 / month      │ │
│ │ (100 Active Orders, │ (Unlimited Orders,   │ (Multi-Branch, Master  │ │
│ │ 1 Counter Terminal) │ Thermal Printing, WA)│ API & Dedicated Acc)   │ │
│ └─────────────────────┴──────────────────────┴────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ SECTION 7: LUXURY FOOTER CTA (Dark Obsidian #0B0C0E)                   │
│ H2: "Your craft is *timeless.* Your system should be too."             │
│ [Open Your Digital Workshop ->]                                         │
│ Footer links, Copyright 2026, Bilingual Locale Switcher (EN / UR)       │
└─────────────────────────────────────────────────────────────────────────┘

```

---

## 5. Workshop Application Shell (Internal Dashboard UI Hierarchy)

When logged in, the application uses a focused **Obsidian Dark Command Center** designed for high contrast under shop lighting:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAR                                                         │
│ [Brand Logo] | [Search Customer (Name/Phone) /] | [Offline Sync OK] | [⚙]│
├──────────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN WORKSPACE VIEWPORT                                  │
│              │                                                          │
│ ＋ New Order │ [TAB: Active Queue]  [TAB: Cutting]  [TAB: Ready]        │
│ 📋 Orders    │ ──────────────────────────────────────────────────────── │
│ 👥 Customers │ ┌──────────────────────────────────────────────────────┐ │
│ ✂️ Workshop   │ │ QUICK FILTER: [Today's Deliveries (8)] [Eid Rush]    │ │
│ 💰 Khata     │ ├──────────────────────────────────────────────────────┤ │
│ 🏷️ Print Tag │ │ ORDER CARD #DP-2026-0801                             │ │
│ ⚙️ Settings  │ │ Muhammad Usman • 0300-1234567 • 2x Men Shalwar Kameez│ │
│              │ │ Delivery: Tomorrow, 6 PM  [Due: Rs. 2,500]           │ │
│              │ │ Stage: [ IN_STITCHING (Master Aslam) ]               │ │
│              │ │ Actions: [WhatsApp Receipt] [Thermal Tag] [Advance+] │ │
│              │ └──────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────┘

```

---

## 6. Micro-Components & Interaction Rules

### 6.1 Fractional Measurement Pill Matrix

* Number fields are paired with quarter-inch toggle pills:
`[ .00 ]` | `[ .25 ]` | `[ .50 ]` | `[ .75 ]`
* Selecting a pill immediately updates the decimal value without keyboard input.

### 6.2 Visual Garment Cut Chips

* Active chips display a gold outline with a subtle background glow (`border-primary bg-primary/10 text-primary-foreground`).
* Inactive chips use a neutral muted border (`border-border text-muted-foreground hover:border-foreground/30`).

### 6.3 WhatsApp Live Invoice Card

* Floating interactive preview card with real-time reactive calculations:
* Automatically calculates `Balance Due = (Stitching + Fabric + Addons) - Advance Paid`.
* Green text badge for `Fully Paid`; Amber/Red badge for `Balance Due`.
* One-tap `Send on WhatsApp` button triggers the generated deep-link with animated feedback.



```

```
