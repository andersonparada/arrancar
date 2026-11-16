import { NOMBRES_DE_TIPOS } from './nombres-de-tipos.js';
import type {
  DocumentoDelMovimiento,
  HechoDelEstado,
  MovimientoDelProveedor,
  RegistroDelMovimiento,
} from './estado-de-cuenta.tipos.js';

const NOMBRE_DE_LA_FORMA: Record<string, string> = {
  cheque: 'cheque',
  nota_de_debito: 'nota de débito',
  nota_ligada: 'nota ligada',
  cuenta_de_apertura: 'cuenta de apertura',
  efectivo: 'efectivo',
  deposito: 'depósito',
};

const etiquetaDelDocumento = ({ tipo, serie, numero }: DocumentoDelMovimiento): string =>
  `${NOMBRES_DE_TIPOS[tipo]} ${serie ? `${serie}-${numero}` : numero}`;

function descripcionDelRegistro(prefijo: string, registro: RegistroDelMovimiento | null): string {
  if (!registro) return prefijo;
  const forma = NOMBRE_DE_LA_FORMA[registro.forma] ?? registro.forma;
  return `${prefijo} ${registro.numero} (${forma}${registro.referencia ? ` ${registro.referencia}` : ''})`;
}

/** El texto de cada línea: qué pasó y con qué documento o pago. */
export function conceptoDe({ hecho, documento, registro }: MovimientoDelProveedor): string {
  const delDocumento = documento ? etiquetaDelDocumento(documento) : '';
  const conceptos: Record<HechoDelEstado, string> = {
    documento: delDocumento,
    nota_de_credito: delDocumento,
    pago: descripcionDelRegistro('Pago', registro),
    reintegro: descripcionDelRegistro('Reintegro', registro),
    diferencia_menor: `Diferencia menor de ${delDocumento}`,
    baja_de_saldo_a_favor: `Baja del saldo a favor de ${delDocumento}`,
    anulacion_de_documento: `Anulación de ${delDocumento}`,
    anulacion_de_pago: descripcionDelRegistro('Anulación del pago', registro),
    anulacion_de_reintegro: descripcionDelRegistro('Anulación del reintegro', registro),
    anulacion_de_ajuste: `Anulación del ajuste de ${delDocumento}`,
  };
  return conceptos[hecho];
}
