import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Chequera } from './chequera.js';
import { ChequeraDeAperturaSinFormato, NombreDeFormatoInvalido } from './errores-de-impresion.js';
import { FormatoGuardado } from './formato-guardado.js';

const cuentaId = Identificador.desde<'Cuenta'>('00000000-0000-4000-8000-0000000000cc');
const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const formato = () => FormatoGuardado.crear(cuentaId, { nombre: ' Banrural ', base: 'cheque_suelto', ajustes: {} });

describe('FormatoGuardado', () => {
  it('nace activo y sin probar, con el nombre recortado', () => {
    expect(formato().instantanea()).toMatchObject({ nombre: 'Banrural', activo: true, probadoEn: null });
  });

  it('exige un nombre de 1 a 80 caracteres', () => {
    const datos = { base: 'cheque_suelto' as const, ajustes: {} };
    expect(() => FormatoGuardado.crear(cuentaId, { ...datos, nombre: '   ' })).toThrow(NombreDeFormatoInvalido);
    expect(() => FormatoGuardado.crear(cuentaId, { ...datos, nombre: 'x'.repeat(81) })).toThrow(
      NombreDeFormatoInvalido,
    );
  });

  it('cambiar la plantilla o los ajustes borra la prueba; cambiar solo el nombre, no', () => {
    const probado = formato();
    probado.marcarProbado(new Date('2026-11-18T10:00:00Z'));

    probado.cambiarDatos({ nombre: 'Otro nombre', base: 'cheque_suelto', ajustes: {} });
    expect(probado.instantanea().probadoEn).not.toBeNull();

    probado.cambiarDatos({ nombre: 'Otro nombre', base: 'cheque_suelto', ajustes: { desplazamiento: { xMm: 1 } } });
    expect(probado.instantanea().probadoEn).toBeNull();

    probado.marcarProbado(new Date());
    probado.cambiarDatos({
      nombre: 'Otro nombre',
      base: 'cheque_suelto_casillas',
      ajustes: { desplazamiento: { xMm: 1 } },
    });
    expect(probado.instantanea().probadoEn).toBeNull();
  });

  it('se inactiva y se reactiva', () => {
    const uno = formato();
    uno.inactivar();
    expect(uno.estaActivo).toBe(false);
    uno.reactivar();
    expect(uno.estaActivo).toBe(true);
  });
});

describe('el formato de una chequera', () => {
  const datos = { cuentaBancariaId: 'una-cuenta', serie: null, desde: 1, hasta: 10 };

  it('nace sin formato y se le asigna un formato o una plantilla', () => {
    const chequera = Chequera.crear(empresaId, datos, 5000);
    expect(chequera.formato).toEqual({ formatoDeChequeId: null, plantillaDeCheque: null });

    chequera.asignarFormato({ formatoDeChequeId: 'un-formato', plantillaDeCheque: null });
    expect(chequera.formato.formatoDeChequeId).toBe('un-formato');

    chequera.asignarFormato({ formatoDeChequeId: null, plantillaDeCheque: 'cheque_suelto' });
    expect(chequera.formato).toEqual({ formatoDeChequeId: null, plantillaDeCheque: 'cheque_suelto' });
  });

  it('no admite un formato y una plantilla a la vez', () => {
    const chequera = Chequera.crear(empresaId, datos, 5000);

    expect(() =>
      chequera.asignarFormato({ formatoDeChequeId: 'un-formato', plantillaDeCheque: 'cheque_suelto' }),
    ).toThrow(/no los dos/);
  });

  it('la de la carga inicial nunca se imprime', () => {
    const deApertura = Chequera.deApertura(empresaId, { cuentaBancariaId: 'una-cuenta', serie: null, numero: 5 });

    expect(() => deApertura.asignarFormato({ formatoDeChequeId: null, plantillaDeCheque: 'cheque_suelto' })).toThrow(
      ChequeraDeAperturaSinFormato,
    );
  });
});
