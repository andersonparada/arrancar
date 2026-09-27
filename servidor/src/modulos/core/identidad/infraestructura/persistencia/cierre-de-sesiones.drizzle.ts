import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { CierreDeSesiones } from '../../aplicacion/puertos/cierre-de-sesiones.js';
import { sesiones } from './usuarios.tablas.js';

/** Fuera de la unidad de trabajo: se cierra después de confirmar el cambio que lo motiva. */
export class CierreDeSesionesDrizzle implements CierreDeSesiones {
  constructor(private readonly bd: BaseDatos) {}

  async cerrarTodasDe(usuarioId: string): Promise<void> {
    await this.bd.delete(sesiones).where(eq(sesiones.usuarioId, usuarioId));
  }
}
