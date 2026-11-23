import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FotoDelPeriodo } from '../../../dominio/periodos/foto-del-periodo.js';
import { huellaDelLibro } from '../libro/libro-para-imprimir.js';
import { dtoDelLibro } from '../../dto/libro.dto.js';
import type {
  AjusteDelControl,
  ConsultasDelPeriodo,
  RepositorioDePeriodos,
} from '../../puertos/puertos-de-periodos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CifrasDeVentas } from '../../puertos/cifras-de-ventas.js';
import { armarLibro, type DependenciasParaArmarElLibro, type LibroArmado } from '../libro/consultar-libro.js';

/** Lo que comparten los casos de uso de períodos: el libro (para la foto), el historial, el ajuste y el rastro. */
export interface DependenciasDePeriodos extends DependenciasParaArmarElLibro {
  unidadDeTrabajo: UnidadDeTrabajo;
  periodos: RepositorioDePeriodos;
  consultasDelPeriodo: ConsultasDelPeriodo;
  ajuste: AjusteDelControl;
  cifrasDeVentas: CifrasDeVentas;
  auditoria: Auditoria;
  reloj: Reloj;
  publicadorEventos: PublicadorEventos;
}

/** Los totales del libro armado, tal como se guardan al declarar: el mismo cálculo del libro, no otro. */
export function fotoDelLibro(armado: LibroArmado): FotoDelPeriodo {
  return {
    version: 1,
    tipoDeLibro: armado.libro.tipoDeLibro,
    documentos: armado.libro.filas.length,
    huella: huellaDelLibro(armado.libro.filas),
    resumen: dtoDelLibro(armado.libro, armado).resumen as unknown as Record<string, unknown>,
  };
}

/** La foto del período con el libro de hoy y las cifras de ventas que responden los módulos de ventas. */
export async function fotoDelPeriodoDeHoy(
  dependencias: DependenciasDePeriodos,
  operador: Operador,
  periodo: string,
): Promise<FotoDelPeriodo> {
  const foto = fotoDelLibro(await armarLibro(dependencias, operador, periodo));
  const ventas = await dependencias.cifrasDeVentas.delPeriodo(operador, periodo);
  return ventas.length > 0 ? { ...foto, ventas } : foto;
}
