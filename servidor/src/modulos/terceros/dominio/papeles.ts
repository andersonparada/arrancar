/** Cómo compra el cliente; permite medir cuánto se gana vendiendo sin intermediarios. */
export const CLASES_DE_CLIENTE = ['directo', 'intermediario', 'empresa', 'subasta'] as const;
export type ClaseDeCliente = (typeof CLASES_DE_CLIENTE)[number];

export type TipoDePapel = 'cliente' | 'proveedor';

interface PapelComun {
  activo: boolean;
  notas: string | null;
}

export interface PapelDeCliente extends PapelComun {
  tipo: 'cliente';
  clase: ClaseDeCliente;
}

export interface PapelDeProveedor extends PapelComun {
  tipo: 'proveedor';
  categoriaId: string | null;
}

/** Lo que un tercero es para la cuenta. Un papel quitado no se borra: queda inactivo con su historial. */
export type Papel = PapelDeCliente | PapelDeProveedor;

export type PapelSegunTipo<Tipo extends TipoDePapel> = Extract<Papel, { tipo: Tipo }>;
