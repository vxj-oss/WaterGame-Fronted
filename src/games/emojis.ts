import { GameDef } from './kit';
import { RaceItem, runRace } from './race';

const strip = (s: string) => s.replace(/^(el|la|los|las)\s+/i, '');

const e = (big: string, answers: string[], tag: string, clue: string): RaceItem => {
  const all = [...answers, ...answers.map(strip)];
  return { big, a: [...new Set(all)], tag, c: ['¿Cuál es el título?', clue, `Empieza con “${strip(answers[0]).slice(0, 2)}”`] };
};

export const ITEMS: RaceItem[] = [
  e('🦁👑🌅', ['El Rey León'], 'Película', 'Un cachorro que será rey de la sabana'),
  e('🚢🧊💔', ['Titanic'], 'Película', 'Un barco famoso y un amor imposible'),
  e('🐠🔍🌊', ['Buscando a Nemo', 'Nemo'], 'Película', 'Un papá pez cruza el océano'),
  e('⚡👓🧙‍♂️🦉', ['Harry Potter'], 'Película', 'Un niño mago con una cicatriz'),
  e('❄️👸⛄', ['Frozen', 'Frozen el reino del hielo'], 'Película', 'Dos hermanas y un muñeco de nieve'),
  e('🤠🚀🧸', ['Toy Story'], 'Película', 'Juguetes que cobran vida'),
  e('🦈🏖️😱', ['Tiburón', 'Jaws'], 'Película', 'Una playa y un gran pez peligroso'),
  e('👹🟢🐴🏰', ['Shrek'], 'Película', 'Un ogro verde y un burro'),
  e('🦸‍♂️🛡️🔨💚', ['Los Vengadores', 'Avengers'], 'Película', 'Superhéroes de Marvel que se unen'),
  e('🦖🌴🧬', ['Jurassic Park', 'Parque Jurásico'], 'Película', 'Dinosaurios revividos en una isla'),
  e('💍🌋🧙‍♂️🏔️', ['El Señor de los Anillos', 'Señor de los Anillos'], 'Película', 'Un anillo que hay que destruir'),
  e('🏴‍☠️⚓🦜', ['Piratas del Caribe'], 'Película', 'Jack Sparrow y su barco'),
  e('🌹👸👹', ['La Bella y la Bestia', 'Bella y la Bestia'], 'Película', 'Una rosa encantada y un castillo'),
  e('🧞‍♂️🪔🐒🕌', ['Aladdín', 'Aladdin'], 'Película', 'Una lámpara mágica y un genio'),
  e('💀🎸🌼🐕', ['Coco'], 'Película', 'Música y Día de Muertos'),
  e('🏠🎈👴', ['Up', 'Up una aventura de altura'], 'Película', 'Un viejito y su casa con globos'),
  e('💊🕶️💻', ['Matrix', 'The Matrix'], 'Película', 'Pastilla roja o pastilla azul'),
  e('🔵🌿🐉', ['Avatar'], 'Película', 'Seres azules en el planeta Pandora'),
  e('🏹🔥🕊️', ['Los Juegos del Hambre', 'Juegos del Hambre'], 'Película', 'Una chica con arco en una competencia mortal'),
  e('🕷️🕸️🦸‍♂️', ['Spider-Man', 'Spiderman', 'El Hombre Araña', 'Hombre Araña'], 'Película', 'Un superhéroe que lanza telarañas'),
  e('🚗🏁⚡', ['Cars', 'Rayo McQueen'], 'Película', 'Un auto de carreras rojo'),
  e('👁️🟣🚪👾', ['Monsters Inc', 'Monstruos S.A.', 'Monstruos SA'], 'Película', 'Monstruos que asustan niños'),
  e('🟡👓🍌', ['Mi Villano Favorito', 'Minions'], 'Película', 'Criaturas amarillas que adoran los plátanos'),
  e('🌺👽💙🏝️', ['Lilo y Stitch', 'Lilo & Stitch', 'Stitch'], 'Película', 'Una niña hawaiana y un alienígena azul'),
  e('⚔️🐉🌸🇨🇳', ['Mulán', 'Mulan'], 'Película', 'Una guerrera que se hace pasar por soldado'),
  e('🐭👨‍🍳🍲🇫🇷', ['Ratatouille'], 'Película', 'Un ratón cocinero en París'),
  e('🪵👃🧚', ['Pinocho'], 'Película', 'Un muñeco de madera que miente'),
  e('🌊🐷🔱🥥', ['Moana', 'Vaiana'], 'Película', 'Una joven navega por el océano'),
  e('📓🦢🌧️💕', ['El Diario de Noa', 'Diario de Noa'], 'Película', 'Un romance bajo la lluvia'),
  e('😊😢😡😨🤢', ['Intensamente', 'Inside Out', 'Intensa Mente'], 'Película', 'Las emociones dentro de la cabeza de una niña'),
  e('🐼🥋🍜', ['Kung Fu Panda'], 'Película', 'Un panda que quiere ser guerrero'),
  e('🦁🦒🦛🏝️', ['Madagascar'], 'Película', 'Animales del zoológico en una isla'),
  e('👸💇‍♀️🗼🔦', ['Enredados', 'Rapunzel'], 'Película', 'Una princesa con cabello larguísimo'),
  e('🧜‍♀️🦀🌊', ['La Sirenita', 'Sirenita'], 'Película', 'Una sirena que quiere piernas'),
  e('🏠💰🎭', ['La Casa de Papel', 'Casa de Papel'], 'Serie', 'Un atraco con máscaras de Dalí'),
  e('👦🔦🔮👹', ['Stranger Things'], 'Serie', 'Niños y un mundo al revés'),
  e('🐉🗡️👑❄️', ['Juego de Tronos', 'Game of Thrones'], 'Serie', 'Reinos que pelean por un trono de espadas'),
  e('☕🛋️👫', ['Friends'], 'Serie', 'Seis amigos y un café en Nueva York'),
  e('🍩🟡👨‍👩‍👧‍👦', ['Los Simpson', 'Los Simpsons', 'Simpson', 'Simpsons'], 'Serie', 'Una familia amarilla de Springfield'),
  e('🧽🍍🌊', ['Bob Esponja'], 'Serie', 'Vive en una piña bajo el mar'),
  e('⚡🔴⚪🐭', ['Pokémon', 'Pokemon'], 'Serie', 'Criaturas que se capturan en bolas'),
  e('🦑🟢🔴🎮', ['El Juego del Calamar', 'Juego del Calamar', 'Squid Game'], 'Serie', 'Juegos infantiles con un final mortal'),
  e('🔴👧🐺🧺', ['Caperucita Roja', 'Caperucita'], 'Cuento', 'Una niña y un lobo en el bosque'),
  e('👠🎃🕛👸', ['Cenicienta'], 'Cuento', 'Un zapatito de cristal a medianoche'),
  e('🍎👸🧙‍♀️⛏️', ['Blancanieves', 'Blancanieves y los siete enanitos'], 'Cuento', 'Una manzana envenenada y siete enanitos'),
  e('🐷🐷🐷🐺🏠', ['Los Tres Cerditos', 'Tres Cerditos'], 'Cuento', 'Tres casas y un lobo que sopla'),
];

function start(ctx: Parameters<GameDef['start']>[0]) {
  runRace(ctx, { catalog: ITEMS, count: 5, seconds: 30, levels: [10, 20] });
}

export const emojis: GameDef = {
  id: 'emojis',
  name: 'Emojis y películas',
  tagline: 'Adivina el título solo con emojis',
  icon: '🎬',
  from: '#f472b6',
  to: '#7c3aed',
  online: true,
  local: false,
  match: { target: 2 },
  start,
};
