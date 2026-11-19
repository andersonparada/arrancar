import { sql } from 'drizzle-orm';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PagadoAlProveedorEnElMes } from '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  BloqueoDeBancarizacion,
  PagadoAlProveedor,
  UmbralDeBancarizacion,
} from '../aplicacion/puertos/puertos-de-bancarizacion.js';

export const CLAVE_DEL_UMBRAL = 'libro-de-compras.bancarizacion.umbral';

/** El umbral de bancarización de la instalación (quetzales), convertido a centavos. */
export class UmbralDeBancarizacionEnConfiguracion implements UmbralDeBancarizacion {
  async centavos({ cuentaId, empresaId }: Operador): Promise<number> {
    const quetzales = await configuracion.lector.obtener<number>(CLAVE_DEL_UMBRAL, { cuentaId, empresaId });
    return Math.round(quetzales * 100);
  }
}

/**
 * El turno por empresa y proveedor: `pg_advisory_xact_lock` sobre un número que sale de la clave
 * `libro-de-compras.bancarizacion:<empresa>:<proveedor>`, la misma que toma Cuentas por pagar al repartir efectivo, para
 * que todos los módulos esperen el mismo turno. Dura lo que la transacción y se puede tomar dos veces en ella.
 */
export class BloqueoDeBancarizacionDrizzle implements BloqueoDeBancarizacion {
  async bloquear(proveedorId: string): Promise<void> {
    const { empresaId } = contextoEnCurso();
    const clave = `libro-de-compras.bancarizacion:${empresaId}:${proveedorId}`;
    await transaccionEnCurso().execute(sql`select pg_advisory_xact_lock(hashtextextended(${clave}, 0))`);
  }
}

/** Pregunta a todos los módulos activos que pagan (`preguntarATodos`) y junta lo que responden. */
export class PagadoAlProveedorEnMediador implements PagadoAlProveedor {
  async delMes(operador: Operador, proveedorId: string, mes: string): Promise<PagadoAlProveedorEnElMes[]> {
    const respuestas = await mediador.preguntarATodos(operador, 'libro-de-compras.pagado_al_proveedor_en_el_mes', {
      proveedorId,
      mes,
    });
    return respuestas.map(({ respuesta }) => respuesta);
  }
}
