import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  CampoComparado,
  DiferenciaDeConciliacion,
  DocumentoConciliable,
  FilaConciliable,
} from './tipos-de-conciliacion.js';

const CAMPOS_DE_TEXTO = ['autorizacionFel', 'tipoDte', 'nitEmisor', 'serie', 'numero', 'fechaEmision'] as const;
const CAMPOS_DE_MONTO = ['total', 'iva', 'idp', 'otrosImpuestos'] as const;

function textoIgual(arrancar: string | null, sat: string): boolean {
  return arrancar !== null && arrancar.toLowerCase() === sat.toLowerCase();
}

function diferencia(campo: CampoComparado, arrancar: string | null, sat: string): DiferenciaDeConciliacion {
  return { campo, arrancar, sat };
}

/**
 * Los datos que no coinciden entre el documento y el DTE. Los montos se comparan en centavos (el IVA con una diferencia
 * de centavos también se informa: manda el DTE); los textos, sin importar mayúsculas.
 */
export function diferenciasDeConciliacion(
  documento: DocumentoConciliable,
  fila: FilaConciliable,
): DiferenciaDeConciliacion[] {
  const deTexto = CAMPOS_DE_TEXTO.filter((campo) => !textoIgual(documento[campo], fila[campo])).map((campo) =>
    diferencia(campo, documento[campo], fila[campo]),
  );
  const deMonto = CAMPOS_DE_MONTO.filter((campo) => aCentavos(documento[campo]) !== aCentavos(fila[campo])).map(
    (campo) => diferencia(campo, documento[campo], fila[campo]),
  );
  return [...deTexto, ...deMonto];
}
