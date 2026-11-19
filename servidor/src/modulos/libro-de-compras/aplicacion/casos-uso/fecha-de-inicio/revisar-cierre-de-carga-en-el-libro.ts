import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';

/** `aaaa-mm-dd`, de una fecha que ya viene validada por Empresas. */
const PARTES_DE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * La revisión del Libro de compras al cerrar la carga inicial: si la fecha de inicio no es día 1, el mes de esa fecha
 * queda partido (las compras anteriores no están en el libro de Arrancar). Con día 1 no tiene nada que decir.
 *
 * El texto lo arma este módulo y no Empresas a propósito: con el Libro de compras apagado la frase sería falsa.
 */
export class RevisarCierreDeCargaEnElLibro {
  /** @returns `null` si la fecha de inicio es día 1. */
  ejecutar({ fechaDeInicio }: { fechaDeInicio: string }): RevisionDeCierreDeModulo | null {
    const [, anio, mes, dia] = PARTES_DE_FECHA.exec(fechaDeInicio) ?? [];
    if (!anio || !mes || !dia || Number(dia) === 1) return null;
    const ultimoDiaAnterior = Number(dia) - 1;
    return {
      nombreDelModulo: 'Libro de compras',
      resumen: null,
      ruta: null,
      hallazgos: [
        {
          codigo: 'mes_partido',
          nivel: 'aviso',
          mensaje:
            `El mes de ${mes}/${anio} queda partido: las compras del 1 al ${ultimoDiaAnterior} no están en el Libro de ` +
            'compras de Arrancar; la declaración de ese mes debe sumarlas.',
          registro: null,
        },
      ],
      cifras: [],
    };
  }
}
