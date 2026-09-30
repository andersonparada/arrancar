import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { textoDeTasa } from '../vigencias-de-combustible/reglas-de-vigencia-de-combustible';

/** Lo que muestra la tarjeta del combustible: su tasa vigente, o que no tiene. Sin permiso de ver tasas, nada. */
export const detallesDeCombustible = (
  vigente: VigenciaDeCombustible | null,
  puedeVerTasas: boolean,
): DetalleDeRegistro[] =>
  puedeVerTasas
    ? [
        {
          etiqueta: 'Tasa vigente de IDP',
          valor: vigente
            ? `${textoDeTasa(vigente)}, desde ${formatearFecha(vigente.vigenteDesde)}`
            : 'Sin tasa vigente',
        },
      ]
    : [];
