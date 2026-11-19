import { describe, expect, it } from 'vitest';
import type { CampoArmado } from '../../servicios/tipos-de-formatos-de-cheque';
import { conModoDeFecha } from './campos-del-formato';
import { formatoDeEjemplo } from './ejemplos-de-formato';
import {
  altoDeRenglonMm,
  cajasDelFormato,
  escalaParaAncho,
  estiloDeLaHoja,
  estiloDelCampo,
  marcasDeRegla,
  PIXELES_POR_MM,
  reglaDePagina,
} from './estilos-de-impresion-de-cheque';

const campo: CampoArmado = {
  clave: 'beneficiario',
  xMm: 25,
  yMm: 24,
  anchoMm: 105,
  tamanoPt: 10,
  alineacion: 'izquierda',
  texto: 'JUAN PÉREZ*****',
};

describe('reglaDePagina y estiloDeLaHoja', () => {
  it('el papel del cheque sale a su medida y sin márgenes', () => {
    expect(reglaDePagina({ anchoMm: 175, altoMm: 76 })).toBe('@page { size: 175mm 76mm; margin: 0; }');
    expect(reglaDePagina({ anchoMm: 215.9, altoMm: 279.4 }, 'carta')).toBe(
      '@page carta { size: 215.9mm 279.4mm; margin: 0; }',
    );
  });

  it('la hoja mide lo mismo en pantalla y al imprimir su alto lleva una holgura de 0.2 mm', () => {
    expect(estiloDeLaHoja({ anchoMm: 175, altoMm: 76 })).toEqual({
      width: '175mm',
      height: '76mm',
      '--alto-impresion': '75.8mm',
    });
  });
});

describe('estiloDelCampo', () => {
  it('pone el campo en milímetros y suma el desplazamiento de la impresora', () => {
    const estilo = estiloDelCampo(campo, { xMm: 1.5, yMm: -0.5 });
    expect(estilo).toMatchObject({
      left: '26.5mm',
      top: '23.5mm',
      width: '105mm',
      fontSize: '10pt',
      textAlign: 'left',
    });
  });

  it('el monto va pegado a la derecha y las casillas centradas', () => {
    const origen = { xMm: 0, yMm: 0 };
    expect(estiloDelCampo({ ...campo, alineacion: 'derecha' }, origen).textAlign).toBe('right');
    expect(estiloDelCampo({ ...campo, alineacion: 'centro' }, origen).textAlign).toBe('center');
  });

  it('usa letra monoespaciada', () => {
    expect(estiloDelCampo(campo, { xMm: 0, yMm: 0 }).fontFamily).toContain('monospace');
  });

  it('el renglón de 10 pt mide unos 4.2 mm', () => {
    expect(altoDeRenglonMm(10)).toBeCloseTo(4.23, 2);
  });
});

describe('escalaParaAncho', () => {
  it('achica una hoja ancha para que quepa en la pantalla', () => {
    expect(escalaParaAncho(200, 400)).toBeCloseTo(400 / (200 * PIXELES_POR_MM), 5);
  });

  it('nunca agranda más del máximo y sin ancho disponible no escala', () => {
    expect(escalaParaAncho(10, 10000)).toBe(2);
    expect(escalaParaAncho(100, 0)).toBe(1);
  });
});

describe('marcasDeRegla', () => {
  it('marca cada separación hasta el borde, empezando en cero', () => {
    expect(marcasDeRegla(35, 10).map((m) => m.mm)).toEqual([0, 10, 20, 30]);
  });

  it('una separación que no sirve se cambia por 10 mm', () => {
    expect(marcasDeRegla(25, 0).map((m) => m.mm)).toEqual([0, 10, 20]);
  });
});

describe('cajasDelFormato', () => {
  it('trae un rectángulo por cada campo usado, con el segundo renglón de las letras', () => {
    const claves = cajasDelFormato(formatoDeEjemplo()).map((caja) => caja.clave);
    expect(claves).toEqual([
      'fecha.lugarYFecha',
      'beneficiario',
      'montoEnNumeros',
      'montoEnLetras',
      'noNegociable',
      'paraAbonoEnCuenta',
      'montoEnLetras2',
    ]);
  });

  it('suma el desplazamiento y conserva si el campo es visible', () => {
    const formato = formatoDeEjemplo();
    formato.desplazamiento = { xMm: 2, yMm: 1 };
    formato.beneficiario.visible = false;
    const caja = cajasDelFormato(formato).find((c) => c.clave === 'beneficiario');
    expect(caja).toMatchObject({ xMm: 27, yMm: 25, anchoMm: 105, visible: false });
  });

  it('con casillas trae día, mes y año', () => {
    const claves = cajasDelFormato(conModoDeFecha(formatoDeEjemplo(), 'casillas')).map((c) => c.clave);
    expect(claves).toEqual(expect.arrayContaining(['fecha.dia', 'fecha.mes', 'fecha.anio']));
  });
});
