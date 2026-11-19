import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

const TIPOS = { individual: 'Persona individual', juridica: 'Persona jurídica' } as const;

const CLASES = { directo: 'Directo', intermediario: 'Intermediario', empresa: 'Empresa', subasta: 'Subasta' } as const;

/** Los datos del tercero, iguales en clientes y proveedores y en el mismo orden del formulario. */
const datosDelTercero = (): Columna[] => [
  { clave: 'tipo', titulo: 'Tipo', requerido: true, tipo: 'lista', opciones: TIPOS },
  { clave: 'nombres', titulo: 'Nombres', requerido: false, tipo: 'texto' },
  { clave: 'apellidos', titulo: 'Apellidos', requerido: false, tipo: 'texto' },
  { clave: 'razonSocial', titulo: 'Razón social', requerido: false, tipo: 'texto' },
  { clave: 'nombreComercial', titulo: 'Nombre comercial', requerido: false, tipo: 'texto' },
  { clave: 'nit', titulo: 'NIT', requerido: false, tipo: 'texto' },
  { clave: 'dpi', titulo: 'DPI', requerido: false, tipo: 'texto' },
  { clave: 'telefono', titulo: 'Teléfono', requerido: false, tipo: 'texto' },
  { clave: 'whatsapp', titulo: 'WhatsApp', requerido: false, tipo: 'texto' },
  { clave: 'correo', titulo: 'Correo', requerido: false, tipo: 'texto' },
  { clave: 'departamentoCodigo', titulo: 'Departamento', requerido: false, tipo: 'texto' },
  { clave: 'municipioCodigo', titulo: 'Municipio', requerido: false, tipo: 'texto' },
  { clave: 'direccion', titulo: 'Dirección', requerido: false, tipo: 'texto' },
  { clave: 'notas', titulo: 'Notas', requerido: false, tipo: 'texto' },
];

/** Las columnas del Excel de clientes. */
export const columnasDeClientes = (): Columna[] => [
  ...datosDelTercero(),
  { clave: 'clase', titulo: 'Clase de cliente', requerido: true, tipo: 'lista', opciones: CLASES },
  { clave: 'activo', titulo: 'Activo', requerido: false, tipo: 'siNo' },
];

/** Las columnas del Excel de proveedores; la categoría se escribe por su nombre. */
export const columnasDeProveedores = (categorias: () => Promise<OpcionDeReferencia[]>): Columna[] => [
  ...datosDelTercero(),
  {
    clave: 'categoriaId',
    titulo: 'Categoría',
    requerido: false,
    tipo: 'referencia',
    campoDeNombre: 'categoriaNombre',
    opciones: categorias,
  },
  { clave: 'activo', titulo: 'Activo', requerido: false, tipo: 'siNo' },
];

/** Las columnas del Excel de categorías de proveedor. */
export const columnasDeCategorias = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'activo', titulo: 'Activo', requerido: false, tipo: 'siNo' },
];

export const NOTAS_DEL_EXCEL_DE_TERCEROS = [
  'Una persona individual necesita Nombres; una persona jurídica, Razón social o Nombre comercial.',
  'Departamento y Municipio se escriben con su código de dos dígitos (por ejemplo 01).',
  'Si alguien se parece a un tercero ya registrado (mismo NIT, DPI o nombre muy parecido), la fila se rechaza.',
];
