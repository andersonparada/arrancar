import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DepreciacionCerrada } from '../../../dominio/eventos.js';
import {
  CierreConBloqueos,
  MesAnteriorSinCerrar,
  MesPorLlegar,
  RevisionDelCierreDesactualizada,
} from '../../../dominio/errores-de-cierre.js';
import type { CierreDto } from '../../dto/cierre.dto.js';
import { ArmadorDelCierre, type CierreArmado } from './armador-del-cierre.js';
import type { DependenciasDeCierre } from './dependencias-de-cierre.js';
import { cierreADto, revisionADto, totalesADto } from './dtos-de-cierre.js';

interface CierrePedido {
  periodo: string;
  /** La huella de la revisión que vio quien cierra: si ya cambió, se rechaza. */
  huella?: string | null;
}

export class CerrarMes {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierre) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /**
   * Cierra el mes: con el candado exclusivo de la empresa vuelve a calcular lo que se revisó, guarda el cierre con sus
   * cuotas (una por activo y libro, sin duplicar) y deja constancia en la auditoría. Al confirmar publica
   * `depreciacion_cerrada`. Cerrar de nuevo un mes cerrado se rechaza sin tocar nada.
   * @throws MesCerrado, MesAnteriorAlInicio o SinMesPorCerrar si el mes no es el que toca.
   * @throws MesPorLlegar si el mes es posterior al mes en curso.
   * @throws MesAnteriorSinCerrar si antes hay un mes sin cerrar.
   * @throws RevisionDelCierreDesactualizada si llegó una huella y ya no coincide.
   * @throws CierreConBloqueos si la revisión tiene hallazgos que bloquean.
   */
  async ejecutar(operador: Operador, pedido: CierrePedido): Promise<CierreDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { evento, dto } = await unidadDeTrabajo.ejecutar(operador, () => this.cerrar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async cerrar(operador: Operador, { periodo, huella }: CierrePedido) {
    const { cierres, repositorioCierres, auditoria } = this.dependencias;
    await cierres.bloquear('exclusivo');
    const armado = await this.armador.armar(operador, periodo);
    this.exigirCerrable(armado, huella);
    const { totales, cuotas, regimenIsr } = armado;
    await repositorioCierres.guardar({
      empresaId: operador.empresaId,
      periodo,
      cerradoPor: operador.usuarioId,
      ahora: new Date(),
      regimenIsr,
      totales,
      cuotas,
    });
    await auditoria.registrar({
      recurso: 'activos-fijos.cierres',
      registroId: `${operador.empresaId}:${periodo}`,
      accion: 'cerrar',
      anterior: { periodo, ...totalesADto(totales), regimenIsr },
    });
    const guardado = await repositorioCierres.buscar(periodo);
    return { evento: this.evento(operador, armado), dto: cierreADto(guardado!) };
  }

  private exigirCerrable(armado: CierreArmado, huella: string | null | undefined): void {
    if (armado.porLlegar) throw new MesPorLlegar(armado.periodo);
    if (armado.siguiente !== armado.periodo) throw new MesAnteriorSinCerrar(armado.siguiente);
    if (huella && huella !== armado.huella) throw new RevisionDelCierreDesactualizada(revisionADto(armado));
    if (armado.hallazgos.some((hallazgo) => hallazgo.nivel === 'bloquea'))
      throw new CierreConBloqueos(revisionADto(armado));
  }

  private evento(operador: Operador, { periodo, cuotas, totales, regimenIsr }: CierreArmado) {
    return new DepreciacionCerrada({
      empresaId: operador.empresaId,
      periodo,
      cuotas: cuotas.map((cuota) => ({
        activoId: cuota.activoId,
        claseId: cuota.claseId,
        incisoFiscal: cuota.incisoFiscal,
        libro: cuota.libro,
        montoCentavos: cuota.montoCentavos,
        localidadId: cuota.localidadId,
        departamentoId: cuota.departamentoId,
        ocioso: cuota.ocioso,
      })),
      totalContableCentavos: totales.contableCentavos,
      totalFiscalCentavos: totales.fiscalCentavos,
      regimenIsr,
    });
  }
}
