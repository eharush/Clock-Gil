// תוכן הלימוד: עזרי זמן בעברית, שלבי ההסבר ומחוללי השאלות לכל שלב.
(function () {
  // ---------- עזרים ----------
  const HOURS = ['שתים עשרה', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת עשרה'];
  const FIVES = { 5: 'חמש', 10: 'עשר', 20: 'עשרים', 25: 'עשרים וחמש' };

  const wrapH = h => ((((h - 1) % 12) + 12) % 12) + 1;
  const pad = m => String(m).padStart(2, '0');
  const digital = (h, m) => `${wrapH(h)}:${pad(m)}`;
  const hourName = h => HOURS[wrapH(h) % 12];

  function timeWords(h, m) {
    const H = hourName(h);
    const N = hourName(h + 1);
    if (m === 0) return H;
    if (m === 15) return `${H} ורבע`;
    if (m === 30) return `${H} וחצי`;
    if (m === 45) return `רבע ל${N}`;
    if (m < 30 && FIVES[m]) return `${H} ו${FIVES[m]} דקות`;
    if (m > 30 && FIVES[60 - m]) return `${FIVES[60 - m]} ל${N}`;
    return `${H} ו־${m} דקות`;
  }

  const dig = (h, m) => `<span class="dig" dir="ltr">${digital(h, m)}</span>`;
  const H = t => `<span class="t-hour">${t}</span>`;
  const M = t => `<span class="t-min">${t}</span>`;

  function explainTime(h, m) {
    const hp = m === 0 ? `${H('המחוג הקצר')} מצביע על ${wrapH(h)}` : `${H('המחוג הקצר')} כבר עבר את ה־${wrapH(h)}`;
    const n = m / 5 || 12;
    const mp = m === 0 ? `${M('המחוג הארוך')} על 12, כלומר שעה עגולה` : `${M('המחוג הארוך')} על ה־${n}, ו־${n}×5 = ${m} דקות`;
    return `${hp}, ו${mp}. השעה ${dig(h, m)}, ${timeWords(h, m)}.`;
  }

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // זמנים אקראיים בלי חזרות
  function uniqueTimes(count, minutes, hours) {
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < count && guard++ < 500) {
      const h = pick(hours || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const m = pick(minutes);
      const k = `${h}:${m}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([h, m]);
    }
    return out;
  }
  const handsApart = (h, m) => {
    const md = m * 6;
    const hd = ((h % 12) * 30 + m * 0.5) % 360;
    const d = Math.abs(md - hd) % 360;
    return Math.min(d, 360 - d) >= 60;
  };

  // ---------- מחוללי שאלות ----------
  function timeOption(h, m, style) {
    const key = `${wrapH(h)}:${m}`;
    if (style === 'words') return { key, html: `<span class="opt-words">${timeWords(h, m)}</span>` };
    return { key, html: `<span class="opt-dig" dir="ltr">${digital(h, m)}</span><span class="opt-words">${timeWords(h, m)}</span>` };
  }

  // מסיחים שמבוססים על טעויות נפוצות
  function readQ(h, m, opts) {
    const o = opts || {};
    const n = m / 5 || 12;
    const cand = [
      [h + 1, m],                       // לקחו את המספר הבא במקום המספר שהמחוג הקצר עבר
      [n, (wrapH(h) * 5) % 60],         // החליפו בין המחוגים
      [h, n === 12 ? 12 : n],           // קראו את המספר כדקות במקום לכפול ב-5
      [h - 1, m],
      [h, (m + 30) % 60],
    ];
    const keys = new Set([`${wrapH(h)}:${m}`]);
    const options = [timeOption(h, m, o.style)];
    options[0].correct = true;
    const pool = o.pool || [0, 15, 30, 45];
    for (const [ch, cm] of cand.concat(Array.from({ length: 12 }, () => [rnd(1, 12), pick(pool)]))) {
      if (options.length >= 4) break;
      if (cm < 0 || cm > 59) continue;
      const k = `${wrapH(ch)}:${cm}`;
      if (keys.has(k)) continue;
      keys.add(k);
      options.push(timeOption(ch, cm, o.style));
    }
    return {
      type: 'choice',
      prompt: o.prompt || 'מה השעה בשעון?',
      clock: Object.assign({ h, m }, o.clock || {}),
      options: shuffle(options),
      explain: explainTime(h, m),
      hint: o.hint || `קודם ${H('המחוג הקצר')}: איזה מספר הוא כבר עבר? אחר כך ${M('המחוג הארוך')}: ספרו בקפיצות של 5.`,
      onWrong: c => c.setRing(true),
      wide: o.style !== 'words',
    };
  }

  function setQ(h, m, opts) {
    const o = opts || {};
    let sh, sm;
    do {
      sh = rnd(1, 12);
      sm = o.startM != null ? o.startM : 0;
    } while (wrapH(sh) === wrapH(h) && sm === m);
    return {
      type: 'set',
      prompt: o.prompt || `כוונו את השעון ל־${dig(h, m)}, ${timeWords(h, m)}`,
      target: { h: wrapH(h), m },
      clock: { h: sh, m: sm, mode: 'drag', draggable: o.draggable || ['hour', 'minute'], snap: o.snap || 5 },
      explain: explainTime(h, m),
    };
  }

  function choiceQ(prompt, correct, wrong, extra) {
    const options = shuffle([{ html: correct, correct: true }].concat(wrong.map(w => ({ html: w }))));
    return Object.assign({ type: 'choice', prompt, options, clock: { h: 10, m: 10 } }, extra || {});
  }

  // ---------- השלבים ----------
  const LEVELS = [
    {
      id: 'numbers',
      title: 'הכירו את השעון',
      sub: '12 מספרים במעגל',
      color: 'sun',
      icon: { h: 12, m: 0, hideHands: ['hour', 'minute'] },
      steps: [
        {
          title: 'פני השעון',
          text: 'זה שעון מחוגים. על הפנים שלו יש <b>12 מספרים</b>, מ־1 עד 12, והם מסודרים במעגל כמו פיצה שחתכו ל־12 משולשים.',
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'] },
          actions: [{
            label: 'ספרו איתי עד 12',
            run: async (c, ui) => {
              for (let n = 1; n <= 12; n++) {
                c.setHighlightNums([{ n, cls: 'accent' }]);
                ui.sfx.pop(n);
                ui.note(`<span class="big-num">${n}</span>`);
                if (!(await c.wait(420))) return;
              }
              c.setHighlightNums([]);
              ui.note('12 מספרים. אחרי 12 מתחילים שוב מ־1.');
            },
          }],
        },
        {
          title: 'ארבעת עמודי התווך',
          text: 'ארבעה מספרים תמיד באותו מקום, ולפיהם קל למצוא את כל השאר:<ul class="pillars"><li><b>12</b> תמיד למעלה</li><li><b>3</b> תמיד בצד ימין</li><li><b>6</b> תמיד למטה</li><li><b>9</b> תמיד בצד שמאל</li></ul>',
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'], hlNums: [{ n: 12, cls: 'berry' }, { n: 3, cls: 'leaf' }, { n: 6, cls: 'sun' }, { n: 9, cls: 'sky' }] },
        },
        {
          title: 'כיוון השעון',
          text: 'המספרים עולים בכיוון אחד: מה־12 למעלה פונים ימינה, יורדים למטה, עולים בצד שמאל וחוזרים ל־12. לכיוון הזה קוראים <b>"עם כיוון השעון"</b>, וגם המחוגים תמיד מסתובבים כך.',
          clock: { h: 12, m: 0, hideHands: ['hour'] },
          actions: [{
            label: 'הראו לי את הכיוון',
            run: async c => {
              c.startSweep();
              await c.tweenTotal(c.total + 60, 3200);
              if (await c.wait(500)) c.clearSweep();
            },
          }],
        },
        {
          title: 'תורכם',
          text: 'לחצו על מספרים בשעון. נסו למצוא קודם את 12, 3, 6 ו־9, ואז את המספרים שביניהם.',
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'], mode: 'number' },
          setup: (c, ui) => {
            c.onNumber = n => {
              ui.sfx.pop(n);
              c.setHighlightNums([{ n, cls: 'accent' }]);
              const where = { 12: ' – למעלה', 3: ' – בצד ימין', 6: ' – למטה', 9: ' – בצד שמאל' }[n] || '';
              ui.note(`זה המספר <span class="big-num">${n}</span>${where}`);
            };
          },
        },
      ],
      questions() {
        const visible = [];
        const order = shuffle([12, 3, 6, 9]).concat(shuffle([1, 2, 4, 5, 7, 8, 10, 11]).slice(0, 3));
        const qs = order.map(n => ({
          type: 'number',
          prompt: `איפה נמצא המספר <span class="big-inline">${n}</span>? לחצו על העיגול הנכון.`,
          target: n,
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'], numbers: 'slots', visibleNums: visible, mode: 'number' },
          keepNumbers: visible,
          hint: [12, 3, 6, 9].includes(n)
            ? 'זכרו: 12 למעלה, 3 בימין, 6 למטה, 9 בשמאל.'
            : 'מצאו מספר שאתם כבר מכירים, ומשם ספרו עם כיוון השעון.',
          explain: `נכון! זה המקום של ${n}.`,
        }));
        qs.splice(4, 0, choiceQ('איזה מספר נמצא תמיד <b>למטה</b>, מול ה־12?', '6', ['3', '9', '1'], {
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'], numbers: 'slots', visibleNums: [12] },
          explain: 'ה־6 נמצא בדיוק מול ה־12, בתחתית השעון.',
          hint: 'דמיינו קו ישר מה־12 למטה דרך מרכז השעון.',
        }));
        return qs;
      },
    },

    {
      id: 'hands',
      title: 'מחוג קצר, מחוג ארוך',
      sub: 'מי מראה שעות ומי דקות',
      color: 'hour',
      icon: { h: 10, m: 10, hl: 'both' },
      steps: [
        {
          title: 'שני מחוגים',
          text: 'לשעון יש שני <b>מחוגים</b>, מעין חיצים שיוצאים מהמרכז ומסתובבים. לכל אחד יש תפקיד אחר.',
          clock: { h: 10, m: 10 },
        },
        {
          title: 'המחוג הקצר: שעות',
          text: `${H('המחוג הקצר והעבה')} הוא <b>מחוג השעות</b>. הוא מראה איזו שעה עכשיו. בשעון שלנו הוא תמיד כתום.`,
          clock: { h: 10, m: 10, hl: 'hour' },
        },
        {
          title: 'המחוג הארוך: דקות',
          text: `${M('המחוג הארוך והדק')} הוא <b>מחוג הדקות</b>. הוא מראה כמה דקות עברו מאז השעה העגולה. בשעון שלנו הוא תמיד כחול.`,
          clock: { h: 10, m: 10, hl: 'minute' },
        },
        {
          title: 'טריק לזכור',
          text: `במילה ${H('שעה')} יש 3 אותיות, ובמילה ${M('דקות')} יש 4.<br>מילה קצרה, מחוג קצר. מילה ארוכה, מחוג ארוך.`,
          clock: { h: 10, m: 10, hl: 'both' },
        },
        {
          title: 'מהיר ואיטי',
          text: `${M('המחוג הארוך')} ממהר, ו${H('המחוג הקצר')} זז לאט. בזמן שהארוך מסתובב סיבוב שלם, הקצר מתקדם רק ממספר אחד למספר הבא.`,
          clock: { h: 2, m: 0 },
          readout: true,
          actions: [{
            label: 'הריצו 3 שעות קדימה',
            run: async c => {
              await c.tweenTotal(c.total + 180, 7000);
            },
          }],
        },
      ],
      questions() {
        const qs = [];
        const targets = shuffle(['hour', 'minute', 'hour', 'minute']);
        const times = uniqueTimes(20, [5, 10, 15, 20, 25, 35, 40, 45, 50, 55]).filter(([h, m]) => handsApart(h, m));
        targets.forEach((t, i) => {
          const [h, m] = times[i];
          qs.push({
            type: 'hand',
            prompt: t === 'hour' ? 'לחצו על <b>מחוג השעות</b>' : 'לחצו על <b>מחוג הדקות</b>',
            target: t,
            clock: { h, m, neutral: true, mode: 'hand' },
            hint: t === 'hour' ? 'מחוג השעות הוא הקצר מבין השניים.' : 'מחוג הדקות הוא הארוך מבין השניים.',
            explain: t === 'hour' ? `נכון! ${H('הקצר')} מראה שעות.` : `נכון! ${M('הארוך')} מראה דקות.`,
          });
        });
        qs.splice(2, 0, choiceQ('איזה מחוג זז מהר יותר?', `${M('המחוג הארוך')}, מחוג הדקות`, [`${H('המחוג הקצר')}, מחוג השעות`], {
          explain: 'המחוג הארוך מסתובב סיבוב שלם בכל שעה. הקצר צריך 12 שעות לסיבוב.',
          hint: 'דקות עוברות הרבה יותר מהר משעות.',
        }));
        qs.push(choiceQ(`${H('המחוג הקצר')} מראה את...`, 'השעות', ['הדקות', 'השניות'], {
          explain: 'מילה קצרה, מחוג קצר: שעה.',
          hint: 'זכרו את הטריק: "שעה" מילה קצרה.',
        }));
        return qs;
      },
    },

    {
      id: 'oclock',
      title: 'שעה עגולה',
      sub: 'סיבוב שלם = שעה',
      color: 'leaf',
      icon: { h: 3, m: 0 },
      steps: [
        {
          title: 'המחוג הארוך על 12',
          text: `כש${M('המחוג הארוך')} מצביע בדיוק על <b>12</b>, זו <b>שעה עגולה</b>. אז מסתכלים רק על ${H('המחוג הקצר')}: הוא על 3, ולכן השעה ${dig(3, 0)}, שלוש.`,
          clock: { h: 3, m: 0, hlNums: [{ n: 12, cls: 'minute' }, { n: 3, cls: 'hour' }] },
        },
        {
          title: 'סיבוב שלם',
          text: `${M('המחוג הארוך')} יוצא מה־12, מקיף את כל השעון וחוזר ל־12. סיבוב שלם כזה לוקח <b>60 דקות, שהן שעה אחת</b>.<br>ובאותו זמן ${H('המחוג הקצר')} מתקדם מספר אחד: מ־3 ל־4.`,
          clock: { h: 3, m: 0 },
          readout: true,
          actions: [{
            label: 'הפעילו סיבוב שלם',
            run: async c => {
              c.startSweep();
              const ok = await c.tweenTotal(c.total + 60, 5000);
              if (ok && (await c.wait(700))) c.clearSweep();
            },
          }],
        },
        {
          title: 'נסו בעצמכם',
          text: `גררו את ${M('המחוג הארוך')} סיבוב שלם מסביב לשעון, עם כיוון השעון, ושימו לב מה קורה ל${H('מחוג הקצר')}.`,
          clock: { h: 5, m: 0, mode: 'drag', draggable: ['minute'], snap: 1 },
          readout: true,
        },
        {
          title: 'לסיכום',
          text: `<ul class="recap"><li>${M('ארוך')} על 12: שעה עגולה. קוראים רק את ${H('הקצר')}.</li><li>סיבוב שלם של ${M('הארוך')} = שעה אחת.</li><li>בכל סיבוב ${H('הקצר')} זז למספר הבא.</li></ul>`,
          clock: { h: 7, m: 0, hlNums: [{ n: 12, cls: 'minute' }, { n: 7, cls: 'hour' }] },
        },
      ],
      questions() {
        const qs = uniqueTimes(4, [0]).map(([h]) => readQ(h, 0, { pool: [0, 15] }));
        const [h2] = uniqueTimes(1, [0])[0];
        qs.splice(2, 0, setQ(h2, 0, { draggable: ['hour'], prompt: `כוונו את ${H('המחוג הקצר')} כדי שהשעון יראה ${dig(h2, 0)}, ${timeWords(h2, 0)}` }));
        const h3 = rnd(1, 11);
        qs.push(choiceQ(`השעה ${dig(h3, 0)}. ${M('המחוג הארוך')} עושה סיבוב שלם אחד. מה השעה עכשיו?`, `<span class="opt-dig" dir="ltr">${digital(h3 + 1, 0)}</span>`, [
          `<span class="opt-dig" dir="ltr">${digital(h3, 1)}</span>`,
          `<span class="opt-dig" dir="ltr">${digital(h3 + 12 - 1, 0)}</span>`,
          `<span class="opt-dig" dir="ltr">${digital(h3, 30)}</span>`,
        ], { clock: { h: h3, m: 0 }, explain: 'סיבוב שלם של המחוג הארוך = שעה אחת. המחוג הקצר זז למספר הבא.', hint: 'כמה זמן לוקח סיבוב שלם של המחוג הארוך?', wide: true }));
        const [h4] = uniqueTimes(1, [0])[0];
        qs.push(setQ(h4, 0, { draggable: ['hour'] }));
        return qs;
      },
    },

    {
      id: 'fives',
      title: 'קפיצות של 5',
      sub: 'כל מספר שווה 5 דקות',
      color: 'minute',
      icon: { h: 12, m: 20, ring: true },
      steps: [
        {
          title: 'שנתות קטנות',
          text: 'הסתכלו על הקווים הקטנים בשולי השעון. הם נקראים <b>שנתות</b>. בין כל שני מספרים יש 5 צעדים קטנים, וכל צעד הוא <b>דקה אחת</b>.',
          clock: { h: 12, m: 0, hideHands: ['hour'], hlTicks: [0, 5] },
          readout: true,
          actions: [{
            label: 'צעד אחר צעד',
            run: async (c, ui) => {
              c.configure(Object.assign({}, c.cfg, { h: 12, m: 0 }));
              for (let i = 1; i <= 5; i++) {
                if (!(await c.wait(250))) return;
                await c.tweenTotal(i, 450);
                ui.sfx.tick();
              }
            },
          }],
        },
        {
          title: 'קופצים ב־5',
          text: `לכן כש${M('המחוג הארוך')} מגיע למספר הבא, עברו <b>5 דקות</b>. ממספר למספר קופצים ב־5: 5, 10, 15, 20...`,
          clock: { h: 12, m: 0, hideHands: ['hour'], ring: 0 },
          actions: [{
            label: 'ספרו בקפיצות',
            run: async (c, ui) => {
              c.configure(Object.assign({}, c.cfg, { h: 12, m: 0, ring: 0 }));
              for (let n = 1; n <= 12; n++) {
                if (!(await c.tweenTotal(n * 5, 420))) return;
                c.setRing(n);
                ui.sfx.pop(n);
                ui.note(`<span class="big-num">${n * 5}</span> דקות`);
                if (!(await c.wait(250))) return;
              }
              ui.note('60 דקות = שעה שלמה!');
            },
          }],
        },
        {
          title: 'טריק הכפל',
          text: `ליד כל מספר כתוב כמה דקות הוא שווה כש${M('המחוג הארוך')} מצביע עליו. הטריק: <b>כופלים ב־5</b>.<br>המספר 4: 4×5 = 20 דקות.<br>לחצו על מספר כדי לבדוק.`,
          clock: { h: 12, m: 20, hideHands: ['hour'], ring: true, mode: 'number' },
          setup: (c, ui) => {
            c.onNumber = n => {
              ui.sfx.pop(n);
              c.setHighlightNums([{ n, cls: 'minute' }]);
              c.tweenTotal(n === 12 ? Math.ceil(c.total / 60) * 60 : Math.floor(c.total / 60) * 60 + n * 5, 500);
              ui.note(n === 12 ? '12 → 00 דקות (סיבוב שלם)' : `<span dir="ltr">${n} × 5 = ${n * 5}</span> דקות`);
            };
          },
        },
        {
          title: 'ומה עם ה־12?',
          text: `כש${M('המחוג הארוך')} חוזר ל־12 עברו 60 דקות, כלומר שעה שלמה, ומתחילים לספור שוב מאפס. לכן ליד ה־12 כתוב <b>00</b>.`,
          clock: { h: 12, m: 0, hideHands: ['hour'], ring: true, hlNums: [{ n: 12, cls: 'minute' }] },
        },
      ],
      questions() {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        const qs = [];
        nums.slice(0, 4).forEach(n => {
          const m = n * 5;
          const wrong = [n, n * 10, m + 5, m - 5].filter(v => v !== m && v > 0 && v < 60);
          qs.push(choiceQ(`${M('המחוג הארוך')} מצביע על ה־${n}. כמה דקות עברו?`, `${m} דקות`, shuffle([...new Set(wrong)]).slice(0, 3).map(v => `${v} דקות`), {
            clock: { h: 12, m, hideHands: ['hour'], hlNums: [{ n, cls: 'minute' }] },
            explain: `<span dir="ltr">${n} × 5 = ${m}</span>. ${M('המחוג הארוך')} על ה־${n} מראה ${m} דקות.`,
            hint: 'ספרו בקפיצות של 5 מה־12 עד המספר.',
            onWrong: c => c.setRing(true),
          }));
        });
        nums.slice(4, 7).forEach(n => {
          qs.push({
            type: 'number',
            prompt: `על איזה מספר יצביע ${M('המחוג הארוך')} אחרי <b>${n * 5} דקות</b>? לחצו על המספר.`,
            target: n,
            clock: { h: 12, m: 0, hideHands: ['hour'], mode: 'number' },
            hint: 'ספרו בקפיצות של 5: מספר 1 הוא 5, מספר 2 הוא 10...',
            onWrong: c => c.setRing(true),
            explain: `<span dir="ltr">${n} × 5 = ${n * 5}</span>, לכן המחוג הארוך יהיה על ה־${n}.`,
            after: (c, n2) => c.tweenTotal(n2 * 5, 600),
          });
        });
        qs.push(choiceQ(`כמה דקות לוקח ל${M('מחוג הארוך')} לעשות סיבוב שלם?`, '60 דקות', ['12 דקות', '100 דקות', '30 דקות'], {
          clock: { h: 12, m: 0, hideHands: ['hour'], ring: true },
          explain: '12 מספרים × 5 דקות = 60 דקות, שהן שעה שלמה.',
          hint: 'יש 12 מספרים, וכל אחד שווה 5 דקות.',
        }));
        return qs;
      },
    },

    {
      id: 'half',
      title: 'חצי שעה',
      sub: 'הארוך על 6',
      color: 'berry',
      icon: { h: 2, m: 30, sectors: [{ from: 0, to: 30, cls: 'half' }] },
      steps: [
        {
          title: 'חצי סיבוב',
          text: `כש${M('המחוג הארוך')} מגיע ל־6, הוא עשה <b>חצי סיבוב</b>, חצי מהשעון. <span dir="ltr">6 × 5 = 30</span>, ו־30 דקות הן <b>חצי שעה</b>.`,
          clock: { h: 2, m: 0, hlNums: [{ n: 6, cls: 'minute' }] },
          readout: true,
          actions: [{
            label: 'הראו חצי סיבוב',
            run: async c => {
              c.configure(Object.assign({}, c.cfg, { h: 2, m: 0 }));
              c.startSweep();
              await c.tweenTotal(c.total + 30, 3000);
            },
          }],
        },
        {
          title: 'איפה המחוג הקצר?',
          text: `שימו לב ל${H('מחוג הקצר')}: בחצי שעה הוא נמצא <b>באמצע הדרך</b> בין 2 ל־3. הוא כבר עזב את ה־2, אבל עוד לא הגיע ל־3.`,
          clock: { h: 2, m: 30, hl: 'hour', hlNums: [{ n: 2, cls: 'hour' }, { n: 3, cls: 'hour' }], sectors: [{ from: 0, to: 30, cls: 'half' }] },
        },
        {
          title: 'איך קוראים',
          text: `לוקחים את המספר ש${H('המחוג הקצר')} <b>כבר עבר</b>, כאן 2, ומוסיפים "וחצי".<br>${dig(2, 30)} = שתיים וחצי.`,
          clock: { h: 2, m: 30, sectors: [{ from: 0, to: 30, cls: 'half' }] },
        },
        {
          title: 'נסו בעצמכם',
          text: `גררו את ${M('המחוג הארוך')} ל־6 וראו איפה נעצר ${H('המחוג הקצר')}.`,
          clock: { h: 5, m: 0, mode: 'drag', draggable: ['minute'], snap: 5 },
          readout: true,
        },
      ],
      questions() {
        const qs = uniqueTimes(4, [30]).map(([h]) => readQ(h, 30, { pool: [0, 30] }));
        const [h0] = uniqueTimes(1, [0])[0];
        qs.splice(2, 0, readQ(h0, 0, { pool: [0, 30] }));
        qs.push(choiceQ('כמה דקות יש בחצי שעה?', '30 דקות', ['50 דקות', '15 דקות', '6 דקות'], {
          clock: { h: 12, m: 30, sectors: [{ from: 0, to: 30, cls: 'half' }] },
          explain: 'שעה היא 60 דקות, וחצי ממנה הוא 30.',
          hint: 'המחוג הארוך על 6. כמה זה 6×5?',
        }));
        uniqueTimes(2, [30]).forEach(([h]) => qs.push(setQ(h, 30)));
        return qs;
      },
    },

    {
      id: 'quarter',
      title: 'רבע שעה',
      sub: 'ורבע, ורבע ל...',
      color: 'sky',
      icon: { h: 4, m: 15, sectors: [{ from: 0, to: 15, cls: 'q1' }] },
      steps: [
        {
          title: 'פיצה של 4 חלקים',
          text: 'חלקו את השעון ל־<b>4 חלקים שווים</b>, כמו פיצה עם 4 משולשים. כל חלק הוא <b>רבע שעה = 15 דקות</b>.',
          clock: { h: 12, m: 0, hideHands: ['hour', 'minute'], sectors: [{ from: 0, to: 15, cls: 'q1' }, { from: 15, to: 30, cls: 'q2' }, { from: 30, to: 45, cls: 'q3' }, { from: 45, to: 60, cls: 'q4' }], hlNums: [{ n: 12, cls: 'accent' }, { n: 3, cls: 'accent' }, { n: 6, cls: 'accent' }, { n: 9, cls: 'accent' }] },
        },
        {
          title: '"ורבע"',
          text: `${M('המחוג הארוך')} על <b>3</b>: עברו 15 דקות, רבע שעה. אומרים <b>"ורבע"</b>.<br>${dig(4, 15)} = ארבע ורבע.`,
          clock: { h: 4, m: 15, sectors: [{ from: 0, to: 15, cls: 'q1' }], hlNums: [{ n: 3, cls: 'minute' }] },
        },
        {
          title: '"רבע ל..."',
          text: `${M('המחוג הארוך')} על <b>9</b>: עברו 45 דקות. עד השעה הבאה חסר רק עוד רבע שעה (החלק הצבעוני)! לכן אומרים <b>"רבע ל..."</b> והשעה הבאה.<br>${dig(4, 45)} = רבע לחמש. שימו לב ש${H('המחוג הקצר')} כמעט הגיע ל־5.`,
          clock: { h: 4, m: 45, sectors: [{ from: 45, to: 60, cls: 'q4' }], hlNums: [{ n: 9, cls: 'minute' }, { n: 5, cls: 'hour' }] },
        },
        {
          title: 'מפת הפיצה',
          text: `<ul class="recap"><li>${M('ארוך')} על 12: שעה עגולה</li><li>${M('ארוך')} על 3: ורבע</li><li>${M('ארוך')} על 6: וחצי</li><li>${M('ארוך')} על 9: רבע ל...</li></ul>לחצו על הכפתורים וראו את המחוגים זזים.`,
          clock: { h: 4, m: 0 },
          readout: true,
          actions: [
            { label: 'ורבע', run: c => c.animateTo(4, 15, 900) },
            { label: 'וחצי', run: c => c.animateTo(4, 30, 900) },
            { label: 'רבע ל...', run: c => c.animateTo(4, 45, 900) },
            { label: 'שעה עגולה', run: c => c.animateTo(5, 0, 900) },
          ],
        },
      ],
      questions() {
        const qs = uniqueTimes(5, [15, 45, 15, 45, 30]).map(([h, m]) => readQ(h, m));
        qs.splice(3, 0, choiceQ('כמה דקות יש ברבע שעה?', '15 דקות', ['25 דקות', '4 דקות', '30 דקות'], {
          clock: { h: 12, m: 15, sectors: [{ from: 0, to: 15, cls: 'q1' }] },
          explain: 'שעה היא 60 דקות. מחלקים ל־4 חלקים: 15 דקות בכל חלק.',
          hint: 'המחוג הארוך על 3. כמה זה 3×5?',
        }));
        const [h1] = uniqueTimes(1, [15])[0];
        const [h2] = uniqueTimes(1, [45])[0];
        qs.push(setQ(h1, 15));
        qs.push(setQ(h2, 45, { prompt: `כוונו את השעון ל<b>רבע ל${hourName(h2 + 1)}</b>` }));
        return qs;
      },
    },

    {
      id: 'any',
      title: 'כל 5 דקות',
      sub: 'קוראים כל שעה',
      color: 'grape',
      icon: { h: 8, m: 20 },
      steps: [
        {
          title: 'שני צעדים',
          text: `עכשיו מחברים הכל. קוראים שעון בשני צעדים:<ol class="recap"><li>${H('המחוג הקצר')}: איזו שעה?</li><li>${M('המחוג הארוך')}: כמה דקות?</li></ol>`,
          clock: { h: 8, m: 20 },
        },
        {
          title: 'צעד 1: השעה',
          text: `${H('המחוג הקצר')} נמצא בין 8 ל־9. לוקחים את המספר שהוא <b>כבר עבר</b>: <b>8</b>.`,
          clock: { h: 8, m: 20, hl: 'hour', hlNums: [{ n: 8, cls: 'hour' }] },
        },
        {
          title: 'צעד 2: הדקות',
          text: `${M('המחוג הארוך')} על ה־4. סופרים בקפיצות של 5: 5, 10, 15, 20. כלומר <b>20 דקות</b>.`,
          clock: { h: 8, m: 20, hl: 'minute', hlNums: [{ n: 4, cls: 'minute' }], ring: 4 },
          actions: [{
            label: 'ספרו איתי',
            run: async (c, ui) => {
              c.setRing(0);
              for (let n = 1; n <= 4; n++) {
                if (!(await c.wait(450))) return;
                c.setRing(n);
                ui.sfx.pop(n);
                ui.note(`<span class="big-num">${n * 5}</span>`);
              }
              ui.note('20 דקות');
            },
          }],
        },
        {
          title: 'ביחד',
          text: `${dig(8, 20)}: שמונה ועשרים דקות.<br>אחרי חצי שעה אפשר לומר גם כמה חסר לשעה הבאה: ${dig(8, 40)} = <b>עשרים לתשע</b> (חסרות 20 דקות, החלק הצבעוני).`,
          clock: { h: 8, m: 40, sectors: [{ from: 40, to: 60, cls: 'q4' }] },
          readout: true,
        },
        {
          title: 'מלכודת!',
          text: `כש${H('המחוג הקצר')} בין 12 ל־1, השעה היא <b>12</b> ולא 1. תמיד בודקים איזה מספר הוא <b>כבר עבר</b>.<br>כאן: ${dig(12, 35)}, עשרים וחמש לאחת.`,
          clock: { h: 12, m: 35, hl: 'hour', hlNums: [{ n: 12, cls: 'hour' }] },
        },
      ],
      questions() {
        const mins = [5, 10, 20, 25, 35, 40, 50, 55];
        const qs = uniqueTimes(6, mins).map(([h, m]) => readQ(h, m, { pool: mins }));
        uniqueTimes(2, mins).forEach(([h, m], i) => qs.splice(2 + i * 3, 0, setQ(h, m)));
        return qs;
      },
    },

    {
      id: 'champ',
      title: 'אלופי השעון',
      sub: 'אתגר בלי רמזים',
      color: 'gold',
      icon: { h: 9, m: 45, hl: 'both' },
      steps: [
        {
          title: 'האתגר הגדול',
          text: `בשלב הזה השעה כתובה רק במילים. צריך לכוון את המחוגים או לבחור איך קוראים לשעה.<br>טיפ: גררו קודם את ${M('המחוג הארוך')}. ${H('המחוג הקצר')} יזוז איתו, ואם צריך תקנו אותו בסוף.`,
          clock: { h: 9, m: 0, mode: 'drag', snap: 5 },
          readout: true,
        },
      ],
      questions() {
        const mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        const times = uniqueTimes(8, mins);
        return times.map(([h, m], i) =>
          i % 2 === 0
            ? setQ(h, m, { prompt: `כוונו את השעון ל: <b>${timeWords(h, m)}</b>` })
            : readQ(h, m, { style: 'words', prompt: 'איך קוראים לשעה הזאת?', pool: mins })
        );
      },
    },
  ];

  window.ClockContent = { LEVELS, timeWords, digital, wrapH, explainTime };
})();
