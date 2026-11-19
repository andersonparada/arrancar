import { describe, expect, it } from 'vitest';
import {
  conOtraBase,
  datosDeFormato,
  edicionDeFormato,
  edicionNueva,
  ordenarFormatos,
  problemasDeFormato,
  textoDeLaPrueba,
} from './edicion-de-formato-de-cheque';
import { plantillasDeEjemplo } from './ejemplos-de-formato';

const plantillas = plantillasDeEjemplo();

describe('edicionNueva', () => {
  it('parte del cheque suelto, con una copia de sus medidas', () => {
    const edicion = edicionNueva(plantillas);
    expect(edicion).toMatchObject({ abierta: true, id: null, base: 'cheque_suelto', nombre: '' });
    expect(edicion.formato).not.toBe(plantillas[0]!.formato);
    expect(edicion.formato?.papel.anchoMm).toBe(175);
  });

  it('parte de la plantilla elegida', () => {
    expect(edicionNueva(plantillas, 'voucher_carta_arriba').formato?.papel.anchoMm).toBe(215.9);
  });
});

describe('edicionDeFormato', () => {
  const guardado = {
    id: 'f1',
    nombre: 'Banco',
    base: 'cheque_suelto' as const,
    ajustes: {},
    probadoEn: null,
    activo: true,
    chequerasQueLoUsan: 0,
  };

  it('usa las medidas resueltas del servidor', () => {
    const resuelto = { ...plantillas[0]!.formato, desplazamiento: { xMm: 2, yMm: 0 } };
    const edicion = edicionDeFormato({ ...guardado, resuelto, danado: false }, plantillas);
    expect(edicion.formato?.desplazamiento.xMm).toBe(2);
    expect(edicion.danado).toBe(false);
  });

  it('un formato dañado vuelve a la plantilla para corregirlo', () => {
    const edicion = edicionDeFormato({ ...guardado, resuelto: null, danado: true }, plantillas);
    expect(edicion.danado).toBe(true);
    expect(edicion.formato?.papel.anchoMm).toBe(175);
  });
});

describe('conOtraBase y datosDeFormato', () => {
  it('cambiar de plantilla reemplaza las medidas y conserva el nombre', () => {
    const edicion = { ...edicionNueva(plantillas), nombre: 'Mi banco' };
    const otra = conOtraBase(edicion, plantillas, 'voucher_carta_arriba');
    expect(otra).toMatchObject({ nombre: 'Mi banco', base: 'voucher_carta_arriba' });
    expect(otra.formato?.papel.anchoMm).toBe(215.9);
  });

  it('manda el nombre sin espacios y solo los ajustes', () => {
    const edicion = { ...edicionNueva(plantillas), nombre: '  Mi banco ' };
    edicion.formato!.desplazamiento.xMm = 1;
    expect(datosDeFormato(edicion, plantillas)).toEqual({
      nombre: 'Mi banco',
      base: 'cheque_suelto',
      ajustes: { desplazamiento: { xMm: 1 } },
    });
  });
});

describe('problemasDeFormato', () => {
  it('saca la lista de problemas del detalle del error', () => {
    expect(problemasDeFormato({ campos: ['beneficiario.xMm: muy chico', 7] })).toEqual(['beneficiario.xMm: muy chico']);
  });

  it('sin lista, no hay problemas', () => {
    expect(problemasDeFormato(undefined)).toEqual([]);
    expect(problemasDeFormato({ campo: 'nombre' })).toEqual([]);
  });
});

describe('textos y orden', () => {
  it('dice si la prueba de alineación está hecha', () => {
    expect(textoDeLaPrueba({ probadoEn: null })).toBe('Sin probar la alineación');
    expect(textoDeLaPrueba({ probadoEn: '2026-11-18T10:00:00Z' })).toBe('Prueba de alineación hecha');
  });

  it('ordena por nombre sin distinguir tildes ni mayúsculas', () => {
    const nombres = ordenarFormatos([{ nombre: 'banrural' }, { nombre: 'Ágil' }, { nombre: 'BAC' }]).map(
      (f) => f.nombre,
    );
    expect(nombres).toEqual(['Ágil', 'BAC', 'banrural']);
  });
});
