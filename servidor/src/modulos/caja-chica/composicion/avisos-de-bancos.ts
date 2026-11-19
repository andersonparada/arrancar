import '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AtenderMovimientoDeFondoPorCambiar } from '../aplicacion/casos-uso/fondos/atender-movimiento-por-cambiar.js';
import type { DependenciasDeReposiciones } from '../aplicacion/casos-uso/reposiciones/dependencias-de-reposiciones.js';
import { AtenderMovimientoDeReposicionPorCambiar } from '../aplicacion/casos-uso/reposiciones/atender-movimiento-de-reposicion-por-cambiar.js';
import { dependenciasDeFondos } from './fondos.js';

/**
 * Atiende el aviso `bancos.movimiento_por_cambiar` de los cheques y las notas de Caja chica. Es un solo manejador porque el
 * módulo escucha el aviso una vez: primero lo ve la reposición dueña del movimiento (si el usuario la ve) y, si no es de
 * una reposición, el manejador de los fondos (apertura, aumentos, disminuciones y movimientos ajenos que dicen ser del módulo).
 */
export function atenderAvisosDeBancos(reposiciones: DependenciasDeReposiciones): void {
  const deReposiciones = new AtenderMovimientoDeReposicionPorCambiar(reposiciones);
  const deFondos = new AtenderMovimientoDeFondoPorCambiar(dependenciasDeFondos());
  mediador.escuchar('caja-chica', 'bancos.movimiento_por_cambiar', async (aviso, operador) => {
    if (await deReposiciones.ejecutar(operador, aviso)) return;
    await deFondos.ejecutar(operador, aviso);
  });
}
