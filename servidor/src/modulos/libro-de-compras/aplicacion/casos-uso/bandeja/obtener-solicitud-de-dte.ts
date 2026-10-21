import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DteNoEstaPendiente } from '../../../dominio/errores-de-bandeja.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { ArmadorDeSolicitudDelDte } from './armador-de-solicitud-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';
import type { SolicitudConAvisos } from './solicitud-desde-el-dte.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  armador: ArmadorDeSolicitudDelDte;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
}

/**
 * «Abrir en el formulario»: la solicitud de registro propuesta para la fila (lo completado, las propuestas y los montos del
 * DTE), con el proveedor, el concepto y el destino que falten en `null`. El formulario de L3-8 se abre lleno con ella; al
 * registrar, el enlace por autorización marca la fila. Un IVA que no cuadra con el total no es un error aquí: los montos
 * salen sin deducir y con un aviso, para que el usuario los corrija.
 */
export class ObtenerSolicitudDeDte {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe; DteNoEstaPendiente si la fila ya se registró o se descartó. */
  ejecutar(operador: Operador, id: string): Promise<SolicitudConAvisos> {
    const { unidadDeTrabajo, filas, armador, crearProponedor } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fila = await filas.buscar(Identificador.desde<'DteRecibido'>(id));
      if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
      if (fila.estado !== 'pendiente') throw new DteNoEstaPendiente(fila.estado);
      const { solicitud, avisos } = await armador.armar(operador, fila, {
        proponedor: crearProponedor(operador),
        tolerante: true,
      });
      return { solicitud, avisos };
    });
  }
}
