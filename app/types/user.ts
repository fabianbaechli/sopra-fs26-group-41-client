export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  token: string;
}

export interface UserStats {
  moviesLogged: number;
  highlyRatedMovies: number;
}

export interface MyProfile {
  id: number;
  username: string;
  hasLetterboxdData: boolean;
  stats: UserStats;
}

export interface LetterboxdImportResponse {
  id: number;
  username: string;
  hasLetterboxdData: boolean;
  stats: UserStats;
}

export interface UserProfile {
  id: number;
  username: string;
  hasLetterboxdData: boolean;
  tasteOverlap?: number;
  stats: UserStats;
}