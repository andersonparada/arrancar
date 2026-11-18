import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { AVISO_DE_REINTEGRO_EN_EFECTIVO } from '../../../dominio/avisos-de-reintegros.js';
import { ReintegroRegistrado } from '../../../dominio/eventos-de-reintegros.js';
import {
  conceptosDelReintegro,
  exigirFechaDeReintegro,
  exigirMedioDeCobro,
  exigirNotasValidas,
  notasEnCentavos,
} from '../../../dominio/registro-de-reintegro.js';
import { CLAVE_DE_REINTEGROS, efectoDelReintegro, type Reintegro } from '../../../dominio/reintegros.js';
import type { ReintegroDto } from '../../dto/reintegros.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';
import { LectorDelReintegro } from './lector-del-reintegro.js';
import { NotasDelReintegro, type NotaRevisada } from './notas-del-reintegro.js';
import type { PeticionDeReintegro } from './peticion-de-reintegro.js';

/** Lo ya validado del reintegro, listo para ordenar a Bancos y guardar. */
interface DatosDelReintegro {
  reintegroId: string;
  fecha: string;
  referencia: string | null;
  montoCentavos: number;
  proveedor: { nombre: string };
  notas: NotaRevisada[];
}

/**
 * Registra el reintegro del proveedor (`reintegros.crear`): devuelve el saldo libre de una o varias notas de crédito, por
 * depósito (orden a Bancos con la nota de crédito y el concepto de reintegro, de activo fijo si la factura lo es) o en
 * efectivo (referencia del recibo obligatoria, sin movimiento y con el aviso de depositarlo). Pide la carga inicial y bloquea
 * las notas en orden de id; si Bancos lanza, nada se guarda. Publica `reintegro_registrado` al confirmar.
 */
export class RegistrarReintegro {
  private readonly lector: LectorDelReintegro;
  private readonly notas: NotasDelReintegro;

  constructor(private readonly dependencias: DependenciasDeReintegros) {
    this.lector = new LectorDelReintegro(dependencias);
    this.notas = new NotasDelReintegro(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado si el proveedor no existe.
   * @throws ReintegroSinNotas, DemasiadasNotasEnReintegro, MontoDeReintegroInvalido, NotaRepetidaEnReintegro,
   * CuentaDelDepositoObligatoria, ReferenciaDelReciboObligatoria, NoEsNotaConSaldo, NotaPendienteNoSeAjusta,
   * NotaDeOtroProveedor, NotaEnContrasena, ReintegroMayorQueElSaldoLibre, FechaDeReintegroInvalida y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeReintegro): Promise<ReintegroDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(operador: Operador, pedido: PeticionDeReintegro) {
    const pedidas = notasEnCentavos(pedido.notas);
    exigirNotasValidas(pedidas);
    const referencia = exigirMedioDeCobro(pedido);
    const proveedor = await this.dependencias.lecturas.proveedor(pedido.proveedorId);
    if (!proveedor) throw new RecursoNoEncontrado('El proveedor');
    const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
    const notas = await this.notas.bloquearYRevisar(pedido.proveedorId, pedidas);
    const fecha = await this.fechaValida(operador, pedido, { notas, fechaDeInicio });
    const montoCentavos = notas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
    const datos = { reintegroId: crypto.randomUUID(), fecha, referencia, montoCentavos, proveedor, notas };
    const movimiento = pedido.forma === 'deposito' ? await this.ordenar(operador, pedido, datos) : null;
    const reintegro = await this.guardar({ pedido, datos, movimientoId: movimiento?.movimientoId ?? null });
    const avisos = movimiento ? movimiento.avisos.map(({ mensaje }) => mensaje) : [AVISO_DE_REINTEGRO_EN_EFECTIVO];
    return {
      dto: await this.lector.leer(reintegro, avisos),
      eventos: [this.evento(operador, reintegro, notas)],
    };
  }

  private async fechaValida(
    operador: Operador,
    pedido: PeticionDeReintegro,
    { notas, fechaDeInicio }: { notas: readonly NotaRevisada[]; fechaDeInicio: string | null },
  ): Promise<string> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeReintegro(fecha, hoy, { recepciones: notas.map(({ recepcion }) => recepcion), fechaDeInicio });
    return fecha;
  }

  /** La nota de crédito en Bancos, a nombre del proveedor (quien depositó), con el reintegro como origen. */
  private async ordenar(
    operador: Operador,
    pedido: PeticionDeReintegro,
    datos: DatosDelReintegro,
  ): Promise<MovimientoCreado> {
    const beneficiario =
      (await this.dependencias.nombreDelNit.de(
        pedido.proveedorId,
        datos.notas.map(({ notaId }) => notaId),
      )) ?? datos.proveedor.nombre;
    return this.dependencias.bancos.registrarNotaDeCredito(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.reintegroId },
      cuentaBancariaId: pedido.cuentaBancariaId!,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      beneficiario,
      conceptos: conceptosDelReintegro(datos.notas),
      ...(datos.referencia ? { referencia: datos.referencia } : {}),
      ...(pedido.observaciones?.trim() ? { observaciones: pedido.observaciones.trim() } : {}),
    });
  }

  private async guardar(por: {
    pedido: PeticionDeReintegro;
    datos: DatosDelReintegro;
    movimientoId: string | null;
  }): Promise<Reintegro> {
    const { pedido, datos, movimientoId } = por;
    const { correlativos, reintegros } = this.dependencias;
    const asignado = await correlativos.siguiente(CLAVE_DE_REINTEGROS, datos.fecha);
    await reintegros.agregar({
      id: datos.reintegroId,
      proveedorId: pedido.proveedorId,
      numero: asignado.numero,
      anioDeNumero: asignado.anio,
      forma: pedido.forma,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId,
      referencia: datos.referencia,
      observaciones: pedido.observaciones?.trim() || null,
      notas: datos.notas.map(({ notaId, montoCentavos }) => ({ notaId, montoCentavos })),
    });
    return (await reintegros.buscar(datos.reintegroId))!;
  }

  private evento(operador: Operador, reintegro: Reintegro, notas: readonly NotaRevisada[]): EventoDominio {
    return new ReintegroRegistrado({
      empresaId: operador.empresaId,
      reintegroId: reintegro.id,
      numero: reintegro.numero,
      proveedorId: reintegro.proveedorId,
      forma: reintegro.forma,
      fecha: reintegro.fecha,
      montoCentavos: reintegro.montoCentavos,
      movimientoId: reintegro.movimientoId,
      efecto: efectoDelReintegro(reintegro),
      notas: notas.map(({ notaId, montoCentavos, deActivoFijo }) => ({
        documentoId: notaId,
        montoCentavos,
        tieneActivoFijo: deActivoFijo,
      })),
    });
  }
}
