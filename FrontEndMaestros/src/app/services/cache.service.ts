import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live en milisegundos
  maxSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private subjects = new Map<string, BehaviorSubject<any>>();
  private pendingRequests = new Map<string, Observable<any>>();
  
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutos por defecto
    maxSize: 100
  };

  constructor() {
    // Limpiar caché expirado cada minuto
    setInterval(() => this.cleanExpired(), 60000);
  }

  /**
   * Obtener datos del caché o ejecutar el observable
   */
  get<T>(key: string, source$: Observable<T>, ttl?: number): Observable<T> {
    const cached = this.cache.get(key);
    
    // Si está en caché y no ha expirado
    if (cached && !this.isExpired(cached)) {
      console.log(`📦 Cache hit: ${key}`);
      return of(cached.data as T);
    }

    // Si hay una petición pendiente, reutilizarla
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Reusing pending request: ${key}`);
      return this.pendingRequests.get(key) as Observable<T>;
    }

    // Ejecutar el observable y cachear el resultado
    console.log(`🔄 Cache miss: ${key}`);
    const request$ = source$.pipe(
      tap(data => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
      }),
      shareReplay(1)
    );

    this.pendingRequests.set(key, request$);
    return request$;
  }

  /**
   * Guardar datos en caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Limpiar si excede el tamaño máximo
    if (this.cache.size >= this.config.maxSize) {
      this.cleanOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl || this.config.defaultTTL
    };

    this.cache.set(key, entry);

    // Actualizar BehaviorSubject si existe
    const subject = this.subjects.get(key);
    if (subject) {
      subject.next(data);
    }

    console.log(`💾 Cached: ${key}`);
  }

  /**
   * Obtener un BehaviorSubject para suscribirse a cambios
   */
  getSubject<T>(key: string, initialValue?: T): BehaviorSubject<T | null> {
    if (!this.subjects.has(key)) {
      const cached = this.cache.get(key);
      const value = cached && !this.isExpired(cached) ? cached.data : initialValue ?? null;
      this.subjects.set(key, new BehaviorSubject<T | null>(value));
    }
    return this.subjects.get(key) as BehaviorSubject<T | null>;
  }

  /**
   * Invalidar una entrada del caché
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Invalidar entradas que coincidan con un patrón
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  /**
   * Limpiar todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Verificar si una entrada ha expirado
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.expiresIn;
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanExpired(): void {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Limpiar las entradas más antiguas
   */
  private cleanOldest(): void {
    // Ordenar por timestamp y eliminar el 20% más antiguo
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`🧹 Removed ${toRemove} oldest cache entries`);
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Claves de caché predefinidas
 */
export const CACHE_KEYS = {
  TIPOS_INVENTARIO: 'tipos-inventario',
  ANALISTAS: 'analistas',
  CATEGORIAS_DISPOSITIVOS: 'categorias-dispositivos',
  CATEGORIAS_CONSUMIBLES: 'categorias-consumibles',
  UBICACIONES: 'ubicaciones',
  USUARIOS: 'usuarios',
  
  // Funciones para generar claves dinámicas
  dispositivo: (id: number) => `dispositivo-${id}`,
  consumible: (id: number) => `consumible-${id}`,
  mobiliario: (id: number) => `mobiliario-${id}`,
  consumiblesPorTipo: (tipo: string) => `consumibles-${tipo}`,
  estadisticas: (tipo: string) => `estadisticas-${tipo}`
};
