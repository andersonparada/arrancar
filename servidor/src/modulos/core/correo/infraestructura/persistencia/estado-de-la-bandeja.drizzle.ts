import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { CorreoFallidoDto } from '../../aplicacion/dto/bandeja-de-soporte.dto.js';
import type { ConteoPorEstado, EstadoDeLaBandeja } from '../../aplicacion/puertos/estado-de-la-bandeja.js';
import type { EstadoDeCorreo } from '../../dominio/estado-de-correo.js';

interface FilaDeConteo extends Record<string, unknown> {
  estado: EstadoDeCorreo;
  total: number;
  mas_antiguo: Date | string;
}

interface FilaDeFallido extends Record<string, unknown> {
  id: string;
  empresa: string;
  tipo: string;
  codigo: string | null;
  intentos: number;
  creado_en: Date | string;
  contenido_depurado: boolean;
}

/** Sin unidad de trabajo ni variables de empresa: solo las funciones de la migración 0027. */
export class EstadoDeLaBandejaDrizzle implements EstadoDeLaBandeja {
  constructor(private readonly bd: BaseDatos) {}

  async conteos(): Promise<ConteoPorEstado[]> {
    const { rows } = await this.bd.execute<FilaDeConteo>(sql`select * from core.resumen_de_la_bandeja()`);
    return rows.map((fila) => ({
      estado: fila.estado,
      total: fila.total,
      masAntiguo: new Date(fila.mas_antiguo),
    }));
  }

  async fallidosRecientes(limite: number): Promise<CorreoFallidoDto[]> {
    const { rows } = await this.bd.execute<FilaDeFallido>(
      sql`select * from core.correos_fallidos_recientes(${limite})`,
    );
    return rows.map((fila) => ({
      id: fila.id,
      empresa: fila.empresa,
      tipo: fila.tipo,
      codigo: fila.codigo,
      intentos: fila.intentos,
      creadoEn: new Date(fila.creado_en),
      contenidoDepurado: fila.contenido_depurado,
    }));
  }
}
