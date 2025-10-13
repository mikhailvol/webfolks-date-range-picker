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

## ⚙️ Configuration (input attributes)

Add attributes directly to the input. Defaults shown in **bold**.

| Attribute | Values | Default | What it does |
|---|---|---|---|
| `data-disable-past` | `"true"` \| `"false"` | **"true"** | Disable selecting dates before today. |
| `data-max-years` | number (≥0) | **2** | How many years into the future the user can select. |
| `data-max-years-past` | number (≥0) | **2** | How many years into the past (only used if `data-disable-past="false"`). |
| `data-date-format` | pattern string | **`EEE, MMM d`** | Display format (input + footer). See patterns below. |
| `data-range-separator` | string | **` — `** | Text between start and end dates. |
| `data-show-nights` | `"true"` \| `"false"` | **"false"** | Show “(n nights)” in footer when a full range is selected. |
| `required-valid` | `"true"` \| `"false"` | **"false"** | If `"true"`, field must have a complete range to submit. |
| `open-on-error` | `"true"` \| `"false"` | **"false"** | If `"true"`, open the picker when submit is blocked by validation. |
| `data-autoclose-first` | `"true"` \| `"false"` | **"false"** | Desktop only: automatically close after the first completed selection (first open only). |

### Examples

```html
<!-- Default: no past dates, 2 years future, friendly format, no (n nights) -->
<input datepicker="range" placeholder="Select date range">

<!-- Allow past dates (up to 1 year back); future 3 years -->
<input datepicker="range" data-disable-past="false" data-max-years-past="1" data-max-years="3">

<!-- ISO format & custom separator -->
<input datepicker="range" data-date-format="YYYY-MM-DD" data-range-separator=" to ">

<!-- Show nights in footer -->
<input datepicker="range" data-show-nights="true">

<!-- Validation: require full range; optionally re-open picker on error -->
<input datepicker="range" required-valid="true" open-on-error="true">

<!-- Desktop: close after the first completed range -->
<input datepicker="range" data-autoclose-first="true">
```

---

## 🗓 Date Format Patterns

Supported tokens (both cases where it makes sense):

- Year: `YYYY`, `yyyy`, `YY`, `yy`
- Month: `MMMM` (long name), `MMM` (short name), `MM`, `M`
- Day of month: `DD`, `dd`, `D`, `d`
- Weekday: `EEEE` (long), `EEE` (short)

### Examples

| Example | Pattern | Typical Use |
|---|---|---|
| `2025-10-13` | `YYYY-MM-DD` | Databases, APIs |
| `13 Oct 2025` | `DD MMM YYYY` | Global web/app UI |
| `Fri, Feb 20` | `EEE, MMM d` | Dashboards, calendars |
| `Oct 13, 2025` | `MMM DD, YYYY` | English UIs |
| `13/10/2025` | `DD/MM/YYYY` | Europe/LatAm |
| `13 October 2025` | `DD MMMM YYYY` | Invoices, articles |
| `Monday, February 20, 2025` | `EEEE, MMMM d, yyyy` | Event pages |
| `13.10.2025` | `DD.MM.YYYY` | Central/Eastern Europe |
| `2025/10/13` | `YYYY/MM/DD` | Logs, file names |
| `10/13/2025` | `MM/DD/YYYY` | United States |

---

## 📱 Mobile Experience (automatic)

- On screens **< 768px**, the picker becomes a **fullscreen modal**:
  - Sticky **header** with “Select dates” and a **close (X)** button.
  - Sticky **weekdays** row.
  - All months from the configured window are stacked vertically (no nav buttons).
  - Sticky **footer** with summary (and optional **(n nights)**) + “Select dates” button.
  - On first open, the modal auto-scrolls to **current month** (or to the **start month** if a range is already selected).
- Smooth, jank-free interactions (preserves scroll position during re-renders).

> 💡 For instant tap response on iOS, include this CSS:
```css
.wf-dp-cell, .wf-dp-btn, .wf-dp-cta {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
```

---

## 🖥 Desktop Experience

- Anchored popover below the input.  
- **Two months** displayed side-by-side.  
- Previous/Next arrows at the sides of the calendar.  
- Optional **auto-close** after first completed selection: `data-autoclose-first="true"`.  

---

## ✅ Selection & Validation Logic

- **First tap** selects the **start** date.  
- **Second tap**:
  - If **after** start → completes the range.  
  - If **before** start → resets start (waits for a new end).  
  - **Same day** is **not allowed** (must be at least 1 night).  
- **Input value updates instantly**:
  - Partial: `Tue, Oct 14 — End Date`  
  - Complete: `Tue, Oct 14 — Fri, Oct 17`
- **Validation**:
  - If `required-valid="true"`: the form won’t submit without a full range.
  - Even without `required-valid`, a **partial** selection (start only) shows an inline error and blocks submit.
  - `open-on-error="true"` will open the picker when the form is blocked.

---

## 🎯 Events

Subscribe to changes if you need to read JS Date objects:

```js
const input = document.querySelector('input[datepicker="range"]');
input.addEventListener('wf-datepicker:change', (e) => {
  const { startDate, endDate } = e.detail; // JS Date objects (cloned)
  console.log('Range selected:', startDate, endDate);
});
```

---

## 🎨 Theming (CSS variables)

Define these to match your design system:

```css
:root {
  --wf-dp-primary-color: #007bff;
  --wf-dp-selected-color: #007bff;
  --wf-dp-range-color: #e3f2fd;
  --wf-dp-disabled-color: #6c757d;
  --wf-dp-current-date-color: #007bff;
  --wf-dp-bg: #fff;
  --wf-dp-text: #111827;
  --wf-dp-border: #e5e7eb;
}
```

---

## 🧩 Programmatic API (lightweight)

Each input gets an instance stored at `input.__wfDatepicker`:

```js
const input = document.querySelector('input[datepicker="range"]');
const picker = input.__wfDatepicker;

// optional helpers:
picker.open();
picker.close(true); // triggers validation on close

// read state:
console.log(picker.start, picker.end); // JS Date objects or null
```

---

## 🛡 Browser Support

- ✅ Chrome, Firefox, Safari, Edge (modern versions)  
- ❌ No Internet Explorer support  

---

## 🧰 Troubleshooting

| Issue | Fix |
|---|---|
| **Native HTML validation tooltip appears** | Remove the native `required` attribute. Use `required-valid="true"` instead. |
| **Popover misplaced** | Avoid transforms on parent containers — the popover is `position: fixed`. |
| **Mobile tap feels delayed** | Add `touch-action: manipulation;` in your CSS (see above). |
| **Can’t scroll to past months on mobile** | Set `data-disable-past="false"` and configure `data-max-years-past`. |

---

## 🔒 Accessibility

Basic ARIA roles are present, but full screen reader support and keyboard navigation are planned for a future version.

---

## 📝 License

MIT License

---

## 📄 Quick Copy/Paste Example

```html
<link rel="stylesheet" href="wf-datepicker.css">
<input
  type="text"
  datepicker="range"
  placeholder="Select date range"
  data-date-format="DD MMM YYYY"
  data-range-separator=" — "
  data-disable-past="false"
  data-max-years-past="1"
  data-max-years="3"
  data-show-nights="true"
  required-valid="true"
  open-on-error="true"
  data-autoclose-first="true"
/>
<script src="wf-datepicker.js"></script>
```

---

## 💬 Notes

If you’d like to have **different date formats** for the **input field** and the **footer summary**, you can extend this version with:  
`data-date-format-input` and `data-date-format-footer` attributes.
