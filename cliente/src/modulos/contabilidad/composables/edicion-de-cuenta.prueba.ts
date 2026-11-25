import { describe, expect, it } from 'vitest';
import { cuentaDePrueba } from './cuentas-de-prueba';
import {
  admiteSubcuentas,
  anchosDeMascara,
  camposQueAplican,
  codigoPropuesto,
  conRubro,
  conTipo,
  cuentaNueva,
  datosDeLaCuenta,
  datosParaEnviar,
  ejemploDeCodigo,
} from './edicion-de-cuenta';

const MASCARA = '9.9.99.99.999';

describe('máscara', () => {
  it('saca el ancho de cada nivel y rechaza lo que no es una máscara', () => {
    expect(anchosDeMascara(MASCARA)).toEqual([1, 1, 2, 2, 3]);
    expect(anchosDeMascara('9.9')).toEqual([]);
    expect(anchosDeMascara(null)).toEqual([]);
    expect(ejemploDeCodigo(MASCARA)).toBe('1.1.01.01.001');
  });
});

describe('código de la siguiente cuenta', () => {
  const mayor = cuentaDePrueba('1.1');
  const hija = cuentaDePrueba('1.1.01');
  const cuentas = [cuentaDePrueba('1'), mayor, hija, cuentaDePrueba('1.1.02'), cuentaDePrueba('2')];

  it('suma uno al último grupo de las hermanas y respeta el ancho', () => {
    expect(codigoPropuesto(cuentas, mayor, MASCARA)).toBe('1.1.03');
    expect(codigoPropuesto(cuentas, hija, MASCARA)).toBe('1.1.01.01');
  });

  it('en el primer nivel sigue a la última cuenta raíz', () => {
    expect(codigoPropuesto(cuentas, null, MASCARA)).toBe('3');
  });

  it('queda vacío si ya no cabe otro nivel o no hay números libres', () => {
    const ultima = cuentaDePrueba('1.1.01.01.001');
    expect(codigoPropuesto([ultima], ultima, MASCARA)).toBe('');
    const llena = Array.from({ length: 9 }, (_, i) => cuentaDePrueba(String(i + 1)));
    expect(codigoPropuesto(llena, null, MASCARA)).toBe('');
  });

  it('solo una cuenta de mayor que no esté en el último nivel admite cuentas inferiores', () => {
    expect(admiteSubcuentas(mayor, MASCARA)).toBe(true);
    expect(admiteSubcuentas(cuentaDePrueba('1.1.01', { esDeDetalle: true }), MASCARA)).toBe(false);
    expect(admiteSubcuentas(cuentaDePrueba('1.1.01.01.001'), MASCARA)).toBe(false);
  });
});

describe('cuenta nueva', () => {
  it('hereda naturaleza y tipo de su superior y es de detalle en el último nivel', () => {
    const padre = cuentaDePrueba('4.1', { naturaleza: 'acreedora', tipo: 'resultados' });
    const nueva = cuentaNueva([padre], padre, MASCARA);
    expect(nueva).toMatchObject({ naturaleza: 'acreedora', tipo: 'resultados', esDeDetalle: false, codigo: '4.1.01' });
    const ultima = cuentaNueva([padre], cuentaDePrueba('4.1.01', { naturaleza: 'acreedora' }), '9.9.99.99');
    expect(ultima.esDeDetalle).toBe(true);
  });
});

describe('qué campos aplican', () => {
  const base = datosDeLaCuenta(cuentaDePrueba('1.1.01.01.001', { esDeDetalle: true, rubro: 'efectivo' }));

  it('el balance de detalle pide flujo y corriente; resultados pide tratamiento fiscal', () => {
    expect(camposQueAplican(base)).toEqual({
      clasificacion: true,
      corriente: true,
      claseDeFlujo: true,
      tratamientoFiscal: false,
    });
    expect(camposQueAplican({ ...base, tipo: 'resultados' })).toMatchObject({
      claseDeFlujo: false,
      tratamientoFiscal: true,
    });
    expect(camposQueAplican({ ...base, esDeDetalle: false }).clasificacion).toBe(false);
  });

  it('al cambiar el tipo se quita el rubro que ya no cabe y el tratamiento fiscal', () => {
    const resultados = conTipo({ ...base, corriente: true, claseDeFlujo: 'efectivo' }, 'resultados');
    expect(resultados).toMatchObject({ rubro: null, corriente: false, claseDeFlujo: null });
    const balance = conTipo({ ...base, tipo: 'resultados', tratamientoFiscal: 'deducible' }, 'balance');
    expect(balance.tratamientoFiscal).toBe('no_aplica');
  });

  it('al cambiar a un rubro sin corriente, lo apaga', () => {
    expect(conRubro({ ...base, corriente: true }, 'capital').corriente).toBe(false);
    expect(conRubro({ ...base, corriente: true }, 'inventarios').corriente).toBe(true);
  });
});

describe('lo que se manda', () => {
  it('recorta los textos y apaga lo que no aplica', () => {
    const datos = {
      ...datosDeLaCuenta(cuentaDePrueba('1.1', { esDeDetalle: false })),
      codigo: ' 1.1 ',
      nombre: ' Caja ',
      corriente: true,
      claseDeFlujo: 'efectivo' as const,
      tratamientoFiscal: 'deducible' as const,
    };
    expect(datosParaEnviar(datos)).toMatchObject({
      codigo: '1.1',
      nombre: 'Caja',
      corriente: false,
      claseDeFlujo: null,
      tratamientoFiscal: 'no_aplica',
    });
  });
});
