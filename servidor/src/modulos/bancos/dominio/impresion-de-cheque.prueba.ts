import { describe, expect, it } from 'vitest';
import {
  BeneficiarioNoCabe,
  CampoDelFormatoFaltante,
  MontoEnLetrasNoCabe,
  MontoEnNumerosNoCabe,
} from './errores-de-impresion.js';
import { armarCheque, type CampoArmado, type DatosParaImprimir } from './impresion-de-cheque.js';
import { plantillaDeFabrica } from './formatos-de-cheque/plantillas.js';
import type { FormatoDeCheque } from './formatos-de-cheque/tipos.js';
import { capacidadDeRenglon } from './formatos-de-cheque/texto-del-cheque.js';

const suelto = (): FormatoDeCheque => structuredClone(plantillaDeFabrica('cheque_suelto').formato);

const datos = (cambios: Partial<DatosParaImprimir> = {}): DatosParaImprimir => ({
  fecha: '2026-11-18',
  lugar: 'Guatemala',
  beneficiario: 'JUAN PÉREZ LÓPEZ',
  montoCentavos: 112000,
  concepto: 'Compra de insumos',
  noNegociable: true,
  paraAbonoEnCuenta: false,
  ...cambios,
});

const campo = (formato: FormatoDeCheque, clave: string, cambios: Partial<DatosParaImprimir> = {}): CampoArmado =>
  armarCheque(formato, datos(cambios)).campos.find((c) => c.clave === clave)!;

const claves = (formato: FormatoDeCheque, cambios: Partial<DatosParaImprimir> = {}) =>
  armarCheque(formato, datos(cambios)).campos.map((c) => c.clave);

describe('la fecha del cheque', () => {
  it('en texto lleva el lugar y la fecha con el día sin ceros', () => {
    expect(campo(suelto(), 'fecha').texto).toBe('Guatemala, 18 de noviembre de 2026');
    expect(campo(suelto(), 'fecha', { fecha: '2026-09-01' }).texto).toBe('Guatemala, 1 de septiembre de 2026');
    expect(campo(suelto(), 'fecha', { fecha: '2026-12-31', lugar: 'Escuintla' }).texto).toBe(
      'Escuintla, 31 de diciembre de 2026',
    );
  });

  it('un posfechado imprime su fecha real, no la de hoy', () => {
    expect(campo(suelto(), 'fecha', { fecha: '2027-03-05' }).texto).toBe('Guatemala, 5 de marzo de 2027');
  });

  it('en casillas pone día y mes con dos dígitos y el año con cuatro, cada uno en la suya', () => {
    const casillas = plantillaDeFabrica('cheque_suelto_casillas').formato;

    const dia1mes9 = armarCheque(casillas, datos({ fecha: '2026-09-01' })).campos;
    const treintayuno = armarCheque(casillas, datos({ fecha: '2026-12-31' })).campos;

    const texto = (campos: CampoArmado[], clave: string) => campos.find((c) => c.clave === clave)?.texto;
    expect(['dia', 'mes', 'anio', 'lugar'].map((clave) => texto(dia1mes9, clave))).toEqual([
      '01',
      '09',
      '2026',
      'Guatemala',
    ]);
    expect(['dia', 'mes', 'anio'].map((clave) => texto(treintayuno, clave))).toEqual(['31', '12', '2026']);
    expect(dia1mes9.find((c) => c.clave === 'fecha')).toBeUndefined();
  });
});

describe('el beneficiario', () => {
  it('va pegado a la izquierda y lleno de asteriscos hasta el final del renglón', () => {
    const { texto } = campo(suelto(), 'beneficiario');

    const capacidad = capacidadDeRenglon(105, 10);
    expect(texto).toHaveLength(capacidad);
    expect(texto.startsWith('JUAN PÉREZ LÓPEZ*')).toBe(true);
    expect(texto.replace(/\*+$/, '')).toBe('JUAN PÉREZ LÓPEZ');
  });

  it('un nombre largo baja el tamaño de la letra y el relleno se calcula con el tamaño final', () => {
    const nombre = 'AGROPECUARIA Y SERVICIOS INTEGRALES DEL ALTIPLANO OCCIDENTAL';

    const beneficiario = campo(suelto(), 'beneficiario', { beneficiario: nombre });

    expect(beneficiario.tamanoPt).toBeLessThan(10);
    expect(beneficiario.tamanoPt).toBeGreaterThanOrEqual(7);
    expect(beneficiario.texto).toHaveLength(capacidadDeRenglon(105, beneficiario.tamanoPt));
    expect(beneficiario.texto.startsWith(`${nombre}*`)).toBe(true);
  });

  it('si el nombre llena el renglón exacto, también baja el tamaño: siempre queda un asterisco', () => {
    const exacto = 'X'.repeat(capacidadDeRenglon(105, 10));

    const beneficiario = campo(suelto(), 'beneficiario', { beneficiario: exacto });

    expect(beneficiario.tamanoPt).toBeLessThan(10);
    expect(beneficiario.texto.endsWith('*')).toBe(true);
  });

  it('un nombre que no cabe ni con 7 pt no se corta', () => {
    const demasiado = 'NOMBRE MUY LARGO '.repeat(8);

    expect(() => armarCheque(suelto(), datos({ beneficiario: demasiado }))).toThrow(BeneficiarioNoCabe);
  });
});

describe('el monto en números', () => {
  it('es Q, asteriscos y la cifra pegada al borde derecho', () => {
    const { texto } = campo(suelto(), 'montoEnNumeros');

    expect(texto).toHaveLength(capacidadDeRenglon(35, 10));
    expect(texto).toMatch(/^Q\*+1,120\.00$/);
  });

  it('usa centavos enteros: miles, millones y centavos exactos', () => {
    const monto = (montoCentavos: number) => campo(suelto(), 'montoEnNumeros', { montoCentavos }).texto;

    expect(monto(5)).toMatch(/^Q\*+0\.05$/);
    expect(monto(100000100)).toMatch(/^Q\*+1,000,001\.00$/);
  });

  it('una cifra que no deja ni un asterisco no cabe', () => {
    expect(() => armarCheque(suelto(), datos({ montoCentavos: 99_999_999_999_999 }))).toThrow(MontoEnNumerosNoCabe);
  });
});

describe('el monto en letras', () => {
  it('cabe en el primer renglón: lo rellena y llena entero de asteriscos el segundo', () => {
    const cheque = armarCheque(suelto(), datos());

    const primero = cheque.campos.find((c) => c.clave === 'montoEnLetras')!;
    const segundo = cheque.campos.find((c) => c.clave === 'montoEnLetras2')!;
    expect(primero.texto.startsWith('MIL CIENTO VEINTE QUETZALES CON 00/100*')).toBe(true);
    expect(primero.texto).toHaveLength(capacidadDeRenglon(145, 10));
    expect(segundo.texto).toBe('*'.repeat(capacidadDeRenglon(145, 10)));
  });

  it('si no cabe, parte entre palabras: llena el hueco del primero y termina el segundo con asteriscos', () => {
    const formato = suelto();
    formato.montoEnLetras = { ...formato.montoEnLetras, anchoMm: 70 };
    const capacidad = capacidadDeRenglon(70, 10);

    const cheque = armarCheque(formato, datos({ montoCentavos: 123456789 }));

    const primero = cheque.campos.find((c) => c.clave === 'montoEnLetras')!.texto;
    const segundo = cheque.campos.find((c) => c.clave === 'montoEnLetras2')!.texto;
    expect(primero).toHaveLength(capacidad);
    expect(primero).toMatch(/^UN MILLÓN DOSCIENTOS TREINTA Y\*+$/);
    expect(primero.endsWith('*')).toBe(true);
    expect(segundo.startsWith('CUATRO MIL QUINIENTOS')).toBe(true);
    expect(segundo.endsWith('*')).toBe(true);
    expect(`${primero.replace(/\*+$/, '')} ${segundo.replace(/\*+$/, '')}`).toBe(
      'UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE QUETZALES CON 89/100',
    );
  });

  it('sin segundo renglón, el primero deja al menos un asterisco', () => {
    const formato = suelto();
    formato.montoEnLetras = { ...formato.montoEnLetras, segundaLinea: null };

    const { texto } = campo(formato, 'montoEnLetras');

    expect(texto.endsWith('*')).toBe(true);
    expect(claves(formato)).not.toContain('montoEnLetras2');
  });

  it('un monto que no cabe en los renglones del formato no se imprime cortado', () => {
    expect(() => armarCheque(suelto(), datos({ montoCentavos: 99_999_999_999_999 }))).toThrow(/no cabe/);
    const formato = suelto();
    formato.montoEnLetras = { ...formato.montoEnLetras, segundaLinea: null };
    expect(() => armarCheque(formato, datos({ montoCentavos: 123456789 }))).toThrow(MontoEnLetrasNoCabe);
  });
});

describe('NO NEGOCIABLE', () => {
  it('se dibuja si el cheque lo es y el formulario no lo trae impreso', () => {
    expect(campo(suelto(), 'noNegociable').texto).toBe('NO NEGOCIABLE');
    expect(claves(suelto(), { noNegociable: false })).not.toContain('noNegociable');
  });

  it('con el formulario que ya lo trae no se dibuja; si el cheque es negociable, avisa sin bloquear', () => {
    const formato = suelto();
    formato.noNegociable = { ...formato.noNegociable, preimpreso: true };

    expect(claves(formato)).not.toContain('noNegociable');
    expect(armarCheque(formato, datos()).avisos).toEqual([]);
    expect(armarCheque(formato, datos({ noNegociable: false })).avisos).toEqual([
      'Este formulario ya trae NO NEGOCIABLE impreso: el cheque no podrá negociarse aunque se haya emitido negociable.',
    ]);
  });
});

describe('PARA ABONO EN CUENTA', () => {
  it('se dibuja solo si el cheque la lleva', () => {
    expect(claves(suelto())).not.toContain('paraAbonoEnCuenta');
    expect(campo(suelto(), 'paraAbonoEnCuenta', { paraAbonoEnCuenta: true }).texto).toBe('PARA ABONO EN CUENTA');
  });

  it('con el formulario que ya la trae no se dibuja; sin la casilla en el cheque, avisa sin bloquear', () => {
    const formato = suelto();
    formato.paraAbonoEnCuenta = { ...formato.paraAbonoEnCuenta, preimpreso: true };

    expect(claves(formato, { paraAbonoEnCuenta: true })).not.toContain('paraAbonoEnCuenta');
    expect(armarCheque(formato, datos({ paraAbonoEnCuenta: true })).avisos).toEqual([]);
    expect(armarCheque(formato, datos()).avisos[0]).toContain('ya trae PARA ABONO EN CUENTA impreso');
  });

  it('si el cheque la lleva y el formato no tiene dónde ponerla, no se imprime en silencio', () => {
    const formato = suelto();
    formato.paraAbonoEnCuenta = { ...formato.paraAbonoEnCuenta, visible: false };

    expect(() => armarCheque(formato, datos({ paraAbonoEnCuenta: true }))).toThrow(CampoDelFormatoFaltante);
    expect(() => armarCheque(formato, datos())).not.toThrow();
  });
});

describe('lo que lleva la cara del cheque', () => {
  it('solo los campos de la lista cerrada: nada de «posfechado» ni de concepto', () => {
    const cheque = armarCheque(suelto(), datos({ fecha: '2027-03-05', concepto: 'Páguese a partir del 5 de marzo' }));

    expect(cheque.campos.map((c) => c.clave)).toEqual([
      'fecha',
      'beneficiario',
      'montoEnNumeros',
      'montoEnLetras',
      'montoEnLetras2',
      'noNegociable',
    ]);
    expect(JSON.stringify(cheque).toLowerCase()).not.toContain('posfechado');
    expect(JSON.stringify(cheque)).not.toContain('Páguese');
  });

  it('el talón sí dice el concepto, porque es de la empresa', () => {
    const formato = plantillaDeFabrica('voucher_carta_en_medio').formato;

    const talon = armarCheque(formato, datos()).campos.filter((c) => c.clave.startsWith('talon'));

    expect(talon.map((c) => c.texto)).toEqual(['18/11/2026', 'JUAN PÉREZ LÓPEZ', 'Q 1,120.00', 'Compra de insumos']);
  });

  it('un campo no visible no se dibuja', () => {
    const formato = suelto();
    formato.beneficiario = { ...formato.beneficiario, visible: false };

    expect(claves(formato)).not.toContain('beneficiario');
  });
});
