/*
 * Lógica pura del juego de instrumentos (sin DOM ni audio), testeable con Node.
 */
(function (root) {
  'use strict';

  const MIN_INSTRUMENTS = 3;
  const LEVEL_KEYS = ['easy', 'medium', 'hard', 'expert'];

  // distractors: 'different' = opciones de otras familias, 'mixed' = al azar, 'same' = misma familia.
  const DIFFICULTIES = {
    easy:   { label: 'Fácil',   options: 3, time: 15, melodyLength: 4, maxInstruments: 10, distractors: 'different' },
    medium: { label: 'Medio',   options: 4, time: 10, melodyLength: 4, maxInstruments: 10, distractors: 'mixed' },
    hard:   { label: 'Difícil', options: 6, time: 6,  melodyLength: 3, maxInstruments: 15, distractors: 'same' },
    expert: { label: 'Experto', options: 6, time: 4,  melodyLength: 3, maxInstruments: 20, distractors: 'same' },
  };

  // Notas MIDI que usan las melodías (pentatónica de Do, para que suenen bien).
  const MELODY_POOL = [60, 62, 64, 67, 69, 72];

  function shuffle(arr, rand) {
    const r = rand || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** 'general' devuelve todos; 'orquesta' / 'banda' filtran por etiqueta. */
  function filterByCategory(list, category) {
    if (category === 'general') return list.slice();
    return list.filter((i) => i.categories.includes(category));
  }

  /** Máximo de instrumentos: el del nivel, sin pasar de los que hay disponibles. */
  function maxCount(difficulty, available) {
    return Math.min(DIFFICULTIES[difficulty].maxInstruments, available);
  }

  /** Ajusta lo que pide el usuario al rango permitido (mínimo 3). */
  function clampCount(difficulty, n, available) {
    const wanted = Math.max(MIN_INSTRUMENTS, Math.round(Number(n)) || MIN_INSTRUMENTS);
    return Math.min(maxCount(difficulty, available), wanted);
  }

  function pickSession(pool, count, rand) {
    return shuffle(pool, rand).slice(0, count);
  }

  /** Melodía aleatoria sin repetir la misma nota dos veces seguidas. */
  function pickMelody(length, rand) {
    const r = rand || Math.random;
    const out = [];
    while (out.length < length) {
      const n = MELODY_POOL[Math.floor(r() * MELODY_POOL.length)];
      if (n !== out[out.length - 1]) out.push(n);
    }
    return out;
  }

  /** Construye las opciones de una pregunta: el correcto + distractores según el modo. */
  function buildOptions(correct, pool, n, mode, rand) {
    const others = pool.filter((i) => i.id !== correct.id);
    const size = Math.min(n, others.length + 1);
    const sameFamily = others.filter((i) => i.family === correct.family);
    const otherFamily = others.filter((i) => i.family !== correct.family);
    let ordered;
    if (mode === 'same') ordered = shuffle(sameFamily, rand).concat(shuffle(otherFamily, rand));
    else if (mode === 'different') ordered = shuffle(otherFamily, rand).concat(shuffle(sameFamily, rand));
    else ordered = shuffle(others, rand);
    return shuffle([correct].concat(ordered.slice(0, size - 1)), rand);
  }

  /** Puntos de un acierto: base por nivel + bonus por rapidez, penalizando repeticiones. */
  function scoreFor(difficulty, timeLeft, timeTotal, replays) {
    const mult = LEVEL_KEYS.indexOf(difficulty) + 1;
    const base = 10 * mult;
    const bonus = Math.round((10 * Math.max(0, timeLeft)) / timeTotal) * mult;
    const total = base + bonus;
    return replays > 0 ? Math.round(total / (replays + 1)) : total;
  }

  function createStats(saved) {
    return {
      score: 0, streak: 0, hits: 0, total: 0,
      best: (saved && saved.best) || 0,
      failed: (saved && saved.failed) || {}, // { idInstrumento: nº de fallos pendientes }
    };
  }

  /** Aplica una respuesta y devuelve un estado nuevo (no modifica el anterior). */
  function applyAnswer(state, id, correct, points) {
    const s = Object.assign({}, state, { failed: Object.assign({}, state.failed) });
    s.total += 1;
    if (correct) {
      s.hits += 1;
      s.score += points || 0;
      s.streak += 1;
      if (s.failed[id]) {
        s.failed[id] -= 1;
        if (!s.failed[id]) delete s.failed[id];
      }
    } else {
      s.streak = 0;
      s.failed[id] = (s.failed[id] || 0) + 1;
    }
    s.best = Math.max(s.best, s.score);
    return s;
  }

  /** Orden de estudio: al azar, pero los instrumentos más fallados salen primero. */
  function orderForStudy(list, failed, rand) {
    const f = failed || {};
    return shuffle(list, rand)
      .map((inst, i) => ({ inst, i }))
      .sort((a, b) => (f[b.inst.id] || 0) - (f[a.inst.id] || 0) || a.i - b.i)
      .map((x) => x.inst);
  }

  const api = {
    MIN_INSTRUMENTS, DIFFICULTIES, LEVEL_KEYS, MELODY_POOL,
    shuffle, filterByCategory, maxCount, clampCount, pickSession, pickMelody,
    buildOptions, scoreFor, createStats, applyAnswer, orderForStudy,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuizLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);