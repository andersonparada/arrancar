import { asc, eq } from 'drizzle-orm';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeAccesosALocalidades,
  UsuarioConAcceso,
} from '../../aplicacion/puertos/consultas-de-accesos-a-localidades.js';
import { accesosALocalidades } from './accesos-a-localidades.tablas.js';
import { localidades } from './localidades.tablas.js';

/**
 * La tabla de accesos solo tiene seguridad por empresa (muestra todas las filas de la empresa);
 * el `join` con `localidades` aplica su alcance, así nunca aparece una localidad que el operador no ve.
 */
export class ConsultasDeAccesosALocalidadesDrizzle implements ConsultasDeAccesosALocalidades {
  async usuariosConAcceso(localidadId: string): Promise<UsuarioConAcceso[]> {
    return transaccionEnCurso()
      .select({ usuarioId: accesosALocalidades.usuarioId, usuario: usuarios.usuario })
      .from(accesosALocalidades)
      .innerJoin(localidades, eq(localidades.id, accesosALocalidades.localidadId))
      .innerJoin(usuarios, eq(usuarios.id, accesosALocalidades.usuarioId))
      .where(eq(accesosALocalidades.localidadId, localidadId))
      .orderBy(asc(usuarios.usuario));
  }
}
