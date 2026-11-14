import { z } from 'zod';
import {
  decimalObligatorio,
  decimalOpcional,
  fechaObligatoria,
  idOpcional,
  opcionObligatoria,
  opcionOpcional,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { MOTIVOS_DE_LA_FACTURA_ANTERIOR } from '../dominio/factura-anterior.js';
import {
  FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO,
  type MotivoSinCredito,
  type TipoDeDocumento,
} from '../dominio/tipos-de-documento.js';

const FAMILIAS = FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO as readonly TipoDeDocumento[] as readonly [
  TipoDeDocumento,
  ...TipoDeDocumento[],
];
const MOTIVOS = MOTIVOS_DE_LA_FACTURA_ANTERIOR as readonly MotivoSinCredito[] as readonly [
  MotivoSinCredito,
  ...MotivoSinCredito[],
];

/**
 * La factura del sistema anterior que corrige una nota (excluyente con `documentoAfectadoId`). El motivo de una familia
 * sin IVA lo pone el servidor; `null` en `motivoSinCredito` significa que dio crédito fiscal.
 */
export const esquemaFacturaAnterior = z
  .object({
    tipo: opcionObligatoria(FAMILIAS),
    serie: textoOpcional(40),
    numero: textoObligatorio(40),
    fechaEmision: fechaObligatoria(),
    autorizacionFel: idOpcional(),
    total: decimalObligatorio(2),
    iva: decimalObligatorio(2),
    notasDeDebitoAnterioresTotal: decimalOpcional(2),
    notasDeDebitoAnterioresIva: decimalOpcional(2),
    motivoSinCredito: opcionOpcional(MOTIVOS),
    detalleDelMotivo: textoOpcional(500),
  })
  .nullish()
  .transform((valor) => valor ?? null);
