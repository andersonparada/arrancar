import type { Auditoria } from '../../core/compartido/aplicacion/auditoria.js';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { clasificarCambioDeNit, motivoDelCambioDeNit, type CambioDeNit } from '../dominio/cambio-de-nit.js';
import type { EmpresaDto } from './dto/empresa.dto.js';

/** Lo que decide qué se exige al cambiar el NIT. */
export interface PermisoDelNit {
  nitNuevo: string | null;
  /** El operador tiene `empresas.nit.corregir`. */
  puedeCorregir: boolean;
  motivo?: string | null;
}

/**
 * Antes de guardar: quitar o reemplazar el NIT exige permiso y motivo (A-10).
 * @returns el cambio y el motivo (obligatorio solo al quitar o reemplazar).
 * @throws AccesoDenegado sin el permiso; FaltaElMotivoDelCambioDeNit sin motivo.
 */
export function exigirParaCambiarElNit(
  anterior: EmpresaDto,
  { nitNuevo, puedeCorregir, motivo }: PermisoDelNit,
): { cambio: CambioDeNit; motivo: string | null } {
  const cambio = clasificarCambioDeNit(anterior.nit, nitNuevo);
  if (cambio !== 'corregido') return { cambio, motivo: motivo?.trim() || null };
  if (!puedeCorregir) throw new AccesoDenegado('No tiene permiso para quitar o cambiar el NIT de la empresa.');
  return { cambio, motivo: motivoDelCambioDeNit(motivo) };
}

/** Deja rastro de todo cambio de NIT: cómo estaba la empresa y el NIT que quedó. */
export async function auditarElCambioDeNit(
  auditoria: Auditoria,
  { anterior, nitNuevo, motivo }: { anterior: EmpresaDto; nitNuevo: string | null; motivo: string | null },
): Promise<void> {
  await auditoria.registrar({
    recurso: 'empresas.empresas',
    registroId: anterior.id,
    accion: 'corregir',
    anterior: { ...anterior, nitNuevo },
    motivo,
  });
}
