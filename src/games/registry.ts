import { checkers } from './checkers';
import { chess } from './chess';
import { draw } from './drawing';
import { emojis } from './emojis';
import { guess } from './guess';
import { trivia } from './trivia';
import { hangman } from './hangman';
import { GameDef } from './kit';
import { memory } from './memory';
import { navy } from './battleship';
import { truth } from './truthordare';
import { ttt } from './tictactoe';
import { tuti } from './tutifruti';

export const GAMES: GameDef[] = [ttt, checkers, chess, memory, hangman, navy, draw, tuti, trivia, emojis, guess, truth];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);
