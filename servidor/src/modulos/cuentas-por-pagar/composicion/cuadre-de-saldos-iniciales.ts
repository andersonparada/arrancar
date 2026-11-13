import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
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
    crear: () => {
      throw new Error('El cuadre de saldos iniciales no se importa.');
    },
  });
}

/** Raíz de composición del cuadre de los saldos iniciales. */
export function rutasDelCuadreDeSaldosInicialesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const cuadre = new ObtenerCuadreDeSaldosIniciales({
    unidadDeTrabajo,
    consultas: new ConsultasDeCuadreDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
  });
  return rutasDelCuadreDeSaldosIniciales(new CuadreDeSaldosInicialesControlador(cuadre), intercambioDelCuadre(cuadre));
}
