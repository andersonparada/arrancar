import { describe, expect, it } from 'vitest';
import type { MediosDePago } from '../../servicios/tipos-de-pagos';
import { conProveedorElegido, juntarCuentasDeNotas, opcionesDeCuentasParaNotas } from './opciones-del-pago';

const cuenta = (id: string, nombre: string) => ({ cuentaBancariaId: id, cuentaBancariaNombre: nombre });

describe('cuentas para filtrar las notas', () => {
  it('acumula las cuentas vistas sin repetir, así el selector no se encoge al filtrar', () => {
    const sinFiltro = juntarCuentasDeNotas(
      [],
      [cuenta('b', 'Banco B'), cuenta('a', 'Banco A'), cuenta('a', 'Banco A')],
    );
    const filtrada = juntarCuentasDeNotas(sinFiltro, [cuenta('a', 'Banco A')]);

    expect(filtrada).toBe(sinFiltro);
    expect(opcionesDeCuentasParaNotas(null, filtrada).map(({ texto }) => texto)).toEqual(['Banco A', 'Banco B']);
  });

  it('agrega una cuenta nueva que aparece después', () => {
    const vistas = juntarCuentasDeNotas([cuenta('a', 'Banco A')], [cuenta('c', 'Banco C')]);
    expect(vistas.map(({ cuentaBancariaId }) => cuentaBancariaId)).toEqual(['a', 'c']);
  });

  it('con acceso a Bancos usa sus cuentas', () => {
    const medios = { cuentas: [{ cuentaBancariaId: 'z', nombre: 'Cuenta Z' }] } as unknown as MediosDePago;
    expect(opcionesDeCuentasParaNotas(medios, [cuenta('a', 'Banco A')])).toEqual([{ valor: 'z', texto: 'Cuenta Z' }]);
  });
});

describe('proveedor elegido en el selector', () => {
  const proveedor = (id: string) => ({ proveedorId: id, nombre: id, nit: null, porPagar: '1.00', contrasenas: 0 });

  it('no lo repite si la lista ya trae al mismo proveedor como otro objeto', () => {
    const lista = [proveedor('x'), proveedor('y')];
    expect(conProveedorElegido(lista, proveedor('x'))).toBe(lista);
  });

  it('lo agrega si la lista no lo trae', () => {
    expect(conProveedorElegido([proveedor('y')], proveedor('x')).map((p) => p.proveedorId)).toEqual(['y', 'x']);
  });

  it('no agrega nada si no hay elegido', () => {
    const lista = [proveedor('y')];
    expect(conProveedorElegido(lista, undefined)).toBe(lista);
  });
});
