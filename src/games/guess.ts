import { Ctx, el, esc, GameDef } from './kit';
import { RaceItem, runRace } from './race';

const flag = (big: string, a: string[], continent: string, capital: string): RaceItem => ({
  big,
  a,
  tag: 'Bandera',
  c: ['¿De qué país es esta bandera?', `Continente: ${continent}`, `Su capital es ${capital}`],
});

const FLAGS: RaceItem[] = [
  flag('🇲🇽', ['México', 'Mexico', 'Mejico'], 'América del Norte', 'Ciudad de México'),
  flag('🇪🇸', ['España'], 'Europa', 'Madrid'),
  flag('🇦🇷', ['Argentina'], 'América del Sur', 'Buenos Aires'),
  flag('🇧🇷', ['Brasil', 'Brazil'], 'América del Sur', 'Brasilia'),
  flag('🇨🇴', ['Colombia'], 'América del Sur', 'Bogotá'),
  flag('🇨🇱', ['Chile'], 'América del Sur', 'Santiago'),
  flag('🇵🇪', ['Perú', 'Peru'], 'América del Sur', 'Lima'),
  flag('🇺🇸', ['Estados Unidos', 'EEUU', 'EE UU', 'USA', 'Estados Unidos de America'], 'América del Norte', 'Washington D. C.'),
  flag('🇨🇦', ['Canadá', 'Canada'], 'América del Norte', 'Ottawa'),
  flag('🇫🇷', ['Francia'], 'Europa', 'París'),
  flag('🇮🇹', ['Italia'], 'Europa', 'Roma'),
  flag('🇩🇪', ['Alemania'], 'Europa', 'Berlín'),
  flag('🇬🇧', ['Reino Unido', 'Inglaterra', 'Gran Bretaña', 'UK'], 'Europa', 'Londres'),
  flag('🇯🇵', ['Japón', 'Japon'], 'Asia', 'Tokio'),
  flag('🇨🇳', ['China'], 'Asia', 'Pekín'),
  flag('🇰🇷', ['Corea del Sur', 'Corea'], 'Asia', 'Seúl'),
  flag('🇮🇳', ['India'], 'Asia', 'Nueva Delhi'),
  flag('🇷🇺', ['Rusia'], 'Europa y Asia', 'Moscú'),
  flag('🇦🇺', ['Australia'], 'Oceanía', 'Canberra'),
  flag('🇪🇬', ['Egipto'], 'África', 'El Cairo'),
  flag('🇿🇦', ['Sudáfrica', 'Sudafrica'], 'África', 'Pretoria'),
  flag('🇵🇹', ['Portugal'], 'Europa', 'Lisboa'),
  flag('🇬🇷', ['Grecia'], 'Europa', 'Atenas'),
  flag('🇹🇷', ['Turquía', 'Turquia'], 'Asia y Europa', 'Ankara'),
  flag('🇻🇪', ['Venezuela'], 'América del Sur', 'Caracas'),
  flag('🇪🇨', ['Ecuador'], 'América del Sur', 'Quito'),
  flag('🇺🇾', ['Uruguay'], 'América del Sur', 'Montevideo'),
  flag('🇨🇺', ['Cuba'], 'El Caribe', 'La Habana'),
  flag('🇨🇷', ['Costa Rica'], 'Centroamérica', 'San José'),
  flag('🇵🇦', ['Panamá', 'Panama'], 'Centroamérica', 'Ciudad de Panamá'),
];

const item = (tag: string, a: string[], c: string[]): RaceItem => ({ a, tag, c });

const COUNTRIES: RaceItem[] = [
  item('País', ['Francia'], ['Aquí está la ciudad del amor', 'Es un país de Europa', 'Tiene la Torre Eiffel']),
  item('País', ['Italia'], ['Tiene forma de bota', 'Es un país de Europa', 'Allí nacieron la pizza y el Coliseo']),
  item('País', ['Egipto'], ['Está en el norte de África', 'Lo cruza el río Nilo', 'Tiene pirámides y faraones']),
  item('País', ['Japón', 'Japon'], ['Está en Asia', 'Su capital es Tokio', 'Es la tierra del sushi y los samuráis']),
  item('País', ['Perú', 'Peru'], ['Está en Sudamérica', 'Aquí vivió el imperio inca', 'Tiene Machu Picchu']),
  item('País', ['México', 'Mexico', 'Mejico'], ['Está en América del Norte', 'Su capital es Ciudad de México', 'Es la tierra de los tacos y los mariachis']),
  item('País', ['Brasil', 'Brazil'], ['El país más grande de Sudamérica', 'Allí se habla portugués', 'Tiene el carnaval de Río y la selva amazónica']),
  item('País', ['India'], ['Está en Asia', 'Es uno de los países más poblados del mundo', 'Tiene el Taj Mahal']),
  item('País', ['China'], ['Está en Asia', 'Su capital es Pekín', 'Tiene la Gran Muralla']),
  item('País', ['Australia'], ['Es un país y también un continente', 'Está en Oceanía', 'Allí viven los canguros y los koalas']),
  item('País', ['Grecia'], ['Está en Europa', 'Su capital es Atenas', 'Allí nacieron los Juegos Olímpicos y está el Partenón']),
  item('País', ['España'], ['Está en Europa', 'Su capital es Madrid', 'Es famoso por la paella y el flamenco']),
  item('País', ['Argentina'], ['Está en Sudamérica', 'Su capital es Buenos Aires', 'Allí nació el tango']),
  item('País', ['Canadá', 'Canada'], ['Está en América del Norte', 'Su capital es Ottawa', 'Su bandera tiene una hoja de arce']),
  item('País', ['Rusia'], ['Es el país más grande del mundo', 'Su capital es Moscú', 'Tiene el Kremlin y la Plaza Roja']),
  item('País', ['Estados Unidos', 'EEUU', 'USA', 'Estados Unidos de America'], ['Está en América del Norte', 'Su capital es Washington', 'Allí está la Estatua de la Libertad']),
  item('País', ['Reino Unido', 'Inglaterra', 'Gran Bretaña', 'UK'], ['Es una isla de Europa', 'Su capital es Londres', 'Allí está el Big Ben']),
  item('País', ['Marruecos'], ['Está en el norte de África', 'Tiene ciudades como Marrakech', 'Su capital es Rabat']),
  item('País', ['Colombia'], ['Está en Sudamérica', 'Es famoso por su café', 'Su capital es Bogotá']),
  item('País', ['Turquía', 'Turquia'], ['Está entre Europa y Asia', 'Tiene la ciudad de Estambul', 'Su capital es Ankara']),
];

const singer = (a: string[], c: string[]): RaceItem => ({ a, tag: 'Cantante', c });

const SINGERS: RaceItem[] = [
  singer(['Shakira'], ['Cantante colombiana', 'Su canción “Hips Don’t Lie” fue un éxito mundial', 'Cantó “Waka Waka” para un Mundial']),
  singer(['Bad Bunny', 'Benito'], ['Cantante de Puerto Rico', 'Su álbum “Un Verano Sin Ti” rompió récords', 'Canta “Me Porto Bonito”']),
  singer(['Taylor Swift', 'Taylor'], ['Cantante estadounidense de pop', 'Tiene una gira llamada “Eras Tour”', 'Canta “Shake It Off”']),
  singer(['Michael Jackson', 'Jackson'], ['Lo llaman el Rey del Pop', 'Hizo famoso el “moonwalk”', 'Canta “Thriller”']),
  singer(['Beyoncé', 'Beyonce'], ['Cantante estadounidense', 'Formó parte de Destiny’s Child', 'Canta “Single Ladies”']),
  singer(['Ed Sheeran', 'Sheeran'], ['Cantautor británico pelirrojo', 'Toca la guitarra y usa un pedal de bucle', 'Canta “Shape of You”']),
  singer(['Rihanna'], ['Cantante de Barbados', 'Fundó la marca Fenty', 'Canta “Umbrella”']),
  singer(['Adele'], ['Cantante británica', 'Sus álbumes se llaman con números', 'Canta “Hello”']),
  singer(['Enrique Iglesias', 'Enrique'], ['Cantante español', 'Es hijo de Julio Iglesias', 'Canta “Bailando”']),
  singer(['Juanes'], ['Cantante colombiano de rock', 'Fue líder de la banda Ekhymosis', 'Canta “La camisa negra”']),
  singer(['Luis Miguel'], ['Cantante mexicano', 'Le dicen “El Sol de México”', 'Canta “La incondicional”']),
  singer(['Justin Bieber', 'Bieber'], ['Cantante canadiense', 'Fue descubierto en YouTube', 'Canta “Baby”']),
  singer(['Dua Lipa'], ['Cantante británica de pop', 'Tiene el éxito “Don’t Start Now”', 'Canta “Levitating”']),
  singer(['Billie Eilish'], ['Cantante estadounidense muy joven', 'Su estilo mezcla pop oscuro y ropa holgada', 'Canta “Bad Guy”']),
  singer(['Bruno Mars'], ['Cantante nacido en Hawái', 'Hizo “Uptown Funk” con Mark Ronson', 'Canta “Just the Way You Are”']),
  singer(['Maluma'], ['Cantante colombiano de reguetón', 'Nació en Medellín', 'Canta “Felices los 4”']),
  singer(['J Balvin', 'Balvin'], ['Cantante colombiano de reguetón', 'Es de Medellín y le encantan los colores', 'Canta “Mi Gente”']),
  singer(['Karol G', 'Karol'], ['Cantante colombiana de reguetón', 'Se hace llamar “La Bichota”', 'Canta “Tusa”']),
  singer(['Ricky Martin'], ['Cantante puertorriqueño', 'Fue integrante de Menudo', 'Canta “Livin’ la Vida Loca”']),
  singer(['Lady Gaga'], ['Cantante estadounidense', 'Su nombre artístico viene de una canción de Queen', 'Canta “Poker Face”']),
  singer(['Katy Perry'], ['Cantante estadounidense', 'Tiene la canción “Roar”', 'Canta “Firework”']),
  singer(['Camilo'], ['Cantante colombiano', 'Está casado con Evaluna Montaner', 'Canta “Vida de rico”']),
  singer(['Rosalía', 'Rosalia'], ['Cantante catalana', 'Mezcla flamenco con pop', 'Canta “Malamente”']),
  singer(['Daddy Yankee'], ['Cantante puertorriqueño', 'Le dicen “El Rey del Reguetón”', 'Canta “Gasolina”']),
  singer(['Marc Anthony'], ['Cantante estadounidense de origen puertorriqueño', 'Es un famoso salsero', 'Canta “Vivir mi vida”']),
  singer(['Celia Cruz'], ['Cantante cubana', 'Es la “Reina de la Salsa”', 'Su grito famoso es “¡Azúcar!”']),
  singer(['Elvis Presley', 'Elvis'], ['Lo llaman el Rey del Rock and Roll', 'Era famoso por su peinado y sus caderas', 'Canta “Jailhouse Rock”']),
  singer(['Freddie Mercury', 'Mercury'], ['Fue la voz de una banda británica', 'Canta “Bohemian Rhapsody”', 'Su banda se llama Queen']),
  singer(['Ariana Grande', 'Ariana'], ['Cantante estadounidense de voz muy aguda', 'Siempre lleva una coleta alta', 'Canta “7 rings”']),
];

const chara = (a: string[], c: string[]): RaceItem => ({ a, tag: 'Personaje', c });

const CHARACTERS: RaceItem[] = [
  chara(['Mickey Mouse', 'Mickey', 'Ratón Mickey'], ['Es un ratón famoso', 'Su novia es Minnie', 'Es el símbolo de Disney']),
  chara(['Harry Potter', 'Harry'], ['Es un mago joven', 'Tiene una cicatriz de rayo', 'Estudia en Hogwarts']),
  chara(['Spider-Man', 'Spiderman', 'Hombre Araña', 'El Hombre Araña'], ['Superhéroe de Marvel', 'Lo picó una araña', 'Su nombre real es Peter Parker']),
  chara(['Pikachu'], ['Es un Pokémon amarillo', 'Lanza rayos', 'Es la mascota de Ash']),
  chara(['Mario', 'Super Mario', 'Mario Bros'], ['Fontanero de videojuegos', 'Usa gorra roja y bigote', 'Su hermano es Luigi']),
  chara(['Elsa'], ['Es una princesa con poderes de hielo', 'Canta “Libre soy”', 'Su hermana es Anna']),
  chara(['Simba'], ['Es un cachorro de león', 'Su papá es Mufasa', 'Es el Rey León']),
  chara(['Shrek'], ['Es un ogro verde', 'Vive en un pantano', 'Su esposa es Fiona']),
  chara(['Bob Esponja', 'Bob'], ['Vive en una piña bajo el mar', 'Trabaja en el Crustáceo Crujiente', 'Su mejor amigo es Patricio']),
  chara(['Homero Simpson', 'Homero', 'Homer'], ['Es el papá de una familia amarilla', 'Trabaja en una planta nuclear', 'Adora las donas']),
  chara(['Batman'], ['Superhéroe sin superpoderes', 'Vive en Gotham', 'Su identidad secreta es Bruce Wayne']),
  chara(['Darth Vader', 'Vader'], ['Villano de Star Wars', 'Respira con un sonido muy grave', 'Es el papá de Luke']),
  chara(['Goku'], ['Protagonista de un anime', 'Se transforma en Súper Saiyajin', 'Es de Dragon Ball']),
  chara(['Woody'], ['Es un juguete vaquero', 'Su mejor amigo es Buzz', 'Es de Toy Story']),
  chara(['Nemo'], ['Es un pez payaso', 'Tiene una aleta más pequeña', 'Su papá es Marlin']),
  chara(['Sonic'], ['Es un erizo azul', 'Corre más rápido que el sonido', 'Recolecta anillos dorados']),
  chara(['Hello Kitty', 'Kitty'], ['Gatita blanca japonesa', 'Lleva un moño rojo', 'Está en muchísimos productos']),
  chara(['Winnie the Pooh', 'Pooh', 'Winnie Pooh', 'Winnie'], ['Es un osito amarillo', 'Le encanta la miel', 'Su amigo es Piglet']),
  chara(['Peppa Pig', 'Peppa'], ['Es una cerdita rosa', 'Salta en los charcos de barro', 'Su hermano es George']),
  chara(['Superman'], ['Superhéroe que vuela', 'Su debilidad es la kriptonita', 'Su identidad secreta es Clark Kent']),
  chara(['Olaf'], ['Es un muñeco de nieve que habla', 'Sueña con el verano', 'Es amigo de Anna y Elsa']),
  chara(['Stitch'], ['Es un alienígena azul', 'Vive en Hawái', 'Es amigo de Lilo']),
];

const POOLS: Record<string, { label: string; icon: string; items: RaceItem[] }> = {
  mix: { label: 'Mixto', icon: '🎲', items: [...FLAGS, ...COUNTRIES, ...SINGERS, ...CHARACTERS] },
  flags: { label: 'Banderas', icon: '🏁', items: FLAGS },
  countries: { label: 'Países', icon: '🌍', items: COUNTRIES },
  singers: { label: 'Cantantes', icon: '🎤', items: SINGERS },
  characters: { label: 'Personajes', icon: '🦸', items: CHARACTERS },
};

function start(ctx: Ctx) {
  const chooser: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  const box = el('div', 'rc-pick');
  ctx.root.append(box);
  let started = false;

  const go = (cat: string) => {
    if (started || !POOLS[cat]) return;
    started = true;
    box.remove();
    runRace(ctx, { catalog: POOLS[cat].items, speed: true, goal: 20, seconds: 20, maxItems: 40 });
  };

  ctx.turn(chooser);
  if (ctx.me === chooser) {
    ctx.status('<b>Elige una categoría</b>');
    box.innerHTML = '<div class="gpanel"><h3>¿De qué adivinamos?</h3><div class="choices"></div></div>';
    const list = box.querySelector<HTMLElement>('.choices')!;
    Object.entries(POOLS).forEach(([key, p]) => {
      const b = el('button', 'gbtn lagoon', `${p.icon} ${esc(p.label)}`);
      b.onclick = () => {
        ctx.send({ cat: key });
        go(key);
      };
      list.append(b);
    });
  } else {
    ctx.status(`${esc(ctx.other)} está eligiendo la categoría`);
    box.innerHTML = `<div class="gpanel"><h3>Espera</h3><p>${esc(ctx.other)} elige de qué adivinar.</p></div>`;
  }

  ctx.on((d) => {
    if (typeof d?.cat === 'string') go(d.cat);
  });
}

export const guess: GameDef = {
  id: 'guess',
  name: 'Adivina quién o qué',
  tagline: 'Cantantes, países, banderas y personajes: ¡gana quien conozca más!',
  icon: '🧠',
  from: '#38bdf8',
  to: '#6366f1',
  online: true,
  local: false,
  match: { target: 2, perPoint: 1 },
  start,
};
