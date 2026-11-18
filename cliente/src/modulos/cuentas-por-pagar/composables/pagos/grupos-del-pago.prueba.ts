import { describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo } from './ejemplos-de-pago';
import { gruposIncluidos, gruposPorAgregar } from './grupos-del-pago';

const a = cargoDeEjemplo('a');
const b = cargoDeEjemplo('b', { saldo: '250.50', contrasenaId: 'c2' });
const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial', saldo: '80.00', contrasenaId: 'c2' });
const datos = datosDeEjemplo([a, b, inicial]);

describe('grupos por contraseña (M2)', () => {
  it('la contraseña abierta va incluida y las otras se ofrecen para agregar', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '100.00' } });
    const incluidos = gruposIncluidos(edicion, datos);
    expect(incluidos.map(({ id }) => id)).toEqual(['c1']);
    expect(incluidos[0]).toMatchObject({ numero: '2026-15', pagando: 10000, porPagar: '1000.00' });
    expect(gruposPorAgregar(edicion, datos).map(({ id, porPagar }) => [id, porPagar])).toEqual([['c2', '330.50']]);
  });

  it('al agregarla pasa a los incluidos con lo que se paga dentro de ella', () => {
    const edicion = edicionDeEjemplo({
      contrasenasIncluidas: ['c1', 'c2'],
      montos: { a: '1000.00', b: '50.50', i: '80.00' },
    });
    expect(gruposIncluidos(edicion, datos).map(({ id, pagando }) => [id, pagando])).toEqual([
      ['c1', 100000],
      ['c2', 13050],
    ]);
    expect(gruposPorAgregar(edicion, datos)).toEqual([]);
  });

  it('en la cuenta de apertura solo se ven los saldos iniciales y las contraseñas que los tienen', () => {
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', contrasenasIncluidas: [] });
    expect(gruposIncluidos(edicion, datos)).toEqual([]);
    const por = gruposPorAgregar(edicion, datos);
    expect(por.map(({ id, cargos }) => [id, cargos.map(({ id: cargo }) => cargo)])).toEqual([['c2', ['i']]]);
  });
});
