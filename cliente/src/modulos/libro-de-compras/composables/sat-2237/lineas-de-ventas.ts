import type { CifraDeVentas, RemanentesDeRetenciones, RespuestaDeVentas } from '../../servicios/sat-2237.api';
import { SECCION_DE_VENTAS as textos } from '../../textos-del-sat-2237';

export interface LineaDeRemanente {
  etiqueta: string;
  /** Monto con dos decimales, como lo manda el servidor. */
  valor: string;
  /** Lo que se traslada o se paga: se resalta. */
  destacada: boolean;
}

/** Todas las cifras que respondieron los módulos de ventas, en el orden en que llegaron. */
export const cifrasDeVentas = (respuestas: RespuestaDeVentas[]): CifraDeVentas[] =>
  respuestas.flatMap((respuesta) => respuesta.cifras);

/** Las líneas del remanente con los nombres del formulario: retenciones en el SAT-2237, constancias en el SAT-2046. */
export function lineasDeRemanente(remanentes: RemanentesDeRetenciones): LineaDeRemanente[] {
  const nombres = remanentes.formulario === 'SAT-2046' ? textos.constancias : textos.retenciones;
  return [
    { etiqueta: nombres.delPeriodo, valor: remanentes.retencionesDelPeriodo, destacada: false },
    { etiqueta: nombres.anterior, valor: remanentes.remanenteAnterior, destacada: false },
    { etiqueta: nombres.impuestoDelMes, valor: remanentes.impuestoDelMes, destacada: false },
    { etiqueta: textos.impuestoAPagar, valor: remanentes.impuestoAPagar, destacada: true },
    { etiqueta: nombres.alSiguiente, valor: remanentes.remanenteAlSiguiente, destacada: true },
  ];
}
