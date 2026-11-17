import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { diasEntre, sumarDias } from '../../../dominio/fechas-de-corte.js';
import { inicioDeSemanaDeVencimiento } from '../../../dominio/meses-de-reporte.js';
import type {
  FilaDeChequePosfechadoDto,
  ReporteDeChequesPosfechadosDto,
  SumaDeChequesDto,
} from '../../dto/reportes-de-pagos.dto.js';
import type { ChequePosfechado } from '../../puertos/puertos-de-reportes-de-pagos.js';
import { baseDelCorte } from './base-del-corte.js';
import type { DependenciasDeReportesDePagos } from './reporte-de-pagos-realizados.js';

export const LEYENDAS_DE_CHEQUES = [
  'El cheque se paga a la vista (Código de Comercio art. 501): el proveedor puede cobrarlo antes de su fecha.',
  'El total es el «Comprometido» de los reportes de saldos al mismo corte.',
];

/** Los filtros de R7; el corte es hoy si falta. */
export interface SolicitudDeChequesPosfechados {
  corte?: string;
  proveedorId?: string;
  cuentaBancariaId?: string;
}

const mesYAnio = ({ anio, mes }: { anio: number; mes: number }): string => `${String(mes).padStart(2, '0')}/${anio}`;

function filaDe(cheque: ChequePosfechado, corte: string): FilaDeChequePosfechadoDto {
  return {
    pagoId: cheque.pagoId,
    numeroDelPago: cheque.numeroDelPago,
    fecha: cheque.fecha,
    diasQueFaltan: diasEntre(corte, cheque.fecha),
    cuenta: cheque.cuenta,
    numeroDeCheque: cheque.numeroDeCheque,
    proveedorId: cheque.proveedorId,
    proveedorNombre: cheque.proveedorNombre,
    monto: deCentavos(cheque.montoCentavos),
    cobrado: cheque.cobrado,
    cobradoEn: cheque.cobradoEn ? mesYAnio(cheque.cobradoEn) : null,
  };
}

/** Agrupa los cheques por una clave y suma cantidad y monto, conservando el orden de aparición. */
function agrupar<Clave>(cheques: readonly ChequePosfechado[], claveDe: (cheque: ChequePosfechado) => Clave) {
  const grupos = new Map<string, { clave: Clave; cantidad: number; centavos: number }>();
  for (const cheque of cheques) {
    const clave = claveDe(cheque);
    const grupo = grupos.get(JSON.stringify(clave)) ?? { clave, cantidad: 0, centavos: 0 };
    grupo.cantidad += 1;
    grupo.centavos += cheque.montoCentavos;
    grupos.set(JSON.stringify(clave), grupo);
  }
  return [...grupos.values()];
}

const suma = (cantidad: number, centavos: number): SumaDeChequesDto => ({ cantidad, monto: deCentavos(centavos) });

/** Las filas del reporte y sus totales por cuenta, por semana de vencimiento y general. */
function armarReporte(corte: string, cheques: readonly ChequePosfechado[]): ReporteDeChequesPosfechadosDto {
  const porCuenta = agrupar(cheques, (c) => [c.cuentaBancariaId, c.cuenta]);
  const porSemana = agrupar(cheques, (c) => inicioDeSemanaDeVencimiento(corte, c.fecha));
  return {
    corte,
    filas: cheques.map((cheque) => filaDe(cheque, corte)),
    totalesPorCuenta: porCuenta.map(({ clave, cantidad, centavos }) => ({
      cuentaBancariaId: clave[0] ?? null,
      cuenta: clave[1] ?? null,
      ...suma(cantidad, centavos),
    })),
    totalesPorSemana: porSemana.map(({ clave, cantidad, centavos }) => ({
      desde: clave,
      hasta: sumarDias(clave, 6),
      ...suma(cantidad, centavos),
    })),
    total: suma(
      cheques.length,
      cheques.reduce((total, c) => total + c.montoCentavos, 0),
    ),
    leyendas: LEYENDAS_DE_CHEQUES,
  };
}

/**
 * R7: los cheques entregados hasta el corte con fecha posterior, que todavía no rebajan el pasivo. Usa la misma fecha de
 * efecto que los reportes de saldos: uno cobrado antes de su fecha en una conciliación autorizada que termina hasta el
 * corte ya no sale; uno de la conciliación del mes del corte sale con «cobrado en mm/aaaa».
 */
export class ReporteDeChequesPosfechados {
  constructor(private readonly dependencias: DependenciasDeReportesDePagos) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeChequesPosfechados): Promise<ReporteDeChequesPosfechadosDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { corte } = await baseDelCorte(this.dependencias, operador, { ...solicitud, autorizacion: 'todos' });
      const cheques = await this.dependencias.consultasDePagos.chequesPosfechados({
        empresaId: operador.empresaId,
        corte,
        proveedorId: solicitud.proveedorId,
        cuentaBancariaId: solicitud.cuentaBancariaId,
      });
      return armarReporte(corte, cheques);
    });
  }
}
