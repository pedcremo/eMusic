/*
 * Reproduce melodías con el timbre de cada instrumento (síntesis con Web Audio).
 * Reutiliza el contexto de audio de audio.js y midiToFreq de logic.js.
 */
(function (root) {
  'use strict';

  const active = new Set(); // osciladores sonando, para poder cortarlos
  const BELL = { wave: 'sine', harmonics: [[1, 1], [2, 0.5], [3, 0.3]], attack: 0.01, sustain: 0.1, release: 0.25 };

  /** Programa una nota en el instante `when` (tiempo del AudioContext). */
  function scheduleNote(midi, timbre, duration, when) {
    const ac = root.MusicAudio.getContext();
    const freq = root.MusicLogic.midiToFreq(midi) * Math.pow(2, timbre.octave || 0);
    const dur = Math.max(duration, timbre.attack + 0.05);
    const end = when + dur + timbre.release;
    const peak = 0.3;

    // Envolvente: ataque -> caída hasta el nivel de sostenido -> relajación final.
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, when);
    master.gain.exponentialRampToValueAtTime(peak, when + timbre.attack);
    master.gain.exponentialRampToValueAtTime(Math.max(peak * timbre.sustain, 0.0002), when + dur);
    master.gain.exponentialRampToValueAtTime(0.0001, end);
    master.connect(ac.destination);

    // Un oscilador por armónico; el volumen se normaliza para que todos suenen parecido de fuerte.
    const total = timbre.harmonics.reduce((sum, h) => sum + h[1], 0);
    timbre.harmonics.forEach(([mult, vol]) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = timbre.wave;
      osc.frequency.value = freq * mult;
      g.gain.value = vol / total;
      osc.connect(g).connect(master);

      if (timbre.vibrato) { // pequeña oscilación de la altura (violín, flauta...)
        const lfo = ac.createOscillator();
        const depth = ac.createGain();
        lfo.frequency.value = timbre.vibrato.rate;
        depth.gain.value = timbre.vibrato.depth * mult;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(when);
        lfo.stop(end);
        active.add(lfo);
        lfo.onended = () => active.delete(lfo);
      }

      osc.start(when);
      osc.stop(end);
      active.add(osc);
      osc.onended = () => active.delete(osc);
    });
  }

  /** Toca una melodía (lista de notas MIDI). La promesa se resuelve al terminar. */
  function playMelody(midis, timbre, noteDur = 0.45, gap = 0.08) {
    const ac = root.MusicAudio.getContext();
    const start = ac.currentTime + 0.05;
    midis.forEach((m, i) => scheduleNote(m, timbre, noteDur, start + i * (noteDur + gap)));
    const totalMs = (0.05 + midis.length * (noteDur + gap) + timbre.release) * 1000;
    return new Promise((resolve) => setTimeout(resolve, totalMs));
  }

  /** Sonido alegre: arpegio mayor ascendente y brillante. */
  function playHappy() { return playMelody([72, 76, 79, 84], BELL, 0.16, 0.03); }

  /** Melodía triste: arpegio menor descendente, tocado con el instrumento de la pregunta. */
  function playSad(timbre) { return playMelody([67, 63, 60, 55], timbre, 0.5, 0.1); }

  /** Corta todo lo que esté sonando (al saltar de pantalla). */
  function stopAll() {
    active.forEach((o) => { try { o.stop(); } catch (e) { /* ya parado */ } });
    active.clear();
  }

  root.QuizAudio = { playMelody, playHappy, playSad, stopAll };
})(window);