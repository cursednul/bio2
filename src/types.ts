export type ThemeMode = 'lavender' | 'cyber' | 'sakura' | 'solar';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  primary: string;
  primaryLight: string;
  glow: string;
  bgDark: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  textGradient: string;
}

export interface SocialLink {
  id: string;
  title: string;
  handle: string;
  url: string;
  icon: string;
  copyValue?: string;
  color: string;
}

export interface CommentEntry {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  pinned?: boolean;
}

export interface AdminSettings {
  socialsViewMode: 'cards' | 'dock';
  favGame: string;
  favSong: string;
  announcement: string;
  announcementActive: boolean;
  motionPreset: 'flow' | 'hyper' | 'calm';
}
