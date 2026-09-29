import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import {
  ReporteDeMovimientos,
  type FiltroDelReporte,
} from '../aplicacion/casos-uso/movimientos/reporte-de-movimientos.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { aFilaExportadaDelReporte, columnasDelReporteDeMovimientos } from '../http/movimientos.columnas.js';
import { MovimientosControlador } from '../http/movimientos.controlador.js';
import { rutasMovimientos } from '../http/movimientos.rutas.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeMovimientos() {
  const { unidadDeTrabajo, auditoria, correlativos, reloj } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    reloj,
    consultas,
    repositorio: new RepositorioMovimientosDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro }),
  };
}

const casosDeUso = (dependencias: ReturnType<typeof dependenciasDeMovimientos>) => ({
  obtener: new ObtenerMovimiento(dependencias),
  reporte: new ReporteDeMovimientos(dependencias),
});

/** Exporta el reporte con los mismos filtros que la pantalla; nunca se importa (es reporte). */
function intercambioDelReporte(casos: ReturnType<typeof casosDeUso>) {
  return crearIntercambio<ReturnType<typeof aFilaExportadaDelReporte>, never, FiltroDelReporte>({
    nombre: 'Movimientos',
    columnas: columnasDelReporteDeMovimientos,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => {
      const reporte = await casos.reporte.ejecutar(operador, filtro ?? {});
      return reporte.filas.map(aFilaExportadaDelReporte);
    },
    crear: () => {
      throw new Error('El reporte de movimientos no se importa.');
    },
  });
}

/** Raíz de composición de los movimientos: solo lectura (el reporte); registrar vive en Notas y en Saldo inicial. */
export function rutasDeMovimientos() {
  const casos = casosDeUso(dependenciasDeMovimientos());
  return rutasMovimientos(new MovimientosControlador(casos), intercambioDelReporte(casos));
}
