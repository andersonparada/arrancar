import type { CategoriaDeIusi, FuenteDeValor, OrigenDeValor } from '../dominio/tipos-de-valor-de-inmueble.js';
import type { InmuebleDto, SolicitudDeInmueble } from './dto/inmueble.dto.js';
import type {
  SolicitudDeValorDeInmueble,
  ValorDeInmuebleDto,
  ValoresVigentesDeInmueble,
} from './dto/valor-de-inmueble.dto.js';

type Parte = 'VigenteDesde' | 'Terreno' | 'Construcciones' | 'Cultivos' | 'Total' | 'Documento';

/** Las columnas de una serie de valores en el Excel de inmuebles: van planas, con el prefijo de la serie. */
export type SerieEnExcel<Prefijo extends string> = Record<`${Prefijo}${Parte}`, string | null> &
  Record<`${Prefijo}Origen`, OrigenDeValor | null>;

/** Los valores vigentes de matrícula fiscal y de catastro municipal; la categoría del IUSI va con la matrícula. */
export type ValoresEnExcel = SerieEnExcel<'matricula'> &
  SerieEnExcel<'catastro'> & { matriculaCategoriaIusi: CategoriaDeIusi | null };

export type FilaDeInmuebleEnExcel = InmuebleDto & ValoresEnExcel;
export type SolicitudDeInmuebleEnExcel = SolicitudDeInmueble & ValoresEnExcel;

const SERIES: ReadonlyArray<{ prefijo: 'matricula' | 'catastro'; fuente: FuenteDeValor }> = [
  { prefijo: 'matricula', fuente: 'matricula_fiscal' },
  { prefijo: 'catastro', fuente: 'catastro_municipal' },
];

/** Cada columna de una serie y el campo del valor que lleva. */
const CAMPOS_DEL_VALOR = {
  VigenteDesde: 'vigenteDesde',
  Origen: 'origen',
  Terreno: 'valorTerreno',
  Construcciones: 'valorConstrucciones',
  Cultivos: 'valorCultivosPermanentes',
  Total: 'valorTotal',
  Documento: 'documento',
} as const;

const CLAVES_DE_VALORES = new Set([
  ...SERIES.flatMap(({ prefijo }) => Object.keys(CAMPOS_DEL_VALOR).map((parte) => `${prefijo}${parte}`)),
  'matriculaCategoriaIusi',
]);

/** Los datos del inmueble de una fila importada, sin las columnas de los valores. */
export function sinValores(fila: SolicitudDeInmuebleEnExcel): SolicitudDeInmueble {
  const datos = Object.entries(fila).filter(([clave]) => !CLAVES_DE_VALORES.has(clave));
  return Object.fromEntries(datos) as unknown as SolicitudDeInmueble;
}

/** Los valores que trae una fila importada (de cero a dos); lo incompleto ya lo rechazó la validación de la fila. */
export function valoresDeLaFila(fila: ValoresEnExcel): SolicitudDeValorDeInmueble[] {
  const campos = fila as unknown as Record<string, string | null>;
  return SERIES.flatMap(({ prefijo, fuente }) => {
    const leer = (parte: string) => campos[`${prefijo}${parte}`] ?? null;
    const vigenteDesde = leer('VigenteDesde');
    const origen = leer('Origen') as OrigenDeValor | null;
    const valorTotal = leer('Total');
    if (vigenteDesde === null || origen === null || valorTotal === null) return [];
    return [
      {
        fuente,
        vigenteDesde,
        origen,
        valorTerreno: leer('Terreno'),
        valorConstrucciones: leer('Construcciones'),
        valorCultivosPermanentes: leer('Cultivos'),
        valorTotal,
        categoriaIusi: fuente === 'matricula_fiscal' ? (leer('CategoriaIusi') as CategoriaDeIusi | null) : null,
        documento: leer('Documento'),
      },
    ];
  });
}

const aColumnas = (prefijo: string, valor: ValorDeInmuebleDto | null) =>
  Object.fromEntries(
    Object.entries(CAMPOS_DEL_VALOR).map(([parte, campo]) => [`${prefijo}${parte}`, valor?.[campo] ?? null]),
  );

/** El inmueble con sus valores vigentes en columnas planas, como se exporta. */
export function filaConValores(
  inmueble: InmuebleDto,
  vigentes: ValoresVigentesDeInmueble | undefined,
): FilaDeInmuebleEnExcel {
  return {
    ...inmueble,
    ...aColumnas('matricula', vigentes?.matriculaFiscal ?? null),
    ...aColumnas('catastro', vigentes?.catastroMunicipal ?? null),
    matriculaCategoriaIusi: vigentes?.matriculaFiscal?.categoriaIusi ?? null,
  } as FilaDeInmuebleEnExcel;
}
