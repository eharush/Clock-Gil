// ניהול המסכים: מסלול השלבים, הסבר, תרגול, סיום ושעון חופשי.
(function () {
  const { LEVELS, timeWords, digital, wrapH } = window.ClockContent;
  const $ = s => document.querySelector(s);
  const H = t => `<span class="t-hour">${t}</span>`;
  const M = t => `<span class="t-min">${t}</span>`;

  // ---------- שמירת התקדמות ----------
  const STORE_KEY = 'clock-gil-v1';
  const state = { stars: {}, unlockAll: false, muted: false };
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
  } catch (e) { /* אין אחסון זמין */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  const isUnlocked = i => i === 0 || state.unlockAll || (state.stars[LEVELS[i - 1].id] || 0) > 0;

  // ---------- צלילים ----------
  const sfx = {
    ctx: null,
    tone(freq, dur, type, when, vol) {
      if (state.muted) return;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime + (when || 0);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.05);
      } catch (e) { /* ignore */ }
    },
    pop(i) { this.tone(420 + (i || 0) * 35, 0.12, 'triangle', 0, 0.12); },
    tick() { this.tone(1500, 0.035, 'square', 0, 0.025); },
    click() { this.tone(600, 0.06, 'triangle', 0, 0.08); },
    correct() { this.tone(660, 0.14, 'triangle'); this.tone(990, 0.22, 'triangle', 0.1); },
    wrong() { this.tone(240, 0.18, 'sine', 0, 0.12); this.tone(190, 0.26, 'sine', 0.12, 0.12); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', i * 0.13, 0.13)); },
  };

  // ---------- הקראה (רק אם יש קול עברי במכשיר) ----------
  const tts = {
    voice: null,
    init() {
      if (!('speechSynthesis' in window)) return;
      const pickVoice = () => {
        const v = speechSynthesis.getVoices().find(x => /^(he|iw)/i.test(x.lang));
        this.voice = v || null;
        document.querySelectorAll('.speak-btn').forEach(b => (b.hidden = !this.voice));
      };
      pickVoice();
      speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
    },
    say(html) {
      if (!this.voice) return;
      const div = document.createElement('div');
      div.innerHTML = html.replace(/<br\s*\/?>|<\/li>/g, '. ');
      const text = div.textContent.replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => timeWords(+h, +m)).replace(/×/g, ' כפול ');
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.rate = 0.9;
      speechSynthesis.speak(u);
    },
    stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
  };

  // ---------- קונפטי ----------
  const confetti = (() => {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    let parts = [];
    let running = false;
    const colors = ['--hour', '--minute', '--sun', '--berry', '--leaf'].map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#f80');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resize() {
      cv.width = innerWidth * devicePixelRatio;
      cv.height = innerHeight * devicePixelRatio;
    }
    addEventListener('resize', resize);
    resize();
    function frame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) {
        p.vy += 0.25;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.translate(p.x * devicePixelRatio, p.y * devicePixelRatio);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s, -p.s / 2, p.s * 2, p.s);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(frame);
      else running = false;
    }
    return function burst(x, y, n) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 7;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: 3 + Math.random() * 4, c: colors[i % colors.length], life: 70 + Math.random() * 40 });
      }
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    };
  })();
  function burstFrom(elm, n) {
    const r = elm.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, n || 40);
  }

  // ---------- הינשוף טיקי ----------
  function owlSVG(mood) {
    const eye = mood === 'happy'
      ? '<path d="M-17 -6 q6 -7 12 0" class="o-line"/><path d="M5 -6 q6 -7 12 0" class="o-line"/>'
      : '<circle cx="-11" cy="-6" r="9" class="o-eye"/><circle cx="11" cy="-6" r="9" class="o-eye"/><circle cx="-9.5" cy="-5" r="4" class="o-pupil"/><circle cx="12.5" cy="-5" r="4" class="o-pupil"/><circle cx="-8" cy="-7" r="1.4" class="o-shine"/><circle cx="14" cy="-7" r="1.4" class="o-shine"/>';
    return `<svg viewBox="-34 -40 68 76" aria-hidden="true">
      <path d="M-26 -22 L-22 -38 L-10 -28 Z M26 -22 L22 -38 L10 -28 Z" class="o-ear"/>
      <ellipse cx="0" cy="0" rx="28" ry="32" class="o-body"/>
      <ellipse cx="0" cy="12" rx="17" ry="17" class="o-belly"/>
      <g class="o-belly-clock"><line x1="0" y1="12" x2="0" y2="3" class="o-bh"/><line x1="0" y1="12" x2="7" y2="12" class="o-bm"/></g>
      ${eye}
      <path d="M-4 3 L4 3 L0 9 Z" class="o-beak"/>
      <path d="M-14 31 l4 -4 l4 4 M6 31 l4 -4 l4 4" class="o-feet"/>
    </svg>`;
  }
  document.querySelectorAll('[data-owl]').forEach(d => (d.innerHTML = owlSVG(d.dataset.owl)));

  // ---------- מסכים ----------
  const screens = ['home', 'lesson', 'practice', 'result', 'free'];
  function show(name) {
    tts.stop();
    screens.forEach(s => ($(`#screen-${s}`).hidden = s !== name));
    window.scrollTo({ top: 0 });
    if (name === 'home') renderHome();
  }

  function readoutHTML(t) {
    return `<span class="dig" dir="ltr">${digital(t.h, t.m)}</span><span class="words">${timeWords(t.h, t.m)}</span>`;
  }
  function starsHTML(n, total) {
    let s = '';
    for (let i = 0; i < (total || 3); i++) s += `<svg class="star ${i < n ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>`;
    return s;
  }

  // ---------- בית ----------
  const liveClock = new Clock($('#liveClock'), { label: 'השעה עכשיו' });
  function tickLive() {
    const d = new Date();
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes();
    liveClock.total = (h % 12) * 60 + m + d.getSeconds() / 60;
    liveClock.render();
    $('#liveDigital').textContent = digital(h, m);
    $('#liveWords').textContent = timeWords(h, m);
  }
  tickLive();
  setInterval(tickLive, 5000);

  const iconClocks = [];
  function renderHome() {
    const list = $('#levelList');
    if (!list.children.length) {
      LEVELS.forEach((L, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button class="level" type="button" data-color="${L.color}">
            <span class="level-top"><span class="level-num">${i + 1}</span><span class="level-icon clock-host"></span></span>
            <span class="level-body"><span class="level-title">${L.title}</span><span class="level-sub">${L.sub}</span>
            <span class="level-foot"><span class="stars small-stars"></span><span class="lock">נעול</span></span></span>
          </button>`;
        li.querySelector('button').addEventListener('click', () => {
          if (!isUnlocked(i)) {
            sfx.wrong();
            $('#homeBubble').textContent = `השלב "${L.title}" ייפתח אחרי שתסיימו את השלב הקודם.`;
            return;
          }
          sfx.click();
          openLesson(i);
        });
        list.appendChild(li);
        iconClocks.push(new Clock(li.querySelector('.level-icon'), Object.assign({ label: L.title }, L.icon)));
      });
    }
    let done = 0;
    LEVELS.forEach((L, i) => {
      const btn = list.children[i].querySelector('.level');
      const st = state.stars[L.id] || 0;
      if (st) done++;
      btn.classList.toggle('locked', !isUnlocked(i));
      btn.classList.toggle('done', st > 0);
      btn.querySelector('.stars').innerHTML = starsHTML(st);
      btn.setAttribute('aria-label', `שלב ${i + 1}: ${L.title}${isUnlocked(i) ? '' : ' (נעול)'}${st ? `, ${st} כוכבים` : ''}`);
    });
    $('#pathSummary').textContent = done === 0 ? 'מתחילים בשלב 1. כל שלב פותח את הבא אחריו.' : done === LEVELS.length ? 'סיימתם את כל השלבים. אתם אלופי השעון!' : `סיימתם ${done} מתוך ${LEVELS.length} שלבים.`;
    const next = LEVELS.findIndex(L => !state.stars[L.id]);
    $('#continueBtn').textContent = done === 0 ? 'מתחילים ←' : next === -1 ? 'לשעון החופשי ←' : `ממשיכים לשלב ${next + 1} ←`;
    $('#unlockBtn').textContent = state.unlockAll ? 'להורים ולמורים: נעילת השלבים מחדש' : 'להורים ולמורים: פתיחת כל השלבים';
  }
  $('#continueBtn').addEventListener('click', () => {
    sfx.click();
    const next = LEVELS.findIndex(L => !state.stars[L.id]);
    if (next === -1) openFree();
    else openLesson(next);
  });
  $('#homeBtn').addEventListener('click', () => show('home'));
  $('#unlockBtn').addEventListener('click', () => {
    state.unlockAll = !state.unlockAll;
    save();
    renderHome();
  });
  $('#resetBtn').addEventListener('click', () => ($('#resetConfirm').hidden = false));
  $('#resetNo').addEventListener('click', () => ($('#resetConfirm').hidden = true));
  $('#resetYes').addEventListener('click', () => {
    state.stars = {};
    state.unlockAll = false;
    save();
    $('#resetConfirm').hidden = true;
    renderHome();
  });

  const soundBtn = $('#soundBtn');
  function syncSound() {
    soundBtn.setAttribute('aria-pressed', String(!state.muted));
    soundBtn.classList.toggle('muted', state.muted);
    soundBtn.setAttribute('aria-label', state.muted ? 'הפעלת צלילים' : 'השתקת צלילים');
  }
  soundBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    save();
    syncSound();
    sfx.click();
  });
  syncSound();

  // ---------- הסבר ----------
  const lessonClock = new Clock($('#lessonClock'));
  const cur = { level: 0, step: 0, qs: [], q: 0, mistakes: 0 };
  const lessonUI = {
    sfx,
    note(html) {
      const n = $('#lessonNote');
      n.hidden = !html;
      n.innerHTML = html || '';
      n.classList.remove('pop');
      void n.offsetWidth;
      n.classList.add('pop');
    },
  };

  function openLesson(i) {
    cur.level = i;
    cur.step = 0;
    show('lesson');
    renderStep();
  }
  function renderStep() {
    const L = LEVELS[cur.level];
    const st = L.steps[cur.step];
    const last = cur.step === L.steps.length - 1;
    $('#lessonEyebrow').textContent = `שלב ${cur.level + 1} · הסבר`;
    $('#lessonTitle').textContent = L.title;
    $('#lessonDots').innerHTML = L.steps.map((_, i) => `<span class="${i === cur.step ? 'on' : i < cur.step ? 'past' : ''}"></span>`).join('');
    $('#stepTitle').textContent = st.title;
    $('#stepText').innerHTML = st.text;
    $('#prevStep').disabled = cur.step === 0;
    $('#nextStep').textContent = last ? 'לתרגול! ←' : 'הבא ←';
    $('#skipToPractice').hidden = last;

    lessonClock.onNumber = null;
    lessonClock.onChange = null;
    lessonClock.onStep = () => sfx.tick();
    lessonClock.configure(st.clock);
    lessonUI.note('');
    const ro = $('#lessonReadout');
    ro.hidden = !st.readout;
    if (st.readout) {
      lessonClock.onChange = t => (ro.innerHTML = readoutHTML(t));
      ro.innerHTML = readoutHTML(lessonClock.getTime());
    }
    const acts = $('#stepActions');
    acts.innerHTML = '';
    (st.actions || []).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip play';
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${a.label}`;
      b.addEventListener('click', async () => {
        sfx.click();
        b.classList.add('running');
        await a.run(lessonClock, lessonUI);
        b.classList.remove('running');
      });
      acts.appendChild(b);
    });
    if (st.clock && st.clock.mode === 'drag') {
      const p = document.createElement('p');
      p.className = 'drag-help';
      p.textContent = 'גוררים את המחוג עם האצבע או העכבר';
      acts.appendChild(p);
    }
    if (st.setup) st.setup(lessonClock, lessonUI);
  }
  $('#prevStep').addEventListener('click', () => {
    if (cur.step > 0) {
      cur.step--;
      sfx.click();
      renderStep();
    }
  });
  $('#nextStep').addEventListener('click', () => {
    sfx.click();
    if (cur.step < LEVELS[cur.level].steps.length - 1) {
      cur.step++;
      renderStep();
    } else startPractice(cur.level);
  });
  $('#skipToPractice').addEventListener('click', () => startPractice(cur.level));
  $('#speakStep').addEventListener('click', () => tts.say(`${$('#stepTitle').textContent}. ${$('#stepText').innerHTML}`));

  // ---------- תרגול ----------
  const pClock = new Clock($('#practiceClock'));
  let answered = false;
  let wrongHere = 0;

  function startPractice(i) {
    cur.level = i;
    cur.qs = LEVELS[i].questions();
    cur.q = 0;
    cur.mistakes = 0;
    show('practice');
    renderQ();
  }

  function renderQ() {
    const L = LEVELS[cur.level];
    const q = cur.qs[cur.q];
    const n = cur.qs.length;
    answered = false;
    wrongHere = 0;
    $('#practiceEyebrow').textContent = `שלב ${cur.level + 1} · ${L.title}`;
    $('#progressBar').style.width = `${(cur.q / n) * 100}%`;
    $('#progressWrap').setAttribute('aria-valuemax', n);
    $('#progressWrap').setAttribute('aria-valuenow', cur.q);
    $('#progressText').textContent = `${cur.q + 1}/${n}`;
    $('#qPrompt').innerHTML = q.prompt;
    $('#qFeedback').hidden = true;
    $('#qNext').hidden = true;
    $('#qCheck').hidden = q.type !== 'set';
    $('#qCheck').disabled = false;
    $('#dragHelp').hidden = q.type !== 'set';

    pClock.onNumber = pClock.onHand = pClock.onChange = null;
    pClock.onStep = q.type === 'set' ? () => sfx.tick() : null;
    pClock.configure(q.clock);

    const ans = $('#qAnswers');
    ans.innerHTML = '';
    ans.className = `answers${q.wide ? ' wide' : ''}`;
    if (q.type === 'choice') {
      q.options.forEach(o => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'answer';
        b.innerHTML = o.html;
        b.addEventListener('click', () => {
          if (answered || b.disabled) return;
          if (o.correct) {
            b.classList.add('good');
            ans.querySelectorAll('.answer').forEach(x => (x.disabled = true));
            onCorrect(b);
          } else {
            b.classList.add('bad');
            b.disabled = true;
            onWrong(q.hint);
          }
        });
        ans.appendChild(b);
      });
    } else if (q.type === 'number') {
      pClock.onNumber = num => {
        if (answered) return;
        if (num === q.target) {
          if (q.clock.numbers === 'slots') {
            pClock.revealNumber(num);
            if (q.keepNumbers && !q.keepNumbers.includes(num)) q.keepNumbers.push(num);
          }
          pClock.setHighlightNums([{ n: num, cls: 'good' }]);
          if (q.after) q.after(pClock, num);
          onCorrect($('#practiceClock'));
        } else {
          pClock.flashNumber(num, 'bad', 800);
          onWrong(q.hint);
        }
      };
    } else if (q.type === 'hand') {
      pClock.onHand = hand => {
        if (answered) return;
        if (!hand) {
          showFeedback('info', 'לחצו בדיוק על אחד המחוגים.');
          return;
        }
        if (hand === q.target) {
          pClock.flashHand(hand, 'flash-good');
          pClock.highlightHand(hand);
          onCorrect($('#practiceClock'));
        } else {
          pClock.flashHand(hand, 'flash-bad');
          onWrong(q.hint);
        }
      };
    }
  }

  const PRAISE = ['כל הכבוד!', 'מעולה!', 'יפה מאוד!', 'נכון!', 'בדיוק!', 'אלופים!'];
  function onCorrect(fromEl) {
    answered = true;
    const q = cur.qs[cur.q];
    sfx.correct();
    burstFrom(fromEl, 36);
    showFeedback('good', `<b>${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</b> ${q.explain || ''}`);
    $('#qCheck').hidden = true;
    const next = $('#qNext');
    next.hidden = false;
    next.textContent = cur.q === cur.qs.length - 1 ? 'סיום השלב ←' : 'הבא ←';
    next.focus({ preventScroll: true });
  }
  function onWrong(hint) {
    cur.mistakes++;
    wrongHere++;
    const q = cur.qs[cur.q];
    sfx.wrong();
    showFeedback('bad', `<b>כמעט!</b> ${hint || 'נסו שוב.'}`);
    if (q.onWrong && wrongHere === 1) q.onWrong(pClock);
    const card = $('.question-card');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }
  function showFeedback(kind, html) {
    const f = $('#qFeedback');
    f.hidden = false;
    f.className = `feedback ${kind}`;
    f.innerHTML = html;
  }

  $('#qCheck').addEventListener('click', () => {
    const q = cur.qs[cur.q];
    if (answered || q.type !== 'set') return;
    const t = pClock.getTime();
    const { h, m } = q.target;
    const minOK = t.m === m;
    const hourOK = t.h === h;
    if (minOK && hourOK) {
      pClock.configure(Object.assign({}, q.clock, { h: t.h, m: t.m, mode: 'none', hl: 'both' }));
      onCorrect($('#practiceClock'));
      return;
    }
    let hint;
    if (!minOK) {
      hint = m === 0
        ? `${M('המחוג הארוך')} צריך להצביע על 12, כי זו שעה עגולה.`
        : `${M('המחוג הארוך')} צריך להראות ${m} דקות, כלומר להצביע על ה־${m / 5}.`;
      if (!hourOK && q.clock.draggable.includes('hour')) hint += ` אחר כך בדקו את ${H('המחוג הקצר')}.`;
    } else {
      hint = `${M('המחוג הארוך')} במקום הנכון! עכשיו ${H('המחוג הקצר')}: ` + (m === 0 ? `הוא צריך להצביע על ${h}.` : `הוא צריך להיות אחרי ה־${h}, בדרך ל־${wrapH(h + 1)}.`);
    }
    onWrong(hint);
  });
  $('#qNext').addEventListener('click', () => {
    sfx.click();
    if (cur.q < cur.qs.length - 1) {
      cur.q++;
      renderQ();
    } else finishLevel();
  });
  $('#backToLesson').addEventListener('click', () => openLesson(cur.level));
  $('#speakQ').addEventListener('click', () => tts.say($('#qPrompt').innerHTML));

  // ---------- סיום שלב ----------
  function finishLevel() {
    const L = LEVELS[cur.level];
    const stars = cur.mistakes <= 1 ? 3 : cur.mistakes <= 3 ? 2 : 1;
    state.stars[L.id] = Math.max(state.stars[L.id] || 0, stars);
    save();
    show('result');
    const last = cur.level === LEVELS.length - 1;
    $('#resultEyebrow').textContent = `שלב ${cur.level + 1} הושלם`;
    $('#resultTitle').textContent = last ? 'אתם אלופי השעון!' : stars === 3 ? 'מושלם!' : stars === 2 ? 'עבודה יפה!' : 'סיימתם את השלב!';
    $('#resultStars').innerHTML = starsHTML(stars);
    const mis = cur.mistakes === 0 ? 'בלי אף טעות!' : cur.mistakes === 1 ? 'עם טעות אחת בלבד.' : `עם ${cur.mistakes} טעויות בדרך.`;
    $('#resultText').innerHTML = last
      ? `סיימתם את כל השלבים, ${mis} עכשיו אפשר לשחק בשעון החופשי או לחזור לכל שלב ולנסות לאסוף 3 כוכבים.`
      : `עניתם על כל ${cur.qs.length} השאלות ${mis}${stars < 3 ? ' אפשר לתרגל שוב כדי לאסוף 3 כוכבים.' : ''}`;
    $('#resultNext').textContent = last ? 'לשעון החופשי ←' : `לשלב ${cur.level + 2}: ${LEVELS[cur.level + 1].title} ←`;
    sfx.win();
    setTimeout(() => {
      burstFrom($('#resultStars'), 120);
    }, 150);
  }
  $('#resultNext').addEventListener('click', () => {
    sfx.click();
    if (cur.level === LEVELS.length - 1) openFree();
    else openLesson(cur.level + 1);
  });
  $('#resultRetry').addEventListener('click', () => startPractice(cur.level));
  $('#resultHome').addEventListener('click', () => show('home'));

  // ---------- שעון חופשי ----------
  const freeCfg = { h: 10, m: 10, mode: 'drag', snap: 1 };
  const freeClock = new Clock($('#freeClock'), freeCfg);
  freeClock.onChange = t => ($('#freeReadout').innerHTML = readoutHTML(t));
  freeClock.onStep = () => sfx.tick();
  function openFree() {
    show('free');
    const t = freeClock.getTime();
    freeClock.configure(Object.assign({}, freeCfg, t, { ring: $('#freeRing').checked, snap: $('#freeSnap').checked ? 5 : 1 }));
  }
  $('#freeBtnTop').addEventListener('click', () => {
    sfx.click();
    openFree();
  });
  document.querySelectorAll('[data-free]').forEach(b =>
    b.addEventListener('click', () => {
      sfx.click();
      const v = b.dataset.free;
      if (v === 'now') {
        const d = new Date();
        freeClock.animateTo(d.getHours() % 12 || 12, d.getMinutes(), 1200);
      } else {
        freeClock.tweenTotal(Math.round(freeClock.total) + Number(v), v === '+60' ? 3000 : 700);
      }
    })
  );
  $('#freeRing').addEventListener('change', e => freeClock.setRing(e.target.checked));
  $('#freeSnap').addEventListener('change', e => (freeClock.cfg.snap = e.target.checked ? 5 : 1));

  // נגיש מהקונסול לבדיקות
  window.ClockGame = { state, cur, clocks: { lesson: lessonClock, practice: pClock, free: freeClock } };

  tts.init();
  show('home');
})();
