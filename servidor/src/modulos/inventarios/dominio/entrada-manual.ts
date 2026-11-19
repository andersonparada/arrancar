import { CAUSAS_DE_ENTRADA, type CausaDeEntrada } from './documento.js';
import { DocumentoInvalido } from './errores-de-kardex.js';
import {
  exigirRenglones,
  textoObligatorio,
  textoOpcional,
  type EscritoComun,
  type PlanDeDocumento,
} from './plan-de-documento.js';

export interface EntradaManualEscrita extends EscritoComun {
  causa: CausaDeEntrada;
  /** «Acta de donación», «Orden de producción 12»: obligatorio. */
  soporte: string;
}

/** La NIIF pide registrar la donación a su valor razonable; sin factura, el costo puede no ser deducible (V-10). */
export const AVISO_DE_DONACION_RECIBIDA =
  'La NIIF pide registrarla a su valor razonable, con un ingreso. Sin factura que la respalde, ese costo puede no ser deducible al venderla o consumirla (ISR art. 21); consulte a su contador.';

/** Lo que va al libro de compras no se registra a mano: se recibe desde sus líneas. */
export const AVISO_DE_LO_QUE_ESTA_EN_EL_LIBRO =
  'Si la compra está en el Libro de compras, recíbala desde allí: una entrada manual no se liga a ninguna factura.';

function exigirCostos(causa: CausaDeEntrada, renglones: EntradaManualEscrita['renglones']): void {
  if (renglones.some((renglon) => renglon.costoTotal < 0n))
    throw new DocumentoInvalido('El costo no puede ser negativo.');
  const sinCosto = renglones.some((renglon) => renglon.costoTotal === 0n);
  if (sinCosto && causa !== 'donacion_recibida') {
    throw new DocumentoInvalido(
      'Escriba el costo de cada renglón: solo una donación recibida puede entrar a costo cero.',
    );
  }
}

/**
 * Revisa una entrada manual (§6.4): causa conocida, soporte escrito y costo por renglón (cero solo en la donación
 * recibida, con aviso). El costo es el que se escribe: el kardex lo toma tal cual.
 * @throws DocumentoInvalido si algo no se cumple.
 */
export function planDeEntradaManual(datos: EntradaManualEscrita): PlanDeDocumento {
  if (!CAUSAS_DE_ENTRADA.includes(datos.causa)) throw new DocumentoInvalido('La causa de la entrada no es válida.');
  exigirRenglones(datos.renglones);
  exigirCostos(datos.causa, datos.renglones);
  const avisos = [AVISO_DE_LO_QUE_ESTA_EN_EL_LIBRO];
  if (datos.causa === 'donacion_recibida') avisos.push(AVISO_DE_DONACION_RECIBIDA);
  return {
    clase: 'entrada_manual',
    fecha: datos.fecha,
    bodegaId: datos.bodegaId,
    causa: datos.causa,
    destino: null,
    conceptoDeGastoId: null,
    localidadId: null,
    departamentoId: null,
    activoFijoId: null,
    entregadoA: null,
    soporte: textoObligatorio(datos.soporte, 'Soporte', 150),
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
    renglones: datos.renglones,
    avisos,
  };
}
