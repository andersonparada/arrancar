import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CargoParaAplicar, CargosParaAplicar } from '../servicios/tipos';
import {
  datosDeAplicacion,
  edicionDeAplicacion,
  erroresDeAplicacion,
  erroresDelServidor,
  fechaMinimaDeAplicacion,
  montoMaximoDelCargo,
  restanteDeLaNota,
  tocaBancarizacion,
  totalAplicado,
} from './aplicacion-de-nota';

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-13';

function cargo(id: string, saldo: string, resto: Partial<CargoParaAplicar> = {}): CargoParaAplicar {
  return {
    id,
    tipo: 'factura',
    serie: 'A',
    numero: id,
    fechaEmision: '2026-10-01',
    fechaRecepcion: '2026-10-02',
    vencimiento: null,
    estado: 'autorizado',
    total: saldo,
    saldo,
    propuesto: '0.00',
    origen: 'libro_de_compras',
    sobreUmbralDeBancarizacion: false,
    ...resto,
  };
}

const datos = (cargos: CargoParaAplicar[], saldoLibre = '100.00'): CargosParaAplicar => ({
  saldoLibre,
  fechaMinima: '2026-10-05',
  cargos,
});

describe('edicionDeAplicacion', () => {
  it('pone la propuesta del servidor solo donde hay algo que aplicar y la fecha de hoy', () => {
    const edicion = edicionDeAplicacion(
      datos([cargo('a', '80.00', { propuesto: '80.00' }), cargo('b', '50.00', { propuesto: '0.00' })]),
      HOY,
    );
    expect(edicion.montos).toEqual({ a: '80.00', b: '' });
    expect(edicion.fecha).toBe(HOY);
    expect(totalAplicado(edicion)).toBe(8000);
    expect(restanteDeLaNota(edicion)).toBe(2000);
  });
});

describe('montoMaximoDelCargo', () => {
  it('no pasa del saldo del cargo ni de lo que queda libre en la nota', () => {
    const edicion = edicionDeAplicacion(datos([cargo('a', '80.00', { propuesto: '80.00' }), cargo('b', '50.00')]), HOY);
    const [primero, segundo] = edicion.cargos as [CargoParaAplicar, CargoParaAplicar];
    expect(montoMaximoDelCargo(edicion, segundo)).toBe('20.00');
    expect(montoMaximoDelCargo(edicion, primero)).toBe('80.00');
  });
});

describe('fechaMinimaDeAplicacion', () => {
  it('sube con la recepción del cargo más reciente que se elige', () => {
    const edicion = edicionDeAplicacion(
      datos([
        cargo('a', '10.00', { fechaRecepcion: '2026-11-01' }),
        cargo('b', '10.00', { fechaRecepcion: '2026-10-10' }),
      ]),
      HOY,
    );
    edicion.montos = { a: '', b: '5' };
    expect(fechaMinimaDeAplicacion(edicion)).toBe('2026-10-10');
    edicion.montos = { a: '5', b: '5' };
    expect(fechaMinimaDeAplicacion(edicion)).toBe('2026-11-01');
  });
});

describe('tocaBancarizacion', () => {
  it('avisa solo si se compensa contra un cargo sobre el umbral', () => {
    const edicion = edicionDeAplicacion(
      datos([cargo('a', '40000.00', { sobreUmbralDeBancarizacion: true })], '500'),
      HOY,
    );
    expect(tocaBancarizacion(edicion)).toBe(false);
    edicion.montos = { a: '100' };
    expect(tocaBancarizacion(edicion)).toBe(true);
  });
});

describe('erroresDeAplicacion', () => {
  const base = () => edicionDeAplicacion(datos([cargo('a', '60.00'), cargo('b', '60.00')]), HOY);

  it('pide al menos un monto', () => {
    expect(erroresDeAplicacion(base(), HOY).total).toMatch(/al menos un documento/);
  });

  it('no deja pasar del saldo libre, del saldo del cargo ni fechas futuras o anteriores al mínimo', () => {
    const edicion = base();
    edicion.montos = { a: '60', b: '60' };
    expect(erroresDeAplicacion(edicion, HOY).total).toMatch(/pasa del saldo a favor/);
    edicion.montos = { a: '70', b: '' };
    expect(erroresDeAplicacion(edicion, HOY)['monto-a']).toMatch(/solo debe/);
    edicion.montos = { a: '10', b: '' };
    edicion.fecha = '2026-11-14';
    expect(erroresDeAplicacion(edicion, HOY).fecha).toMatch(/futura/);
    edicion.fecha = '2026-10-04';
    expect(erroresDeAplicacion(edicion, HOY).fecha).toMatch(/anterior/);
  });

  it('acepta una aplicación bien hecha', () => {
    const edicion = base();
    edicion.montos = { a: '60.00', b: '40' };
    expect(erroresDeAplicacion(edicion, HOY)).toEqual({});
  });
});

describe('datosDeAplicacion', () => {
  it('manda solo los cargos con monto y la referencia sin espacios (vacía es nula)', () => {
    const edicion = edicionDeAplicacion(datos([cargo('a', '60.00'), cargo('b', '60.00')]), HOY);
    edicion.montos = { a: '', b: '12.5' };
    edicion.referencia = '  ';
    expect(datosDeAplicacion(edicion)).toEqual({
      fecha: HOY,
      referencia: null,
      aplicaciones: [{ cargoId: 'b', monto: '12.50' }],
    });
  });
});

describe('erroresDelServidor', () => {
  it('pasa el error de una fila al cargo que se envió en esa posición', () => {
    const enviados = {
      fecha: HOY,
      referencia: null,
      aplicaciones: [
        { cargoId: 'x', monto: '1.00' },
        { cargoId: 'y', monto: '2.00' },
      ],
    };
    expect(erroresDelServidor({ 'aplicaciones.1.monto': 'mal', fecha: 'tarde' }, enviados)).toEqual({
      'monto-y': 'mal',
      fecha: 'tarde',
    });
  });
});
