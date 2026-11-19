import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { ActivoFichaDto, SolicitudDePonerEnUso } from '../../dto/activo.dto.js';
import type { TopesPorInciso } from '../../puertos/lector-de-topes.js';
import type { PrimerMes } from '../../../dominio/depreciacion/meses.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';
import { planearUso } from './plan-de-uso.js';

interface PedidoDePonerEnUso {
  activoId: string;
  solicitud: SolicitudDePonerEnUso;
}

interface ReglasDeLaEmpresa {
  topes: TopesPorInciso;
  primerMes: PrimerMes;
}

export class PonerEnUso {
  constructor(private readonly dependencias: DependenciasDeUso) {}

  /**
   * Pone el activo en uso («Disponible para uso»): toma de su clase el porcentaje fiscal, la vida útil y el residual
   * que el usuario no escriba, los valida contra el máximo de ley y abre los dos tramos de depreciación.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ActivoNoEnConstruccion si no es un activo del balance en construcción.
   * @throws ActivoSinCosto si no tiene costos vigentes (salvo los terrenos).
   * @throws FechaDeUsoInvalida, MesCerrado o ParametrosDeUsoInvalidos si la fecha o los parámetros no cumplen.
   */
  async ejecutar(operador: Operador, pedido: PedidoDePonerEnUso): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, topes, primerMes } = this.dependencias;
    const reglas = { topes: await topes.paraEmpresa(operador), primerMes: await primerMes.paraEmpresa(operador) };
    return unidadDeTrabajo.ejecutar(operador, () => this.poner(operador, pedido, reglas));
  }

  private async poner(operador: Operador, pedido: PedidoDePonerEnUso, reglas: ReglasDeLaEmpresa) {
    const { repositorio, consultas, clases, costos, tramos, cierres } = this.dependencias;
    await cierres.bloquear('compartido');
    const [activo] = await repositorio.buscarBloqueando([pedido.activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirEnConstruccion();
    const propiedades = activo.instantanea();
    const clase = await clases.buscar(Identificador.desde(propiedades.claseId));
    if (!clase) throw new RecursoNoEncontrado('La clase de activo');
    const { incisoFiscal } = clase.instantanea();
    const plan = planearUso({
      activo: propiedades,
      clase: clase.instantanea(),
      costos: (await costos.vigentesDeActivo(pedido.activoId)).map((costo) => costo.instantanea()),
      solicitud: pedido.solicitud,
      primerMes: reglas.primerMes,
      porcentajeMaximo: reglas.topes[incisoFiscal].porcentajeMaximo,
      ultimoMesCerrado: await cierres.ultimoMesCerrado(),
    });
    activo.ponerEnUso(plan.datos);
    await repositorio.guardar(activo);
    await tramos.agregarVarios({ empresaId: operador.empresaId, activoId: pedido.activoId, tramos: plan.tramos });
    return consultas.obtener(pedido.activoId);
  }
}
