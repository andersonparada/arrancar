import { montoEnLetras } from '../../../../core/compartido/dominio/monto-en-letras.js';
import { deCentavos } from '../../../dominio/centavos.js';
import { MODULO_CUENTAS_POR_PAGAR } from '../../../dominio/origen-de-movimiento.js';
import type { ComprobanteDeEgresoDto, DetalleDelOrigenDto } from '../../dto/impresion-de-cheque.dto.js';
import type { ChequeParaImprimir } from '../../puertos/impresion-de-cheques.js';

export const LEYENDA_DEL_COMPROBANTE = 'Documento interno de control; no es un documento tributario.';
const RENGLONES_DE_APLICACION_CONTABLE = 5;

/** El origen del cheque: el detalle que dio su módulo o, sin él, de dónde viene. */
function origenDelComprobante(
  moduloDeOrigen: string | null,
  detalle: DetalleDelOrigenDto | null,
): DetalleDelOrigenDto | null {
  if (!moduloDeOrigen) return null;
  if (detalle) return detalle;
  const descripcion =
    moduloDeOrigen === MODULO_CUENTAS_POR_PAGAR ? 'Pago de Cuentas por pagar' : `Origen: ${moduloDeOrigen}`;
  return { modulo: moduloDeOrigen, descripcion, documentos: [], totalRetenido: null };
}

const datosDelCheque = (cheque: ChequeParaImprimir): ComprobanteDeEgresoDto['cheque'] => {
  const movimiento = cheque.movimiento!;
  return {
    numero: cheque.numero,
    serie: cheque.serie,
    fecha: movimiento.fecha,
    beneficiario: movimiento.beneficiario,
    monto: deCentavos(movimiento.montoCentavos),
    montoEnLetras: montoEnLetras(movimiento.montoCentavos).toLocaleUpperCase('es-GT'),
    concepto: movimiento.conceptoNombre,
    referencia: movimiento.referencia,
    observaciones: movimiento.observaciones,
    noNegociable: cheque.noNegociable,
    paraAbonoEnCuenta: movimiento.paraAbonoEnCuenta,
  };
};

const firmasDelComprobante = (elaboro: string | null): ComprobanteDeEgresoDto['firmas'] => [
  { rotulo: 'Elaboró', nombre: elaboro, conDpiYFecha: false },
  { rotulo: 'Revisó', nombre: null, conDpiYFecha: false },
  { rotulo: 'Autorizó', nombre: null, conDpiYFecha: false },
  { rotulo: 'Recibí conforme', nombre: null, conDpiYFecha: true },
];

interface DatosDelComprobante {
  cheque: ChequeParaImprimir;
  empresa: { nombre: string; nit: string | null };
  detalle: DetalleDelOrigenDto | null;
  esReimpresion: boolean;
}

/**
 * El comprobante de egreso (voucher): cheque, concepto, el detalle del documento de origen con sus retenciones, la
 * «Aplicación contable» en blanco para llenar a mano y las firmas. Es para el archivo de la empresa.
 * @throws Error si el cheque no tiene movimiento (se revisa antes: solo se imprime uno emitido).
 */
export function armarComprobanteDeEgreso({
  cheque,
  empresa,
  detalle,
  esReimpresion,
}: DatosDelComprobante): ComprobanteDeEgresoDto {
  const movimiento = cheque.movimiento;
  if (!movimiento) throw new Error('El comprobante de egreso es de un cheque emitido.');
  return {
    titulo: 'Comprobante de egreso',
    esReimpresion,
    empresa,
    cuenta: cheque.cuenta,
    cheque: datosDelCheque(cheque),
    origen: origenDelComprobante(movimiento.moduloDeOrigen, detalle),
    aplicacionContable: { renglonesEnBlanco: RENGLONES_DE_APLICACION_CONTABLE },
    firmas: firmasDelComprobante(movimiento.elaboro),
    leyenda: LEYENDA_DEL_COMPROBANTE,
  };
}
