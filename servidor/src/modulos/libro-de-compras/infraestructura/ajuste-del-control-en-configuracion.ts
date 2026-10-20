import { and, eq } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import { configuraciones } from '../../core/configuracion/infraestructura/persistencia/configuraciones.tablas.js';
import { usuarios } from '../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { AjusteDelControl, DetalleDelAjuste } from '../aplicacion/puertos/puertos-de-periodos.js';

export const CLAVE_DEL_CONTROL = 'libro-de-compras.periodos.control_de_declarados';

/**
 * El bloqueo de períodos declarados es una variable de configuración del nivel empresa (`control_de_declarados`):
 * así la instalación puede fijar un valor para todas y cada empresa lo cambia para sí. Quién y cuándo lo cambió
 * salen de la misma fila de configuración y, con su motivo, de la auditoría.
 */
export class AjusteDelControlEnConfiguracion implements AjusteDelControl {
  encendido(): Promise<boolean> {
    const { cuentaId, empresaId } = contextoEnCurso();
    return configuracion.lector.obtener<boolean>(CLAVE_DEL_CONTROL, { cuentaId, empresaId });
  }

  async detalle(): Promise<DetalleDelAjuste> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .select({
        actualizadoEn: configuraciones.actualizadoEn,
        id: usuarios.id,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
      })
      .from(configuraciones)
      .leftJoin(usuarios, eq(usuarios.id, configuraciones.actualizadoPor))
      .where(
        and(
          eq(configuraciones.nivel, 'empresa'),
          eq(configuraciones.empresaId, empresaId),
          eq(configuraciones.clave, CLAVE_DEL_CONTROL),
        ),
      );
    const actualizadoPor = fila?.id ? { id: fila.id, nombre: `${fila.nombres} ${fila.apellidos}`.trim() } : null;
    return { encendido: await this.encendido(), actualizadoEn: fila?.actualizadoEn ?? null, actualizadoPor };
  }

  async establecer(encendido: boolean): Promise<void> {
    const { cuentaId, empresaId, usuarioId } = contextoEnCurso();
    await configuracion.establecer.ejecutar({
      destino: { cuentaId, empresaId },
      clave: CLAVE_DEL_CONTROL,
      nivel: 'empresa',
      valor: encendido,
      usuarioId,
    });
  }
}
