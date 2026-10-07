import wordsData from '../data/words.json';
import { WordMode } from '../types';

export interface WordOption {
  word: string;
  category: string;
}

export class WordManager {
  private categoryMap: Map<string, string[]> = new Map();
  private allDefaultWords: { word: string; category: string }[] = [];

  constructor() {
    this.loadWords();
  }

  private loadWords(): void {
    const categories = wordsData.categories as Record<string, string[]>;
    for (const [category, words] of Object.entries(categories)) {
      this.categoryMap.set(category, words);
      for (const w of words) {
        this.allDefaultWords.push({ word: w.toLowerCase().trim(), category });
      }
    }
  }

  public getRandomWordChoices(count: number = 3, customWords: string[] = [], customWordsOnly: boolean = false): WordOption[] {
    const choices: WordOption[] = [];
    const usedWords = new Set<string>();

    const sanitizedCustom = customWords
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 1);

    const pool: WordOption[] = [];

    if (customWordsOnly && sanitizedCustom.length > 0) {
      for (const cw of sanitizedCustom) {
        pool.push({ word: cw, category: 'custom' });
      }
    } else {
      pool.push(...this.allDefaultWords);
      for (const cw of sanitizedCustom) {
        pool.push({ word: cw, category: 'custom' });
      }
    }

    if (pool.length === 0) {
      pool.push(...this.allDefaultWords);
    }

    // Shuffle pool copies
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    for (const item of shuffled) {
      if (!usedWords.has(item.word)) {
        usedWords.add(item.word);
        choices.push(item);
        if (choices.length >= count) break;
      }
    }

    // Fallback if pool had fewer items
    while (choices.length < count && pool.length > 0) {
      const fallback = pool[Math.floor(Math.random() * pool.length)];
      choices.push(fallback);
    }

    return choices;
  }

  public generateHintPattern(
    word: string,
    revealedIndices: Set<number>,
    mode: WordMode = 'normal'
  ): string {
    if (mode === 'hidden') {
      return '?'.repeat(word.length);
    }

    let pattern = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (char === ' ') {
        pattern += '   '; // Triple space for word separator
      } else if (char === '-' || char === '\'' || char === '.') {
        pattern += `${char} `;
      } else if (revealedIndices.has(i)) {
        pattern += `${char} `;
      } else {
        pattern += '_ ';
      }
    }
    return pattern.trim();
  }

  public getCandidateIndices(word: string): number[] {
    const indices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (char !== ' ' && char !== '-' && char !== '\'' && char !== '.') {
        indices.push(i);
      }
    }
    return indices;
  }

  public checkGuess(guess: string, targetWord: string): { isCorrect: boolean; isClose: boolean } {
    const g = guess.trim().toLowerCase();
    const target = targetWord.trim().toLowerCase();

    if (g === target) {
      return { isCorrect: true, isClose: false };
    }

    // Check Levenshtein distance for close match
    const dist = this.levenshteinDistance(g, target);
    const threshold = target.length > 7 ? 2 : 1;
    const isClose = dist <= threshold && Math.abs(g.length - target.length) <= 2;

    return { isCorrect: false, isClose };
  }

  public levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
