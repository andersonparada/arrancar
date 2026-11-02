import { describe, expect, it } from 'vitest';
import { partirNombreDePersona, propuestaDeProveedorNuevo } from './propuesta-de-proveedor-nuevo.js';

describe('partir el nombre de una persona', () => {
  it('formato del RTU: apellidos y nombres separados por comas', () => {
    expect(partirNombreDePersona('PARADA,ALVIZURES,,ANDERSON,MAGDIEL')).toEqual({
      nombres: 'ANDERSON MAGDIEL',
      apellidos: 'PARADA ALVIZURES',
    });
  });

  it('formato del RTU con apellido de casada y un solo nombre', () => {
    expect(partirNombreDePersona('LOPEZ,PEREZ,GOMEZ,MARIA,')).toEqual({
      nombres: 'MARIA',
      apellidos: 'LOPEZ PEREZ DE GOMEZ',
    });
    expect(partirNombreDePersona('LOPEZ,,DE GOMEZ,MARIA,').apellidos).toBe('LOPEZ DE GOMEZ');
  });

  it('una coma: NOMBRES , APELLIDOS, con o sin espacios alrededor', () => {
    const esperado = { nombres: 'RONALD ABEL', apellidos: 'PENSAMIENTO MONTES' };
    expect(partirNombreDePersona('RONALD ABEL , PENSAMIENTO MONTES')).toEqual(esperado);
    expect(partirNombreDePersona('RONALD ABEL,PENSAMIENTO MONTES')).toEqual(esperado);
  });

  it.each([
    ['ANDERSON MAGDIEL PARADA ALVIZURES', 'ANDERSON MAGDIEL', 'PARADA ALVIZURES'],
    ['ANA DE LEON', 'ANA', 'DE LEON'],
    ['SOY FETICHE', 'SOY', 'FETICHE'],
    ['MARIA DE LOS ANGELES GARCIA', 'MARIA', 'DE LOS ANGELES GARCIA'],
    ['JUAN PEREZ LOPEZ', 'JUAN', 'PEREZ LOPEZ'],
    ['MARIA LOPEZ VDA. DE PEREZ', 'MARIA', 'LOPEZ VDA. DE PEREZ'],
    ['ANA MARIA DE LA CRUZ SOTO', 'ANA MARIA', 'DE LA CRUZ SOTO'],
  ])('sin coma, por palabras: %s', (nombre, nombres, apellidos) => {
    expect(partirNombreDePersona(nombre)).toEqual({ nombres, apellidos });
  });

  it('una sola palabra son nombres, sin apellidos', () => {
    expect(partirNombreDePersona('CUAUHTEMOC')).toEqual({ nombres: 'CUAUHTEMOC', apellidos: null });
  });

  it('quita espacios repetidos y conserva la escritura del DTE', () => {
    expect(partirNombreDePersona('  Juan   Carlos  Pérez ')).toEqual({ nombres: 'Juan', apellidos: 'Carlos Pérez' });
    expect(partirNombreDePersona('PARADA ALVIZURES  ANDERSON MAGDIEL')).toEqual({
      nombres: 'PARADA ALVIZURES',
      apellidos: 'ANDERSON MAGDIEL',
    });
  });

  it('una coma con un lado vacío o más comas sin formato conocido se parte por palabras', () => {
    expect(partirNombreDePersona('PEREZ LOPEZ,')).toEqual({ nombres: 'PEREZ', apellidos: 'LOPEZ' });
    expect(partirNombreDePersona('A,B,C')).toEqual({ nombres: 'A', apellidos: 'B C' });
  });
});

describe('propuesta de proveedor nuevo', () => {
  it('una empresa se propone jurídica con su razón social sin espacios repetidos', () => {
    const propuesta = propuestaDeProveedorNuevo('AGRO  DEL NORTE,   S.A.');

    expect(propuesta.tipoDePersona).toBe('juridica');
    expect(propuesta.juridica).toEqual({ razonSocial: 'AGRO DEL NORTE, S.A.' });
  });

  it('una persona se propone individual y trae también la forma jurídica', () => {
    expect(propuestaDeProveedorNuevo('RONALD ABEL , PENSAMIENTO MONTES')).toEqual({
      tipoDePersona: 'individual',
      individual: { nombres: 'RONALD ABEL', apellidos: 'PENSAMIENTO MONTES' },
      juridica: { razonSocial: 'RONALD ABEL , PENSAMIENTO MONTES' },
    });
  });

  it('una fundación inglesa es jurídica', () => {
    expect(propuestaDeProveedorNuevo('GATES FOUNDATION').tipoDePersona).toBe('juridica');
  });
});
