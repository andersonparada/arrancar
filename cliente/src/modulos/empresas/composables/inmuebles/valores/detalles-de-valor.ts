import { formatearMonto, formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { ValorDeInmueble } from '../../../servicios/valores-de-inmueble.api';
import { OPCIONES_DE_CATEGORIA_DE_IUSI, OPCIONES_DE_ORIGEN } from './edicion-de-valor';

const monto = (valor: string | null): string => (valor === null ? '—' : formatearMonto(valor));

/** Lo que muestra la tarjeta de un valor: el total, cómo se obtuvo y sus partes. */
export const detallesDeValor = (valor: ValorDeInmueble): DetalleDeRegistro[] => [
  { etiqueta: 'Valor total', valor: monto(valor.valorTotal) },
  { etiqueta: 'Origen', valor: formatearOpcion(OPCIONES_DE_ORIGEN, valor.origen) },
  { etiqueta: 'Terreno', valor: monto(valor.valorTerreno) },
  { etiqueta: 'Construcciones', valor: monto(valor.valorConstrucciones) },
  { etiqueta: 'Cultivos permanentes', valor: monto(valor.valorCultivosPermanentes) },
  ...(valor.fuente === 'matricula_fiscal'
    ? [
        {
          etiqueta: 'Categoría del IUSI',
          valor: formatearOpcion(OPCIONES_DE_CATEGORIA_DE_IUSI, valor.categoriaIusi),
        },
      ]
    : []),
  { etiqueta: 'Documento', valor: formatearTexto(valor.documento) },
];
