# Silaye (سلائی) — Bespoke Tailor Workshop Management & CRM

Silaye is a mission-critical multi-tenant tailor shop OS and workflow pipeline engine designed for bespoke tailoring workshops, master craftsmen, and garment boutiques.

## Features & Architecture

- **Bilingual & RTL-First:** Seamless English & Urdu typography (`Noto Sans Arabic`, `Noto Nastaliq Urdu`) with vertical baseline alignment and bidirectional numeral isolation.
- **Precision Fractional Measurement Intake:** Rapid intake with quarter-inch modifiers (`.00`, `.25`, `.50`, `.75`) and full keyboard navigation.
- **Visual Garment Style Selector:** Selectable chips for Collar Cuts (Sherwani, Ban, Shirt), Daman, Pocket configurations, and Front Patti.
- **Workflow Pipeline & Workshop Board:** Multi-stage production tracking from booking to cutting, stitching, kaj/button, pressing, and trial/delivery.
- **Digital Khata Ledger:** Built-in receivables (*Udhaar*), advance payments, and customer balance tracking.
- **WhatsApp Direct Invoicing & Receipts:** 1-click Pakistani phone format sanitization and automated messaging links.
- **Offline-First & Native Scaffolding:** Designed for Web (Next.js App Router), Desktop (.exe via Electron), and Mobile (.apk via Capacitor).

## Tech Stack

- **Framework:** Next.js 15 (App Router, Static Export ready)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Semantic color tokens: Obsidian Dark default, Raw Linen mode, Tailor Gold accents)
- **Icons:** Lucide React
- **Validation:** Zod

## Getting Started

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Type check
npm run typecheck

# Production build
npm run build
```

## Deployment

Configured for seamless deployment on [Vercel](https://vercel.com).
