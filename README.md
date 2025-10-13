# WF Date Range Picker

A lightweight, **vanilla JavaScript** date range picker optimized for **Webflow** and modern websites.  
No dependencies, clean UI, perfect UX on desktop and mobile.

---

## ✨ Why this date picker?

- **Vanilla JS, zero deps** – Drop it into any Webflow project or site.  
- **Single input, date *range*** – One field, two dates. Minimal mental load.  
- **Perfect UX** – Smart range logic, instant input updates, error prevention.  
- **Mobile-first** – Fullscreen modal on small screens with sticky header/footer.  
- **Responsive** – Two months side-by-side on desktop; stacked months on mobile.  
- **Flexible formatting** – Configure date display with input attributes.  
- **Configurable limits** – Restrict past/future selection windows by years.  
- **Real-time validation** – Inline error message; optional open-on-error.  
- **Maintainable** – Clear code, CSS variables, and minimal API surface.  
- **Configurable stay length** – Define minimum nights or allow same-day selections via attribute.  
- **Reset the date range** – Add an optional button to reset the date range selection.

---

## 📦 File Structure

```
wf-datepicker/
├── wf-datepicker.js          # Core library (vanilla JS)
├── wf-datepicker.css         # Styles (Theming via CSS variables)
└── index.html                # Sample usage / demo
```

---

## 🚀 Installation (Webflow & plain HTML)

1. **Add the CSS** (before `</head>`):

```html
<link rel="stylesheet" href="wf-datepicker.css">
```

2. **Add the JS** (right before `</body>`):

```html
<script src="wf-datepicker.js"></script>
```

3. **Add your input field**:

```html
<input type="text" datepicker="range" placeholder="Select date range">
```

> ✅ That’s it. The picker auto-initializes on any `<input datepicker="range">`.

---

# ⚙️ Configuration (input attributes)

Add attributes directly to the input. Defaults shown in **bold**.

| Attribute | Values | Default | What it does |
|---|---|---|---|
| `data-wf-dp-disable-past` | `true` \| `false` | **true** | Disable selecting dates before today. |
| `data-wf-dp-max-years` | number (≥0) | **2** | How many years into the future the user can select. |
| `data-wf-dp-max-years-past` | number (≥0) | **2** | How many years into the past (only used if `data-wf-dp-disable-past="false"`). |
| `data-wf-dp-format` | pattern string | **`EEE, MMM d`** | Display format (input + footer). See patterns below. |
| `data-wf-dp-separator` | string | **` — `** | Text between start and end dates. |
| `data-wf-dp-show-nights` | `true` \| `false` | **false** | Show “(n nights)” in footer when a full range is selected. |
| `data-wf-dp-required` | `true` \| `false` | **false** | If `true`, field must have a complete range to submit. |
| `data-wf-dp-open-on-error` | `true` \| `false` | **false** | If `true`, open the picker when submit is blocked by validation. |
| `data-wf-dp-autoclose-first` | `true` \| `false` | **false** | Desktop only: automatically close after the first completed selection (first open only). |
| `data-wf-dp-min-nights` | `0` \| `1-n` | **1** | Sets the minimum length of the range in nights (end date is exclusive). `0` → same-day selection allowed (0 nights). `2`, `3`, … → enforce longer minimums. |
| `data-wf-dp-commit-mode` | `instant` \| `confirm` | **instant** | Controls when the input updates. `instant` updates on each click; `confirm` updates only when the user clicks the Select dates button. |

### Examples

```html
<input datepicker="range" placeholder="Select date range">
<input datepicker="range" data-wf-dp-disable-past="false" data-wf-dp-max-years-past="1" data-wf-dp-max-years="3">
<input datepicker="range" data-wf-dp-format="YYYY-MM-DD" data-wf-dp-separator=" to ">
<input datepicker="range" data-wf-dp-show-nights="true">
<input datepicker="range" data-wf-dp-required="true" data-wf-dp-open-on-error="true">
<input datepicker="range" data-wf-dp-autoclose-first="true">
```

---

# ⏏️ Configuration (external controls)

| Attribute | Values | Default | What it does |
|---|---|---|---|
| `data-wf-dp-reset` | *(empty)* | – | When clicked, clear the selected range and reset the connected picker(s). |
| `data-wf-dp-target` | CSS selector | **`[datepicker="range"]`** | Limits which picker(s) the reset affects. |
| `data-wf-dp-hide-when-empty` | *(empty)* | – | Automatically hide reset buttons when inputs are empty or no date is selected. |

### Examples

```html
<button data-wf-dp-reset>Reset all dates</button>
<button data-wf-dp-reset data-wf-dp-hide-when-empty>Reset all dates</button>
<input id="booking-range" datepicker="range" data-wf-dp-min-nights="2">
<button data-wf-dp-reset data-wf-dp-target="#booking-range">Reset</button>
```

---

## 🗓 Date Format Patterns

| Token | Meaning |
|---|---|
| `YYYY`, `yyyy` | Full year (2025) |
| `YY`, `yy` | Short year (25) |
| `MMMM` | Full month name (October) |
| `MMM` | Short month name (Oct) |
| `MM`, `M` | Month number (10) |
| `DD`, `D` | Day number (13) |
| `EEEE` | Full weekday name (Monday) |
| `EEE` | Short weekday name (Mon) |

---

## 📱 Mobile Experience

- On screens <768px: fullscreen modal.  
- Sticky header + close button.  
- Sticky weekdays.  
- Auto-scroll to current/start month.  
- Sticky footer with summary and button.  

---

## 🖥 Desktop Experience

- Popover anchored to the input.  
- Two months side-by-side.  
- Previous/Next arrows.  
- Optional autoclose (`data-wf-dp-autoclose-first="true"`).  

---

## ✅ Selection & Validation Logic

- First click → start date.  
- Second click → end date (if valid).  
- Same day allowed if `data-wf-dp-min-nights="0"`.  
- Input auto-updates (partial or full range).  
- Form blocked if incomplete range and `data-wf-dp-required="true"`.  

---

## 🎯 Events

```js
const input = document.querySelector('input[datepicker="range"]');
input.addEventListener('wf-datepicker:change', (e) => {
  const { startDate, endDate } = e.detail;
  console.log('Range selected:', startDate, endDate);
});
```

---

## 🎨 Theming (CSS Variables)

```css
:root {
  /* Primary brand color used across interactive elements (buttons, highlights, active states) */
  --wf-dp-primary: #0062eb;

  /* Darker variant of the primary color for hover or pressed states */
  --wf-dp-primary-hover: color-mix(in srgb, var(--wf-dp-primary) 90%, black);

  /* Background color for selected date ranges or highlighted areas */
  --wf-dp-range-color: #e3f2fd;

  /* Neutral text or icon color for secondary and less emphasized UI elements */
  --wf-dp-grey: #595959;

  /* Base border color for inputs, popovers, and dividers */
  --wf-dp-border: #e5e7eb;

  /* Default background color for components and containers */
  --wf-dp-bg: #ffffff;

  /* Background color used for hover states and subtle surface changes */
  --wf-dp-hover: #f3f4f6;

  /* Soft, layered shadow for popovers, modals, and elevated surfaces */
  --wf-dp-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

---

## 🧩 API Access

```js
const input = document.querySelector('input[datepicker="range"]');
const picker = input.__wfDatepicker;

picker.open();
picker.close(true);
console.log(picker.start, picker.end);
```

---

## 🧰 Troubleshooting

| Issue | Fix |
|---|---|
| Native tooltip shows | Remove native `required`; use `data-wf-dp-required="true"`. |
| Popover misplaced | Avoid transforms; it uses `position: fixed`. |
| Mobile tap delay | Add `touch-action: manipulation;`. |
| Can't select past | Set `data-wf-dp-disable-past="false"`. |

---

## 📝 License

MIT License

---

## 📄 Quick Example

```html
<link rel="stylesheet" href="wf-datepicker.css">
<script src="wf-datepicker.js"></script>

<input
  type="text"
  datepicker="range"
  placeholder="Select date range"
  data-wf-dp-format="DD MMM YYYY"
  data-wf-dp-separator=" — "
  data-wf-dp-disable-past="false"
  data-wf-dp-max-years-past="1"
  data-wf-dp-max-years="3"
  data-wf-dp-show-nights="true"
  data-wf-dp-required="true"
  data-wf-dp-open-on-error="true"
  data-wf-dp-autoclose-first="true"
  data-wf-dp-min-nights="1"
  readonly
/>

<button type="button" data-wf-dp-reset data-wf-dp-target="#booking-range">Reset dates</button>
```

---
