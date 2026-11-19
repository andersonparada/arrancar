/**
 * Lo que dejó la QA de CP4-12 (`docs/modulos/informe-qa-cp4-12-2026-11-18.md`): la adenda del posfechado (A.1 y A.5) pide
 * los mismos cinco nombres de estado de pago en la lista, la ficha, la contraseña y R2, en masculino, en un diccionario
 * único. Hoy la lista, la ficha del documento y la contraseña dicen «Sin pagar», «Pagada en parte», «Comprometida en
 * parte», «Comprometida» y «Pagada», y R2 «Pendiente», «Pagado en parte», «Comprometido en parte», «Comprometido» y
 * «Pagado». La prueba `it.fails` pasa mientras sigan distintos; al unificarlos, quitar `.fails`.
 */

import { describe, expect, it } from 'vitest';
import type { EstadoDePago } from '../servicios/tipos-de-pagos';
import { nombreDelEstadoDePago } from './pagos/detalles-de-pago';
import { TEXTOS_DE_ESTADO_DE_PAGO } from './reportes/vistas-de-documentos';

const ESTADOS: EstadoDePago[] = ['pendiente', 'en_parte', 'comprometido_en_parte', 'comprometido', 'pagado'];

describe('los nombres de los cinco estados de pago', () => {
  it('R2 usa los nombres de la adenda, en masculino', () => {
    expect(ESTADOS.map((estado) => TEXTOS_DE_ESTADO_DE_PAGO[estado])).toEqual([
      'Pendiente',
      'Pagado en parte',
      'Comprometido en parte',
      'Comprometido',
      'Pagado',
    ]);
  });

  it.fails('la lista, la ficha y la contraseña dicen lo mismo que R2', () => {
    expect(ESTADOS.map(nombreDelEstadoDePago)).toEqual(ESTADOS.map((estado) => TEXTOS_DE_ESTADO_DE_PAGO[estado]));
  });
});
