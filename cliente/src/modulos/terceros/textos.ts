import type { ClaseCliente, PapelTercero } from './servicios/terceros.api';

/** Nombres de las ventanas y del menú del módulo de clientes (técnicamente, `terceros`). */

export const NOMBRE_TERCEROS = 'Clientes';

export const VENTANAS_TERCEROS = {
  buscarContacto: {
    titulo: 'Buscar contacto',
    descripcion: 'A quién llamar o escribir: clientes, proveedores y sus personas de contacto.',
  },
  clientes: {
    titulo: 'Clientes',
    descripcion: 'Personas y empresas a las que les vende.',
    nuevo: 'Nuevo cliente',
    editar: 'Editar cliente',
  },
  proveedores: {
    titulo: 'Proveedores',
    descripcion: 'Personas y empresas a las que les compra o que le dan un servicio.',
    nuevo: 'Nuevo proveedor',
    editar: 'Editar proveedor',
  },
  categorias: {
    titulo: 'Categorías de proveedor',
    descripcion: 'Para agrupar a los proveedores: insumos, veterinaria, transporte…',
  },
  ficha: { titulo: 'Ficha' },
} as const;

/** La lista de cada papel, para volver a ella desde la ficha o el formulario. */
export const VENTANA_DEL_PAPEL: Record<PapelTercero, (typeof VENTANAS_TERCEROS)['clientes' | 'proveedores']> = {
  cliente: VENTANAS_TERCEROS.clientes,
  proveedor: VENTANAS_TERCEROS.proveedores,
};

export const CLASES_DE_CLIENTE: Record<ClaseCliente, string> = {
  directo: 'Consumidor directo',
  intermediario: 'Intermediario o acopiador',
  empresa: 'Empresa compradora',
  subasta: 'Subasta o feria',
};
