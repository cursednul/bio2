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

export interface CommentReply {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface CommentEntry {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  pinned?: boolean;
  isAdmin?: boolean;
  replies?: CommentReply[];
}

export type SocialsViewMode = 'cards' | 'dock' | 'grid';

export interface GlobalSettingsDoc {
  socialsViewMode: SocialsViewMode;
  favGame: string;
  favSong: string;
  announcement: string;
  announcementActive: boolean;
  motionPreset: 'flow' | 'hyper' | 'calm';
  lowPowerMode?: boolean;
  maintenanceMode?: boolean;
  commentsEnabled?: boolean;
  bioEmoticon?: string;
  nickname?: string;
  avatarUrl?: string;
  activeSongId?: string;
  activeSongTitle?: string;
  activeSongArtist?: string;
  activeSongUrl?: string;
  updatedAt?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  sourceType: 'url' | 'upload' | 'preset';
  duration?: number;
  createdAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  gameTitle: string;
  createdAt?: string;
}

export interface AdminSettings {
  socialsViewMode: SocialsViewMode;
  favGame: string;
  favSong: string;
  announcement: string;
  announcementActive: boolean;
  motionPreset: 'flow' | 'hyper' | 'calm';
  lowPowerMode?: boolean;
  maintenanceMode?: boolean;
  commentsEnabled?: boolean;
  bioEmoticon?: string;
  nickname?: string;
  avatarUrl?: string;
}
