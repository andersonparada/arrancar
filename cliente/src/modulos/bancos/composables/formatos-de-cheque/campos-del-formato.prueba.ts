import { describe, expect, it } from 'vitest';
import { copiaDelFormato } from './ajustes-de-formato';
import {
  conModoDeFecha,
  entradasDelFormato,
  leerCampo,
  ponerCampo,
  ponerComprobante,
  ponerSegundoRenglon,
} from './campos-del-formato';
import { formatoDeEjemplo } from './ejemplos-de-formato';

describe('entradasDelFormato', () => {
  it('con la fecha en texto ofrece un solo campo de fecha y los cuatro del talón como opcionales', () => {
    const entradas = entradasDelFormato(formatoDeEjemplo());
    expect(entradas.filter((e) => e.grupo === 'fecha').map((e) => e.clave)).toEqual(['fecha.lugarYFecha']);
    expect(entradas.filter((e) => e.grupo === 'talon').every((e) => e.opcional)).toBe(true);
  });

  it('con casillas ofrece lugar, día, mes y año', () => {
    const formato = conModoDeFecha(formatoDeEjemplo(), 'casillas');
    expect(
      entradasDelFormato(formato)
        .filter((e) => e.grupo === 'fecha')
        .map((e) => e.clave),
    ).toEqual(['fecha.lugar', 'fecha.dia', 'fecha.mes', 'fecha.anio']);
  });

  it('las dos leyendas dejan elegir «ya viene impreso» y no hay campo libre', () => {
    const entradas = entradasDelFormato(formatoDeEjemplo());
    expect(entradas.filter((e) => e.conPreimpreso).map((e) => e.clave)).toEqual(['noNegociable', 'paraAbonoEnCuenta']);
    expect(entradas.map((e) => e.clave)).not.toContain('texto');
  });
});

describe('leerCampo y ponerCampo', () => {
  it('lee por ruta y un opcional sin usar es null', () => {
    const formato = formatoDeEjemplo();
    expect(leerCampo(formato, 'beneficiario')?.xMm).toBe(25);
    expect(leerCampo(formato, 'talonFecha')).toBeNull();
  });

  it('al poner un talón le da un lugar visible y al quitarlo lo deja en null', () => {
    const formato = copiaDelFormato(formatoDeEjemplo());
    ponerCampo(formato, 'talonMonto', true);
    expect(leerCampo(formato, 'talonMonto')).toMatchObject({ visible: true, alineacion: 'izquierda' });
    ponerCampo(formato, 'talonMonto', false);
    expect(formato.talonMonto).toBeNull();
  });
});

describe('segundo renglón, comprobante y modo de la fecha', () => {
  it('el segundo renglón va debajo del primero y del mismo ancho', () => {
    const formato = copiaDelFormato(formatoDeEjemplo());
    ponerSegundoRenglon(formato, false);
    expect(formato.montoEnLetras.segundaLinea).toBeNull();
    ponerSegundoRenglon(formato, true);
    expect(formato.montoEnLetras.segundaLinea).toEqual({ xMm: 25, yMm: 40, anchoMm: 145 });
  });

  it('el comprobante dentro de la hoja ocupa la parte de abajo', () => {
    const formato = copiaDelFormato(formatoDeEjemplo());
    ponerComprobante(formato, true);
    expect(formato.comprobante?.yMm).toBeGreaterThan(0);
    ponerComprobante(formato, false);
    expect(formato.comprobante).toBeNull();
  });

  it('cambiar el modo y volver conserva el renglón de la fecha', () => {
    const casillas = conModoDeFecha(formatoDeEjemplo(), 'casillas');
    expect(casillas.fecha.modo === 'casillas' && casillas.fecha.dia.yMm).toBe(12);
    const texto = conModoDeFecha(casillas, 'texto');
    expect(texto.fecha.modo === 'texto' && texto.fecha.lugarYFecha.yMm).toBe(12);
    expect(conModoDeFecha(texto, 'texto')).toBe(texto);
  });
});
