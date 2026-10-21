/*
 * Flujo del juego de instrumentos: configurar -> estudiar -> (seguir | test) -> resumen.
 */
(function () {
  'use strict';

  const Q = window.QuizLogic;
  const QA = window.QuizAudio;
  const ALL = window.INSTRUMENTS;
  const STORAGE_KEY = 'oido-instrumentos';

  const $ = (sel) => document.querySelector(sel);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const screens = {
    setup: $('#screen-setup'), study: $('#screen-study'), choice: $('#screen-choice'),
    test: $('#screen-test'), summary: $('#screen-summary'),
  };
  const ui = {
    score: $('#score'), best: $('#best'), streak: $('#streak'), accuracy: $('#accuracy'),
    category: $('#category'), difficulty: $('#difficulty'), count: $('#count'),
    countLabel: $('#count-label'), setupInfo: $('#setup-info'),
    studyProgress: $('#study-progress'), studyImage: $('#study-image'),
    studyName: $('#study-name'), studyFamily: $('#study-family'),
    choiceText: $('#choice-text'),
    testProgress: $('#test-progress'), card: $('#test-card'), status: $('#test-status'),
    reveal: $('#test-reveal'), testName: $('#test-name'), timer: $('#timer-bar'),
    options: $('#options'),
    summaryText: $('#summary-text'), summaryFailed: $('#summary-failed'),
  };

  // ---------- Estado ----------
  let stats = Q.createStats(load());
  let config = null;      // { category, difficulty, count }
  let pool = [];          // instrumentos de la categoría elegida
  let session = [];       // instrumentos de esta sesión
  let melody = [];        // melodía de la sesión (la misma para todos los instrumentos)
  let studyOrder = [];
  let studyIndex = 0;
  let questions = [];
  let qIndex = 0;
  let current = null;     // instrumento de la pregunta actual
  let phase = 'idle';     // idle | listening | answering | feedback
  let replays = 0;
  let deadline = 0;
  let rafId = null;
  let token = 0;          // invalida procesos asíncronos antiguos al cambiar de pantalla
  let testHits = 0;
  let testFailed = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch (e) { return null; }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: stats.best, failed: stats.failed }));
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  // ---------- Pintar ----------
  function render() {
    ui.score.textContent = stats.score;
    ui.best.textContent = stats.best;
    ui.streak.textContent = stats.streak;
    ui.accuracy.textContent = stats.total ? Math.round((100 * stats.hits) / stats.total) + '%' : '—';
  }

  function showScreen(name) {
    Object.keys(screens).forEach((k) => { screens[k].hidden = k !== name; });
  }

  /** Pone la imagen: si es una ruta, <img>; si no, el emoji de prueba. */
  function renderImage(el, inst, alt) {
    el.textContent = '';
    if (/^(img\/|https?:)/.test(inst.image)) {
      const img = document.createElement('img');
      img.src = inst.image;
      img.alt = alt;
      el.appendChild(img);
    } else {
      el.textContent = inst.image;
    }
  }

  function setStatus(text, tone = '') {
    ui.status.textContent = text;
    ui.card.dataset.tone = tone;
  }

  // ---------- Pantalla de configuración ----------
  function refreshSetup() {
    const available = Q.filterByCategory(ALL, ui.category.value).length;
    const diff = ui.difficulty.value;
    const max = Q.maxCount(diff, available);
    ui.count.max = max;
    ui.count.min = Math.min(Q.MIN_INSTRUMENTS, max);
    ui.count.value = Q.clampCount(diff, ui.count.value, available);
    ui.countLabel.textContent = ui.count.value;
    const d = Q.DIFFICULTIES[diff];
    ui.setupInfo.textContent =
      `${Math.min(d.options, available)} opciones · ${d.time} s por pregunta · ${d.melodyLength} notas · ` +
      `hasta ${max} instrumentos con esta categoría`;
  }

  function startSession() {
    const diff = ui.difficulty.value;
    pool = Q.filterByCategory(ALL, ui.category.value);
    config = {
      category: ui.category.value,
      difficulty: diff,
      count: Q.clampCount(diff, ui.count.value, pool.length),
    };
    session = Q.pickSession(pool, config.count);
    stats = Q.createStats({ best: stats.best, failed: stats.failed }); // puntos a cero, récord y fallos se conservan
    render();
    startStudy();
  }

  // ---------- Fase de estudio ----------
  function startStudy() {
    token++;
    QA.stopAll();
    melody = Q.pickMelody(Q.DIFFICULTIES[config.difficulty].melodyLength);
    studyOrder = Q.orderForStudy(session, stats.failed);
    studyIndex = 0;
    showScreen('study');
    showStudy();
  }

  function showStudy() {
    const inst = studyOrder[studyIndex];
    ui.studyProgress.textContent = `Instrumento ${studyIndex + 1} de ${studyOrder.length}`;
    renderImage(ui.studyImage, inst, inst.name);
    ui.studyName.textContent = inst.name;
    ui.studyFamily.textContent = 'Familia: ' + inst.family;
    playStudy();
  }

  /** Suena la melodía dos veces seguidas con el timbre del instrumento. */
  async function playStudy() {
    const id = ++token;
    QA.stopAll();
    const inst = studyOrder[studyIndex];
    await QA.playMelody(melody, inst.timbre);
    if (id !== token) return;
    await wait(500);
    if (id !== token) return;
    await QA.playMelody(melody, inst.timbre);
  }

  function studyNext() {
    if (studyIndex + 1 < studyOrder.length) {
      studyIndex++;
      showStudy();
    } else {
      token++;
      QA.stopAll();
      ui.choiceText.textContent =
        `Has repasado ${studyOrder.length} instrumentos. ¿Seguimos estudiando o pasamos al test?`;
      showScreen('choice');
    }
  }

  // ---------- Fase de test ----------
  function startTest() {
    token++;
    QA.stopAll();
    stopTimer();
    questions = Q.shuffle(session);
    qIndex = 0;
    testHits = 0;
    testFailed = [];
    showScreen('test');
    nextQuestion();
  }

  function renderOptions(options) {
    ui.options.textContent = '';
    options.forEach((inst, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.dataset.id = inst.id;
      btn.setAttribute('aria-label', 'Opción ' + (i + 1));
      const key = document.createElement('kbd');
      key.textContent = i + 1;
      const img = document.createElement('span');
      renderImage(img, inst, ''); // alt vacío: el nombre no debe revelarse
      btn.append(key, img);
      btn.addEventListener('click', () => answer(inst.id));
      ui.options.appendChild(btn);
    });
  }

  async function nextQuestion() {
    if (qIndex >= questions.length) { endTest(); return; }
    const id = ++token;
    const diff = Q.DIFFICULTIES[config.difficulty];
    current = questions[qIndex];
    replays = 0;
    phase = 'listening';

    ui.testProgress.textContent = `Pregunta ${qIndex + 1} de ${questions.length}`;
    ui.reveal.textContent = '';
    ui.testName.textContent = '';
    ui.timer.style.width = '100%';
    ui.timer.classList.remove('low');
    renderOptions(Q.buildOptions(current, pool, diff.options, diff.distractors));

    if (qIndex === 0) { // aviso inicial
      setStatus('El test va a comenzar…');
      await wait(1600);
      if (id !== token) return;
    }
    setStatus('Escucha con atención ♪');
    await QA.playMelody(melody, current.timbre);
    if (id !== token) return;
    setStatus('¿Qué instrumento era?');
    phase = 'answering';
    startTimer();
  }

  function startTimer() {
    const total = Q.DIFFICULTIES[config.difficulty].time * 1000;
    deadline = performance.now() + total;
    const tick = () => {
      const left = deadline - performance.now();
      ui.timer.style.width = Math.max(0, (100 * left) / total) + '%';
      ui.timer.classList.toggle('low', left < total * 0.3);
      if (left <= 0) { answer(null); return; } // se acabó el tiempo
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  async function answer(givenId) {
    if (phase !== 'answering') return;
    stopTimer();
    phase = 'feedback';
    const id = token;
    const diff = Q.DIFFICULTIES[config.difficulty];
    const correct = givenId === current.id;
    const timeLeft = Math.max(0, (deadline - performance.now()) / 1000);
    const points = correct ? Q.scoreFor(config.difficulty, timeLeft, diff.time, replays) : 0;

    stats = Q.applyAnswer(stats, current.id, correct, points);
    save();
    render();
    if (correct) testHits++; else testFailed.push(current.name);

    // Marca las opciones y enseña el instrumento correcto en grande.
    [...ui.options.children].forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.id === current.id) btn.classList.add('ok');
      else if (btn.dataset.id === givenId) btn.classList.add('ko');
    });
    renderImage(ui.reveal, current, current.name);
    ui.testName.textContent = current.name;

    if (correct) {
      setStatus(`¡Correcto! +${points}`, 'ok');
      await QA.playHappy();
    } else {
      setStatus(givenId === null ? 'Se acabó el tiempo' : 'Ese no era', 'ko');
      await QA.playSad(current.timbre);
    }
    await wait(800);
    if (id !== token) return;
    qIndex++;
    nextQuestion();
  }

  function pickByIndex(i) {
    const btn = ui.options.children[i];
    if (btn) answer(btn.dataset.id);
  }

  function replay() {
    if (phase !== 'answering') return;
    replays++;
    QA.playMelody(melody, current.timbre);
  }

  function endTest() {
    phase = 'idle';
    ui.summaryText.textContent =
      `Has acertado ${testHits} de ${questions.length}. Puntos de esta sesión: ${stats.score}.`;
    ui.summaryFailed.textContent = testFailed.length
      ? 'Para repasar: ' + testFailed.join(', ') + '. Saldrán los primeros en el próximo estudio.'
      : '¡Sin fallos! Prueba con más instrumentos o más dificultad.';
    showScreen('summary');
  }

  function quit() {
    token++;
    phase = 'idle';
    stopTimer();
    QA.stopAll();
    showScreen('setup');
  }

  function resetProgress() {
    if (!confirm('¿Borrar récord y fallos guardados?')) return;
    stats = Q.createStats(null);
    save();
    render();
  }

  // ---------- Eventos ----------
  const actions = {
    start: startSession,
    'study-replay': playStudy,
    'study-next': studyNext,
    'more-study': startStudy,
    'go-test': startTest,
    'test-replay': replay,
    quit: quit,
    'new-session': () => showScreen('setup'),
    reset: resetProgress,
  };

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fn = actions[btn.dataset.action];
      if (fn) fn();
      btn.blur();
    });
  });

  ui.category.addEventListener('change', refreshSetup);
  ui.difficulty.addEventListener('change', refreshSetup);
  ui.count.addEventListener('input', refreshSetup);

  // Teclado: 1..6 eligen opción (como el teclado numérico del dictado), A repite el sonido.
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const num = /^(Numpad|Digit)([1-6])$/.exec(e.code);
    if (num && phase === 'answering') { e.preventDefault(); pickByIndex(Number(num[2]) - 1); return; }
    if (e.code === 'KeyA') { e.preventDefault(); replay(); }
  });

  render();
  refreshSetup();
  showScreen('setup');
})();