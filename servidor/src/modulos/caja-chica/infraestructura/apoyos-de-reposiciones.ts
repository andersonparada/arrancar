import { eq } from 'drizzle-orm';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { transaccionEnCurso } from '../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { movimientos } from '../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import type {
  ConciliacionDeMovimientos,
  ConfiguracionDeControl,
  LibroParaReponer,
} from '../aplicacion/puertos/puertos-de-reposiciones.js';
import type { SeparacionDeFuncionesConfigurada } from '../dominio/reglas-de-reposiciones.js';

/** Lee de Bancos (el módulo depende de él) si el banco ya pagó el movimiento: está en una conciliación. */
export class ConciliacionDeMovimientosDrizzle implements ConciliacionDeMovimientos {
  async estaConciliado(movimientoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ conciliacionId: movimientos.conciliacionId })
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId));
    return (fila?.conciliacionId ?? null) !== null;
  }
}

/** Las órdenes a Libro de compras van por el mediador: este módulo no importa nada del otro. */
export class LibroParaReponerEnMediador implements LibroParaReponer {
  marcarProcesado(operador: Operador, documentoId: string, procesado: boolean): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId, procesado });
  }
}

/** La opción de control del fondo, de la configuración por niveles (empresa → instalación). */
export class ConfiguracionDeControlEnConfiguracion implements ConfiguracionDeControl {
  separacionDeFunciones({ cuentaId, empresaId }: Operador): Promise<SeparacionDeFuncionesConfigurada> {
    return configuracion.lector.obtener<SeparacionDeFuncionesConfigurada>(
      'caja-chica.control.separacion_de_funciones',
      { cuentaId, empresaId },
    );
  }
}
