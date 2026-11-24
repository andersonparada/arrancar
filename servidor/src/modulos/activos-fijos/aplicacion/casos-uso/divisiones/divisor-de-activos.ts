import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { costosDeDivision } from '../../../dominio/costos-de-division.js';
import { repartirCifras, tramosDeUnaParte, type CifrasRepartidas } from '../../../dominio/depreciacion/division.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import { Division, type CausaDeDivision } from '../../../dominio/division.js';
import type { ActivoDividido } from '../../../dominio/eventos.js';
import { separarActivo } from '../../../dominio/separar-activo.js';
import { exigirDivisionPosible } from './comprobaciones-de-division.js';
import { prepararCifras, type PreparacionDeDivision } from './cifras-de-division.js';
import type { DependenciasDeDivisiones } from './dependencias-de-divisiones.js';
import { eventoDeActivoDividido } from './eventos-de-divisiones.js';

/** Qué se separa de qué activo, desde cuándo y por qué. El activo de origen debe estar bloqueado. */
export interface PedidoDeDivisionDeActivo {
  origen: Activo;
  cantidad: number;
  fecha: string;
  motivo: string;
  causa: CausaDeDivision;
  /** El código ya elegido y libre del activo nuevo. */
  codigo: string;
}

/** Lo que dejó la división: las dos entidades, la fila de la división y su evento. */
export interface DivisionHecha {
  division: Division;
  nuevo: Activo;
  evento: ActivoDividido;
}

/** Los dos activos con su parte de lo repartido, listos para guardar. */
interface PartesPorGuardar {
  origen: Activo;
  nuevo: Activo;
  division: Division;
  repartidas: CifrasRepartidas;
  preparada: PreparacionDeDivision;
}

/**
 * Divide un activo con cantidad en dos (§6.11 y §7.6): el nuevo se lleva `cantidad` unidades con su parte del costo, de la
 * depreciación acumulada y del residual, y los dos abren tramos nuevos en los dos libros. Lo usan dividir a mano, separar
 * en unidades y, más adelante, el traslado y la baja de una parte. Toma el activo ya bloqueado y los candados puestos.
 */
export class DivisorDeActivos {
  constructor(private readonly dependencias: DependenciasDeDivisiones) {}

  /**
   * @throws DivisionNoPermitida, CantidadASepararInvalida, DivisionInvalida, MesCerrado o DivisionConMovimientosPosteriores
   *   si el activo no admite la división.
   */
  async dividir(operador: Operador, pedido: PedidoDeDivisionDeActivo): Promise<DivisionHecha> {
    const { origen, cantidad, fecha } = pedido;
    const incisoFiscal = await exigirDivisionPosible(this.dependencias, operador, { activo: origen, fecha, cantidad });
    const preparada = await prepararCifras(this.dependencias, { activo: origen, incisoFiscal, fecha });
    const repartidas = repartirCifras(preparada.cifras, {
      separadas: cantidad,
      original: origen.instantanea().cantidad,
    });
    const nuevo = separarActivo(origen, { cantidad, codigo: pedido.codigo });
    if (preparada.conLibros) this.repartirResidual({ origen, nuevo, repartidas });
    const division = this.registrar(pedido, { nuevo, repartidas, desde: preparada.desde });
    await this.guardar({ origen, nuevo, division, repartidas, preparada });
    return { division, nuevo, evento: eventoDeActivoDividido({ origen, division, incisoFiscal }) };
  }

  /** Cada activo se queda con su parte del residual; la vida útil contable total no cambia. */
  private repartirResidual({ origen, nuevo, repartidas }: Pick<PartesPorGuardar, 'origen' | 'nuevo' | 'repartidas'>) {
    for (const [activo, parte] of [
      [origen, repartidas.origen],
      [nuevo, repartidas.nuevo],
    ] as const) {
      const { vidaUtilContableMeses } = activo.instantanea();
      activo.ajustarEstimacion({ vidaUtilContableMeses, valorResidual: deCentavos(parte.valorResidualCentavos) });
    }
  }

  private registrar(
    pedido: PedidoDeDivisionDeActivo,
    { nuevo, repartidas, desde }: { nuevo: Activo; repartidas: CifrasRepartidas; desde: string },
  ): Division {
    const { origen, cantidad, fecha, motivo, causa } = pedido;
    const { empresaId, id, cantidad: restante } = origen.instantanea();
    const parte = repartidas.nuevo;
    return Division.registrar({
      empresaId,
      activoOrigenId: id.valor,
      activoNuevoId: nuevo.id.valor,
      codigoDelActivoNuevo: nuevo.instantanea().codigo,
      fecha,
      periodo: desde,
      cantidadOriginal: restante + cantidad,
      cantidadSeparada: cantidad,
      causa,
      motivo,
      costoSeparadoCentavos: parte.costoQueAplicaCentavos + parte.costoQueNoAplicaCentavos,
      costoFiscalSeparadoCentavos: parte.costoQueAplicaCentavos,
      acumuladaContableSeparadaCentavos: parte.acumuladaContableCentavos,
      acumuladaFiscalSeparadaCentavos: parte.acumuladaFiscalCentavos,
      residualSeparadoCentavos: parte.valorResidualCentavos,
    });
  }

  /** Primero los activos y la división (las demás filas la señalan), luego los costos y los tramos. */
  private async guardar({ origen, nuevo, division, repartidas, preparada }: PartesPorGuardar): Promise<void> {
    const { repositorio, divisiones, costos } = this.dependencias;
    const { id, fecha } = division.instantanea();
    await repositorio.guardar(origen);
    await repositorio.agregar(nuevo);
    await divisiones.agregar(division);
    const nuevos = costosDeDivision({
      empresaId: origen.instantanea().empresaId,
      divisionId: id.valor,
      activoOrigenId: origen.id.valor,
      activoNuevoId: nuevo.id.valor,
      fecha,
      nuevo: repartidas.nuevo,
      descripcion: `Parte de ${origen.instantanea().codigo} separada en ${nuevo.instantanea().codigo}`,
    });
    await costos.agregarVarios(nuevos);
    if (preparada.conLibros) await this.guardarTramos({ origen, nuevo, division, repartidas, preparada });
  }

  private async guardarTramos({ origen, nuevo, division, repartidas, preparada }: PartesPorGuardar): Promise<void> {
    const { tramos } = this.dependencias;
    const porcentajeFiscal = origen.instantanea().porcentajeFiscal ?? '0.00';
    for (const [activo, cifras] of [
      [origen, repartidas.origen],
      [nuevo, repartidas.nuevo],
    ] as const) {
      const partes = tramosDeUnaParte({
        desdePeriodo: preparada.desde,
        cifras,
        porcentajeFiscal,
        mesesQueFaltan: preparada.mesesQueFaltan,
      });
      await tramos.reemplazar({
        empresaId: activo.instantanea().empresaId.valor,
        activoId: activo.id.valor,
        mejoraId: null,
        divisionId: division.id.valor,
        tramos: [partes.contable, partes.fiscal].filter((tramo): tramo is TramoCalculado => tramo !== null),
      });
    }
  }
}
