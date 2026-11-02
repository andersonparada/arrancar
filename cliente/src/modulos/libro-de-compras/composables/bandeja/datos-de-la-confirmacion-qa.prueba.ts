import { describe, expect, it } from 'vitest';
import type { ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import { separarVistaPrevia } from './datos-de-la-confirmacion';

describe('hallazgo del QA en el navegador (2026-11-01)', () => {
  /**
   * El servidor crea el proveedor al confirmar, pero la vista previa responde `dte_sin_proveedor` para un DTE de
   * proveedor nuevo: la ventana lo trata como error y «Registrar» queda en 0, así que ese DTE nunca se confirma.
   */
  it.fails('un DTE de proveedor nuevo no impide confirmarlo', () => {
    const resultados = [
      { id: 'a', error: { codigo: 'dte_sin_proveedor', mensaje: 'El proveedor de este DTE aún no existe.' } },
    ] as unknown as ResultadoDeVistaPrevia[];

    const { listas, conError } = separarVistaPrevia(resultados);

    expect(listas.map(({ id }) => id)).toEqual(['a']);
    expect(conError).toEqual([]);
  });
});
