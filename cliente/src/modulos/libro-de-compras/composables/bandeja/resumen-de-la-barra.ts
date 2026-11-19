import type { DteRecibido } from '../../servicios/dte-recibidos.api';
import { seRegistraSegunLaSat, totalConSigno } from './criterio-de-registro';
import { faltantesDeLaFila } from './datos-de-la-bandeja';

/** Lo marcado visto con el mismo criterio que «Confirmar»: lo que se registraría y por cuánto. */
export interface ResumenDeLaBarra {
  marcados: number;
  registrables: number;
  noSeRegistran: number;
  /** Con signo: las notas de crédito restan y las de débito suman. */
  total: string;
  /** Pendientes a las que todavía les falta completar algo antes de confirmar. */
  conFaltantes: number;
}

export function resumenDeLaBarra(filas: readonly DteRecibido[]): ResumenDeLaBarra {
  const registrables = filas.filter(({ estadoSat }) => seRegistraSegunLaSat(estadoSat));
  return {
    marcados: filas.length,
    registrables: registrables.length,
    noSeRegistran: filas.length - registrables.length,
    total: totalConSigno(registrables),
    conFaltantes: filas.filter((fila) => faltantesDeLaFila(fila).length > 0).length,
  };
}

const plural = (cantidad: number, singular: string, pluralDe: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

/** Las partes de la frase de la barra; el monto lo pone la barra con el formato de la empresa. */
export interface FraseDeLaBarra {
  marcados: string;
  /** «se registrarán 15 por»; vacío si ninguno se registra. */
  seRegistran: string;
  conMonto: boolean;
  noSeRegistran: string;
}

/** «17 marcados: se registrarán 15 por Q 9,524.06 (2 no se registran)». */
export function fraseDeLaBarra(resumen: ResumenDeLaBarra): FraseDeLaBarra {
  const { marcados, registrables, noSeRegistran } = resumen;
  const sinRegistro = noSeRegistran
    ? ` (${noSeRegistran} ${noSeRegistran === 1 ? 'no se registra' : 'no se registran'})`
    : '';
  return {
    marcados: plural(marcados, 'marcado', 'marcados'),
    seRegistran: registrables ? `se ${registrables === 1 ? 'registrará' : 'registrarán'} ${registrables} por` : '',
    conMonto: registrables > 0,
    noSeRegistran: registrables ? sinRegistro : ' (ninguno se puede registrar)',
  };
}
