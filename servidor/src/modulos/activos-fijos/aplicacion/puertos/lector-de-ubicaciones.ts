import type { UbicacionesDto } from '../dto/activo.dto.js';

export interface LocalidadVisible {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface DepartamentoVisible extends LocalidadVisible {
  localidadId: string | null;
}

/**
 * Los nombres de las localidades y departamentos de la empresa, sin el alcance de localidades de Empresas
 * (AF-P22 b: Activos fijos no filtra por localidad). Solo dan id, código, nombre y si están activos.
 */
export interface LectorDeUbicaciones {
  localidad(id: string): Promise<LocalidadVisible | null>;
  departamento(id: string): Promise<DepartamentoVisible | null>;
  /** Las activas, para los selectores de destino. */
  activas(): Promise<UbicacionesDto>;
}
