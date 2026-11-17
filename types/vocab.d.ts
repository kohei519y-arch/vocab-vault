/**
 * Vocab Vault — Core TypeScript Declarations
 * 全モジュール共通の単語エントリ・FSRS・同期・辞書スキーマ型定義
 */

export type LanguageCode = 'en' | 'ja' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'nl' | 'zh' | 'ko';

export interface VocabDialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface VocabDOMApi {
  clear(el: Element | any): void;
  setSafeHtml(el: Element | any, rawHtml: string): void;
  createEl(tag: string, attrs?: Record<string, any> | null, children?: any): Element | any;
  stripUnsafeHtmlString(raw: string): string;
}

export interface VocabTelemetryEntry {
  type: string;
  message: string;
  detail: string;
  at: string;
}

export interface VocabTelemetryApi {
  captureError(type: string, message: string, detail?: string): void;
  getErrors(): VocabTelemetryEntry[];
  clearErrors(): void;
  setHook(fn: ((entry: VocabTelemetryEntry) => void) | null): void;
}

export type PartOfSpeech =
  | 'Noun' | 'N[C]' | 'N[U]' | 'N[C/U]' | 'N[pl]' | 'N[m]' | 'N[f]' | 'N[n]'
  | 'Verb' | 'V[T]' | 'V[I]' | 'V[T/I]' | 'V[refl]' | 'Phrasal V'
  | 'Adj' | 'Adv' | 'Prep' | 'Conj' | 'Pron' | 'Idiom';

export type EtymologyConfidence = 'certain' | 'probable' | 'disputed' | 'unknown';

export interface MeaningSense {
  pos: PartOfSpeech | string;
  text: string;
}

export interface ExampleSentence {
  foreign: string;
  ja: string;
  used_form?: string;
}

export interface PhraseItem {
  foreign: string;
  ja: string;
}

export interface DerivativeItem {
  word: string;
  phonetic?: string;
  pos?: PartOfSpeech | string;
  meaning: string;
  sub_phrase?: string;
  sub_trans?: string;
}

export interface VocabEntry {
  id: string;
  word: string;
  wordKey?: string;
  lang: LanguageCode | string;
  num: number;
  homographIndex?: number;
  category: string;
  folder?: string;
  phonetic?: string;
  grammar_forms?: string;
  etymologyConfidence?: EtymologyConfidence;
  wiktGrounded?: boolean;
  wiktUrl?: string;
  etymology?: string;
  etymologyTags?: string[];
  history_note?: string;
  core?: string;
  meanings: MeaningSense[];
  example?: ExampleSentence | null;
  phrases?: PhraseItem[];
  derivatives?: DerivativeItem[];
  contextSentence?: string;

  // FSRS & Spaced Repetition Parameters
  interval: number;
  repetition: number;
  efactor: number;
  stability?: number;
  difficulty?: number;
  retrievability?: number;
  nextReview: number;
  reviewUpdatedAt?: number;
  isDeleted?: boolean;
  flags?: string[];
  gen?: {
    model?: string;
    pv?: string;
    at?: number;
  };
  updatedAt: number;
  /** 論理クロック（Lamport Version: 端末時計狂い Clock Skew 耐性） */
  version?: number;
}

export interface LanguagePairConfig {
  key: string;
  snap: string;
  tomb: string;
  clearKey: string;
  srcLang: LanguageCode;
  tgtLang: LanguageCode;
  pairId?: string;
}

export interface QueueTask {
  items: Array<{
    word: string;
    pos?: string;
    meaning?: string;
    sentence?: string;
    homographIndex?: number;
  }>;
  fName?: string;
  useHist?: boolean;
  useWikt?: boolean;
  targetLang?: string;
  srcLang?: string;
  tgtLang?: string;
  pairKey?: string;
  isCancelled?: boolean;
  isDone?: boolean;
  isFailed?: boolean;
  card?: HTMLElement | any;
}

export interface DailyAiUsageInfo {
  limit: number;
  used: number;
  count: number;
  remaining: number;
  isUnlimited: boolean;
  isPro: boolean;
  isDev: boolean;
  today: string;
}

export interface DailyOcrUsageInfo {
  limit: number;
  used: number;
  remaining: number;
  isUnlimited: boolean;
  isPro: boolean;
  isDev: boolean;
  today: string;
}

export interface RootTreeProgress {
  totalWords: number;
  totalRoots: number;
  leadingRoot: string;
  leadingCount: number;
  remToCluster: number;
}

export interface MetricsSummary {
  totalWords: number;
  cacheHits: number;
  onDevice: number;
  cloudGen: number;
  tokensSaved: number;
  cacheRate: number;
}
