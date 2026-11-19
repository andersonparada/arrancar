import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CuentaDelDepositoObligatoria } from '../../../dominio/errores-de-fondos.js';
import { FondoCerrado, type ReposicionCompensadaEmitida } from '../../../dominio/eventos-de-fondos.js';
import { MODULO_DE_ORIGEN, RECURSO_DE_FONDOS, type Fondo } from '../../../dominio/fondos.js';
import {
  depositoAlCerrar,
  exigirFechaDesdeLaApertura,
  exigirFechaNoFutura,
  exigirFondoAbierto,
} from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import { ReponedorAlCerrar, type DependenciasDeLaCompensada } from '../reposiciones/reponer-al-cerrar.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { custodioVigente, LectorDelFondo } from './lector-del-fondo.js';

/** Los fondos y lo que el cierre usa de las reposiciones para liquidar lo pendiente. */
export interface DependenciasDeCierre {
  fondos: DependenciasDeFondos;
  compensada: DependenciasDeLaCompensada;
}

/** El motivo, la fecha (hoy por omisión) y, si queda efectivo, la cuenta del depósito (por omisión, la del fondo). */
export interface PeticionDeCierre {
  fondoId: string;
  motivo: string;
  fecha?: string;
  cuentaBancariaId?: string | null;
  referencia?: string | null;
}

/** Lo ya decidido antes de tocar nada. */
interface PlanDelCierre {
  fondo: Fondo;
  fecha: string;
  hoy: string;
  depositoCentavos: number;
  cuentaBancariaId: string | null;
}

/**
 * Cierra un fondo abierto (`fondos.cerrar`, §5.8): sin vales provisionales abiertos, lo pendiente se liquida en una
 * reposición compensada (sin cheque ni nota) y el efectivo que queda se deposita con una nota de crédito de «Devolución
 * de fondo de caja chica» (sin depósito si no queda nada). Deja el cambio `cierre`, el fondo `cerrado` con su motivo y
 * audita `cerrar` con el fondo como estaba. Si lo contado no cuadra, el arqueo se hace antes: su faltante o sobrante
 * entra a lo pendiente. Un fondo cerrado no se reabre. Publica `fondo_cerrado` al confirmar.
 */
export class CerrarFondo {
  private readonly lector: LectorDelFondo;
  private readonly reponedor: ReponedorAlCerrar;

  constructor(private readonly dependencias: DependenciasDeCierre) {
    this.lector = new LectorDelFondo(dependencias.fondos);
    this.reponedor = new ReponedorAlCerrar(dependencias.compensada);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, FechaDelFondoInvalida, FechaAnteriorALaApertura,
   * FechaDeLaReposicionInvalida, FondoConValesAbiertos, EfectivoNegativoAlCerrar, CuentaDelDepositoObligatoria y lo que
   * rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeCierre): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias.fondos;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.cerrar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async cerrar(operador: Operador, pedido: PeticionDeCierre) {
    const { fondos, auditoria } = this.dependencias.fondos;
    const plan = await this.planear(operador, pedido);
    const anterior = await this.lector.leer(plan.fondo);
    const compensada = await this.reponedor.reponer(operador, await this.datosDeLaCompensada(plan));
    const movimiento = await this.depositar(operador, { plan, pedido });
    await this.cerrarElFondo(operador, { plan, motivo: pedido.motivo.trim(), movimiento });
    await auditoria.registrar({ recurso: RECURSO_DE_FONDOS, registroId: plan.fondo.id, accion: 'cerrar', anterior });
    const avisos = movimiento?.avisos.map(({ mensaje }) => mensaje) ?? [];
    return {
      dto: await this.lector.leer((await fondos.buscar(plan.fondo.id))!, avisos),
      eventos: [this.evento(operador, { plan, motivo: pedido.motivo.trim(), movimiento, compensada })],
    };
  }

  private async datosDeLaCompensada({ fondo, fecha, hoy }: PlanDelCierre) {
    const custodio =
      custodioVigente(await this.dependencias.fondos.fondos.custodios(fondo.id))?.custodio ?? fondo.nombre;
    return { fondo, fecha, hoy, custodio };
  }

  /** Deja el cambio `cierre` (con el depósito, si lo hubo) y el fondo `cerrado`. */
  private async cerrarElFondo(
    operador: Operador,
    por: { plan: PlanDelCierre; motivo: string; movimiento: MovimientoCreado | null },
  ): Promise<void> {
    const { plan, motivo, movimiento } = por;
    const { fondos } = this.dependencias.fondos;
    await fondos.agregarCambio({
      fondoId: plan.fondo.id,
      tipo: 'cierre',
      forma: movimiento ? 'nota_de_credito' : 'sin_deposito',
      fecha: plan.fecha,
      montoCentavos: plan.depositoCentavos,
      movimientoId: movimiento?.movimientoId ?? null,
    });
    await fondos.cerrar(plan.fondo.id, { fecha: plan.fecha, cerradoPor: operador.usuarioId, motivo });
  }

  /** Lo que se valida antes de ordenar nada a Bancos o guardar algo. */
  private async planear(operador: Operador, pedido: PeticionDeCierre): Promise<PlanDelCierre> {
    const { consultas, referencias, reloj } = this.dependencias.fondos;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaNoFutura(fecha, hoy);
    exigirFechaDesdeLaApertura(fecha, fondo);
    const depositoCentavos = depositoAlCerrar((await consultas.datosDeLectura([fondo.id])).get(fondo.id)!);
    const cuentaBancariaId = pedido.cuentaBancariaId ?? fondo.cuentaBancariaId;
    if (depositoCentavos > 0) {
      if (!cuentaBancariaId) throw new CuentaDelDepositoObligatoria();
      await referencias.exigirCuentaBancaria(cuentaBancariaId);
    }
    return { fondo, fecha, hoy, depositoCentavos, cuentaBancariaId };
  }

  /** La nota de crédito del depósito; si no queda efectivo no hay movimiento. */
  private async depositar(
    operador: Operador,
    por: { plan: PlanDelCierre; pedido: PeticionDeCierre },
  ): Promise<MovimientoCreado | null> {
    const { plan, pedido } = por;
    if (plan.depositoCentavos === 0) return null;
    const { fondo } = plan;
    const custodio = custodioVigente(await this.dependencias.fondos.fondos.custodios(fondo.id));
    return this.dependencias.fondos.bancos.registrarNota(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: fondo.id },
      cuentaBancariaId: plan.cuentaBancariaId!,
      tipo: 'credito',
      fecha: plan.fecha,
      montoCentavos: plan.depositoCentavos,
      beneficiario: custodio?.custodio ?? fondo.nombre,
      conceptos: [{ claveDeSistema: 'devolucion_de_fondo_de_caja_chica', montoCentavos: plan.depositoCentavos }],
      ...(pedido.referencia ? { referencia: pedido.referencia } : {}),
    });
  }

  private evento(
    operador: Operador,
    por: {
      plan: PlanDelCierre;
      motivo: string;
      movimiento: MovimientoCreado | null;
      compensada: ReposicionCompensadaEmitida | null;
    },
  ): FondoCerrado {
    const { plan, motivo, movimiento, compensada } = por;
    return new FondoCerrado({
      empresaId: operador.empresaId,
      fondoId: plan.fondo.id,
      fecha: plan.fecha,
      motivo,
      depositoCentavos: plan.depositoCentavos,
      movimientoId: movimiento?.movimientoId ?? null,
      cuentaBancariaId: movimiento?.cuentaBancariaId ?? null,
      reposicionCompensada: compensada,
    });
  }
}
