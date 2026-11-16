import { fechaLegible, quetzales } from '../../../dominio/avisos.js';
import { nitEnVariasFichas, type SaldoDeNit } from '../../../dominio/saldos-por-nit.js';
import type { AvisoDelReporteDto } from '../../dto/saldos-al-corte.dto.js';
import type { ChequeCobradoAntes, DatosParaAvisosDelCorte } from '../../puertos/puertos-de-saldos-al-corte.js';

/** Las leyendas fijas de los reportes de saldos (§2.1 y §2.3 del diseño de CP5). */
export const LEYENDAS_DE_SALDOS = [
  'Las aplicaciones de notas y los pagos reaplicados se muestran como están hoy; el saldo neto de cada proveedor no depende de eso.',
  'Los cheques posfechados no rebajan el saldo antes de su fecha (NIIF para las Pymes, sección 11).',
];

const documentos = (cantidad: number): string => (cantidad === 1 ? '1 documento' : `${cantidad} documentos`);

function avisoDeAnterioresAlInicio({ anterioresAlInicio }: DatosParaAvisosDelCorte, inicio: string | null) {
  if (anterioresAlInicio.cantidad === 0 || inicio === null) return [];
  return [
    {
      codigo: 'emitidos_antes_del_inicio',
      mensaje: `Emitidos antes de la fecha de inicio: ${documentos(anterioresAlInicio.cantidad)} (${quetzales(anterioresAlInicio.totalCentavos)}) cuentan desde el ${fechaLegible(inicio)}. No estaban en la carga inicial: revise si faltaban en el saldo de apertura.`,
    },
  ];
}

function avisoDeRegistrosTardios({ registradosDespues }: DatosParaAvisosDelCorte, corte: string) {
  if (registradosDespues.cantidad === 0) return [];
  return [
    {
      codigo: 'registrados_despues_del_corte',
      mensaje: `${documentos(registradosDespues.cantidad)} con fecha hasta el ${fechaLegible(corte)} se registraron después (${quetzales(registradosDespues.totalCentavos)}): si ya cerró ese mes con este reporte, el saldo cambió.`,
    },
  ];
}

const mesDelCheque = ({ anio, mes }: ChequeCobradoAntes): string => `${String(mes).padStart(2, '0')}/${anio}`;

function avisosDeChequesCobradosAntes({ chequesCobradosAntes }: DatosParaAvisosDelCorte): AvisoDelReporteDto[] {
  return chequesCobradosAntes.map((cheque) => ({
    codigo: 'cheque_cobrado_antes_de_su_fecha',
    mensaje: `El cheque ${cheque.referencia ?? `del pago ${cheque.numeroDelPago}`} se cobró en el estado de cuenta de ${mesDelCheque(cheque)}, antes de su fecha; Bancos no guarda el día del cobro.`,
  }));
}

/** Un NIT en más de una ficha de proveedor: casi nunca pasa (Terceros no lo deja repetir), pero se avisa. */
export function avisosDeNitRepetido(grupos: readonly SaldoDeNit[]): AvisoDelReporteDto[] {
  return nitEnVariasFichas(grupos).map((grupo) => ({
    codigo: 'nit_en_varias_fichas',
    mensaje: `El NIT ${grupo.nit} está en ${grupo.fichas.length} fichas de proveedor: revise si son el mismo y únalas en Terceros.`,
  }));
}

/** Lo que cada reporte con corte avisa: documentos viejos, registros tardíos y cheques cobrados antes de su fecha. */
export function avisosDelCorte(
  datos: DatosParaAvisosDelCorte,
  { corte, fechaDeInicio }: { corte: string; fechaDeInicio: string | null },
): AvisoDelReporteDto[] {
  return [
    ...avisoDeAnterioresAlInicio(datos, fechaDeInicio),
    ...avisoDeRegistrosTardios(datos, corte),
    ...avisosDeChequesCobradosAntes(datos),
  ];
}
