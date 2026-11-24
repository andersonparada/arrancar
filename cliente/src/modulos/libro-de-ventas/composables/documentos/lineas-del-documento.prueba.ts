import { describe, expect, it } from 'vitest';
import {
  centavosDe,
  datosDeLinea,
  dineroDe,
  erroresDeLaLinea,
  erroresLocalesDeLinea,
  lineaVacia,
  pendientesDeLineas,
  sumaDeLineas,
} from './lineas-del-documento';

const conTotal = (total: string, cambios = {}) => ({ ...lineaVacia(), conceptoDeIngresoId: 'k1', total, ...cambios });

describe('dinero de una línea', () => {
  it('lee cantidades con hasta dos decimales', () => {
    expect(centavosDe('1250')).toBe(125000);
    expect(centavosDe(' 1250.5 ')).toBe(125050);
    expect(centavosDe('0.07')).toBe(7);
  });

  it('rechaza lo que no es una cantidad', () => {
    for (const texto of ['', 'abc', '12.345', '-5', '1,250.00', '12.', '.5']) expect(centavosDe(texto)).toBeNull();
  });

  it('da formato con dos decimales sin errores de punto flotante', () => {
    expect(dineroDe(125050)).toBe('1250.50');
    expect(dineroDe(5)).toBe('0.05');
  });

  it('suma los totales válidos y deja fuera los que no se pueden leer', () => {
    const lineas = [conTotal('0.10'), conTotal('0.20'), conTotal('x'), conTotal('')];

    expect(sumaDeLineas(lineas)).toBe('0.30');
    expect(sumaDeLineas([])).toBe('0.00');
  });
});

describe('errores de una línea', () => {
  it('las líneas nuevas son gravadas y empiezan con claves distintas', () => {
    const [a, b] = [lineaVacia(), lineaVacia()];

    expect(a.claseFiscal).toBe('gravada');
    expect(a.clave).not.toBe(b.clave);
  });

  it('lo faltante solo se marca al intentar registrar', () => {
    const vacia = lineaVacia();

    expect(erroresLocalesDeLinea(vacia, false)).toEqual({});
    expect(Object.keys(erroresLocalesDeLinea(vacia, true))).toEqual(['conceptoDeIngresoId', 'total']);
  });

  it('un número mal escrito se marca de inmediato y dice cómo corregirlo', () => {
    const errores = erroresLocalesDeLinea(conTotal('12.345', { otrosImpuestos: 'x' }), false);

    expect(errores.total).toContain('hasta dos decimales');
    expect(errores.otrosImpuestos).toBeDefined();
  });

  it('reparte los errores del servidor por línea', () => {
    const errores = { 'lineas.1.total': 'Mal', 'lineas.10.total': 'Otro', numero: 'x' };

    expect(erroresDeLaLinea(errores, 1)).toEqual({ total: 'Mal' });
    expect(erroresDeLaLinea(errores, 0)).toEqual({});
  });

  it('dice qué falta con el número de línea cuando hay varias', () => {
    expect(pendientesDeLineas([lineaVacia()])).toEqual(['el concepto de la línea', 'el total de la línea']);
    expect(pendientesDeLineas([conTotal('1'), lineaVacia()])).toEqual([
      'el concepto de la línea 2',
      'el total de la línea 2',
    ]);
    expect(pendientesDeLineas([conTotal('1')])).toEqual([]);
  });
});

describe('línea para el servidor', () => {
  it('lo vacío va como null y el dinero como texto', () => {
    expect(datosDeLinea(conTotal(' 1120.00 '))).toEqual({
      conceptoDeIngresoId: 'k1',
      tipo: null,
      claseFiscal: 'gravada',
      descripcion: null,
      total: '1120.00',
      otrosImpuestos: null,
    });
  });

  it('manda el tipo, la descripción y los otros impuestos cuando se escribieron', () => {
    const datos = datosDeLinea(conTotal('50', { tipo: 'servicio', descripcion: ' Flete ', otrosImpuestos: '1.5' }));

    expect(datos).toMatchObject({ tipo: 'servicio', descripcion: 'Flete', otrosImpuestos: '1.5' });
  });
});
