import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { diasEntre } from '../../../dominio/fechas-de-corte.js';
import { esDeMesAnterior, numeroDelRetiro, ultimoDiaDelMesAnterior } from '../../../dominio/retiros.js';
import type {
  FilaDeNotaSinAplicarDto,
  FilaDeRetiroPorLiquidarDto,
  ReporteDeNotasSinAplicarDto,
  ReporteDeRetirosPorLiquidarDto,
} from '../../dto/reportes-de-efectivo.dto.js';
import type { ConsultasDeNotasSinAplicar, NotaSinAplicar } from '../../puertos/puertos-de-notas-sin-aplicar.js';
import type { ConsultasDeRetiros, FilaDeRetiro } from '../../puertos/puertos-de-retiros.js';
import { baseDelCorte, type DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Lo que necesitan R10 y R11: la base de los reportes con corte y las lecturas de retiros y de notas. */
export interface DependenciasDeReportesDeEfectivo extends DependenciasDeReportesDeSaldos {
  consultasDeRetiros: ConsultasDeRetiros;
  notasSinAplicar: ConsultasDeNotasSinAplicar;
}

export const LEYENDAS_DE_RETIROS = [
  'El total es el efectivo en manos de custodios al corte (Caja, efectivo para pagos a proveedores).',
  'Un retiro cuenta hasta que se liquida o se anula; lo pagado cuenta por la fecha del pago.',
];

export const LEYENDAS_DE_NOTAS = [
  'El total es el saldo de «Pagos a proveedores por aplicar» al corte: se resta de Proveedores al presentar el balance.',
  'Una nota cuenta desde su fecha en Bancos; lo aplicado cuenta por la fecha del pago que la liga.',
];

/** Cuántos retiros trae R10 de una vez: no se pagina, es una lista de cierre. */
const TOPE_DE_RETIROS = 10_000;

export interface SolicitudDeRetirosPorLiquidar {
  corte?: string;
  custodio?: string;
}

export interface SolicitudDeNotasSinAplicar {
  /** Por omisión, el fin del mes anterior (se revisa al cerrar). */
  corte?: string;
  cuentaBancariaId?: string;
}

function filaDeRetiro({ retiro, ...fila }: FilaDeRetiro, corte: string): FilaDeRetiroPorLiquidarDto {
  return {
    id: retiro.id,
    numero: numeroDelRetiro(retiro.numero, retiro.anioDeNumero),
    forma: retiro.forma,
    documento: fila.numeroDelDocumento,
    cuentaBancariaId: fila.cuentaBancariaId,
    fecha: retiro.fecha,
    custodio: retiro.custodio,
    monto: deCentavos(retiro.montoCentavos),
    pagado: deCentavos(fila.pagadoCentavos),
    disponible: deCentavos(fila.disponibleCentavos),
    diasAbierto: diasEntre(retiro.fecha, corte),
    deMesAnterior: esDeMesAnterior(retiro.fecha, corte),
  };
}

const sumar = <Fila>(filas: readonly Fila[], valor: (fila: Fila) => string): string =>
  deCentavos(filas.reduce((total, fila) => total + aCentavos(valor(fila)), 0));

const totalDeRetiros = (filas: readonly FilaDeRetiroPorLiquidarDto[]): ReporteDeRetirosPorLiquidarDto['total'] => ({
  cantidad: filas.length,
  monto: sumar(filas, (f) => f.monto),
  pagado: sumar(filas, (f) => f.pagado),
  disponible: sumar(filas, (f) => f.disponible),
});

/**
 * R10: los retiros de efectivo que al corte seguían abiertos, con lo pagado y lo disponible hasta entonces y el total en
 * manos de custodios. Usa la misma lectura que la lista de retiros con corte.
 */
export class ReporteDeRetirosPorLiquidar {
  constructor(private readonly dependencias: DependenciasDeReportesDeEfectivo) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeRetirosPorLiquidar): Promise<ReporteDeRetirosPorLiquidarDto> {
    const { unidadDeTrabajo, consultasDeRetiros } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { corte } = await baseDelCorte(this.dependencias, operador, { ...solicitud, autorizacion: 'todos' });
      const pagina = await consultasDeRetiros.listar({
        estado: 'abierto',
        corte,
        custodio: solicitud.custodio,
        soloConDisponible: false,
        pagina: 1,
        limite: TOPE_DE_RETIROS,
      });
      const filas = pagina.filas.map((fila) => filaDeRetiro(fila, corte));
      return { corte, filas, total: totalDeRetiros(filas), leyendas: LEYENDAS_DE_RETIROS };
    });
  }
}

function filaDeNota(nota: NotaSinAplicar, corte: string): FilaDeNotaSinAplicarDto {
  return {
    movimientoId: nota.movimientoId,
    cuentaBancariaId: nota.cuentaBancariaId,
    cuenta: nota.cuenta,
    fecha: nota.fecha,
    numero: nota.numero,
    referencia: nota.referencia,
    monto: deCentavos(nota.montoCentavos),
    aplicado: deCentavos(nota.aplicadoCentavos),
    disponible: deCentavos(nota.montoCentavos - nota.aplicadoCentavos),
    diasSinAplicar: diasEntre(nota.fecha, corte),
    conciliada: nota.conciliada,
  };
}

/**
 * R11: las notas de débito marcadas para Cuentas por pagar que al corte tenían algo sin aplicar. Su total es el saldo de la
 * cuenta transitoria «Pagos a proveedores por aplicar».
 */
export class ReporteDeNotasSinAplicar {
  constructor(private readonly dependencias: DependenciasDeReportesDeEfectivo) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeNotasSinAplicar): Promise<ReporteDeNotasSinAplicarDto> {
    const { unidadDeTrabajo, reloj, notasSinAplicar } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const corte = solicitud.corte ?? ultimoDiaDelMesAnterior(await reloj.hoy(operador));
      await baseDelCorte(this.dependencias, operador, { corte, autorizacion: 'todos' });
      const notas = await notasSinAplicar.notasSinAplicar({
        empresaId: operador.empresaId,
        corte,
        cuentaBancariaId: solicitud.cuentaBancariaId,
      });
      const filas = notas.map((nota) => filaDeNota(nota, corte));
      return {
        corte,
        filas,
        total: {
          cantidad: filas.length,
          monto: sumar(filas, (f) => f.monto),
          aplicado: sumar(filas, (f) => f.aplicado),
          disponible: sumar(filas, (f) => f.disponible),
        },
        leyendas: LEYENDAS_DE_NOTAS,
      };
    });
  }
}
