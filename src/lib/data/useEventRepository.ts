import { EventRepository } from './types';
import { localStorageRepository } from './LocalStorageEventRepository';
import { HttpEventRepository } from './HttpEventRepository';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// When NEXT_PUBLIC_API_URL is set, use the HTTP backend.
// Otherwise fall back to localStorage (offline / demo mode).
export const httpRepository: HttpEventRepository | null = API_URL
  ? new HttpEventRepository(API_URL)
  : null;

export function useEventRepository(): EventRepository {
  return httpRepository ?? localStorageRepository;
}
