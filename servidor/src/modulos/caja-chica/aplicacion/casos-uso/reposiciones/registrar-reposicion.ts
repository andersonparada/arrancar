import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { ReposicionRegistrada } from '../../../dominio/eventos-de-reposiciones.js';
import type { Fondo } from '../../../dominio/fondos.js';
import {
  exigirComprobantesPorReponer,
  exigirFechaDeLaReposicion,
  exigirReposicionConMonto,
  revisarLaSeparacionDeFunciones,
} from '../../../dominio/reglas-de-reposiciones.js';
import { beneficiarioDelFondo, exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { DesgloseDeReposicion, Reposicion } from '../../../dominio/reposiciones.js';
import type { ReposicionDto } from '../../dto/reposiciones.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import { custodioVigente, LectorDelFondo } from '../fondos/lector-del-fondo.js';
import {
  desgloseDe,
  firmadosDe,
  lineasEmitidas,
  marcarProcesadosEnElLibro,
  reposicionDto,
  totalDe,
  type ComprobanteFirmado,
} from './armado-de-la-reposicion.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';
import { ordenarLaReposicion, type FormaDePagoDeLaReposicion } from './orden-de-reposicion.js';

/** La clave del correlativo de las reposiciones. */
export const CLAVE_DE_REPOSICIONES = 'caja-chica.reposiciones';

export type PeticionDeReposicion = FormaDePagoDeLaReposicion & {
  fondoId: string;
  comprobanteIds: string[];
  /** `AAAA-MM-DD`; hoy si falta. */
  fecha?: string;
  observaciones?: string | null;
};

/** Lo que se decide antes de ordenar nada a Bancos. */
interface PlanDeLaReposicion {
  fecha: string;
  montoCentavos: number;
  desglose: DesgloseDeReposicion;
  custodio: string;
  elCustodioRepone: boolean;
  beneficiario: string;
  aviso: string | null;
}

/** Lo que hace falta para guardar la reposición. */
interface ReposicionPorGuardar {
  reposicionId: string;
  numero: number;
  anio: number;
  pedido: PeticionDeReposicion;
  plan: PlanDeLaReposicion;
  movimiento: MovimientoCreado;
  firmados: readonly ComprobanteFirmado[];
}

/**
 * Repone un fondo abierto (`reposiciones.crear`, §5.6): los comprobantes pendientes que se escogen (suman más que cero,
 * con las notas de crédito y los sobrantes restando), repartidos por concepto de Bancos (operación, activo fijo,
 * faltantes), con un cheque (a nombre del custodio vigente u otro, nunca al portador) o una nota de débito. Numera con
 * `caja-chica.reposiciones`, guarda la reposición con sus líneas, marca como procesados los documentos del libro y avisa si
 * quien repone es el custodio (`caja-chica.control.separacion_de_funciones`: avisar o bloquear). Sin auditoría (alta); publica
 * `reposicion_registrada` al confirmar.
 */
export class RegistrarReposicion {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeReposiciones) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, ReposicionSinComprobantes, ComprobanteNoEsDelFondo, ComprobanteYaAnulado,
   * ComprobanteRepuesto, ReposicionSinMonto, FechaDeLaReposicionInvalida, BeneficiarioInvalido, SeparacionDeFunciones y lo
   * que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeReposicion): Promise<ReposicionDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.reponer(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async reponer(operador: Operador, pedido: PeticionDeReposicion) {
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const firmados = firmadosDe(await this.comprobantesPorReponer(pedido));
    const plan = await this.planear(operador, { fondo, pedido, firmados });
    const { numero, anio } = await this.dependencias.correlativos.siguiente(CLAVE_DE_REPOSICIONES, plan.fecha);
    const reposicionId = crypto.randomUUID();
    const movimiento = await this.ordenarEnBancos(operador, { pedido, plan, reposicionId });
    const reposicion = await this.guardar({ reposicionId, numero, anio, pedido, plan, movimiento, firmados });
    await marcarProcesadosEnElLibro(this.dependencias.libro, operador, firmados);
    const avisos = [...movimiento.avisos.map(({ mensaje }) => mensaje), ...(plan.aviso ? [plan.aviso] : [])];
    return {
      dto: reposicionDto({ reposicion, firmados, avisos }),
      eventos: [this.evento(operador, { reposicion, pedido, plan, movimiento, firmados })],
    };
  }

  private async guardar(por: ReposicionPorGuardar): Promise<Reposicion> {
    const { reposicionId, numero, anio, pedido, plan, movimiento, firmados } = por;
    const { reposiciones } = this.dependencias;
    await reposiciones.agregar({
      id: reposicionId,
      fondoId: pedido.fondoId,
      numero,
      anioDeNumero: anio,
      fecha: plan.fecha,
      forma: pedido.forma,
      montoCentavos: plan.montoCentavos,
      movimientoId: movimiento.movimientoId,
      custodio: plan.custodio,
      laHizoElCustodio: plan.elCustodioRepone,
      lineas: firmados.map(({ comprobante, firmadoCentavos }) => ({
        comprobanteId: comprobante.id,
        montoCentavos: firmadoCentavos,
      })),
    });
    return (await reposiciones.buscar(reposicionId))!;
  }

  /** Los comprobantes pedidos, bloqueados y revisados: del fondo, vigentes y sin reponer. */
  private async comprobantesPorReponer(pedido: PeticionDeReposicion) {
    const encontrados = await this.dependencias.comprobantes.bloquear(pedido.comprobanteIds);
    exigirComprobantesPorReponer(pedido.comprobanteIds, encontrados, pedido.fondoId);
    return encontrados;
  }

  /** Lo que se valida antes de ordenar nada a Bancos: fecha, monto, desglose, a nombre de quién y la separación de funciones. */
  private async planear(
    operador: Operador,
    por: { fondo: Fondo; pedido: PeticionDeReposicion; firmados: readonly ComprobanteFirmado[] },
  ): Promise<PlanDeLaReposicion> {
    const { fondo, pedido, firmados } = por;
    const { reloj, referencias, configuracion } = this.dependencias;
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    const comprobantes = firmados.map(({ comprobante }) => comprobante);
    exigirFechaDeLaReposicion(fecha, { hoy, fondo, comprobantes });
    const montoCentavos = exigirReposicionConMonto(totalDe(firmados));
    if (pedido.forma === 'nota_de_debito') await referencias.exigirCuentaBancaria(pedido.cuentaBancariaId);
    const { custodio, elCustodioRepone } = await this.custodioDe(operador, fondo);
    const aviso = revisarLaSeparacionDeFunciones(elCustodioRepone, await configuracion.separacionDeFunciones(operador));
    const beneficiario = pedido.forma === 'cheque' ? beneficiarioDelFondo(pedido.beneficiario, custodio) : custodio;
    return { fecha, montoCentavos, desglose: desgloseDe(firmados), custodio, elCustodioRepone, beneficiario, aviso };
  }

  /** El custodio vigente (o el nombre del fondo si no hay) y si es quien repone. */
  private async custodioDe(operador: Operador, fondo: Fondo): Promise<{ custodio: string; elCustodioRepone: boolean }> {
    const vigente = custodioVigente(await this.dependencias.fondos.custodios(fondo.id));
    const usuarioId = vigente?.custodioUsuarioId ?? null;
    return { custodio: vigente?.custodio ?? fondo.nombre, elCustodioRepone: usuarioId === operador.usuarioId };
  }

  private ordenarEnBancos(
    operador: Operador,
    por: { pedido: PeticionDeReposicion; plan: PlanDeLaReposicion; reposicionId: string },
  ): Promise<MovimientoCreado> {
    const { pedido, plan, reposicionId } = por;
    const datos = {
      reposicionId,
      fecha: plan.fecha,
      montoCentavos: plan.montoCentavos,
      beneficiario: plan.beneficiario,
      desglose: plan.desglose,
      observaciones: pedido.observaciones ?? null,
    };
    return ordenarLaReposicion(this.dependencias.bancos, operador, { pago: pedido, datos });
  }

  private evento(
    operador: Operador,
    por: {
      reposicion: Reposicion;
      pedido: PeticionDeReposicion;
      plan: PlanDeLaReposicion;
      movimiento: MovimientoCreado;
      firmados: readonly ComprobanteFirmado[];
    },
  ): EventoDominio {
    const { reposicion, pedido, plan, movimiento, firmados } = por;
    return new ReposicionRegistrada({
      empresaId: operador.empresaId,
      fondoId: reposicion.fondoId,
      reposicionId: reposicion.id,
      numero: reposicion.numero,
      fecha: plan.fecha,
      forma: pedido.forma,
      montoCentavos: plan.montoCentavos,
      movimientoId: movimiento.movimientoId,
      cuentaBancariaId: movimiento.cuentaBancariaId,
      desglose: plan.desglose,
      lineas: lineasEmitidas(firmados),
    });
  }
}
