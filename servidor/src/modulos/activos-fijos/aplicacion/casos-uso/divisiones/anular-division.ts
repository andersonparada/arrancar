import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { DivisionConMovimientosPosteriores, DivisionNoAnulable } from '../../../dominio/errores-de-division.js';
import type { Division, DivisionId } from '../../../dominio/division.js';
import type { DivisionDto } from '../../dto/division.dto.js';
import { RECURSO_DE_DIVISIONES, type DependenciasDeDivisiones } from './dependencias-de-divisiones.js';
import { eventoDeDivisionAnulada } from './eventos-de-divisiones.js';

interface AnulacionPedida {
  divisionId: string;
  motivo: string;
}

/** La división y sus dos activos, bloqueados y revisados. */
interface PorAnular {
  division: Division;
  origen: Activo;
  nuevo: Activo;
}

export class AnularDivision {
  constructor(private readonly dependencias: DependenciasDeDivisiones) {}

  /**
   * Anula una división (`divisiones.anular`, I-9 a): solo con su mes abierto y si ninguno de los dos activos tiene, después
   * de ella, cuotas, traslados (salvo el alta), mejoras, otros cambios de tramos, bajas ni otra división. Anula los costos
   * que cedió, deja sin efecto sus tramos (y repone los que sustituyó), borra el activo nuevo con su alta y devuelve la
   * cantidad y el residual al origen. La fila queda anulada con el código del activo nuevo. Audita `anular` con la división
   * y los dos activos como estaban; al confirmar publica `division_anulada`.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws DivisionNoAnulable si ya está anulada.
   * @throws MesCerrado si su mes ya se cerró.
   * @throws DivisionConMovimientosPosteriores si alguno de los dos activos tiene movimientos posteriores.
   * @throws DivisionInvalida si falta el motivo.
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida): Promise<DivisionDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async anular(operador: Operador, { divisionId, motivo }: AnulacionPedida) {
    const { consultasDeDivisiones, auditoria } = this.dependencias;
    const porAnular = await this.cargarYRevisar(divisionId);
    const anterior = await this.comoEstaba(porAnular);
    const incisoFiscal = await this.incisoDe(porAnular.origen);
    await this.deshacer(operador, { ...porAnular, motivo });
    await auditoria.registrar({
      recurso: RECURSO_DE_DIVISIONES,
      registroId: divisionId,
      accion: 'anular',
      anterior,
      motivo,
    });
    const { origen, division } = porAnular;
    return {
      dto: await consultasDeDivisiones.obtener(divisionId),
      evento: eventoDeDivisionAnulada({ origen, division, incisoFiscal }),
    };
  }

  /** Anula la fila y lo que creó: costos cedidos, tramos y activo nuevo; el origen recupera su cantidad y su residual. */
  private async deshacer(operador: Operador, { division, origen, nuevo, motivo }: PorAnular & { motivo: string }) {
    const { divisiones, tramos, repositorio } = this.dependencias;
    const propias = division.instantanea();
    await this.anularCostosCedidos(operador, { divisionId: propias.id.valor, motivo });
    division.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    await divisiones.guardar(division);
    await tramos.anularDeDivision(propias.id.valor);
    await repositorio.eliminar(nuevo);
    origen.cambiarCantidad(origen.instantanea().cantidad + propias.cantidadSeparada);
    this.devolverResidual(origen, propias.residualSeparadoCentavos);
    await repositorio.guardar(origen);
  }

  /** Toma el candado del cierre, bloquea los dos activos y revisa que la división se pueda anular. */
  private async cargarYRevisar(divisionId: string): Promise<PorAnular> {
    const { cierres, divisiones, consultasDeDivisiones } = this.dependencias;
    await cierres.bloquear('compartido');
    const division = await divisiones.buscar(Identificador.desde(divisionId) as DivisionId);
    if (!division) throw new RecursoNoEncontrado('La división');
    const { estado, activoOrigenId, activoNuevoId, periodo } = division.instantanea();
    if (estado === 'anulada' || !activoNuevoId) throw new DivisionNoAnulable();
    const [origen, nuevo] = await this.bloquear(activoOrigenId, activoNuevoId);
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo && periodo <= ultimo) throw new MesCerrado(periodo);
    if (await consultasDeDivisiones.hayMovimientosPosteriores(divisionId))
      throw new DivisionConMovimientosPosteriores();
    return { division, origen, nuevo };
  }

  private async bloquear(origenId: string, nuevoId: string): Promise<[Activo, Activo]> {
    const activos = await this.dependencias.repositorio.buscarBloqueando([origenId, nuevoId]);
    const origen = activos.find((activo) => activo.id.valor === origenId);
    const nuevo = activos.find((activo) => activo.id.valor === nuevoId);
    if (!origen || !nuevo) throw new RecursoNoEncontrado('El activo');
    return [origen, nuevo];
  }

  /** La división y las fichas de los dos activos antes del cambio: lo que queda en la auditoría. */
  private async comoEstaba({ division, origen, nuevo }: PorAnular) {
    const { consultas, consultasDeDivisiones } = this.dependencias;
    return {
      division: await consultasDeDivisiones.obtener(division.id.valor),
      origen: await consultas.obtener(origen.id.valor),
      nuevo: await consultas.obtener(nuevo.id.valor),
    };
  }

  private async incisoDe(origen: Activo) {
    const clase = await this.dependencias.clases.buscar(Identificador.desde(origen.instantanea().claseId));
    return clase!.instantanea().incisoFiscal;
  }

  /** Lo que el origen cedió se anula con su rastro; lo que recibió el activo nuevo se va con él. */
  private async anularCostosCedidos(operador: Operador, { divisionId, motivo }: AnulacionPedida): Promise<void> {
    const { costos } = this.dependencias;
    for (const costo of await costos.vigentesDeDivision(divisionId)) {
      if (costo.instantanea().claseDeCosto !== 'division_cedida') continue;
      costo.anularPorDivision({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
      await costos.guardar(costo);
    }
  }

  /** El residual que el activo nuevo se llevó vuelve al origen. */
  private devolverResidual(origen: Activo, residualCentavos: number): void {
    const { vidaUtilContableMeses, valorResidual } = origen.instantanea();
    if (valorResidual === null) return;
    const total = aCentavos(valorResidual) + residualCentavos;
    origen.ajustarEstimacion({ vidaUtilContableMeses, valorResidual: deCentavos(total) });
  }
}
