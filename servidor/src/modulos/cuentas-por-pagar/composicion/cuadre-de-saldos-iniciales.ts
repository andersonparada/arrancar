import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/empresas.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import {
  RevisarCierreDeCargaEnCuentasPorPagar,
  type DependenciasDeLaRevisionDeCierre,
} from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-cuentas-por-pagar.js';
import { ObtenerCuadreDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/obtener-cuadre-de-saldos-iniciales.js';
import {
  aFilasExportadasDeCuadre,
  columnasDelCuadreDeSaldosIniciales,
  type FilaExportadaDeCuadre,
} from '../http/cuadre-de-saldos-iniciales.columnas.js';
import { CuadreDeSaldosInicialesControlador } from '../http/cuadre-de-saldos-iniciales.controlador.js';
import { rutasDelCuadreDeSaldosIniciales } from '../http/cuadre-de-saldos-iniciales.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultasDeCuadreDrizzle } from '../infraestructura/persistencia/cuadre-de-saldos-iniciales.drizzle.js';

function intercambioDelCuadre(cuadre: ObtenerCuadreDeSaldosIniciales) {
  return crearIntercambio<FilaExportadaDeCuadre, never>({
    nombre: 'Cuadre de saldos iniciales',
    columnas: columnasDelCuadreDeSaldosIniciales,
    validar: () => ({ errores: [] }),
    listar: async (operador) => aFilasExportadasDeCuadre(await cuadre.ejecutar(operador)),
    soloExportar: true,
    crear: () => {
      throw new Error('El cuadre de saldos iniciales no se importa.');
    },
  });
}

/** Responde por el mediador la revisión que Empresas pide antes de cerrar la carga inicial (EM-2). */
function responderRevisionDeCierre(dependencias: DependenciasDeLaRevisionDeCierre): void {
  const revisar = new RevisarCierreDeCargaEnCuentasPorPagar(dependencias);
  mediador.responder('cuentas-por-pagar', 'empresas.revisar_cierre_de_carga', (datos, operador) =>
    revisar.ejecutar(operador, datos),
  );
}

/** Raíz de composición del cuadre de los saldos iniciales y de la revisión del cierre de la carga inicial. */
export function rutasDelCuadreDeSaldosInicialesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const consultas = new ConsultasDeCuadreDrizzle();
  const cuadre = new ObtenerCuadreDeSaldosIniciales({
    unidadDeTrabajo,
    consultas,
    cargaInicial: new CargaInicialEnMediador(),
  });
  responderRevisionDeCierre({ unidadDeTrabajo, consultas });
  return rutasDelCuadreDeSaldosIniciales(new CuadreDeSaldosInicialesControlador(cuadre), intercambioDelCuadre(cuadre));
}
