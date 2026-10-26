# Design System & UI Specification

Mission Control uses a **minimal, utilitarian dark interface** inspired by precision developer tools (Linear, Raycast, Vercel). It prioritizes scannable typography, crisp `1px` structural borders, and solid tonal surface hierarchy over decorative effects.

---

## 1. Core Principles

1. **Zero Glassmorphism**: No `backdrop-filter: blur()` on cards or panels, no translucent frosted overlays, and no colored glow drop-shadows. Depth is communicated strictly through solid surface luminance steps and hairline borders.
2. **High-Contrast Restraint**: Primary actions use crisp monochrome contrast (`#f4f4f5` surface with `#09090b` text). Semantic colors (Emerald, Amber, Rose, Indigo) are reserved strictly for status indicators, health states, and priority signals.
3. **Tabular & Monospace Discipline**: All counts, percentages, dates, IDs, and status tags use `JetBrains Mono` with `tabular-nums` for vertical alignment and rapid scanning.
4. **Tight Architectural Geometry**: Small, purposeful border radii (`4px` badges, `6px` controls/inputs, `8px` panels/modals) keep layouts dense and structured.

---

## 2. Color & Surface Tokens

### Surfaces
| Token | Hex | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| `canvas` | `#09090b` | `bg-canvas` | App root background (Zinc 950) |
| `surface` | `#111113` | `bg-surface` | Primary cards, metric strip cells, Kanban columns, modals |
| `elevated` | `#18181b` | `bg-elevated` | Hover states, active segmented controls, dropdown menus |
| `recessed` | `#0c0c0e` | `bg-recessed` | Text inputs, selects, code blocks, empty state wells |

### Borders
| Token | Hex | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| `border-subtle` | `#222226` | `border-subtle` | Default `1px solid` hairline for panels, dividers, and inputs |
| `border-strong` | `#323238` | `border-strong` | Interactive hover/focus borders and active card outlines |

### Typography Colors
| Role | Hex | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| Primary | `#f4f4f5` | `text-zinc-100` | Headings, project titles, primary values |
| Secondary | `#a1a1aa` | `text-zinc-400` | Body copy, descriptions, inactive tabs, form labels |
| Muted | `#71717a` | `text-zinc-500` | Timestamps, placeholders, disabled controls, metadata labels |

### Semantic Status Tokens
| State | Text | Background | Border | Indicator Dot |
| :--- | :--- | :--- | :--- | :--- |
| **On Track / Done / Live** | `text-emerald-400` | `bg-emerald-500/10` | `border-emerald-500/20` | `bg-emerald-400` |
| **At Risk / In Progress** | `text-amber-400` | `bg-amber-500/10` | `border-amber-500/20` | `bg-amber-400` |
| **Blocked / Urgent** | `text-rose-400` | `bg-rose-500/10` | `border-rose-500/20` | `bg-rose-500` |
| **AI-Ready / Info** | `text-indigo-400` | `bg-indigo-500/10` | `border-indigo-500/20` | `bg-indigo-400` |
| **Neutral / Human / Low** | `text-zinc-400` | `bg-zinc-800/60` | `border-zinc-700/60` | `bg-zinc-500` |

---

## 3. Typography & Hierarchy

- **Sans-Serif (`--font-sans`)**: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`
  - **App Title / Brand**: `14px` (`text-sm`), `font-semibold`, `tracking-tight`, `text-zinc-100`
  - **Section Heading**: `14px` (`text-sm`), `font-semibold`, `text-zinc-100`
  - **Card Title**: `14px` (`text-sm`), `font-semibold`, `text-zinc-100`
  - **Task Title**: `12px` (`text-xs`), `font-medium`, `text-zinc-100`
  - **Body / Description**: `12px` (`text-xs`), `font-normal`, `text-zinc-400`, `leading-relaxed`
- **Monospace (`--font-mono`)**: `'JetBrains Mono', monospace`
  - **Metric Value**: `20px` (`text-xl`), `font-semibold`, `tabular-nums`, `tracking-tight`
  - **Section Eyebrow / Column Header**: `11px` (`text-[11px]`), `uppercase`, `tracking-wider`, `text-zinc-400`
  - **Metadata / Badges / Tags**: `11px` (`text-[11px]`), `tabular-nums`

---

## 4. Codified Component Classes (`src/index.css`)

All views and modals must compose from these standardized primitives rather than ad-hoc utility chains:

- **`.surface-panel`**: `bg-surface border border-subtle rounded-lg` — Standard container for cards, sections, and columns.
- **`.surface-panel-interactive`**: Extends `.surface-panel` with `transition-colors duration-150 hover:border-strong` — Interactive project and task cards.
- **`.surface-recessed`**: `bg-recessed border border-subtle rounded-md` — Recessed wells, code previews, and filter bars.
- **`.btn-primary`**: `inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white transition-colors` — Primary CTA.
- **`.btn-secondary`**: `inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-elevated hover:bg-zinc-800 text-zinc-200 border border-subtle hover:border-strong transition-colors` — Secondary actions.
- **`.btn-ghost`**: `inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-elevated transition-colors` — Low-emphasis toolbar and icon actions.
- **`.input-field`**: `w-full px-3 py-1.5 bg-recessed border border-subtle rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors` — Text inputs, selects, and textareas.
- **`.badge`**: `inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border` — Status and metadata pills.
- **`.label-caps`**: `text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium` — Column headers and form section labels.

---

## 5. Anti-Patterns (Prohibited)

- **No Glassmorphism**: Do not use `.glass-panel`, `backdrop-blur-*` on content cards, or semi-transparent card backgrounds.
- **No Multi-Stop Gradients**: Do not use `bg-gradient-to-*` on buttons, icons, text, or progress bars.
- **No Colored Glow Shadows**: Do not use `shadow-indigo-500/*` or similar neon drop-shadows.
- **No Decorative Emojis in UI Controls**: Use clean Lucide icons or `6px` semantic dots instead of emojis in `<select>` options, badges, and headers.
- **No Oversized Radii**: Do not use `rounded-2xl` or `rounded-3xl`.
