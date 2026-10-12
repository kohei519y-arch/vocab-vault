/**
 * Vocab Vault — Core TypeScript Declarations
 * 全モジュール共通の単語エントリ・FSRS・同期・辞書スキーマ型定義
 */

export type LanguageCode = 'en' | 'fr' | 'de' | 'ja';

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
