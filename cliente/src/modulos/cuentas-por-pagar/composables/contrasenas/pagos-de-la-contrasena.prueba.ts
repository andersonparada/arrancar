import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CargoDeContrasena, FichaDeContrasena } from '../../servicios/tipos-de-contrasenas';
import {
  cargoConPagos,
  cargosPagables,
  destinoDeNuevoPago,
  destinoDePagoEnEfectivo,
  filasDePagosDeLaContrasena,
  puedeRegistrarPago,
  puedePagarEnEfectivo,
} from './pagos-de-la-contrasena';

const cargo = (id: string, cambios: Partial<CargoDeContrasena> = {}): CargoDeContrasena => ({
  documentoId: id,
  tipo: 'factura',
  serie: 'A',
  numero: id,
  origen: 'libro_de_compras',
  fechaEmision: '2026-10-01',
  vencimiento: null,
  estado: 'autorizado',
  total: '100.00',
  retenciones: '0.00',
  rebajado: '0.00',
  saldo: '100.00',
  pagado: '0.00',
  comprometido: '0.00',
  retencionesPorPracticar: null,
  sobreUmbralDeBancarizacion: false,
  ...cambios,
});

const ficha = (cambios: Partial<FichaDeContrasena> = {}): FichaDeContrasena =>
  ({
    id: 'c1',
    proveedorId: 'p1',
    estado: 'vigente',
    cargos: [cargo('a')],
    pagos: [],
    ...cambios,
  }) as FichaDeContrasena;

beforeEach(() => setActivePinia(createPinia()));

describe('registrar pago desde la contraseña', () => {
  const puedeTodo = () => true;

  it('se ofrece con cargos autorizados con saldo y algún permiso de pagar', () => {
    expect(puedeRegistrarPago(ficha(), puedeTodo)).toBe(true);
    const soloApertura = (permiso: string) =>
      ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.aplicar-a-apertura'].includes(permiso);
    const inicial = ficha({ cargos: [cargo('a', { origen: 'saldo_inicial' })] });
    expect(puedeRegistrarPago(inicial, soloApertura)).toBe(true);
  });

  it('con solo la apertura no se ofrece si la contraseña no tiene saldos iniciales', () => {
    const soloApertura = (permiso: string) =>
      ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.aplicar-a-apertura'].includes(permiso);
    expect(puedeRegistrarPago(ficha(), soloApertura)).toBe(false);
  });

  it('sin poder ver Pagos no se ofrece, porque la pantalla lo exige', () => {
    expect(puedeRegistrarPago(ficha(), (permiso) => permiso !== 'cuentas-por-pagar.pagos.ver')).toBe(false);
  });

  it('no se ofrece sin permiso, sin saldo, sin autorizar ni en una contraseña anulada', () => {
    expect(puedeRegistrarPago(ficha(), () => false)).toBe(false);
    expect(puedeRegistrarPago(ficha({ cargos: [cargo('a', { saldo: '0.00' })] }), puedeTodo)).toBe(false);
    expect(puedeRegistrarPago(ficha({ cargos: [cargo('a', { estado: 'registrado' })] }), puedeTodo)).toBe(false);
    expect(puedeRegistrarPago(ficha({ estado: 'anulada' }), puedeTodo)).toBe(false);
  });

  it('solo cuenta lo autorizado con saldo', () => {
    const cargos = [cargo('a'), cargo('b', { estado: 'registrado' }), cargo('c', { saldo: '0.00' })];
    expect(cargosPagables({ cargos }).map(({ documentoId }) => documentoId)).toEqual(['a']);
  });

  it('lleva al pago nuevo con el proveedor y la contraseña abiertos', () => {
    expect(destinoDeNuevoPago(ficha())).toEqual({
      name: 'cuentas-por-pagar.pagos.nuevo',
      query: { proveedorId: 'p1', contrasenaId: 'c1' },
    });
  });
});

describe('cargos con pagos', () => {
  it('con algo pagado o comprometido no se quita de la contraseña', () => {
    expect(cargoConPagos(cargo('a'))).toBe(false);
    expect(cargoConPagos(cargo('a', { pagado: '10.00' }))).toBe(true);
    expect(cargoConPagos(cargo('a', { comprometido: '10.00' }))).toBe(true);
  });
});

describe('sección Pagos de la ficha', () => {
  it('lista cada pago con su forma, fecha, lo que entregó y sus marcas', () => {
    const filas = filasDePagosDeLaContrasena({
      pagos: [
        {
          pagoId: 'p1',
          numero: '2026-1',
          forma: 'cheque',
          fecha: '2026-11-01',
          estado: 'vigente',
          monto: '1500.00',
          comprometido: true,
        },
        {
          pagoId: 'p2',
          numero: '2026-2',
          forma: 'nota_de_debito',
          fecha: '2026-11-03',
          estado: 'anulado',
          monto: '20.00',
          comprometido: false,
        },
      ],
    });
    expect(filas[0]).toMatchObject({
      id: 'p1',
      titulo: 'Pago 2026-1 · Cheque',
      anulado: false,
      marcas: ['Posfechado'],
    });
    expect(filas[0]!.monto).toMatch(/1,500\.00/);
    expect(filas[1]).toMatchObject({ titulo: 'Pago 2026-2 · Nota de débito', anulado: true, marcas: ['Anulado'] });
  });

  it('sin pagos queda vacío', () => {
    expect(filasDePagosDeLaContrasena({ pagos: [] })).toEqual([]);
  });
});

describe('pagar en efectivo desde la contraseña', () => {
  const permisos =
    (...dados: string[]) =>
    (permiso: string) =>
      dados.includes(permiso);
  const TODOS = permisos('cuentas-por-pagar.pagos.pagar-en-efectivo', 'cuentas-por-pagar.retiros.ver');

  it('se ofrece con cargos por pagar y los permisos de repartir efectivo y ver retiros', () => {
    expect(puedePagarEnEfectivo(ficha(), TODOS)).toBe(true);
  });

  it('sin alguno de los dos permisos no se ofrece', () => {
    expect(puedePagarEnEfectivo(ficha(), permisos('cuentas-por-pagar.pagos.pagar-en-efectivo'))).toBe(false);
    expect(puedePagarEnEfectivo(ficha(), permisos('cuentas-por-pagar.retiros.ver'))).toBe(false);
  });

  it('no se ofrece en una contraseña anulada ni sin nada por pagar', () => {
    expect(puedePagarEnEfectivo(ficha({ estado: 'anulada' }), TODOS)).toBe(false);
    expect(puedePagarEnEfectivo(ficha({ cargos: [cargo('a', { saldo: '0.00' })] }), TODOS)).toBe(false);
  });

  it('lleva al reparto con el proveedor y la contraseña, y ahí se escoge el retiro', () => {
    expect(destinoDePagoEnEfectivo({ id: 'c1', proveedorId: 'p1' })).toEqual({
      name: 'cuentas-por-pagar.pagos.efectivo',
      query: { proveedorId: 'p1', contrasenaId: 'c1' },
    });
  });
});
