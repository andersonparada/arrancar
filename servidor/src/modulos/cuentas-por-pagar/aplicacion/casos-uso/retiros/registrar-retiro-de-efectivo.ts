import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { avisoDeRetiroDeMesAnterior } from '../../../dominio/avisos-de-retiros.js';
import { CustodioInvalido } from '../../../dominio/errores-de-retiros.js';
import { RetiroRegistrado } from '../../../dominio/eventos-de-retiros.js';
import {
  beneficiarioDelRetiro,
  exigirFechaDeRetiro,
  exigirMontoDeRetiro,
  nombreDelCustodio,
} from '../../../dominio/registro-de-retiro.js';
import { CLAVE_DE_RETIROS, ultimoDiaDelMesAnterior, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import type { RetiroDto } from '../../dto/retiros.dto.js';
import { LectorDelRetiro } from './lector-del-retiro.js';
import { ordenarElRetiro, type DatosParaElRetiro, type PeticionDeRetiro } from './peticion-de-retiro.js';

/** Quién lleva el efectivo ya resuelto: el nombre y, si es usuario, su id. */
interface Custodio {
  nombre: string;
  usuarioId: string | null;
}

/** El retiro ya validado, listo para ordenar a Bancos y guardar. */
interface DatosDelRetiro extends DatosParaElRetiro {
  custodio: Custodio;
}

interface RetiroPorGuardar {
  pedido: PeticionDeRetiro;
  datos: DatosDelRetiro;
  movimiento: MovimientoCreado;
}

/**
 * Registra un retiro de efectivo para pagar a proveedores (`retiros.crear`): ordena a Bancos el cheque (a nombre del custodio
 * o de quien se escriba, nunca al portador y «no negociable» por omisión) o la nota de débito con el retiro como origen y el
 * concepto «Efectivo para pagos»; si Bancos lanza (saldo, chequera, mes conciliado), nada se guarda. El retiro queda abierto.
 * Responde con los avisos de Bancos y el de los retiros de meses anteriores que siguen sin liquidar. Publica
 * `retiro_registrado` al confirmar.
 */
export class RegistrarRetiroDeEfectivo {
  private readonly lector: LectorDelRetiro;

  constructor(private readonly dependencias: DependenciasDeRetiros) {
    this.lector = new LectorDelRetiro(dependencias);
  }

  /**
   * @throws FechaDeRetiroInvalida, MontoDeRetiroInvalido, CustodioObligatorio, CustodioInvalido,
   * BeneficiarioDelRetiroInvalido y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeRetiro): Promise<RetiroDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(operador: Operador, pedido: PeticionDeRetiro) {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const datos = await this.datosDelRetiro(pedido, hoy);
    const movimiento = await ordenarElRetiro(this.dependencias.bancos, operador, { pedido, datos });
    const retiro = await this.guardar({ pedido, datos, movimiento });
    const avisos = [...movimiento.avisos.map(({ mensaje }) => mensaje), ...(await this.avisosDeMesesAnteriores(hoy))];
    return {
      dto: await this.lector.leer(operador, retiro, avisos),
      eventos: [this.evento(operador, retiro, movimiento.cuentaBancariaId)],
    };
  }

  /** Lo que se valida antes de ordenar nada a Bancos: la fecha, el monto, el custodio y a nombre de quién va el cheque. */
  private async datosDelRetiro(pedido: PeticionDeRetiro, hoy: string): Promise<DatosDelRetiro> {
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeRetiro(fecha, hoy);
    const montoCentavos = exigirMontoDeRetiro(aCentavos(pedido.monto));
    const custodio = await this.custodio(pedido);
    const beneficiario =
      pedido.forma === 'cheque' ? beneficiarioDelRetiro(pedido.beneficiario, custodio.nombre) : custodio.nombre;
    return { retiroId: crypto.randomUUID(), fecha, montoCentavos, beneficiario, custodio };
  }

  private async guardar({ pedido, datos, movimiento }: RetiroPorGuardar): Promise<RetiroDeEfectivo> {
    const { correlativos, retiros } = this.dependencias;
    const asignado = await correlativos.siguiente(CLAVE_DE_RETIROS, datos.fecha);
    await retiros.agregar({
      id: datos.retiroId,
      numero: asignado.numero,
      anioDeNumero: asignado.anio,
      forma: pedido.forma,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
      custodio: datos.custodio.nombre,
      custodioUsuarioId: datos.custodio.usuarioId,
      observaciones: pedido.observaciones?.trim() || null,
    });
    return (await retiros.buscar(datos.retiroId))!;
  }

  private async custodio(pedido: PeticionDeRetiro): Promise<Custodio> {
    const usuarioId = pedido.custodioUsuarioId ?? null;
    const delUsuario = usuarioId === null ? null : await this.dependencias.custodios.nombreDelUsuario(usuarioId);
    if (usuarioId !== null && delUsuario === null) throw new CustodioInvalido();
    return { nombre: nombreDelCustodio(pedido.custodio, delUsuario), usuarioId };
  }

  /** Un aviso por cada retiro abierto de un mes anterior: ese efectivo sigue a cargo de su custodio. */
  private async avisosDeMesesAnteriores(hoy: string): Promise<string[]> {
    const { filas } = await this.dependencias.consultas.listar({
      estado: 'abierto',
      hasta: ultimoDiaDelMesAnterior(hoy),
      soloConDisponible: false,
      pagina: 1,
      limite: 20,
    });
    return filas.map(({ retiro, disponibleCentavos }) => avisoDeRetiroDeMesAnterior(retiro, disponibleCentavos));
  }

  private evento(operador: Operador, retiro: RetiroDeEfectivo, cuentaBancariaId: string): EventoDominio {
    return new RetiroRegistrado({
      empresaId: operador.empresaId,
      retiroId: retiro.id,
      numero: retiro.numero,
      forma: retiro.forma,
      fecha: retiro.fecha,
      montoCentavos: retiro.montoCentavos,
      movimientoId: retiro.movimientoId,
      cuentaBancariaId,
      custodio: retiro.custodio,
      custodioUsuarioId: retiro.custodioUsuarioId,
    });
  }
}
