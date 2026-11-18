import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo } from './ejemplos-de-pago';
import { fichaDeEjemplo, lineaDeEjemplo } from './ejemplos-de-ficha-de-pago';
import {
  candidatosDeReaplicacion,
  edicionDeReaplicacionDe,
  erroresDeReaplicacion,
  faltanteDeReaplicacion,
  repartirErroresDeReaplicacion,
  resumenDeReaplicar,
  solicitudDeReaplicar,
  textoDeLaSuma,
} from './reaplicacion';

beforeEach(() => setActivePinia(createPinia()));

const ficha = fichaDeEjemplo();
const datos = datosDeEjemplo([
  cargoDeEjemplo('d1', { saldo: '400.00' }),
  cargoDeEjemplo('d3', { saldo: '700.00', contrasenaId: 'c2' }),
  cargoDeEjemplo('d4', { saldo: '50.00', origen: 'saldo_inicial', contrasenaId: 'c2' }),
]);

describe('reaplicar un pago', () => {
  it('ofrece primero los cargos que ya cubre (con lo que admiten sin contar este pago) y luego los demás', () => {
    const candidatos = candidatosDeReaplicacion(ficha, datos);
    expect(candidatos.map(({ id }) => id)).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(candidatos[0]).toMatchObject({ actual: 60000, disponible: 100000, contrasenaNumero: '2026-15' });
    expect(candidatos[2]).toMatchObject({ actual: 0, disponible: 70000, contrasenaNumero: '2026-16' });
  });

  it('en la cuenta de apertura solo suma saldos iniciales', () => {
    const apertura = fichaDeEjemplo({ forma: 'cuenta_de_apertura', aplicaciones: [lineaDeEjemplo('d1')] });
    expect(candidatosDeReaplicacion(apertura, datos).map(({ id }) => id)).toEqual(['d1', 'd4']);
  });

  it('al abrir deja lo que el pago entrega hoy y vacío en los demás', () => {
    const edicion = edicionDeReaplicacionDe(candidatosDeReaplicacion(ficha, datos));
    expect(edicion.montos).toMatchObject({ d1: '600.00', d2: '400.00', d3: '', d4: '' });
    expect(edicion.abierta).toBe(true);
    expect(faltanteDeReaplicacion(edicion, ficha)).toBe(0);
  });

  it('dice cuánto falta o sobra mientras se escribe', () => {
    const edicion = edicionDeReaplicacionDe(candidatosDeReaplicacion(ficha, datos));
    expect(textoDeLaSuma(edicion, ficha)).toContain('cuadra');
    edicion.montos.d2 = '300';
    expect(textoDeLaSuma(edicion, ficha)).toContain('Faltan');
    edicion.montos.d2 = '450.50';
    expect(textoDeLaSuma(edicion, ficha)).toContain('Sobran');
  });

  it('pide el motivo, la suma exacta y respeta el tope de cada cargo', () => {
    const candidatos = candidatosDeReaplicacion(ficha, datos);
    const edicion = edicionDeReaplicacionDe(candidatos);
    expect(erroresDeReaplicacion(edicion, candidatos, ficha)).toEqual({
      motivo: 'Escriba el motivo de la reaplicación: queda en la auditoría.',
    });
    edicion.motivo = 'Se pagó la factura equivocada';
    expect(erroresDeReaplicacion(edicion, candidatos, ficha)).toEqual({});
    edicion.montos.d2 = '100';
    expect(erroresDeReaplicacion(edicion, candidatos, ficha).aplicaciones).toContain('Faltan');
    edicion.montos = { d1: '1200', d2: '', d3: '', d4: '' };
    expect(erroresDeReaplicacion(edicion, candidatos, ficha)['monto.d1']).toContain('admite hasta');
    edicion.montos = { d1: 'abc' };
    expect(erroresDeReaplicacion(edicion, candidatos, ficha)['monto.d1']).toContain('dos decimales');
  });

  it('manda solo los cargos con monto, con el motivo recortado', () => {
    const candidatos = candidatosDeReaplicacion(ficha, datos);
    const edicion = edicionDeReaplicacionDe(candidatos);
    Object.assign(edicion.montos, { d1: '', d3: '600' });
    edicion.motivo = '  Corrección  ';
    expect(solicitudDeReaplicar(edicion, candidatos)).toEqual({
      motivo: 'Corrección',
      aplicaciones: [
        { cargoId: 'd2', monto: '400.00' },
        { cargoId: 'd3', monto: '600.00' },
      ],
    });
  });

  it('el resumen lista el reparto y aclara qué no cambia', () => {
    const candidatos = candidatosDeReaplicacion(ficha, datos);
    const edicion = edicionDeReaplicacionDe(candidatos);
    const texto = resumenDeReaplicar(edicion, candidatos, ficha);
    expect(texto).toContain('Factura A-d1');
    expect(texto).toContain('no cambian');
  });

  it('los errores del servidor por línea vuelven al cargo que se envió en esa posición', () => {
    const enviadas = [
      { cargoId: 'd2', monto: '400.00' },
      { cargoId: 'd3', monto: '600.00' },
    ];
    expect(
      repartirErroresDeReaplicacion({ 'aplicaciones.1.monto': 'Pasa del saldo.', motivo: 'Falta' }, enviadas),
    ).toEqual({ 'monto.d3': 'Pasa del saldo.', motivo: 'Falta' });
  });
});
