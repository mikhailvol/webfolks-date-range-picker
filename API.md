
# 🧩 WebFolks Date Range Picker — API Access

The WebFolks Date Range Picker automatically attaches an API instance to each input via the `__wfDatepicker` property.

Use it when you need **runtime control** or **integration with other scripts/Webflow Interactions** — beyond what attributes can configure.

---

## 🔹 Accessing the Instance

```js
const input = document.querySelector('input[datepicker="range"]');
const picker = input.__wfDatepicker;
```

> ⚠️ **Important:** The picker initializes automatically on page load.  
> If you run your script too early, `__wfDatepicker` may still be undefined.  
> Use the helper below to wait until it's ready.

### Wait-Until-Ready Helper

```js
window.addEventListener('load', () => {
  const input = document.querySelector('input[datepicker="range"]');
  const openBtn = document.querySelector('#open-dates');

  // wait until the library attaches __wfDatepicker
  const waitForPicker = () => {
    const picker = input && input.__wfDatepicker;
    if (!picker) return requestAnimationFrame(waitForPicker);

    // safe to use the API now
    openBtn.addEventListener('click', () => picker.open());
  };

  waitForPicker();
});
```

---

## ⚙️ Available Methods & Properties

| Method / Property | Description | Example |
|---|---|---|
| `picker.open()` | Opens the picker programmatically. | `picker.open()` |
| `picker.close(force)` | Closes the picker. Pass `true` to close instantly without animation. | `picker.close(true)` |
| `picker.start` / `picker.end` | Returns the currently selected start/end `Date` objects. | `console.log(picker.start, picker.end)` |

---

## 💡 Common Use Cases

### 1️⃣ Open/close via external button or Webflow Interaction

```js
document.querySelector('#open-dates').addEventListener('click', () => picker.open());
document.querySelector('#close-dates').addEventListener('click', () => picker.close(true));
```

---

### 2️⃣ React to date changes

Listen to the custom event and sync other fields, forms, or analytics:

```js
input.addEventListener('wf-datepicker:change', (e) => {
  const { startDate, endDate } = e.detail;
  console.log('Range selected:', startDate, endDate);
});
```

---

### 3️⃣ Custom validation or guided UX

```js
if (!picker.start || !picker.end) {
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  picker.open();
}
```

---

### 4️⃣ Sync values with hidden form inputs

```js
input.addEventListener('wf-datepicker:change', (e) => {
  const { startDate, endDate } = e.detail;
  document.querySelector('input[name="checkin"]').value  = startDate?.toISOString().slice(0,10) || '';
  document.querySelector('input[name="checkout"]').value = endDate?.toISOString().slice(0,10) || '';
});
```

---

### 5️⃣ Trigger analytics or external tracking

```js
input.addEventListener('wf-datepicker:change', (e) => {
  window.dataLayer?.push({
    event: 'date_range_selected',
    start: e.detail.startDate?.toISOString(),
    end:   e.detail.endDate?.toISOString(),
  });
});
```

---

## 🧠 When to Use the API

Use **attributes** for static configuration (format, min nights, alignment, etc.).  
Use the **API** when you need:

- to open/close the picker from another element,
- to read or modify selected dates programmatically,
- to trigger animations, validation, or analytics after selection,
- to integrate with Webflow interactions, hidden fields, or external scripts.

---

## 🧩 Example — Full Demo

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mikhailvol/webfolks-date-range-picker@v1.0.4/wf-datepicker.css">
<script src="https://cdn.jsdelivr.net/gh/mikhailvol/webfolks-date-range-picker@v1.0.4/wf-datepicker.js"></script>

<input type="text" datepicker="range" placeholder="Select date range">
<div id="open-dates">Open dates</div>

<script>
window.addEventListener('load', () => {
  const input = document.querySelector('input[datepicker="range"]');
  const openBtn = document.querySelector('#open-dates');

  const waitForPicker = () => {
    const picker = input && input.__wfDatepicker;
    if (!picker) return requestAnimationFrame(waitForPicker);

    openBtn.addEventListener('click', () => picker.open());
  };

  waitForPicker();
});
</script>
```

---

## 📜 License

MIT © Mikhail Voloshyn
