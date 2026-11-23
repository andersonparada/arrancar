import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

const ORIGENES = {
  avaluo_dicabi: 'Avalúo de DICABI',
  avaluo_municipal: 'Avalúo municipal',
  autoavaluo: 'Autoavalúo',
  valuador_autorizado: 'Valuador autorizado',
  otro: 'Otro',
};

const CATEGORIAS_DE_IUSI = {
  vivienda: 'Vivienda',
  residencial: 'Residencial',
  mixto: 'Mixto',
  comercial: 'Comercial',
  otros: 'Otros',
};

/** Las columnas de una serie de valores; todas opcionales, pero con fecha, origen y total si se escribe alguna. */
const columnasDeLaSerie = (prefijo: string, titulo: string): Columna[] => [
  { clave: `${prefijo}VigenteDesde`, titulo: `${titulo}: vigente desde`, requerido: false, tipo: 'fecha' },
  { clave: `${prefijo}Origen`, titulo: `${titulo}: origen`, requerido: false, tipo: 'lista', opciones: ORIGENES },
  { clave: `${prefijo}Terreno`, titulo: `${titulo}: valor del terreno`, requerido: false, tipo: 'decimal' },
  {
    clave: `${prefijo}Construcciones`,
    titulo: `${titulo}: valor de construcciones`,
    requerido: false,
    tipo: 'decimal',
  },
  {
    clave: `${prefijo}Cultivos`,
    titulo: `${titulo}: valor de cultivos permanentes`,
    requerido: false,
    tipo: 'decimal',
  },
  { clave: `${prefijo}Total`, titulo: `${titulo}: valor total`, requerido: false, tipo: 'decimal' },
  { clave: `${prefijo}Documento`, titulo: `${titulo}: documento`, requerido: false, tipo: 'texto' },
];

const categoriaDelIusi: Columna = {
  clave: 'matriculaCategoriaIusi',
  titulo: 'Matrícula fiscal: categoría del IUSI',
  requerido: false,
  tipo: 'lista',
  opciones: CATEGORIAS_DE_IUSI,
};

/** Los valores vigentes del inmueble en el Excel: el de matrícula fiscal (con su categoría del IUSI) y el de catastro. */
export const columnasDeValoresDeInmueble: Columna[] = [
  ...columnasDeLaSerie('matricula', 'Matrícula fiscal'),
  categoriaDelIusi,
  ...columnasDeLaSerie('catastro', 'Catastro municipal'),
];
