import type { ColumnaDeDinero, FilaDelLibro } from './fila-del-libro.js';
import type { TipoDeLibro } from './tipo-de-libro.js';

export type CampoDeTexto =
  'numeroDeFila' | 'fecha' | 'tipoDte' | 'serie' | 'numero' | 'nit' | 'nombre' | 'siglaDelMotivo';
export type CampoDelLibro = CampoDeTexto | ColumnaDeDinero;

/** Una columna del libro impreso o exportado: su título y de qué campo de la fila sale. */
export interface ColumnaDelLibro {
  titulo: string;
  campo: CampoDelLibro;
}

const TEXTOS: ColumnaDelLibro[] = [
  { titulo: 'Nº', campo: 'numeroDeFila' },
  { titulo: 'Fecha', campo: 'fecha' },
  { titulo: 'Tipo', campo: 'tipoDte' },
  { titulo: 'Serie', campo: 'serie' },
  { titulo: 'Número', campo: 'numero' },
  { titulo: 'NIT', campo: 'nit' },
  { titulo: 'Proveedor', campo: 'nombre' },
];

/** Las columnas de cada libro, en el orden del diseño (§3.9.3.2). */
export const COLUMNAS_DEL_LIBRO: Readonly<Record<TipoDeLibro, readonly ColumnaDelLibro[]>> = {
  completo: [
    ...TEXTOS,
    { titulo: 'Bienes', campo: 'bienes' },
    { titulo: 'Servicios', campo: 'servicios' },
    { titulo: 'Combustibles', campo: 'combustibles' },
    { titulo: 'Pequeño contribuyente', campo: 'pequenoContribuyente' },
    { titulo: 'Primario, pecuario y agropecuario', campo: 'primarioPecuario' },
    { titulo: 'Exento y no afecto', campo: 'exentoYNoAfecto' },
    { titulo: 'IDP', campo: 'idp' },
    { titulo: 'IVA crédito fiscal', campo: 'ivaConCredito' },
    { titulo: 'IVA sin crédito', campo: 'ivaSinCredito' },
    { titulo: 'Motivo', campo: 'siglaDelMotivo' },
    { titulo: 'Total', campo: 'total' },
  ],
  simplificado: [
    ...TEXTOS,
    { titulo: 'Bienes', campo: 'bienes' },
    { titulo: 'Servicios', campo: 'servicios' },
    { titulo: 'Exento y no afecto', campo: 'exentoYNoAfecto' },
    { titulo: 'IDP', campo: 'idp' },
    { titulo: 'IVA (informativo)', campo: 'ivaInformativo' },
    { titulo: 'Total', campo: 'total' },
  ],
};

const CAMPOS_DE_TEXTO: ReadonlySet<CampoDelLibro> = new Set<CampoDelLibro>([
  'numeroDeFila',
  'fecha',
  'tipoDte',
  'serie',
  'numero',
  'nit',
  'nombre',
  'siglaDelMotivo',
]);

export const esCampoDeTexto = (campo: CampoDelLibro): campo is CampoDeTexto => CAMPOS_DE_TEXTO.has(campo);

/** El valor de una fila en un campo de texto, sin nulos. */
export const textoDelCampo = (fila: FilaDelLibro, campo: CampoDeTexto): string => String(fila[campo] ?? '');
