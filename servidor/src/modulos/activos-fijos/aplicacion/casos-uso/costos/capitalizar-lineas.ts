import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CostoInvalido, DemasiadasUnidades, LineaNoCapitalizable } from '../../../dominio/errores-de-costo.js';
import { exigirCapitalizable, type LineaCapitalizable } from '../../../dominio/linea-capitalizable.js';
import { unidadesValidas } from '../../../dominio/reparto-de-costos.js';
import { MAXIMO_DE_UNIDADES } from '../../../dominio/tipos-de-costo.js';
import type { AsignacionDeLinea, CapitalizacionDto, SolicitudDeCapitalizacion } from '../../dto/capitalizacion.dto.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { guardarPlan, type ResultadoDeCapitalizacion } from './guardar-capitalizacion.js';
import { armarPlan } from './plan-de-capitalizacion.js';
import { revisarPlan } from './reglas-de-capitalizacion.js';

/**
 * Cuántos activos crea la operación en total. Se cuenta antes de abrir la transacción y de armar nada: una petición
 * enorme no debe gastar memoria ni tiempo de la base (R-15).
 * @throws DemasiadasUnidades si una asignación o la suma pasa del tope.
 */
function exigirTopeDeUnidades(asignaciones: readonly AsignacionDeLinea[]): void {
  const total = asignaciones.reduce(
    (suma, a) => suma + (a.activoNuevo ? unidadesValidas(a.activoNuevo.unidades) : 0),
    0,
  );
  if (total > MAXIMO_DE_UNIDADES) throw new DemasiadasUnidades();
}

/** Cada asignación dice a dónde va: a un activo, a uno nuevo o a una compra conjunta, y a uno solo. */
function exigirUnSoloDestino(asignaciones: readonly AsignacionDeLinea[]): void {
  const sinDestinoUnico = asignaciones.some(
    ({ activoId, activoNuevo, altaConjuntaId }) => [activoId, activoNuevo, altaConjuntaId].filter(Boolean).length !== 1,
  );
  if (sinDestinoUnico)
    throw new CostoInvalido('Cada parte va a un solo destino: un activo, un activo nuevo o una compra conjunta.');
}

export class CapitalizarLineas {
  constructor(private readonly dependencias: DependenciasDeCostos) {}

  /**
   * Reparte líneas del libro entre activos nuevos (en N unidades, con su cuadrícula), existentes o una compra conjunta,
   * todo o nada en una transacción: toma el candado de cada línea, revisa la regla de la línea y el total de cada activo
   * y guarda activos y costos. Al confirmar publica `activo_capitalizado` por activo.
   * @throws DemasiadasUnidades si pasa de 200 unidades.
   * @throws LineaNoCapitalizable, LineaDescartada, LineaSobrecapitalizada, MontoDeCostoInvalido, CostoDeActivoNegativo.
   * @throws CodigosDeUnidadesRepetidos, AltaConjuntaSinActivosVigentes, RecursoNoEncontrado, FechaAnteriorAlInicio…
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeCapitalizacion): Promise<CapitalizacionDto> {
    if (solicitud.asignaciones.length === 0) throw new CostoInvalido('Elija al menos una línea para capitalizar.');
    exigirUnSoloDestino(solicitud.asignaciones);
    exigirTopeDeUnidades(solicitud.asignaciones);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.capitalizar(operador, solicitud));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async capitalizar(
    operador: Operador,
    solicitud: SolicitudDeCapitalizacion,
  ): Promise<ResultadoDeCapitalizacion> {
    const { asignaciones } = solicitud;
    const lineas = await this.lineasBloqueadas(asignaciones.map(({ lineaId }) => lineaId));
    const plan = await armarPlan(this.dependencias, operador, { asignaciones, lineas });
    await revisarPlan(this.dependencias, plan);
    return guardarPlan(this.dependencias, operador, plan);
  }

  /** Toma el candado de las líneas y recién entonces las lee: lo capitalizado que ve es lo verdadero. */
  private async lineasBloqueadas(lineaIds: readonly string[]): Promise<Map<string, LineaCapitalizable>> {
    const { costos, lineas } = this.dependencias;
    await costos.bloquearLineas(lineaIds);
    const encontradas = new Map((await lineas.buscar([...new Set(lineaIds)])).map((linea) => [linea.lineaId, linea]));
    for (const id of lineaIds) {
      const linea = encontradas.get(id);
      if (!linea) throw new LineaNoCapitalizable('La línea no existe en el libro de compras de la empresa.');
      exigirCapitalizable(linea);
    }
    return encontradas;
  }
}
