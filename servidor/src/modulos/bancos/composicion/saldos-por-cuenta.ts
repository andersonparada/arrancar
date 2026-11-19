import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeSaldosPorCuenta } from '../aplicacion/casos-uso/saldos-por-cuenta/reporte-de-saldos-por-cuenta.js';
import type { FiltroDeSaldosPorCuenta } from '../aplicacion/dto/saldos-por-cuenta.dto.js';
import {
  aFilasExportadasDeSaldos,
  columnasDeSaldosPorCuenta,
  type FilaExportadaDeSaldos,
} from '../http/saldos-por-cuenta.columnas.js';
import { SaldosPorCuentaControlador } from '../http/saldos-por-cuenta.controlador.js';
import { rutasSaldosPorCuenta } from '../http/saldos-por-cuenta.rutas.js';
import { ConsultasDeSaldosPorCuentaDrizzle } from '../infraestructura/persistencia/consultas-de-saldos-por-cuenta.drizzle.js';

/** Exporta el reporte con el mismo filtro que la pantalla; nunca se importa (es reporte). */
function intercambioDeSaldos(reporte: ReporteDeSaldosPorCuenta) {
  return crearIntercambio<FilaExportadaDeSaldos, never, FiltroDeSaldosPorCuenta>({
    nombre: 'Saldos por cuenta',
    columnas: columnasDeSaldosPorCuenta,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => aFilasExportadasDeSaldos(await reporte.ejecutar(operador, filtro ?? {})),
    crear: () => {
      throw new Error('El reporte de saldos por cuenta no se importa.');
    },
  });
}

/** Raíz de composición de «Saldos por cuenta»: solo lectura, con su Excel. */
export function rutasDeSaldosPorCuenta() {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const reporte = new ReporteDeSaldosPorCuenta({
    unidadDeTrabajo,
    reloj,
    consultas: new ConsultasDeSaldosPorCuentaDrizzle(),
  });
  return rutasSaldosPorCuenta(new SaldosPorCuentaControlador(reporte), intercambioDeSaldos(reporte));
}
