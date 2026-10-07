import { GamePhase, RoomSettings, GameStatePayload } from '../types';
import { Player } from './Player';
import { WordManager, WordOption } from '../services/WordManager';

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase, state: GameStatePayload) => void;
  onTimerTick: (timeLeft: number) => void;
  onHintUpdate: (hint: string, revealedCount: number) => void;
  onWordOptions: (drawer: Player, options: WordOption[]) => void;
  onRoundEnd: (data: { word: string; scores: { id: string; name: string; roundScore: number; totalScore: number }[]; nextDrawerName: string | null }) => void;
  onGameOver: (leaderboard: Player[]) => void;
  onWordChosen: (drawer: Player, wordLength: number, hint: string) => void;
  onAllGuessedEarly: () => void;
}

export class Game {
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public currentDrawer: Player | null = null;
  public currentWord: string = '';
  public currentCategory: string = '';
  public revealedIndices: Set<number> = new Set();
  public currentHint: string = '';
  public timeLeft: number = 0;

  private drawerQueue: string[] = [];
  private currentDrawerIndex: number = -1;
  private timerInterval: NodeJS.Timeout | null = null;
  private wordManager: WordManager;
  private settings: RoomSettings;
  private callbacks: GameCallbacks;
  private getPlayers: () => Player[];
  private hintTimestamps: number[] = [];

  constructor(
    settings: RoomSettings,
    wordManager: WordManager,
    getPlayers: () => Player[],
    callbacks: GameCallbacks
  ) {
    this.settings = settings;
    this.wordManager = wordManager;
    this.getPlayers = getPlayers;
    this.callbacks = callbacks;
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): RoomSettings {
    return { ...this.settings };
  }

  public start(): boolean {
    const players = this.getPlayers();
    if (players.length < 2) return false;

    this.currentRound = 1;
    this.resetScores();
    this.setupRoundQueue();
    this.startNextTurn();
    return true;
  }

  private resetScores(): void {
    const players = this.getPlayers();
    for (const player of players) {
      player.score = 0;
      player.roundScore = 0;
      player.hasGuessed = false;
      player.isDrawing = false;
    }
  }

  private setupRoundQueue(): void {
    const players = this.getPlayers();
    // Maintain a consistent player queue for the round
    this.drawerQueue = players.map(p => p.id);
    this.currentDrawerIndex = -1;
  }

  public startNextTurn(): void {
    this.clearTimer();
    const players = this.getPlayers();

    // Reset round states
    for (const p of players) {
      p.resetRound();
    }

    this.currentDrawerIndex++;

    // Check if this round's queue is complete
    if (this.currentDrawerIndex >= this.drawerQueue.length) {
      this.currentRound++;
      if (this.currentRound > this.settings.rounds) {
        this.endGame();
        return;
      }
      this.setupRoundQueue();
      this.currentDrawerIndex = 0;
    }

    const drawerId = this.drawerQueue[this.currentDrawerIndex];
    const drawer = players.find(p => p.id === drawerId);

    // If player disconnected or not found, move to next
    if (!drawer || drawer.isDisconnected) {
      this.startNextTurn();
      return;
    }

    this.currentDrawer = drawer;
    drawer.isDrawing = true;
    this.phase = 'CHOOSING_WORD';
    this.currentWord = '';
    this.revealedIndices.clear();
    this.currentHint = '';

    // Generate word choices
    const choices = this.wordManager.getRandomWordChoices(
      this.settings.wordCount,
      this.settings.customWords,
      this.settings.customWordsOnly
    );

    this.callbacks.onWordOptions(drawer, choices);

    // 15 seconds to choose a word
    const chooseTime = 15;
    this.timeLeft = chooseTime;

    this.callbacks.onPhaseChange(this.phase, this.getStatePayload());

    this.startTimer(chooseTime, () => {
      // Auto-choose first word if timed out
      const fallbackChoice = choices[0] || { word: 'apple', category: 'food' };
      this.chooseWord(fallbackChoice.word, fallbackChoice.category);
    });
  }

  public chooseWord(word: string, category: string = 'general'): void {
    if (this.phase !== 'CHOOSING_WORD') return;

    this.clearTimer();
    this.currentWord = word.trim().toLowerCase();
    this.currentCategory = category;
    this.revealedIndices.clear();
    this.currentHint = this.wordManager.generateHintPattern(this.currentWord, this.revealedIndices, this.settings.wordMode);
    this.phase = 'DRAWING';
    this.timeLeft = this.settings.drawTime;

    // Calculate hint reveal moments
    this.setupHintSchedule();

    if (this.currentDrawer) {
      this.callbacks.onWordChosen(this.currentDrawer, this.currentWord.length, this.currentHint);
    }
    this.callbacks.onPhaseChange(this.phase, this.getStatePayload());

    this.startTimer(this.settings.drawTime, () => {
      this.endTurn();
    });
  }

  private setupHintSchedule(): void {
    this.hintTimestamps = [];
    const count = Math.min(this.settings.hintsCount, Math.max(0, this.currentWord.length - 2));
    if (count <= 0 || this.settings.wordMode === 'hidden') return;

    // Distribute hints at fractions of drawTime
    const interval = this.settings.drawTime / (count + 1);
    for (let i = 1; i <= count; i++) {
      this.hintTimestamps.push(Math.round(this.settings.drawTime - (i * interval)));
    }
  }

  private checkHintReveal(): void {
    if (this.hintTimestamps.length === 0) return;

    if (this.hintTimestamps.includes(this.timeLeft)) {
      const candidates = this.wordManager.getCandidateIndices(this.currentWord)
        .filter(idx => !this.revealedIndices.has(idx));

      if (candidates.length > 0) {
        const randomIdx = candidates[Math.floor(Math.random() * candidates.length)];
        this.revealedIndices.add(randomIdx);
        this.currentHint = this.wordManager.generateHintPattern(this.currentWord, this.revealedIndices, this.settings.wordMode);
        this.callbacks.onHintUpdate(this.currentHint, this.revealedIndices.size);
      }
    }
  }

  public handleCorrectGuess(player: Player): number {
    if (this.phase !== 'DRAWING' || player.hasGuessed || player.isDrawing) {
      return 0;
    }

    player.hasGuessed = true;
    player.guessTimestamp = Date.now();

    // Scoring formula:
    // Faster guess = more points (scale 100 to 500)
    const timeFraction = Math.max(0.1, this.timeLeft / this.settings.drawTime);
    const guessPoints = Math.round(100 + (timeFraction * 400));
    player.addScore(guessPoints);

    // Check if all non-drawers have guessed
    const nonDrawers = this.getPlayers().filter(p => !p.isDrawing && !p.isDisconnected);
    const allGuessed = nonDrawers.every(p => p.hasGuessed);

    if (allGuessed) {
      this.callbacks.onAllGuessedEarly();
      this.endTurn();
    }

    return guessPoints;
  }

  public endTurn(): void {
    this.clearTimer();
    this.phase = 'ROUND_END';

    // Calculate drawer points based on successful guesses
    const nonDrawers = this.getPlayers().filter(p => !p.isDrawing && !p.isDisconnected);
    const guessedCount = nonDrawers.filter(p => p.hasGuessed).length;

    if (this.currentDrawer && nonDrawers.length > 0) {
      const drawerPoints = Math.round((guessedCount / nonDrawers.length) * 350);
      this.currentDrawer.addScore(drawerPoints);
    }

    const scores = this.getPlayers().map(p => ({
      id: p.id,
      name: p.name,
      roundScore: p.roundScore,
      totalScore: p.score,
    }));

    // Find next drawer name for preview
    let nextDrawerName: string | null = null;
    const nextIdx = this.currentDrawerIndex + 1;
    if (nextIdx < this.drawerQueue.length) {
      const nextId = this.drawerQueue[nextIdx];
      const nextPlayer = this.getPlayers().find(p => p.id === nextId);
      if (nextPlayer) nextDrawerName = nextPlayer.name;
    }

    this.callbacks.onRoundEnd({
      word: this.currentWord,
      scores,
      nextDrawerName,
    });
    this.callbacks.onPhaseChange(this.phase, this.getStatePayload());

    // 5-second round transition intermission
    const intermission = 5;
    this.timeLeft = intermission;
    this.startTimer(intermission, () => {
      this.startNextTurn();
    });
  }

  public endGame(): void {
    this.clearTimer();
    this.phase = 'GAME_OVER';

    const leaderboard = [...this.getPlayers()].sort((a, b) => b.score - a.score);
    this.callbacks.onGameOver(leaderboard);
    this.callbacks.onPhaseChange(this.phase, this.getStatePayload());
  }

  public handlePlayerLeave(playerId: string): void {
    // If the active drawer left, skip turn cleanly
    if (this.currentDrawer && this.currentDrawer.id === playerId) {
      this.endTurn();
      return;
    }

    // Check if remaining guessers have already guessed
    if (this.phase === 'DRAWING') {
      const remainingGuessers = this.getPlayers().filter(p => !p.isDrawing && !p.isDisconnected && p.id !== playerId);
      if (remainingGuessers.length > 0 && remainingGuessers.every(p => p.hasGuessed)) {
        this.endTurn();
      }
    }
  }

  private startTimer(duration: number, onComplete: () => void): void {
    this.clearTimer();
    this.timeLeft = duration;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTimerTick(this.timeLeft);

      if (this.phase === 'DRAWING') {
        this.checkHintReveal();
      }

      if (this.timeLeft <= 0) {
        this.clearTimer();
        onComplete();
      }
    }, 1000);
  }

  public clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public resetToLobby(): void {
    this.clearTimer();
    this.phase = 'LOBBY';
    this.currentRound = 0;
    this.currentDrawer = null;
    this.currentWord = '';
    this.revealedIndices.clear();
    this.currentHint = '';
    this.timeLeft = 0;

    for (const player of this.getPlayers()) {
      player.resetRound();
      player.score = 0;
      player.isReady = false;
    }

    this.callbacks.onPhaseChange(this.phase, this.getStatePayload());
  }

  public getStatePayload(): GameStatePayload {
    return {
      phase: this.phase,
      round: this.currentRound,
      totalRounds: this.settings.rounds,
      drawerId: this.currentDrawer ? this.currentDrawer.id : null,
      drawerName: this.currentDrawer ? this.currentDrawer.name : null,
      timeLeft: this.timeLeft,
      hint: this.currentHint,
      wordLength: this.currentWord.length,
      category: this.currentCategory,
      revealedLettersCount: this.revealedIndices.size,
    };
  }
}
