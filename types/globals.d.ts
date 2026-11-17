/// <reference path="./vocab.d.ts" />
type VocabEntry = import('./vocab').VocabEntry;
type LanguagePairConfig = import('./vocab').LanguagePairConfig;
type QueueTask = import('./vocab').QueueTask;
type DailyAiUsageInfo = import('./vocab').DailyAiUsageInfo;
type DailyOcrUsageInfo = import('./vocab').DailyOcrUsageInfo;
type RootTreeProgress = import('./vocab').RootTreeProgress;
type MetricsSummary = import('./vocab').MetricsSummary;
type VocabDOMApi = import('./vocab').VocabDOMApi;
type VocabTelemetryApi = import('./vocab').VocabTelemetryApi;
type VocabDialogOptions = import('./vocab').VocabDialogOptions;

interface Window {
  __VV_DEV_MASTER?: boolean;
  __VV_DEBUG?: boolean;
  __VV_BASE_PATH__?: string;
  __VV_REG_LOCALE__?: (loc: string, dict: Record<string, string>) => void;
  __VV_REG_PACK__?: (packId: string, items: VocabEntry[]) => void;
  __VV_REG_STARTER_LOCS__?: (locs: Record<string, any>) => void;
  VocabDOM?: VocabDOMApi;
  VocabTelemetry?: VocabTelemetryApi;
  VocabI18n?: any;
  VocabStorage?: any;
  VocabSRS?: any;
  VocabSync?: any;
  VocabOCR?: any;
  VocabMorphology?: any;
  VocabEikenCatalog?: any;
  VocabGraphLayout?: any;
  VocabGraphRenderer?: any;
  VocabGraphWebGL?: any;
  VocabGraphViews?: any;
  VocabGraph?: any;
  VocabFeedback?: any;
  VocabDictionary?: any;
  VocabStarterPack?: any;
  VocabExport?: any;
  VocabSpeech?: any;
  VocabCardView?: any;
  VocabQueue?: any;
  VocabModal?: {
    showDialog?: (opts: any) => Promise<any>;
    uiAlert?: (message: string, opts?: VocabDialogOptions) => Promise<void>;
    uiConfirm?: (message: string, opts?: VocabDialogOptions) => Promise<boolean>;
    uiPrompt?: (message: string, defaultValue?: string, opts?: VocabDialogOptions) => Promise<string | null>;
    [key: string]: any;
  };
  VocabSearch?: any;
  VocabNavigation?: any;
  VocabAnkiView?: any;
  VocabListView?: any;
  VocabEvents?: any;
  VocabCore?: {
    App: any;
    getEntries: () => VocabEntry[];
    setEntries: (entries: VocabEntry[]) => void;
    setProState: (flag: boolean) => boolean;
    setAdminState: (flag: boolean) => boolean;
    setComposingState: (active: boolean) => boolean;
    setFocusedCardIndex: (idx: number) => number;
    setProcessingState: (active: boolean) => boolean;
    setSyncingState: (active: boolean) => boolean;
    setFilterState: (patch: Record<string, any>) => any;
    isDebug: () => boolean;
    [key: string]: any;
  };
  App?: any;
  [key: string]: any;
}

declare var load: ((arg: any) => any) | undefined;
declare var process: any;
declare var App: any;
declare var lsGet: any;
declare var lsSet: any;
declare var setJson: any;
declare var getJson: any;
declare var showToast: any;
declare var toggleModal: any;
declare var esc: any;

interface Navigator {
  standalone?: boolean;
  userLanguage?: string;
}

interface Error {
  status?: number;
  code?: string;
  fatal?: boolean;
  isQuotaExceeded?: boolean;
}

interface Response {
  usedModel?: string;
}

interface Element {
  inert?: boolean;
}

interface HTMLAudioElement {
  referrerPolicy?: string;
}
