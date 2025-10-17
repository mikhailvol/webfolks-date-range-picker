(function() {
  // Utilities --------------------------------------------------------------
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const sameDay = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const isBetween = (date, start, end) => start && end && date > start && date < end;

  function formatWithPattern(date, pattern, locale) {
    const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
    const y = date.getFullYear();
    const M = date.getMonth() + 1;
    const d = date.getDate();

    const cache = (formatWithPattern._cache ||= new Map());
    const key = locale || 'default';
    let fmts = cache.get(key);
    if (!fmts) {
      fmts = {
        wShort: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
        wLong:  new Intl.DateTimeFormat(locale, { weekday: 'long'  }),
        mShort: new Intl.DateTimeFormat(locale, { month:   'short' }),
        mLong:  new Intl.DateTimeFormat(locale, { month:   'long'  }),
      };
      cache.set(key, fmts);
    }

    const wShort = fmts.wShort.format(date);
    const wLong  = fmts.wLong.format(date);
    const mShort = fmts.mShort.format(date);
    const mLong  = fmts.mLong.format(date);

    return pattern
      .replace(/YYYY/g, String(y))
      .replace(/yyyy/g, String(y))
      .replace(/YY/g, String(y).slice(-2))
      .replace(/yy/g, String(y).slice(-2))
      .replace(/MMMM/g, mLong)
      .replace(/MMM/g, mShort)
      .replace(/MM/g, pad2(M))
      .replace(/\bM\b/g, String(M))
      .replace(/DD/g, pad2(d))
      .replace(/dd/g, pad2(d))
      .replace(/\bD\b/g, String(d))
      .replace(/\bd\b/g, String(d))
      .replace(/EEEE/g, wLong)
      .replace(/EEE/g, wShort);
  }

  function cloneDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
  function isoDateStr(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }

  function nightsBetween(start, end) {
    const MS = 24*60*60*1000;
    return Math.round((end - start) / MS);
  }

  // Core Picker ------------------------------------------------------------
  class WFDateRangePicker {
    constructor(input, popover) {
      this.input   = input;
      this.popover = popover;

      this.today = new Date();
      this.today = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());

      // ----- Config -------------------------------------------------------
      const bool = (name, def=false) => {
        const v = input.getAttribute(name);
        return v == null ? def : (String(v).toLowerCase() === 'true');
      };
      const int  = (name, def=0, min=null, max=null) => {
        const raw = input.getAttribute(name);
        const n = parseInt(raw ?? '', 10);
        let x = isNaN(n) ? def : n;
        if (min != null) x = Math.max(min, x);
        if (max != null) x = Math.min(max, x);
        return x;
      };

      this.disablePast   = bool('data-wf-dp-disable-past', true);
      this.futureYears   = int('data-wf-dp-max-years', 2, 0);
      this.pastYears     = int('data-wf-dp-max-years-past', 2, 0);

      this.dateFormat    = input.getAttribute('data-wf-dp-format')    || 'EEE, MMM d';
      this.rangeSep      = input.getAttribute('data-wf-dp-separator') || ' — ';
      this.locale        = undefined;
      this.showNights    = bool('data-wf-dp-show-nights', false);

      this.isRequired     = bool('data-wf-dp-required', false);
      this.openOnError    = bool('data-wf-dp-open-on-error', false);
      this.autoCloseFirst = bool('data-wf-dp-autoclose-first', false);

      this.minNights     = int('data-wf-dp-min-nights', 1, 0);
      this.commitMode    = (input.getAttribute('data-wf-dp-commit-mode') || 'instant').toLowerCase();
      this.align         = (input.getAttribute('data-wf-dp-align') || 'center').toLowerCase();
      this.drop          = (input.getAttribute('data-wf-dp-drop')  || 'down').toLowerCase();

      if (this.input.hasAttribute('required')) this.input.removeAttribute('required');

      // ----- State --------------------------------------------------------
      this.start = null;
      this.end   = null;

      if (this.disablePast) {
        this.minSelectable = cloneDate(this.today);
        this.minMonth      = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      } else {
        this.minSelectable = new Date(this.today.getFullYear() - this.pastYears, this.today.getMonth(), this.today.getDate());
        this.minMonth      = new Date(this.minSelectable.getFullYear(), this.minSelectable.getMonth(), 1);
      }
      this.maxMonth  = new Date(this.today.getFullYear() + this.futureYears, this.today.getMonth(), 1);

      this._justOpened = false;
      this.leftMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      this.openCount = 0;

      this._focusedDate = null;
      this._popoverId = null;
      this._prevFocus = null;
      this._onKeydown = null;
      this._onDocEsc = null;

      this._suppressFocusOpen = false;
      this._lastPointerWasOnInput = false;
      this._lastFocusViaKeyboard = false;

      this._lastMobileScrollTop = 0;

      this._fmtMonthYear   = new Intl.DateTimeFormat(this.locale, { month:'long', year:'numeric' });
      this._fmtWeekdayShort= new Intl.DateTimeFormat(this.locale, { weekday:'short' });

      // gesture state for scroll-vs-tap
      this._g = { active:false, id:null, x:0, y:0, moved:false, target:null };

      this._bind();
      this.render();

      // Validation
      this.errorEl = document.createElement('div');
      this.errorEl.className = 'wf-dp-error';
      this.errorEl.textContent = 'Please select a date range.';
      this.errorEl.style.display = 'none';
      this.input.insertAdjacentElement('afterend', this.errorEl);

      this.input.addEventListener('invalid', (e) => { e.preventDefault(); this.showError(); });

      if (this.input.form) {
        this.input.form.addEventListener('submit', (e) => {
          const partial = !!(this.start && !this.end);
          if (partial || (this.isRequired && !this.isRangeComplete())) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.showError();
            if (this.openOnError) this.open(); else this.input.focus({ preventScroll:false });
            return false;
          }
        }, true);
      }

      this.input.addEventListener('input', () => this.hideError());
    }

    // Formatting helpers --------------------------------------------------
    fmt(d) { return formatWithPattern(d, this.dateFormat, this.locale); }
    formatPartial(start) { return `${this.fmt(start)}${this.rangeSep}End Date`; }
    formatRange(s, e) { return `${this.fmt(s)}${this.rangeSep}${this.fmt(e)}`; }
    formatFooterText() {
      if (this.start && this.end && (this.end > this.start || (this.minNights === 0 && sameDay(this.start, this.end)))) {
        const base = this.formatRange(this.start, this.end);
        if (!this.showNights) return base;
        const n = nightsBetween(this.start, this.end);
        return `${base} (${n} ${n===1?'night':'nights'})`;
      }
      if (this.start && !this.end) return this.formatPartial(this.start);
      return 'Select dates';
    }

    // Helpers --------------------------------------------------------------
    isMobile(){ return (window.innerWidth || document.documentElement.clientWidth) < 768; }
    isRangeComplete(){ return !!(this.start && this.end) && nightsBetween(this.start, this.end) >= this.minNights; }

    _isDateDisabled(cur) {
      if (!cur) return true;
      if (cur < this.minSelectable) return true;
      if (cur >= addMonths(this.maxMonth, 1)) return true;
      if (this.start && !this.end && this.minNights > 0 && cur > this.start) {
        const n = nightsBetween(this.start, cur);
        if (n < this.minNights) return true;
      }
      return false;
    }

    _clampToBounds(date) {
      const min = this.minSelectable;
      const max = new Date(this.maxMonth.getFullYear(), this.maxMonth.getMonth()+1, 0);
      if (date < min) return new Date(min);
      if (date > max) return new Date(max);
      return date;
    }

    _updateSelectionClasses() {
      const cells = this.popover.querySelectorAll('.wf-dp-cell[data-date]');
      const start = this.start, end = this.end, today = this.today;
      cells.forEach(cell => {
        const ds = cell.getAttribute('data-date');
        const [y,m,d] = ds.split('-').map(Number);
        const cur = new Date(y, m-1, d);

        const inRange = isBetween(cur, start, end);
        const isStart = start && sameDay(start, cur);
        const isEnd   = end   && sameDay(end, cur);
        const isToday = sameDay(cur, today);

        cell.classList.toggle('wf-dp-inrange', !!inRange);
        cell.classList.toggle('wf-dp-start', !!isStart);
        cell.classList.toggle('wf-dp-end', !!isEnd);
        cell.classList.toggle('wf-dp-today', !!isToday);

        let dynDisabled = false;
        if (start && !end && this.minNights > 0 && cur > start) {
          const n = nightsBetween(start, cur);
          dynDisabled = n < this.minNights;
        }
        const disabled = cell.classList.contains('wf-dp-disabled-static') || dynDisabled;
        cell.classList.toggle('wf-dp-disabled', disabled);
        if (disabled) {
          cell.removeAttribute('tabindex');
          cell.setAttribute('aria-hidden', 'true');
        } else {
          cell.setAttribute('tabindex', '0');
          cell.removeAttribute('aria-hidden');
        }
      });

      const footerLive = this.popover.querySelector('.wf-dp-footer-left, .wf-dp-m-footer .wf-dp-footer-left');
      if (footerLive) footerLive.textContent = this.formatFooterText();
      const cta = this.popover.querySelector('.wf-dp-cta');
      if (cta) cta.disabled = !this.isRangeComplete();
    }

    _setFocusedDate(d) { this._focusedDate = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null; }
    _focusCell(date) {
      const key = date && isoDateStr(date.getFullYear(), date.getMonth()+1, date.getDate());
      const cell = key && this.popover.querySelector(`.wf-dp-cell[data-date="${key}"]`);
      if (cell && !cell.classList.contains('wf-dp-disabled')) {
        cell.focus({ preventScroll: true });
        this._setFocusedDate(date);
        return true;
      }
      return false;
    }

    _moveFocusByDays(delta) {
      if (!this._focusedDate) this._focusedDate = this.start || this.today;
      let target = new Date(this._focusedDate);
      target.setDate(target.getDate() + delta);
      target = this._clampToBounds(target);

      const dir = delta === 0 ? 0 : (delta > 0 ? +1 : -1);
      if (dir !== 0 && this._isDateDisabled(target)) {
        let steps = 0;
        while (steps < 370 && this._isDateDisabled(target)) {
          target.setDate(target.getDate() + dir);
          target = this._clampToBounds(target);
          steps++;
        }
        if (steps >= 370) return;
      }

      if (!this.isMobile()) {
        const rightMonth = addMonths(this.leftMonth, 1);
        if (target < this.leftMonth && this.canGoPrev()) this.leftMonth = addMonths(this.leftMonth, -1);
        else if ((target.getFullYear() > rightMonth.getFullYear()
              || (target.getFullYear() === rightMonth.getFullYear() && target.getMonth() > rightMonth.getMonth()))
              && this.canGoNext()) this.leftMonth = addMonths(this.leftMonth, +1);
      }
      this.render();
      this._focusCell(target);
    }

    _ensureVisibleAndFocus(date) {
      if (!date) return;
      if (!this.isMobile()) {
        const right = addMonths(this.leftMonth, 1);
        if (date < this.leftMonth && this.canGoPrev()) this.leftMonth = addMonths(this.leftMonth, -1);
        else if ((date.getFullYear() > right.getFullYear()
              || (date.getFullYear() === right.getFullYear() && date.getMonth() > right.getMonth()))
              && this.canGoNext()) this.leftMonth = addMonths(this.leftMonth, +1);
        this.render();
        this._focusCell(date);
      } else {
        this._updateSelectionClasses();
        this._focusCell(date);
      }
    }

    _bind() {
      // Focus origin
      document.addEventListener('pointerdown', (e) => {
        this._lastPointerWasOnInput = (e.target === this.input);
        this._lastFocusViaKeyboard = false;
      }, true);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') this._lastFocusViaKeyboard = true;
      }, true);

      // Openers
      this.input.addEventListener('click', (e) => { e.stopPropagation(); this.open(); });
      this._onInputFocus ||= () => {
        if (this._suppressFocusOpen) return;
        if (!this._lastFocusViaKeyboard && !this._lastPointerWasOnInput) return;
        this.open();
      };
      this.input.addEventListener('focus', this._onInputFocus);

      // Close outside
      document.addEventListener('pointerdown', (e) => {
        if (!this.popover.contains(e.target) && e.target !== this.input) this.close(true);
      });
      this.popover.addEventListener('pointerdown', (e) => e.stopPropagation());

      // --- Guarded day selection (prevents scroll-accidental picks) -----
      const TAP_MOVE_TOL = 6; // px
      this._onPD = (e) => {
        if (e.button != null && e.button !== 0) return; // primary only
        const cell = e.target.closest('.wf-dp-cell[data-date]');
        this._g.active = true;
        this._g.id = e.pointerId ?? null;
        this._g.x = e.clientX;
        this._g.y = e.clientY;
        this._g.moved = false;
        this._g.target = cell && !cell.classList.contains('wf-dp-disabled') ? cell : null;
        // DO NOT preventDefault — allow natural scrolling
      };
      this._onPM = (e) => {
        if (!this._g.active) return;
        if (Math.abs(e.clientX - this._g.x) > TAP_MOVE_TOL || Math.abs(e.clientY - this._g.y) > TAP_MOVE_TOL) {
          this._g.moved = true;
        }
      };
      this._onPU = (e) => {
        if (!this._g.active) return;
        const wasTap = !this._g.moved && this._g.target;
        const target = this._g.target;
        this._g.active = false; this._g.target = null;
        if (!wasTap) return;

        const [y,m,d] = target.getAttribute('data-date').split('-').map(Number);
        const date = new Date(y, m-1, d);
        this.selectDay(date);
        // Prevents subsequent synthetic click (speeds up feel on some browsers)
        e.preventDefault();
      };
      this.popover.addEventListener('pointerdown', this._onPD);
      this.popover.addEventListener('pointermove', this._onPM);
      this.popover.addEventListener('pointerup',   this._onPU);

      // Focus-out closes
      this._onDocFocusIn ||= (e) => {
        if (!this.popover.classList.contains('open')) return;
        const t = e.target;
        if (t === this.input) return;
        if (this.popover.contains(t)) return;
        this.close(true);
      };
      document.addEventListener('focusin', this._onDocFocusIn);

      // Layout
      window.addEventListener('resize', () => {
        if (this.popover.classList.contains('open')) {
          this.render();
          this.position();
          requestAnimationFrame(() => this.position());
        }
      });
      window.addEventListener('scroll', () => { if (!this.isMobile()) this.position(); }, true);
    }

    open() {
      this.openCount += 1;
      this._justOpened = true;
      this.popover.classList.add('open');
      this.render();

      // ARIA
      this.popover.setAttribute('role', this.isMobile() ? 'dialog' : 'group');
      if (this.isMobile()) this.popover.setAttribute('aria-modal', 'true'); else this.popover.removeAttribute('aria-modal');
      this.input.setAttribute('aria-expanded', 'true');
      this.input.setAttribute('aria-controls', this._popoverId ||= `wf-dp-${Math.random().toString(36).slice(2)}`);
      this.popover.id = this._popoverId;

      // Focus
      this._prevFocus = document.activeElement;
      this._setFocusedDate(this.start || this.today);
      this.position();
      requestAnimationFrame(() => {
        this.position();
        if (!this._focusCell(this._focusedDate)) {
          const first = this.popover.querySelector('.wf-dp-cell:not(.wf-dp-disabled)');
          first?.focus({ preventScroll: true });
        }
      });

      // Keys
      this._onKeydown ||= (e) => {
        const k = e.key;
        if (k === 'Tab') {
          const activeEl = document.activeElement;
          const activeDayEl = activeEl?.closest?.('.wf-dp-cell[data-date]');
          if (activeDayEl) {
            e.preventDefault();
            const [y, m, d] = activeDayEl.getAttribute('data-date').split('-').map(Number);
            const current = new Date(y, m - 1, d);
            const dir = e.shiftKey ? -1 : +1;

            let next = new Date(current);
            next.setDate(next.getDate() + dir);
            next = this._clampToBounds(next);

            if (this._isDateDisabled(next)) {
              let steps = 0;
              const s = e.shiftKey ? -1 : +1;
              while (steps < 370 && this._isDateDisabled(next)) {
                next.setDate(next.getDate() + s);
                next = this._clampToBounds(next);
                steps++;
              }
              if (steps >= 370) return;
            }
            this._ensureVisibleAndFocus(next);
            return;
          }
        }
        if (k === 'Escape' || k === 'Esc') { e.preventDefault(); this.close(true); this.input.focus(); return; }
        if (k === 'Enter' || k === ' ') {
          e.preventDefault();
          const cta = this.popover.querySelector('.wf-dp-cta');
          const focusedEl = document.activeElement;
          const focusedDay = focusedEl?.closest('.wf-dp-cell[data-date]');
          if (focusedEl && focusedEl.classList.contains('wf-dp-cta')) { cta?.click(); return; }
          if (this.commitMode === 'confirm' && this.isRangeComplete()) { cta?.click(); return; }
          if (focusedDay) {
            const [y,m,d] = focusedDay.getAttribute('data-date').split('-').map(Number);
            this.selectDay(new Date(y, m-1, d));
            const ctaNow = this.popover.querySelector('.wf-dp-cta');
            if (this.commitMode === 'confirm' && this.isRangeComplete()) ctaNow?.focus();
            else this._focusCell(this.end || this.start || this._focusedDate);
            return;
          }
          if (cta && !cta.disabled) cta.focus();
          return;
        }
        if (k === 'ArrowLeft')  { e.preventDefault(); this._moveFocusByDays(-1); return; }
        if (k === 'ArrowRight') { e.preventDefault(); this._moveFocusByDays(+1); return; }
        if (k === 'ArrowUp')    { e.preventDefault(); this._moveFocusByDays(-7); return; }
        if (k === 'ArrowDown')  { e.preventDefault(); this._moveFocusByDays(+7); return; }
        if (k === 'PageUp')     { e.preventDefault(); this.leftMonth = addMonths(this.leftMonth, -1); this.render(); this._moveFocusByDays(0); return; }
        if (k === 'PageDown')   { e.preventDefault(); this.leftMonth = addMonths(this.leftMonth, +1); this.render(); this._moveFocusByDays(0); return; }
        if (k === 'Home') { e.preventDefault(); const dow = (this._focusedDate?.getDay() ?? this.today.getDay()); const mon = (dow + 6) % 7; this._moveFocusByDays(-mon); return; }
        if (k === 'End')  { e.preventDefault(); const dow = (this._focusedDate?.getDay() ?? this.today.getDay()); const mon = (dow + 6) % 7; this._moveFocusByDays(6 - mon); return; }
      };
      this.popover.addEventListener('keydown', this._onKeydown);

      this._onDocEsc ||= (e) => {
        if (!this.popover.classList.contains('open')) return;
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); this.close(true); this.input.focus(); }
      };
      document.addEventListener('keydown', this._onDocEsc, true);
    }

    close(triggerValidation = false) {
      if (!this.popover.classList.contains('open')) return;
      this.popover.classList.remove('open');

      this.input.setAttribute('aria-expanded', 'false');
      if (this._onKeydown) this.popover.removeEventListener('keydown', this._onKeydown);
      if (this._onDocEsc) document.removeEventListener('keydown', this._onDocEsc, true);

      if (triggerValidation) {
        const partial = !!(this.start && !this.end);
        if (partial || (this.isRequired && !this.isRangeComplete())) this.showError();
        else this.hideError();
      }

      if (this._prevFocus && this._prevFocus.focus) {
        if (this._prevFocus === this.input) {
          this._suppressFocusOpen = true;
          setTimeout(() => { this._suppressFocusOpen = false; }, 50);
        }
        this._prevFocus.focus();
      }
    }

    position() {
      if (this.isMobile()) {
        Object.assign(this.popover.style, {
          position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
          width: '100vw', height: '100vh', transform: 'none'
        });
        return;
      }
      const r = this.input.getBoundingClientRect();
      const pop = this.popover;

      let drop = this.drop;
      if (drop === 'auto') {
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - r.bottom;
        const spaceAbove = r.top;
        drop = spaceBelow < 350 && spaceAbove > spaceBelow ? 'up' : 'down';
      }

      let top;
      if (drop === 'up') {
        const estH = pop.offsetHeight || 300;
        top = r.top - estH - 8;
      } else top = r.bottom + 8;

      let left = r.left;
      let transform = 'none';
      if (this.align === 'center') { left = r.left + (r.width / 2); transform = 'translateX(-50%)'; }
      else if (this.align === 'right') { left = r.right; transform = 'translateX(-100%)'; }

      Object.assign(pop.style, { position:'fixed', top:`${top}px`, left:`${left}px`, right:'', bottom:'', width:'', height:'', transform });

      requestAnimationFrame(() => {
        const padX = 8, vw = window.innerWidth || document.documentElement.clientWidth, vh = window.innerHeight || document.documentElement.clientHeight;
        const popW = pop.offsetWidth || 0, popH = pop.offsetHeight || 0;
        if (drop === 'up') { top = r.top - popH - 8; pop.style.top = `${Math.max(8, top)}px`; }
        else { const maxTop = vh - popH - 8; if (top > maxTop) pop.style.top = `${Math.max(8, maxTop)}px`; }
        let actualLeft = left;
        if (transform === 'translateX(-50%)') actualLeft = left - popW / 2;
        if (transform === 'translateX(-100%)') actualLeft = left - popW;
        const clampedLeft = Math.max(padX, Math.min(actualLeft, vw - popW - padX));
        if (clampedLeft !== actualLeft) { pop.style.transform = 'none'; pop.style.left = `${clampedLeft}px`; }
      });
    }

    canGoPrev(){ return addMonths(this.leftMonth, -1) >= this.minMonth; }
    canGoNext(){ return addMonths(this.leftMonth,  1) <  this.maxMonth; }
    goPrev(){ if (this.canGoPrev()) { this.leftMonth = addMonths(this.leftMonth, -1); this.render(); } }
    goNext(){ if (this.canGoNext()) { this.leftMonth = addMonths(this.leftMonth,  1); this.render(); } }

    selectDay(date) {
      if (date < this.minSelectable) return;
      if (date >= addMonths(this.maxMonth, 1)) return;

      if (!this.start || (this.start && this.end)) {
        this.start = date; this.end = null;
        if (this.commitMode === 'instant') this.input.value = this.formatPartial(this.start);
        this.hideError?.();
        this.input.dispatchEvent(new CustomEvent('wf-datepicker:partial', { bubbles:true, composed:true, detail:{ startDate: cloneDate(this.start) }}));
        this._ensureVisibleAndFocus(this.start);
      } else if (this.start && !this.end) {
        const n = nightsBetween(this.start, date);
        if (date > this.start) {
          if (n >= this.minNights) {
            this.end = date;
            if (this.commitMode === 'instant') this.commit();
            this._ensureVisibleAndFocus(this.end);
          } else {
            if (this.isMobile()) this._updateSelectionClasses();
          }
        } else if (date < this.start) {
          this.start = date; this.end = null;
          if (this.commitMode === 'instant') this.input.value = this.formatPartial(this.start);
          this.hideError?.();
          this.input.dispatchEvent(new CustomEvent('wf-datepicker:partial', { bubbles:true, composed:true, detail:{ startDate: cloneDate(this.start) }}));
          this._ensureVisibleAndFocus(this.start);
          return;
        } else {
          if (this.minNights === 0) {
            this.end = date;
            if (this.commitMode === 'instant') this.commit();
            this._ensureVisibleAndFocus(this.end);
          } else {
            this._ensureVisibleAndFocus(this.start);
            return;
          }
        }
      }
      // No extra render here
    }

    commit() {
      if (!this.isRangeComplete()) return;
      this.input.value = this.formatRange(this.start, this.end);
      this.hideError?.();
      if (this.autoCloseFirst && this.openCount === 1 && !this.isMobile()) this.close(true);
      const evt = new CustomEvent('wf-datepicker:change', { bubbles:true, composed:true, detail:{ startDate: cloneDate(this.start), endDate: cloneDate(this.end) } });
      this.input.dispatchEvent(evt);
    }

    render() {
      const rightMonth = addMonths(this.leftMonth, 1);
      const footerText = this.formatFooterText();
      const disableCta = this.isRangeComplete() ? '' : 'disabled';
      this.popover.classList.add('wf-dp-rendering');

      let oldScrollTop = null;
      if (this.isMobile()) {
        const scroller = this.popover.querySelector('.wf-dp-m-scroll');
        if (scroller) oldScrollTop = scroller.scrollTop;
        if (oldScrollTop != null) this._lastMobileScrollTop = oldScrollTop;
      }

      // Build UI
      if (this.isMobile()) {
        const firstMonth = new Date(this.minMonth.getFullYear(), this.minMonth.getMonth(), 1);
        const months = [];
        let cursor = new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1);
        while (cursor <= this.maxMonth) {
          months.push(this.renderMonth(cursor, false));
          cursor = addMonths(cursor, 1);
        }

        this.popover.innerHTML =
        `<div class="wf-dp-modal">
            <div class="wf-dp-m-header">
              <div class="wf-dp-m-title">Select dates</div>
              <button type="button" class="wf-dp-m-close" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 1 0-1.41 1.41L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
                </svg>
              </button>
            </div>

            <div class="wf-dp-m-weekdays" aria-hidden="true">
              ${this.getWeekdays().map(w=>`<div class="wf-dp-weekday">${w}</div>`).join('')}
            </div>

            <div class="wf-dp-m-scroll">
              <div class="wf-dp-cal wf-dp-cal--stack" role="grid" aria-label="Calendar">
                ${months.join('')}
              </div>
            </div>

            <div class="wf-dp-m-footer">
              <div class="wf-dp-footer-left" aria-live="polite">${footerText}</div>
              <button type="button" class="wf-dp-cta" ${disableCta}>Select dates</button>
            </div>
         </div>`;
      } else {
        this.popover.innerHTML =
          `<div class="wf-dp-cal-wrap">
             <button type="button" class="wf-dp-btn prev" data-nav="prev" ${this.canGoPrev() ? '' : 'disabled'} aria-label="Previous Month">
               <svg width="100%" height="100%" viewBox="0 0 48 48" fill="currentColor">
                 <path d="M30.83 32.67L21.66 23.5L30.83 14.33L28 11.5L16 23.5L28 35.5L30.83 32.67Z"/>
               </svg>
             </button>
             <div class="wf-dp-cal" role="grid" aria-label="Calendar">${this.renderMonth(this.leftMonth, true)}${this.renderMonth(rightMonth, true)}</div>
             <button type="button" class="wf-dp-btn next" data-nav="next" ${this.canGoNext() ? '' : 'disabled'} aria-label="Next Month">
               <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                 <path d="M17.17 32.92L26.34 23.75L17.17 14.58L20 11.75L32 23.75L20 35.75L17.17 32.92Z"/>
               </svg>
             </button>
           </div>
           <div class="wf-dp-footer">
             <div class="wf-dp-footer-left" aria-live="polite">${footerText}</div>
             <button type="button" class="wf-dp-cta" ${disableCta}>Select dates</button>
           </div>`;
      }

      const prevBtn = this.popover.querySelector('[data-nav="prev"]');
      const nextBtn = this.popover.querySelector('[data-nav="next"]');
      if (prevBtn) prevBtn.addEventListener('click', () => this.goPrev());
      if (nextBtn) nextBtn.addEventListener('click', () => this.goNext());

      const cta = this.popover.querySelector('.wf-dp-cta');
      if (cta) {
        cta.addEventListener('click', () => {
          if (this.commitMode === 'confirm') {
            if (this.isRangeComplete()) this.commit();
          }
          this.close(true);
        });
        cta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cta.click(); }
        });
      }

      const mobileClose = this.popover.querySelector('.wf-dp-m-close');
      if (mobileClose) mobileClose.addEventListener('click', () => this.close(true));

      // mark static-disabled once
      this.popover.querySelectorAll('.wf-dp-cell[data-date]').forEach(cell => {
        const [y,m,d] = cell.getAttribute('data-date').split('-').map(Number);
        const cur = new Date(y, m-1, d);
        const outOfRange = (cur < this.minSelectable) || (cur >= addMonths(this.maxMonth, 1));
        if (outOfRange) cell.classList.add('wf-dp-disabled', 'wf-dp-disabled-static');
      });

      // Mobile scroll anchoring
      if (this.isMobile()) {
        const scroller = this.popover.querySelector('.wf-dp-m-scroll');
        if (scroller) {
          if (this._justOpened) {
            const anchorDate = this.start ? this.start : this.today;
            const keyAnchor = `${anchorDate.getFullYear()}-${('0'+(anchorDate.getMonth()+1)).slice(-2)}`;
            const sticky = this.getMobileStickyOffset?.() || 0;
            const anchorEl = scroller.querySelector(`.wf-dp-month[data-key="${keyAnchor}"]`);
            if (anchorEl) scroller.scrollTop = Math.max(0, anchorEl.offsetTop - sticky);
            this._justOpened = false;
            requestAnimationFrame(() => { if (anchorEl) scroller.scrollTop = Math.max(0, anchorEl.offsetTop - sticky); });
          } else {
            const target = (oldScrollTop != null) ? oldScrollTop : this._lastMobileScrollTop || 0;
            scroller.scrollTop = target;
            requestAnimationFrame(() => { scroller.scrollTop = target; });
          }
        }
      }

      // 🔸 Always reflect selection classes after any render (fixes desktop highlight)
      this._updateSelectionClasses();

      requestAnimationFrame(() => this.popover.classList.remove('wf-dp-rendering'));
    }

    renderMonth(date, includeWeekdays = true) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth  = new Date(year, month + 1, 0);
      const daysInMonth  = lastOfMonth.getDate();

      let startIdx = (firstOfMonth.getDay() + 6) % 7; // Monday-first
      const title  = this._fmtMonthYear.format(firstOfMonth);
      const key    = `${year}-${('0'+(month+1)).slice(-2)}`; // YYYY-MM

      let html = `<div class="wf-dp-month" data-key="${key}" role="rowgroup">`;
      html += `<div class="wf-dp-month-title">${title}</div>`;
      if (includeWeekdays) {
        html += `<div class="wf-dp-weekdays" aria-hidden="true">${this.getWeekdays().map(w=>`<div class="wf-dp-weekday">${w}</div>`).join('')}</div>`;
      }
      html += `<div class="wf-dp-grid" role="rowgroup">`;

      for (let i=0;i<startIdx;i++) html += `<div class="wf-dp-cell wf-dp-empty" aria-hidden="true">0</div>`;

      for (let d=1; d<=daysInMonth; d++) {
        const cur = new Date(year, month, d);
        const outOfRange = (cur < this.minSelectable) || (cur >= addMonths(this.maxMonth, 1));
        const isToday = sameDay(cur, this.today);

        const classes = [ 'wf-dp-cell' ];
        if (outOfRange) classes.push('wf-dp-disabled', 'wf-dp-disabled-static');
        if (isToday)   classes.push('wf-dp-today');

        const ariaLabel = isoDateStr(year, month+1, d);
        const focusable = !outOfRange;
        const tabAttrs = focusable ? ` tabindex="0" role="button" aria-label="${ariaLabel}"` : ' aria-hidden="true"';

        html += `<div class="${classes.join(' ')}" data-date="${isoDateStr(year, month+1, d)}"${tabAttrs}><span class="wf-dp-day">${d}</span></div>`;
      }

      html += `</div></div>`;
      return html;
    }

    getWeekdays() {
      const base = new Date(2024, 0, 1); // Monday
      return Array.from({ length: 7 }, (_, i) => this._fmtWeekdayShort.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
    }

    showError(){ if (this.errorEl) this.errorEl.style.display = 'block'; this.input.classList.add('wf-dp-input-error'); }
    hideError(){ if (this.errorEl) this.errorEl.style.display = 'none'; this.input.classList.remove('wf-dp-input-error'); }
    getMobileStickyOffset() {
      const header   = this.popover.querySelector('.wf-dp-m-header');
      const weekdays = this.popover.querySelector('.wf-dp-m-weekdays');
      return (header ? header.offsetHeight : 0) + (weekdays ? weekdays.offsetHeight : 0);
    }

    // Public API
    setRange(startDate, endDate) {
      this.start = startDate ? cloneDate(startDate) : null;
      this.end   = endDate   ? cloneDate(endDate)   : null;
      if (this.start && this.end && this.isRangeComplete()) this.input.value = this.formatRange(this.start, this.end);
      else this.input.value = this.start ? this.formatPartial(this.start) : '';
      this.hideError();
      if (this.isMobile()) this._updateSelectionClasses(); else this.render();
    }
    clear(){ this.setRange(null, null); }
    getValue(){ return { start: this.start && cloneDate(this.start), end: this.end && cloneDate(this.end) }; }
  }

  // Auto-init --------------------------------------------------------------
  function initWFDatepickers() {
    const inputs = document.querySelectorAll('input[datepicker="range"]');
    inputs.forEach((input) => {
      if (input.__wfDatepicker) return;

      input.setAttribute('readonly', '');
      input.setAttribute('inputmode', 'none');
      input.setAttribute('autocomplete', 'off');

      const pop = document.createElement('div');
      pop.className = 'wf-dp-popover';
      document.body.appendChild(pop);

      const picker = new WFDateRangePicker(input, pop);
      input.__wfDatepicker = picker;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWFDatepickers);
  } else {
    initWFDatepickers();
  }

  // Global & targeted reset -----------------------------------------------
  document.addEventListener('click', (e) => {
    const resetEl = e.target.closest('[data-wf-dp-reset]');
    if (!resetEl) return;

    const targetSelector = resetEl.getAttribute('data-wf-dp-target') || null;
    const inputs = targetSelector ? document.querySelectorAll(targetSelector) : document.querySelectorAll('input[datepicker="range"]');

    inputs.forEach((input) => {
      const picker = input.__wfDatepicker;
      if (!picker) return;

      picker.start = null;
      picker.end = null;
      picker.input.value = '';
      picker.hideError?.();

      if (picker.isMobile()) picker._updateSelectionClasses(); else picker.render();

      const evt = new CustomEvent('wf-datepicker:reset', { bubbles:true, composed:true, detail:{ resetBy: resetEl } });
      picker.input.dispatchEvent(evt);
    });

    updateResetVisibility();
  });

  // Toggle reset visibility -----------------------------------------------
  function updateResetVisibility() {
    document.querySelectorAll('[data-wf-dp-reset][data-wf-dp-hide-when-empty]').forEach((btn) => {
      const targetSelector = btn.getAttribute('data-wf-dp-target') || 'input[datepicker="range"]';
      const inputs = document.querySelectorAll(targetSelector);
      const hasSelection = Array.from(inputs).some((input) => {
        const picker = input.__wfDatepicker;
        return (picker && picker.start) || (input.value.trim() !== '');
      });
      btn.style.display = hasSelection ? 'block' : 'none';
    });
  }

  // Initial & listeners
  updateResetVisibility();
  document.addEventListener('wf-datepicker:change', updateResetVisibility);
  document.addEventListener('wf-datepicker:partial', updateResetVisibility);
  document.addEventListener('wf-datepicker:reset', updateResetVisibility);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.matches('input[datepicker="range"]')) updateResetVisibility();
  });

  window.WFDateRangePicker = WFDateRangePicker;
})();
