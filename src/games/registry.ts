import { draw } from './draw';
import { hangman } from './hangman';
import { GameDef } from './kit';
import { memory } from './memory';
import { navy } from './navy';
import { truth } from './truth';
import { ttt } from './ttt';
import { tuti } from './tuti';

export const GAMES: GameDef[] = [ttt, memory, hangman, navy, draw, tuti, truth];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);
