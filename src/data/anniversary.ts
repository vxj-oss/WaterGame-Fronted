// Contenido de la sorpresa "Nuestro primer mes". Edita aquí frases, letras y fotos.

export const ANNIVERSARY = {
  /** Desde cuándo aparece el botón (hora local). Para probar antes: añade ?mes=1 a la dirección. */
  unlock: new Date(2026, 10, 26, 0, 0, 0),
  name: 'Sarita Janeth Angulo Vega',
  nickname: 'mi negrita hermosa',
  met: '26 de octubre',
  title: 'Nuestro primer mes',
  sign: 'Tuyo, siempre',
};

/** Nuestra canción: se abre en YouTube desde un botón. */
export const SONG = {
  title: 'Te encontré',
  artist: 'Lil Silvio y El Vega',
  url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Te encontré Lil Silvio y El Vega'),
};

export interface Slide {
  photo: string;
  line: string;
}

/** Fotos en orden de historia (public/anniversary/photo-XX.jpg). */
export const SLIDES: Slide[] = [
  { photo: 'photo-01.jpg', line: 'Hay noches que se vuelven recuerdo para siempre.' },
  { photo: 'photo-02.jpg', line: 'Contigo hasta lo más simple se siente especial.' },
  { photo: 'photo-03.jpg', line: 'Un beso en la frente, y el mundo se calla.' },
  { photo: 'photo-04.jpg', line: 'Tu paz es mi lugar favorito.' },
  { photo: 'photo-05.jpg', line: 'Así de bonito es quererte.' },
  { photo: 'photo-06.jpg', line: 'Mi bella durmiente, durmiendo con su Chopper.' },
  { photo: 'photo-07.jpg', line: 'Cada despertar contigo sería mi favorito.' },
  { photo: 'photo-08.jpg', line: 'Tu sonrisa me arregla cualquier día.' },
  { photo: 'photo-09.jpg', line: 'Mi peleona de cariño, mi tesoro.' },
  { photo: 'photo-10.jpg', line: 'Y además, orgullo: mira lo lejos que vas.' },
  { photo: 'photo-11.jpg', line: 'Aunque estemos lejos, una videollamada contigo lo acerca todo.' },
  { photo: 'photo-12.jpg', line: 'Cada momento contigo es especial.' },
  { photo: 'photo-13.jpg', line: 'Compartir contigo, así sea por una pantalla, vale oro.' },
  { photo: 'photo-14.jpg', line: 'Gracias por quedarte.' },
];

/** Carta. Cada elemento es un párrafo. */
export const LETTER: string[] = [
  'Hace un mes, un 26 de octubre, te conocí, y es lo mejor que me ha pasado.',
  'Eres mi negrita hermosa, divina, preciosa. Mi peleona de cariño. Mi bella durmiente, que duerme todo lo que puede y aun así despierta más linda.',
  'Hemos pasado algunos problemas, pero siempre te lo digo: yo estoy para apoyarte en todo y en cada momento.',
  'Solo te quiero a ti. Eres la única mujer que quiero, y te voy a respetar siempre, siempre. Que nunca lo dudes.',
  'Cada momento contigo es especial. Compartir, agarrar tu mano, todo eso.',
  'Feliz primer mes, amor. Vamos por muchos más.',
];

/** Lo que amo de ti (salen una por una). */
export const LOVES: string[] = [
  'Tu sonrisa, que me arregla cualquier día',
  'Cómo duermes: mi bella durmiente',
  'Tu forma de pelear de cariño',
  'Tu voz en cada videollamada',
  'Que te esfuerzas por tus sueños',
  'Imaginar tu mano en la mía',
  'Que contigo todo se siente en paz',
];

/** Mis promesas (salen una por una). */
export const PROMISES: string[] = [
  'Apoyarte en todo y en cada momento',
  'Respetarte siempre, siempre',
  'Que nunca dudes de lo que siento',
  'Escucharte cuando lo necesites',
  'Cuidar lo nuestro, día a día',
  'Hacerte reír, incluso en los días difíciles',
];

/** Vales de amor: ella los toca para descubrirlos. */
export const COUPONS: { icon: string; title: string; text: string }[] = [
  { icon: '🤗', title: 'Un abrazo largo', text: 'Válido cuando quieras, sin límite de tiempo.' },
  { icon: '🎬', title: 'Noche de película', text: 'Tú eliges la película, yo pongo la compañía.' },
  { icon: '🍨', title: 'Una salida a comer', text: 'Donde tú quieras, lo que tú quieras.' },
  { icon: '📞', title: 'Videollamada eterna', text: 'Hasta que te venza el sueño, mi bella durmiente.' },
  { icon: '🌹', title: 'Una sorpresa', text: 'Cuando menos lo esperes.' },
  { icon: '🤝', title: 'Agarrar tu mano', text: 'Todo el tiempo que me dejes.' },
];

/** Lo que viene (salen una por una). */
export const DREAMS: string[] = [
  'Más meses, y después años',
  'Muchas fotos juntos, no solo en pantalla',
  'Caminar de la mano sin prisa',
  'Cumplir cada meta, una al lado de la otra',
  'Que cada 26 sea una fiesta nuestra',
];

/** Frases o letras de canciones para añadir después (aparecen antes de la carta). */
export const QUOTES: string[] = [];
