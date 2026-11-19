import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Costo } from '../../../dominio/costo.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { TopesPorInciso } from '../../puertos/lector-de-topes.js';
import { claseParaActivo, validarPadre, validarUbicacion } from '../activos/comprobaciones-de-activo.js';
import { proponerCodigo } from '../activos/proponer-codigo.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { planearSaldoInicial, type PlanDeSaldoInicial } from './plan-de-saldo-inicial.js';

/** Lo que se arma al cargar o corregir un saldo: el plan y el inciso de la clase (para el activo). */
export interface SaldoArmado {
  plan: PlanDeSaldoInicial;
  inciso: IncisoFiscal;
}

export interface PedidoDeArmado {
  solicitud: SolicitudDeSaldoInicial;
  fechaDeInicio: string;
  topes: TopesPorInciso;
  /** Al corregir: el activo actual (su id, su clase y su código). */
  actual: { id: string; claseId: string; codigo: string } | null;
}

/** Revisa lo que depende de otros registros (clase, padre, ubicación, código) y arma el plan del saldo inicial. */
export class ArmadorDeSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws RecursoNoEncontrado o ActivoInvalido si la clase, el padre o la ubicación no sirven.
   * @throws SaldoInicialInvalido si las fechas o los montos no cumplen las reglas.
   */
  async armar(operador: Operador, { solicitud, fechaDeInicio, topes, actual }: PedidoDeArmado): Promise<SaldoArmado> {
    const clase = await this.revisarReferencias(solicitud, actual);
    const propiedades = clase.instantanea();
    const codigo = await this.codigoPara(operador, { solicitud, actual });
    const plan = planearSaldoInicial({
      solicitud,
      clase: propiedades,
      porcentajeMaximo: topes[propiedades.incisoFiscal].porcentajeMaximo,
      fechaDeInicio,
      codigo,
    });
    return { plan, inciso: propiedades.incisoFiscal };
  }

  /** La clase, el padre y la ubicación deben existir y servir; devuelve la clase. */
  private async revisarReferencias(solicitud: SolicitudDeSaldoInicial, actual: PedidoDeArmado['actual']) {
    const clase = await claseParaActivo(this.dependencias, solicitud.claseId, actual?.claseId ?? null);
    await validarPadre(this.dependencias, { padreId: solicitud.activoPadreId, activoId: actual?.id ?? null });
    await validarUbicacion(this.dependencias, solicitud);
    return clase;
  }

  /** El código escrito; si no, el que ya tenía el activo; si no, el siguiente del correlativo. */
  private async codigoPara(operador: Operador, { solicitud, actual }: Pick<PedidoDeArmado, 'solicitud' | 'actual'>) {
    return solicitud.codigo?.trim() || actual?.codigo || (await proponerCodigo(this.dependencias, operador));
  }

  /** El costo `saldo_inicial`, la fila del saldo y los tramos de un activo recién creado. */
  async guardarLibros(operador: Operador, activoId: string, plan: PlanDeSaldoInicial): Promise<void> {
    const { costos, saldos, tramos } = this.dependencias;
    const { empresaId } = operador;
    await costos.agregarVarios([
      Costo.deSaldoInicial({
        empresaId: Identificador.desde(empresaId),
        activoId,
        fecha: plan.fechaDeCorte,
        montoCentavos: plan.datos.costoCentavos,
      }),
    ]);
    await saldos.agregar({ empresaId, activoId, fechaDeCorte: plan.fechaDeCorte, datos: plan.datos });
    await tramos.agregarVarios({ empresaId, activoId, tramos: plan.tramos });
  }

  /** Reemplaza el costo, el saldo y los tramos de un activo ya cargado. */
  async reemplazarLibros(operador: Operador, activoId: string, plan: PlanDeSaldoInicial): Promise<void> {
    const { costos, saldos, tramos } = this.dependencias;
    const { empresaId } = operador;
    const costo = (await costos.vigentesDeActivo(activoId)).find((c) => c.instantanea().origen === 'saldo_inicial');
    costo?.corregirSaldoInicial({ montoCentavos: plan.datos.costoCentavos, fecha: plan.fechaDeCorte });
    if (costo) await costos.guardar(costo);
    await saldos.reemplazar({ empresaId, activoId, fechaDeCorte: plan.fechaDeCorte, datos: plan.datos });
    await tramos.eliminarDeActivo(activoId);
    await tramos.agregarVarios({ empresaId, activoId, tramos: plan.tramos });
  }
}
