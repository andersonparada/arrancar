import { describe, expect, it } from 'vitest';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import {
  cambiaElTope,
  cuerpoDeEdicionDelFondo,
  edicionDeDatosDelFondo,
  faltaDelFondo,
} from './edicion-de-datos-del-fondo';

const fondo = {
  nombre: 'Caja de la finca',
  localidadId: 'l-1',
  topePorComprobante: '300.00',
  cuentaBancariaId: 'c-1',
} as Fondo;

describe('edición de los datos del fondo', () => {
  it('parte de lo que el fondo tiene hoy', () => {
    expect(edicionDeDatosDelFondo(fondo)).toEqual({
      nombre: 'Caja de la finca',
      localidadId: 'l-1',
      tope: '300.00',
      cuentaBancariaId: 'c-1',
      motivo: '',
    });
  });

  it('el tope igual al de hoy, aunque se escriba distinto, no cuenta como cambio y no manda motivo', () => {
    const edicion = { ...edicionDeDatosDelFondo(fondo), tope: 300, motivo: 'No hace falta' };
    expect(cambiaElTope(edicion, fondo)).toBe(false);
    expect(cuerpoDeEdicionDelFondo(edicion, fondo).motivo).toBeNull();
  });

  it('con otro tope manda el motivo escrito', () => {
    const edicion = { ...edicionDeDatosDelFondo(fondo), tope: '500', motivo: ' Subieron los precios ' };
    expect(cuerpoDeEdicionDelFondo(edicion, fondo)).toMatchObject({
      topePorComprobante: '500',
      motivo: 'Subieron los precios',
    });
  });

  it('vaciar el tope, la localidad o la cuenta los limpia en el servidor', () => {
    const edicion = { ...edicionDeDatosDelFondo(fondo), tope: '', localidadId: null, cuentaBancariaId: null };
    expect(cuerpoDeEdicionDelFondo(edicion, fondo)).toMatchObject({
      topePorComprobante: null,
      localidadId: null,
      cuentaBancariaId: null,
    });
    expect(cambiaElTope(edicion, fondo)).toBe(true);
  });

  it('sin nombre dice qué falta', () => {
    expect(faltaDelFondo({ ...edicionDeDatosDelFondo(fondo), nombre: '  ' }).nombre).toMatch(/nombre/);
    expect(faltaDelFondo(edicionDeDatosDelFondo(fondo))).toEqual({});
  });
});
