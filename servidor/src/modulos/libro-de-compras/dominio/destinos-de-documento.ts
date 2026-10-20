import type { DestinoDeDocumento } from '../../core/contratos/libro-de-compras.contratos.js';

/** Los módulos a donde puede ir un documento; cada uno atiende `<destino>.recibir_documento`. */
export const DESTINOS_DE_DOCUMENTO = [
  'cuentas-por-pagar',
  'caja-chica',
  'cuentas-por-liquidar',
] as const satisfies readonly DestinoDeDocumento[];

export type { DestinoDeDocumento };

/** El destino que llega como texto libre, o `null` si no es uno de los conocidos (vacío o inexistente). */
export function destinoConocido(valor: string | null | undefined): DestinoDeDocumento | null {
  return DESTINOS_DE_DOCUMENTO.find((destino) => destino === valor) ?? null;
}

/** El destino con que se arma la vista previa cuando el formulario aún no eligió uno (no se guarda). */
export const DESTINO_DE_VISTA_PREVIA: DestinoDeDocumento = DESTINOS_DE_DOCUMENTO[0];
