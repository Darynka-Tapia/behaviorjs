export interface TrackerProviders {
  discord?: string;
  slack?: string;
  telegram?: {
    token: string;
    chatId: string;
  };
}

export interface TrackerConfig {
  targets: string[];
  providers?: TrackerProviders;
  debug?: boolean;
}