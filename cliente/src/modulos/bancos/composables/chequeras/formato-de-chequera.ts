import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { FormatoDeChequera, Chequera } from '../../servicios/chequeras.api';
import type { FormatoDeChequeGuardado, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';
import { CLAVES_DE_PLANTILLA } from '../../servicios/tipos-de-formatos-de-cheque';
import { ordenarFormatos } from '../formatos-de-cheque/edicion-de-formato-de-cheque';

/** Lo que vale el selector: nada, un formato de la cuenta (`formato:<id>`) o una plantilla de fábrica (`plantilla:<clave>`). */
export const SIN_FORMATO = '';

/** El valor del selector que corresponde a lo que la chequera ya tiene. */
export function valorDelFormatoDeChequera(chequera: Pick<Chequera, 'formatoDeChequeId' | 'plantillaDeCheque'>): string {
  if (chequera.formatoDeChequeId) return `formato:${chequera.formatoDeChequeId}`;
  if (chequera.plantillaDeCheque) return `plantilla:${chequera.plantillaDeCheque}`;
  return SIN_FORMATO;
}

/** Lo que se manda al servidor para ese valor del selector (una cosa o la otra, nunca las dos). */
export function formatoDeChequeraDeValor(valor: string): FormatoDeChequera {
  const [tipo, resto] = valor.split(':');
  if (tipo === 'formato' && resto) return { formatoDeChequeId: resto, plantillaDeCheque: null };
  const plantilla = CLAVES_DE_PLANTILLA.find((clave) => clave === resto);
  if (tipo === 'plantilla' && plantilla) return { formatoDeChequeId: null, plantillaDeCheque: plantilla };
  return { formatoDeChequeId: null, plantillaDeCheque: null };
}

/**
 * Las opciones para elegir con qué se imprimen los cheques: «sin formato», los formatos activos de la cuenta por nombre
 * (más el que la chequera ya usa aunque esté inactivo) y las plantillas de fábrica.
 */
export function opcionesDeFormatoDeChequera(
  formatos: readonly FormatoDeChequeGuardado[],
  plantillas: readonly PlantillaDeCheque[],
  actual: string,
): OpcionBuscable<string>[] {
  const visibles = formatos.filter((formato) => formato.activo || `formato:${formato.id}` === actual);
  return [
    { valor: SIN_FORMATO, texto: 'Sin formato (no se podrán imprimir sus cheques)' },
    ...ordenarFormatos(visibles).map((formato) => ({
      valor: `formato:${formato.id}`,
      texto: formato.activo ? formato.nombre : `${formato.nombre} (inactivo)`,
      grupo: 'Formatos de la cuenta',
    })),
    ...ordenarFormatos(plantillas).map((plantilla) => ({
      valor: `plantilla:${plantilla.clave}`,
      texto: plantilla.nombre,
      grupo: 'Plantillas de fábrica (sin ajustes)',
    })),
  ];
}

/** Lo que la tarjeta de la chequera dice de cómo se imprimen sus cheques. */
export function textoDelFormatoDeChequera(
  chequera: Pick<Chequera, 'formatoNombre' | 'plantillaDeCheque'>,
  plantillas: readonly PlantillaDeCheque[] = [],
): string {
  if (chequera.formatoNombre) return chequera.formatoNombre;
  if (!chequera.plantillaDeCheque) return 'Sin formato';
  const nombre = plantillas.find((plantilla) => plantilla.clave === chequera.plantillaDeCheque)?.nombre;
  return `${nombre ?? chequera.plantillaDeCheque.replaceAll('_', ' ')} (de fábrica)`;
}
