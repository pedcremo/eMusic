/*
 * Catálogo de instrumentos. Es lo único que hay que tocar para añadir instrumentos.
 * - image: emoji de prueba. Cuando tengas fotos, pon una ruta: 'img/instruments/violin.jpg'
 * - timbre: receta del sonido sintetizado (se sustituirá por muestras reales).
 */
window.INSTRUMENTS = [
  {
    id: 'piano', name: 'Piano', family: 'teclado', categories: ['orquesta'],
    image: '🎹',
    timbre: { wave: 'triangle', harmonics: [[1, 1], [2, 0.4], [3, 0.15], [4, 0.08]], attack: 0.01, sustain: 0.15, release: 0.25 },
  },
  {
    id: 'violin', name: 'Violín', family: 'cuerda', categories: ['orquesta'],
    image: '🎻',
    timbre: { wave: 'sawtooth', harmonics: [[1, 1], [2, 0.3]], attack: 0.12, sustain: 0.8, release: 0.15, vibrato: { rate: 5.5, depth: 5 } },
  },
  {
    id: 'guitarra', name: 'Guitarra', family: 'cuerda', categories: [],
    image: '🎸',
    timbre: { wave: 'triangle', harmonics: [[1, 1], [2, 0.5], [3, 0.25]], attack: 0.005, sustain: 0.03, release: 0.1 },
  },
  {
    id: 'banjo', name: 'Banjo', family: 'cuerda', categories: [],
    image: '🪕',
    timbre: { wave: 'square', harmonics: [[1, 1]], attack: 0.003, sustain: 0.02, release: 0.08 },
  },
  {
    id: 'trompeta', name: 'Trompeta', family: 'metal', categories: ['orquesta', 'banda'],
    image: '🎺',
    timbre: { wave: 'sawtooth', harmonics: [[1, 1], [2, 0.5], [3, 0.3]], attack: 0.06, sustain: 0.7, release: 0.08 },
  },
  {
    id: 'saxofon', name: 'Saxofón', family: 'madera', categories: ['banda'],
    image: '🎷',
    timbre: { wave: 'square', harmonics: [[1, 1], [3, 0.3]], attack: 0.05, sustain: 0.75, release: 0.1, vibrato: { rate: 5, depth: 3 } },
  },
  {
    id: 'flauta', name: 'Flauta', family: 'madera', categories: ['orquesta', 'banda'],
    image: '🪈',
    timbre: { wave: 'sine', harmonics: [[1, 1], [2, 0.1]], attack: 0.08, sustain: 0.8, release: 0.12, octave: 1, vibrato: { rate: 5, depth: 3 } },
  },
  {
    id: 'acordeon', name: 'Acordeón', family: 'lengüeta', categories: [],
    image: '🪗',
    timbre: { wave: 'square', harmonics: [[1, 1], [1.01, 1]], attack: 0.04, sustain: 0.9, release: 0.08 },
  },
  {
    id: 'campanas', name: 'Campanas', family: 'percusión', categories: ['orquesta'],
    image: '🔔',
    timbre: { wave: 'sine', harmonics: [[1, 1], [2.76, 0.5], [5.4, 0.3]], attack: 0.003, sustain: 0.02, release: 0.6 },
  },
  {
    id: 'tambor', name: 'Tambor', family: 'percusión', categories: ['orquesta', 'banda'],
    image: '🥁',
    timbre: { wave: 'sine', harmonics: [[1, 1], [1.6, 0.3]], attack: 0.001, sustain: 0.01, release: 0.12, octave: -1 },
  },
];