import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { superaElUmbralDeBancarizacion } from '../../../dominio/aplicacion-manual.js';
import { posfechadosDe } from '../../../dominio/pagos.js';
import { fechaMinimaDelPago, retencionPorDescontar } from '../../../dominio/registro-de-pago.js';
import type { CargoParaPagarDto, CargosParaPagarDto } from '../../dto/cargos-para-pagar.dto.js';
import type { FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import type { RetencionDelLibro } from '../../../dominio/avisos-de-pagos.js';
import { saldosDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import type { DependenciasParaPagar } from './dependencias-de-pagos.js';

export interface OpcionesParaPagar {
  /** La contraseña desde la que se abrió la ventana: sus cargos van primero. */
  contrasenaId?: string;
  /** `AAAA-MM-DD`; hoy si falta (fija el mes de la suma al proveedor). */
  fecha?: string;
}

type Conexion = {
  delLibro: Map<string, RetencionDelLibro[]>;
  yaDescontadas: Set<string>;
  umbralCentavos: number;
  hoy: string;
};

const esPagable = ({ fila }: { fila: FilaDeDocumento }) => fila.documento.estado === 'autorizado';

const AL_FINAL = '9999-12-31';

const textoDe = (valor: string | null | undefined, porOmision = ''): string => valor ?? porOmision;

function ordenar(filas: FilaDeDocumento[], contrasenaId: string | undefined): FilaDeDocumento[] {
  const claveDe = ({ contrasena, documento }: FilaDeDocumento) =>
    [
      contrasena?.id === contrasenaId ? '0' : '1',
      textoDe(contrasena?.id),
      textoDe(documento.vencimiento, AL_FINAL),
      documento.fechaEmision,
      documento.id,
    ].join('|');
  return [...filas].sort((a, b) => claveDe(a).localeCompare(claveDe(b)));
}

function datosDeLaRetencion(fila: FilaDeDocumento, conexion: Conexion) {
  const { documento } = fila;
  const retenciones = conexion.delLibro.get(documento.id) ?? [];
  const meses = retenciones.map(({ fecha }) => fecha.slice(0, 7)).sort();
  return {
    retencionPorDescontar: deCentavos(retencionPorDescontar(documento, conexion.yaDescontadas.has(documento.id))),
    retencionesPorPracticar: deCentavos(documento.retencionesPorPracticarCentavos ?? 0),
    constanciasPendientes: retenciones.filter(({ constanciaNumero }) => constanciaNumero === null).length,
    mesDeRetencion: meses[0] ?? null,
  };
}

function dtoDeCargo(fila: FilaDeDocumento, conexion: Conexion): CargoParaPagarDto {
  const { documento, libro } = fila;
  const saldos = saldosDeLaFila(fila, conexion.hoy);
  const disponible = deCentavos(saldos.disponibleCentavos);
  return {
    id: documento.id,
    contrasenaId: fila.contrasena!.id,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: documento.numero,
    origen: documento.origen,
    fechaDeEmision: documento.fechaEmision,
    fechaDeRecepcion: libro.fechaRecepcion,
    vencimiento: documento.vencimiento,
    total: deCentavos(documento.totalCentavos),
    saldo: deCentavos(saldos.deudaCentavos),
    comprometido: deCentavos(saldos.comprometidoCentavos),
    disponible,
    comprometidoHasta: posfechadosDe(fila.pagosVigentes, conexion.hoy).comprometidoHasta,
    propuesto: disponible,
    ...datosDeLaRetencion(fila, conexion),
    tieneActivoFijo: documento.tieneActivoFijo,
    sobreUmbralDeBancarizacion: superaElUmbralDeBancarizacion(documento.totalCentavos, conexion.umbralCentavos),
  };
}

/**
 * Lo que la ventana de pago necesita de un proveedor (M2): sus cargos con saldo en contraseñas vigentes, con lo propuesto
 * (todo el saldo), la retención que descontaría cada uno, las constancias pendientes, la fecha mínima, el beneficiario y la
 * suma pagada en el mes. Los autorizados se pueden pagar; los demás se muestran aparte. Solo lee: no bloquea nada.
 */
export class ListarCargosParaPagar {
  constructor(private readonly dependencias: DependenciasParaPagar) {}

  ejecutar(operador: Operador, proveedorId: string, opciones: OpcionesParaPagar = {}): Promise<CargosParaPagarDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.armar(operador, proveedorId, opciones));
  }

  private async armar(
    operador: Operador,
    proveedorId: string,
    opciones: OpcionesParaPagar,
  ): Promise<CargosParaPagarDto> {
    const filas = await this.cargosEnContrasenas(proveedorId, opciones.contrasenaId);
    const conexion = await this.conexion(operador, filas);
    const dtos = filas.map((fila) => ({ fila, dto: dtoDeCargo(fila, conexion) }));
    const pagables = dtos.filter(esPagable);
    const fechas = await this.fechas(
      operador,
      pagables.map(({ fila }) => fila),
      opciones.contrasenaId,
    );
    return {
      contrasenas: await this.contrasenas(filas),
      cargos: pagables.map(({ dto }) => dto),
      noAutorizados: dtos.filter((cargo) => !esPagable(cargo)).map(({ dto }) => dto),
      ...fechas,
      ...(await this.delProveedor(operador, { proveedorId, filas, fecha: opciones.fecha })),
      umbralDeBancarizacion: deCentavos(conexion.umbralCentavos),
    };
  }

  /** Los cargos con saldo que están en una contraseña vigente, la abierta primero. */
  private async cargosEnContrasenas(proveedorId: string, contrasenaId?: string): Promise<FilaDeDocumento[]> {
    const todos = await this.dependencias.consultas.cargosConSaldoDe(proveedorId);
    return ordenar(
      todos.filter(({ contrasena }) => contrasena !== null),
      contrasenaId,
    );
  }

  /** El beneficiario, lo pagado en el mes y el tope de la diferencia. */
  private async delProveedor(
    operador: Operador,
    {
      proveedorId,
      filas,
      fecha,
    }: { proveedorId: string; filas: readonly FilaDeDocumento[]; fecha: string | undefined },
  ) {
    const { consultasDePagos, nombreDelNit, topeDeDiferencia, reloj } = this.dependencias;
    const delMes = await consultasDePagos.pagosDelMes(proveedorId, fecha ?? (await reloj.hoy(operador)));
    return {
      beneficiario: await nombreDelNit.de(
        proveedorId,
        filas.map(({ documento }) => documento.id),
      ),
      sumaDelMesAlProveedor: deCentavos(delMes.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0)),
      topeDiferencia: deCentavos(await topeDeDiferencia.centavos(operador)),
    };
  }

  private async conexion(operador: Operador, filas: readonly FilaDeDocumento[]): Promise<Conexion> {
    const { retenciones, pagos, umbral } = this.dependencias;
    const ids = filas.map(({ documento }) => documento.id);
    return {
      delLibro: await retenciones.deCargos(ids),
      yaDescontadas: await pagos.conRetencionYaDescontada(ids),
      umbralCentavos: await umbral.centavos(operador),
      hoy: await this.dependencias.reloj.hoy(operador),
    };
  }

  private async contrasenas(filas: readonly FilaDeDocumento[]) {
    const vistas = new Map(filas.map(({ contrasena }) => [contrasena!.id, contrasena!.numero]));
    const fechas = await this.dependencias.consultasDePagos.contrasenas([...vistas.keys()]);
    return [...vistas].map(([id, numero]) => ({ id, numero, fecha: fechas.get(id)?.fecha ?? '' }));
  }

  /** La fecha mínima de lo propuesto (los cargos de la contraseña abierta, o todos) y los datos de la carga inicial. */
  private async fechas(operador: Operador, pagables: readonly FilaDeDocumento[], contrasenaId?: string) {
    const { fechaDeInicio, cerrada } = await this.dependencias.cargaInicial.obtener(operador);
    const propuestos = pagables.filter(({ contrasena }) => !contrasenaId || contrasena?.id === contrasenaId);
    const hayInicial = propuestos.some(({ documento }) => documento.origen === 'saldo_inicial');
    const emisiones = propuestos.map(({ documento }) => documento.fechaEmision);
    const fechaMinima =
      emisiones.length === 0
        ? null
        : fechaMinimaDelPago({ emisiones, fechaDeInicio: hayInicial ? fechaDeInicio : null });
    return { fechaMinima, fechaDeInicio, cargaCerrada: cerrada };
  }
}
