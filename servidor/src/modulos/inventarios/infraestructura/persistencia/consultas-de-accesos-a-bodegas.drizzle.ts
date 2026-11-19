import { asc, eq } from 'drizzle-orm';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeAccesosABodegas,
  UsuarioConAcceso,
} from '../../aplicacion/puertos/consultas-de-accesos-a-bodegas.js';
import { accesosABodegas } from './accesos-a-bodegas.tablas.js';
import { bodegas } from './bodegas.tablas.js';

/**
 * La tabla de accesos solo tiene seguridad por empresa (muestra todas las filas de la empresa);
 * el `join` con `bodegas` aplica su alcance, así nunca aparece una bodega que el operador no ve.
 */
export class ConsultasDeAccesosABodegasDrizzle implements ConsultasDeAccesosABodegas {
  async usuariosConAcceso(bodegaId: string): Promise<UsuarioConAcceso[]> {
    return transaccionEnCurso()
      .select({ usuarioId: accesosABodegas.usuarioId, usuario: usuarios.usuario })
      .from(accesosABodegas)
      .innerJoin(bodegas, eq(bodegas.id, accesosABodegas.bodegaId))
      .innerJoin(usuarios, eq(usuarios.id, accesosABodegas.usuarioId))
      .where(eq(accesosABodegas.bodegaId, bodegaId))
      .orderBy(asc(usuarios.usuario));
  }
}
