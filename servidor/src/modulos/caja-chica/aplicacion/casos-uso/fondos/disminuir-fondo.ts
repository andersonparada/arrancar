import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { CuentaDelDepositoObligatoria } from '../../../dominio/errores-de-fondos.js';
import { MontoDelFondoCambiado } from '../../../dominio/eventos-de-fondos.js';
import { MODULO_DE_ORIGEN, RECURSO_DE_FONDOS, type Fondo } from '../../../dominio/fondos.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import {
  exigirDisminucionPosible,
  exigirFechaDesdeLaApertura,
  exigirFechaNoFutura,
  exigirFondoAbierto,
  exigirMontoPositivo,
} from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { custodioVigente, LectorDelFondo } from './lector-del-fondo.js';

/** El custodio deposita parte del efectivo: nota de crédito en la cuenta (por omisión, la del fondo). */
export interface PeticionDeDisminucion {
  fondoId: string;
  fecha?: string;
  monto: string;
  cuentaBancariaId?: string | null;
  referencia?: string | null;
  observaciones?: string | null;
}

/** Lo ya validado de la disminución. */
interface DatosDeLaDisminucion {
  fondo: Fondo;
  cuentaBancariaId: string;
  fecha: string;
  montoCentavos: number;
}

/**
 * Disminuye el monto de un fondo abierto (`fondos.cambiar-monto`): el custodio deposita y Bancos registra una nota de
 * crédito con «Devolución de fondo de caja chica». Exige que el monto no pase del efectivo esperado y que el fondo
 * quede con algo (para llegar a cero se cierra). Audita `ajustar` con el fondo como estaba. Publica
 * `monto_del_fondo_cambiado` al confirmar.
 */
export class DisminuirFondo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, FechaDelFondoInvalida, MontoDelFondoInvalido,
   * CuentaDelDepositoObligatoria, DisminucionMayorQueElEfectivo, DisminucionDejaElFondoEnCero y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeDisminucion): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.disminuir(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async disminuir(operador: Operador, pedido: PeticionDeDisminucion) {
    const { fondos, auditoria } = this.dependencias;
    const datos = await this.validar(operador, pedido);
    const anterior = await this.lector.leer(datos.fondo);
    const movimiento = await this.depositar(operador, { datos, pedido });
    const cambioId = await fondos.agregarCambio({
      fondoId: datos.fondo.id,
      tipo: 'disminucion',
      forma: 'nota_de_credito',
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
    });
    await auditoria.registrar({ recurso: RECURSO_DE_FONDOS, registroId: datos.fondo.id, accion: 'ajustar', anterior });
    const avisos = movimiento.avisos.map(({ mensaje }) => mensaje);
    return {
      dto: await this.lector.leer((await fondos.buscar(datos.fondo.id))!, avisos),
      eventos: [this.evento(operador, { datos, cambioId, movimiento })],
    };
  }

  /** Lo que se valida antes de ordenar nada a Bancos. */
  private async validar(operador: Operador, pedido: PeticionDeDisminucion): Promise<DatosDeLaDisminucion> {
    const { consultas, referencias, reloj } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaNoFutura(fecha, hoy);
    exigirFechaDesdeLaApertura(fecha, fondo);
    const montoCentavos = exigirMontoPositivo(aCentavos(pedido.monto));
    const cuentaBancariaId = pedido.cuentaBancariaId ?? fondo.cuentaBancariaId;
    if (!cuentaBancariaId) throw new CuentaDelDepositoObligatoria();
    await referencias.exigirCuentaBancaria(cuentaBancariaId);
    const cifras = (await consultas.datosDeLectura([fondo.id])).get(fondo.id)!;
    const esperadoCentavos = efectivoEsperado(cifras);
    exigirDisminucionPosible({ montoCentavos, esperadoCentavos, fondoCentavos: cifras.montoCentavos });
    return { fondo, cuentaBancariaId, fecha, montoCentavos };
  }

  private async depositar(operador: Operador, por: { datos: DatosDeLaDisminucion; pedido: PeticionDeDisminucion }) {
    const { datos, pedido } = por;
    const custodio = custodioVigente(await this.dependencias.fondos.custodios(datos.fondo.id));
    return this.dependencias.bancos.registrarNota(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.fondo.id },
      cuentaBancariaId: datos.cuentaBancariaId,
      tipo: 'credito',
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      beneficiario: custodio?.custodio ?? datos.fondo.nombre,
      conceptos: [{ claveDeSistema: 'devolucion_de_fondo_de_caja_chica', montoCentavos: datos.montoCentavos }],
      ...(pedido.referencia ? { referencia: pedido.referencia } : {}),
      ...(pedido.observaciones ? { observaciones: pedido.observaciones } : {}),
    });
  }

  private evento(
    operador: Operador,
    por: { datos: DatosDeLaDisminucion; cambioId: string; movimiento: MovimientoCreado },
  ) {
    const { datos, cambioId, movimiento } = por;
    return new MontoDelFondoCambiado({
      empresaId: operador.empresaId,
      fondoId: datos.fondo.id,
      cambioId,
      tipo: 'disminucion',
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
      cuentaBancariaId: datos.cuentaBancariaId,
    });
  }
}
