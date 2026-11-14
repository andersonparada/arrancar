import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import type { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { DesgloseDeMovimientos } from '../aplicacion/desglose-de-movimientos.js';
import { RevisorDeCambios } from '../aplicacion/revisor-de-cambios.js';
import { AvisosDeMovimientosEnMediador } from '../infraestructura/avisos-de-movimientos-en-mediador.js';
import { CuentasPorPagarActivoEnModulosActivos } from '../infraestructura/cuentas-por-pagar-activo-en-modulos-activos.js';
import { RepositorioDeDesgloseDrizzle } from '../infraestructura/persistencia/repositorio-de-desglose.drizzle.js';

/**
 * Lo que comparten los casos de uso que tocan movimientos de otro módulo o notas marcadas (CP4): saber si Cuentas
 * por pagar está activo, avisarle antes de un cambio y guardar el reparto por concepto.
 */
export function piezasDeOrigen(conceptos: ConceptosDeMovimientos) {
  const cuentasPorPagar = new CuentasPorPagarActivoEnModulosActivos(new ModulosActivosDeLaCuentaEnRegistro());
  return {
    cuentasPorPagar,
    revisor: new RevisorDeCambios({ avisos: new AvisosDeMovimientosEnMediador(), cuentasPorPagar }),
    desglose: new DesgloseDeMovimientos({ conceptos, repositorio: new RepositorioDeDesgloseDrizzle() }),
  };
}
