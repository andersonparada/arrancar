import { formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { FichaDeParcela, Parcela } from '../../servicios/parcelas.api';
import { OPCIONES_DE_TENENCIA } from './edicion-de-parcela';

/** Cómo se escribe una superficie en m² (texto del servidor) en la unidad de la empresa; `—` si no hay. */
export type MostrarSuperficie = (metrosCuadrados: string | null) => string;

/** La superficie total que se muestra en una tarjeta cuando no es la medición propia de la parcela. */
export interface SuperficieCalculada {
  metrosCuadrados: string | null;
  /** `true` si es la suma de las subparcelas activas. */
  esSuma: boolean;
}

/** La superficie calculada de una parcela sin medición propia, si el árbol dice cuánto suman sus subparcelas. */
export function superficieCalculadaDe(
  parcela: Parcela,
  sumas: ReadonlyMap<string, string>,
): SuperficieCalculada | undefined {
  const suma = parcela.superficieTotalM2 === null ? sumas.get(parcela.id) : undefined;
  return suma === undefined ? undefined : { metrosCuadrados: suma, esSuma: true };
}

/**
 * Lo que muestra la tarjeta de una parcela en la lista: lo que la identifica. Con `calculada`, la superficie total es
 * la suma de las subparcelas (la parcela no tiene medición propia) y la etiqueta lo dice.
 */
export const resumenDeParcela = (
  parcela: Parcela,
  mostrar: MostrarSuperficie,
  calculada?: SuperficieCalculada,
): DetalleDeRegistro[] => [
  { etiqueta: 'Tipo', valor: formatearTexto(parcela.tipoNombre) },
  { etiqueta: 'Tenencia', valor: formatearOpcion(OPCIONES_DE_TENENCIA, parcela.formaDeTenencia) },
  {
    etiqueta: calculada?.esSuma ? 'Superficie total (suma de subparcelas)' : 'Superficie total',
    valor: mostrar(calculada ? calculada.metrosCuadrados : parcela.superficieTotalM2),
  },
  { etiqueta: 'Superficie útil', valor: mostrar(parcela.superficieUtilM2) },
];

/** La marca junto al nombre en la lista: si tiene avisos, que los revise; si es arrendada, que se note. */
export function insigniaDeParcela(parcela: Parcela): string | undefined {
  if (parcela.avisos.length) return 'Con aviso';
  return parcela.formaDeTenencia === 'arrendada' ? 'Arrendada' : undefined;
}

const punto = ({ latitud, longitud }: Parcela): string | null =>
  latitud !== null && longitud !== null ? `${latitud}, ${longitud}` : null;

const colindancias = (parcela: Parcela): DetalleDeRegistro[] => [
  { etiqueta: 'Colinda al norte con', valor: formatearTexto(parcela.colindanciaNorte) },
  { etiqueta: 'Colinda al sur con', valor: formatearTexto(parcela.colindanciaSur) },
  { etiqueta: 'Colinda al oriente con', valor: formatearTexto(parcela.colindanciaOriente) },
  { etiqueta: 'Colinda al poniente con', valor: formatearTexto(parcela.colindanciaPoniente) },
];

/** Todos los datos de la parcela para la pestaña «Datos» de su ficha, ya con formato. */
export const detallesDeParcela = (
  parcela: FichaDeParcela,
  mostrar: MostrarSuperficie,
  calculada?: SuperficieCalculada,
): DetalleDeRegistro[] => [
  { etiqueta: 'Localidad', valor: formatearTexto(parcela.localidadNombre) },
  { etiqueta: 'Código', valor: formatearTexto(parcela.codigo) },
  { etiqueta: 'Parcela madre', valor: formatearTexto(parcela.parcelaMadreCodigo) },
  { etiqueta: 'Nivel', valor: formatearTexto(parcela.nivel) },
  ...resumenDeParcela(parcela, mostrar, calculada),
  { etiqueta: 'Punto en el mapa', valor: formatearTexto(punto(parcela)) },
  ...colindancias(parcela),
  { etiqueta: 'Observaciones', valor: formatearTexto(parcela.observaciones), largo: true },
];

/** Los enlaces para abrir el punto de la parcela en el mapa del teléfono o de la computadora; `null` si no tiene punto. */
export function enlacesDelPunto(parcela: Parcela): { geo: string; mapa: string } | null {
  if (parcela.latitud === null || parcela.longitud === null) return null;
  const { latitud, longitud } = parcela;
  return {
    geo: `geo:${latitud},${longitud}`,
    mapa: `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=17/${latitud}/${longitud}`,
  };
}
