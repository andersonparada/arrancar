import type { DestinoDeDocumento } from '../../core/contratos/libro-de-compras.contratos.js';

/** Los módulos a donde puede ir un documento; cada uno atiende `<destino>.recibir_documento`. */
export const DESTINOS_DE_DOCUMENTO = [
  'cuentas-por-pagar',
  'caja-chica',
  'cuentas-por-liquidar',
] as const satisfies readonly DestinoDeDocumento[];

export type { DestinoDeDocumento };
