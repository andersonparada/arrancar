import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo, notaDeEjemplo } from './ejemplos-de-pago';
import {
  ETIQUETAS_DE_FORMA,
  formasDisponibles,
  opcionesDeChequeras,
  opcionesDeCuentas,
  opcionesDeProveedores,
} from './opciones-del-pago';
import { resumenDelPago, textoDelBoton } from './resumen-del-pago';

const hoy = '2026-11-15';
const a = cargoDeEjemplo('a');
const b = cargoDeEjemplo('b', { contrasenaId: 'c2', retencionPorDescontar: '12.00' });

beforeEach(() => setActivePinia(createPinia()));

describe('resumen antes de confirmar', () => {
  const datos = datosDeEjemplo([a, b]);

  it('dice con qué se paga, cuánto, a nombre de quién y a qué documentos', () => {
    const edicion = edicionDeEjemplo({ contrasenasIncluidas: ['c1', 'c2'], montos: { a: '1000.00', b: '500.00' } });
    const resumen = resumenDelPago(edicion, { datos, nota: null, hoy });
    expect(resumen).toMatch(/Se emitirá un cheque en Bancos por .*1,500\.00/);
    expect(resumen).toMatch(/2 documentos de 2 contraseñas/);
    expect(resumen).toMatch(/Beneficiario: Agropecuaria La Esperanza, S\.A\./);
    expect(resumen).toMatch(/Descuenta .*12\.00 de retención/);
  });

  it('en singular cuando es un documento de una contraseña', () => {
    const resumen = resumenDelPago(edicionDeEjemplo({ montos: { a: '10.00' } }), { datos, nota: null, hoy });
    expect(resumen).toMatch(/1 documento de 1 contraseña\./);
  });

  it('un pago con fecha futura dice que es posfechado', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '10.00' }, fecha: '2026-12-01' });
    expect(resumenDelPago(edicion, { datos, nota: null, hoy })).toMatch(/posfechado/);
  });

  it('una nota ya registrada dice que no mueve dinero otra vez y no lleva beneficiario', () => {
    const edicion = edicionDeEjemplo({ forma: 'nota_ligada', montos: { a: '10.00' }, movimientoId: 'n1' });
    const resumen = resumenDelPago(edicion, { datos, nota: notaDeEjemplo(), hoy });
    expect(resumen).toMatch(/nota de débito 45 que ya está en Bancos \(sin mover dinero otra vez\)/);
    expect(resumen).not.toMatch(/Beneficiario/);
  });

  it('la cuenta de apertura no mueve dinero', () => {
    const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial' });
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', montos: { i: '10.00' }, fecha: '' });
    const resumen = resumenDelPago(edicion, { datos: datosDeEjemplo([inicial]), nota: null, hoy });
    expect(resumen).toMatch(/saldos iniciales sin mover dinero/);
    expect(resumen).not.toMatch(/posfechado/);
  });

  it('la apertura con la carga abierta dice la fecha de inicio, no la de hoy', () => {
    const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial' });
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', montos: { i: '10.00' }, fecha: hoy });
    const datos = datosDeEjemplo([inicial], { fechaDeInicio: '2026-01-01' });
    expect(resumenDelPago(edicion, { datos, nota: null, hoy })).toContain(`fecha ${formatearFecha('2026-01-01')}`);
  });

  it('menciona la diferencia de centavos que se salda', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '999.98' }, diferencias: ['a'] });
    expect(resumenDelPago(edicion, { datos, nota: null, hoy })).toMatch(/diferencia de centavos de 1 documento/);
  });

  it('el botón dice lo que hace', () => {
    expect(textoDelBoton('cheque')).toBe('Registrar el cheque');
    expect(textoDelBoton('cuenta_de_apertura')).toBe('Dar por pagado');
  });
});

describe('pestañas por permiso', () => {
  const todos = () => true;

  it('solo las formas permitidas, en su orden', () => {
    const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial' });
    expect(formasDisponibles(todos, [a, inicial])).toEqual([
      'cheque',
      'nota_de_debito',
      'nota_ligada',
      'cuenta_de_apertura',
    ]);
    const solo = (permiso: string) => permiso === 'cuentas-por-pagar.pagos.ligar-notas-de-debito';
    expect(formasDisponibles(solo, [a, inicial])).toEqual(['nota_ligada']);
  });

  it('la apertura solo si hay saldos iniciales por pagar', () => {
    expect(formasDisponibles(todos, [a])).not.toContain('cuenta_de_apertura');
  });

  it('antes de elegir proveedor solo cuenta el permiso, también el de la apertura', () => {
    const soloApertura = (permiso: string) => permiso === 'cuentas-por-pagar.pagos.aplicar-a-apertura';
    expect(formasDisponibles(soloApertura, null)).toEqual(['cuenta_de_apertura']);
    expect(formasDisponibles(soloApertura, [a])).toEqual([]);
  });

  it('cada forma tiene su nombre', () => {
    expect(ETIQUETAS_DE_FORMA.nota_de_debito).toBe('Transferencia o débito');
  });
});

describe('opciones de los selectores, por nombre', () => {
  const medios = {
    cuentas: [
      {
        cuentaBancariaId: 'z',
        nombre: 'Zona monetaria',
        bancoNombre: null,
        numero: '1',
        saldoCentavos: 150000,
        chequeras: [{ chequeraId: 'ch-z', serie: 'B', siguienteChequeId: 'x', siguienteNumero: 12 }],
      },
      {
        cuentaBancariaId: 'a',
        nombre: 'Ahorro',
        bancoNombre: null,
        numero: '2',
        saldoCentavos: 5,
        chequeras: [{ chequeraId: 'ch-a', serie: null, siguienteChequeId: null, siguienteNumero: null }],
      },
    ],
  };

  it('las chequeras van por nombre con su siguiente cheque y las agotadas se ven apagadas', () => {
    const opciones = opcionesDeChequeras(medios);
    expect(opciones.map(({ valor }) => valor)).toEqual(['ch-a', 'ch-z']);
    expect(opciones[0]).toMatchObject({ deshabilitada: true });
    expect(opciones[0]!.texto).toMatch(/sin cheques disponibles/);
    expect(opciones[1]!.texto).toMatch(/siguiente cheque 12.*1,500\.00/);
  });

  it('las cuentas van por nombre con su saldo', () => {
    const opciones = opcionesDeCuentas(medios);
    expect(opciones.map(({ valor }) => valor)).toEqual(['a', 'z']);
    expect(opciones[1]!.texto).toMatch(/saldo .*1,500\.00/);
    expect(opcionesDeCuentas(null)).toEqual([]);
  });

  it('los proveedores van por nombre con su NIT y lo que se les debe', () => {
    const opciones = opcionesDeProveedores([
      { proveedorId: '2', nombre: 'Zeta', nit: null, porPagar: '10.00', disponible: '10.00', contrasenas: 1 },
      { proveedorId: '1', nombre: 'Álamo', nit: '123-4', porPagar: '500.00', disponible: '500.00', contrasenas: 2 },
    ]);
    expect(opciones.map(({ valor }) => valor)).toEqual(['1', '2']);
    expect(opciones[0]!.texto).toMatch(/NIT 123-4.*500\.00/);
  });
});
