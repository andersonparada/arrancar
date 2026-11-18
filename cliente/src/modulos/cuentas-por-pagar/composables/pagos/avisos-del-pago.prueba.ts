import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { avisosDeApertura, avisosDelPago, AVISO_DE_DIFERENCIA_CON_RETENCION, tieneRetencion } from './avisos-del-pago';
import { lineasDelPago } from './edicion-de-pago';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo, notaDeEjemplo } from './ejemplos-de-pago';

const hoy = '2026-11-15';

beforeEach(() => setActivePinia(createPinia()));

type Cambios = Parameters<typeof edicionDeEjemplo>[0] & { datos?: Parameters<typeof datosDeEjemplo>[1] };

function avisosDe(cargos: Parameters<typeof datosDeEjemplo>[0], montos: Record<string, string>, cambios: Cambios = {}) {
  const { datos: extra, ...deLaEdicion } = cambios;
  const datos = datosDeEjemplo(cargos, extra);
  const edicion = edicionDeEjemplo({ montos, ...deLaEdicion });
  const nota = deLaEdicion.forma === 'nota_ligada' ? notaDeEjemplo({ fecha: '2025-12-20' }) : null;
  return avisosDelPago({ edicion, datos, lineas: lineasDelPago(edicion, datos), hoy, nota });
}

describe('retención', () => {
  const conRetencion = cargoDeEjemplo('r', {
    retencionPorDescontar: '15.00',
    constanciasPendientes: 1,
    mesDeRetencion: '2026-09',
  });

  it('avisa de la constancia sin registrar y del mes en que se entera', () => {
    const avisos = avisosDe([conRetencion], { r: '100.00' });
    expect(avisos.some((aviso) => /no tiene constancia registrada.*Retenciones Web/.test(aviso))).toBe(true);
    expect(avisos.some((aviso) => /es de 09\/2026: se entera con ese mes/.test(aviso))).toBe(true);
  });

  it('si la retención ya se descontó en otro pago, no avisa de ella', () => {
    const yaDescontada = { ...conRetencion, retencionPorDescontar: '0.00' };
    expect(avisosDe([yaDescontada], { r: '100.00' }).filter((aviso) => /retención/.test(aviso))).toEqual([]);
  });

  it('si la retención es del mismo mes del pago no avisa del entero', () => {
    const delMes = { ...conRetencion, mesDeRetencion: '2026-11' };
    expect(avisosDe([delMes], { r: '100.00' }).some((aviso) => /se entera con ese mes/.test(aviso))).toBe(false);
  });

  it('un saldo inicial con retenciones por practicar avisa que no se descuentan', () => {
    const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial', retencionesPorPracticar: '40.00' });
    expect(avisosDe([inicial], { i: '100.00' })[0]).toMatch(/retenciones por practicar del sistema anterior/);
  });

  it('tieneRetencion mira lo que se descontará o las retenciones del libro', () => {
    expect(tieneRetencion(conRetencion)).toBe(true);
    expect(tieneRetencion(cargoDeEjemplo('x'))).toBe(false);
    expect(AVISO_DE_DIFERENCIA_CON_RETENCION).toMatch(/Libro de compras/);
  });
});

describe('fechas', () => {
  it('avisa si la fecha es anterior a la recepción o a la contraseña, sin bloquear', () => {
    const cargo = cargoDeEjemplo('a', { fechaDeEmision: '2026-09-01', fechaDeRecepcion: '2026-11-10' });
    const avisos = avisosDe([cargo], { a: '10.00' }, { fecha: '2026-10-12' });
    expect(avisos.some((aviso) => /anterior a la recepción de la factura A-a/.test(aviso))).toBe(true);
    expect(avisos.some((aviso) => /anterior a la fecha de la contraseña 2026-15/.test(aviso))).toBe(false);
    const antes = avisosDe([cargo], { a: '10.00' }, { fecha: '2026-10-05' });
    expect(antes.some((aviso) => /anterior a la fecha de la contraseña 2026-15/.test(aviso))).toBe(true);
  });

  it('un cheque con fecha futura dice que queda comprometido y se paga a la vista', () => {
    const avisos = avisosDe([cargoDeEjemplo('a')], { a: '10.00' }, { fecha: '2026-12-01' });
    expect(avisos.some((aviso) => /queda comprometido.*se paga a la vista/.test(aviso))).toBe(true);
  });

  it('una nota de débito futura también, sin lo del cheque', () => {
    const avisos = avisosDe([cargoDeEjemplo('a')], { a: '10.00' }, { forma: 'nota_de_debito', fecha: '2026-12-01' });
    expect(avisos.some((aviso) => /La nota lleva fecha/.test(aviso) && !/a la vista/.test(aviso))).toBe(true);
  });

  it('una nota de otro año avisa que se revise', () => {
    const avisos = avisosDe([cargoDeEjemplo('a')], { a: '10.00' }, { forma: 'nota_ligada', movimientoId: 'n1' });
    expect(avisos.some((aviso) => /de otro año/.test(aviso))).toBe(true);
  });
});

describe('bancarización', () => {
  it('no avisa lejos del umbral', () => {
    expect(avisosDe([cargoDeEjemplo('a')], { a: '1000.00' }).some((aviso) => /Bancarización/.test(aviso))).toBe(false);
  });

  it('avisa cuando lo del mes más este pago llega al umbral, sin afirmar qué se pierde', () => {
    const avisos = avisosDe([cargoDeEjemplo('a')], { a: '1000.00' }, { datos: { sumaDelMesAlProveedor: '29000.00' } });
    const aviso = avisos.find((texto) => /Bancarización/.test(texto));
    expect(aviso).toMatch(/Decreto 20-2006/);
    expect(aviso).toMatch(/el sistema le dirá si afecta/);
  });

  it('avisa si un documento solo ya llega al umbral', () => {
    const grande = cargoDeEjemplo('g', { sobreUmbralDeBancarizacion: true, saldo: '40000.00' });
    expect(avisosDe([grande], { g: '100.00' }).some((aviso) => /Bancarización/.test(aviso))).toBe(true);
  });
});

describe('cuenta de apertura', () => {
  it('lleva los avisos fijos y no los del pago bancario', () => {
    const datos = datosDeEjemplo([]);
    const abierta = avisosDeApertura(datos);
    expect(abierta[0]).toMatch(/solo si el documento ya se había pagado antes de la fecha de inicio/);
    expect(abierta[1]).toMatch(/carga inicial está abierta.*cuenta puente/);
    expect(avisosDeApertura({ ...datos, cargaCerrada: true })[1]).toMatch(/cerrada.*corrección de error/);
    const cargo = cargoDeEjemplo('i', { origen: 'saldo_inicial' });
    expect(avisosDe([cargo], { i: '10.00' }, { forma: 'cuenta_de_apertura', fecha: '2026-12-01' })).toEqual([]);
  });
});
