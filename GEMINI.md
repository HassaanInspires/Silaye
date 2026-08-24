# GEMINI.md - CLI Runtime & Execution Blueprint

## 1. Project Context & Environment
* **Project Name:** Silaye / Tailor SaaS Engine
* **Target Architecture:** Multi-tenant Workshop & Tailor Management System
* **Platforms:** Web (Next.js App Router), Desktop Installer (`.exe` via Electron), Mobile (`.apk` via Capacitor)
* **Operating Environment:** Linux Mint (x86_64) / Node.js LTS / TypeScript Strict Mode

---

## 2. CLI Execution Boundaries & Operating Directives

### 2.1 Autonomous Task Execution
* Always consult `tasks.md` and `progress.md` before executing commands or generating code.
* Execute tasks strictly in atomic sequential order. Do not skip steps or implement unrequested features ahead of schedule.
* When completing a task item, immediately update `tasks.md` by marking the corresponding box `[x]` and log progress to `progress.md`.

### 2.2 Shell & Command Safety
* Use standard non-interactive flags for package management and CLI commands (e.g., `npm install --yes`, `npx --yes`).
* Never run destructive commands (`rm -rf`, `git reset --hard`, database drops) without explicit, granular specification.
* Avoid blocking background processes in terminal execution unless redirected or spawned appropriately.
* Run builds, lints, or typechecks (`npm run build`, `npx tsc --noEmit`) to verify correctness after completing major tasks.

---

## 3. Code Generation & Quality Standards

### 3.1 TypeScript & Type Safety
* Enable strict type checking. Never use `any` as an escape hatch; declare explicit interfaces and types in `@/types`.
* Strictly type Next.js App Router props (e.g., `params`, `searchParams` with appropriate `Promise` wrappers where required by Next.js version).
* Validate runtime inputs with Zod schemas where API endpoints or forms receive external data.

### 3.2 File Modification Protocols
* **No Placeholders:** Never generate incomplete stubs, dummy functions, or placeholder comments (e.g., `// TODO: Implement later`, `/* Add styles here */`). All files must be fully implemented and syntactically valid.
* **Preserve Unrelated Code:** When modifying existing files, preserve all existing imports, logic, and exports not directly related to the active change.
* **Component Co-location:** Keep reusable components inside `components/ui/`, domain-specific components inside `components/tailor/`, and utilities inside `lib/`.

---

## 4. UI & Styling Constraints
* Build exclusively with semantic Tailwind CSS utility classes linked to CSS variables defined in `app/globals.css`.
* Never hardcode arbitrary hex colors (e.g., `bg-[#121212]`, `text-[#c8a97e]`) directly in JSX components; use semantic classes (`bg-background`, `bg-card`, `text-primary`, `border-border`).
* Ensure all form inputs, modals, and tables support full responsive sizing and Right-to-Left (RTL) baseline text alignment for bilingual Urdu/English interfaces.
* Maintain clean keyboard navigation and focus rings across all data-entry forms.

---

## 5. Persistence & Context Reset Workflow
* Before concluding any major execution turn or when preparing for a context reset (`/clear` or `/new`), append a concise state summary to `progress.md`:
  * Tasks completed in the current run.
  * Active file changes.
  * Next immediate task to be tackled from `tasks.md`.
