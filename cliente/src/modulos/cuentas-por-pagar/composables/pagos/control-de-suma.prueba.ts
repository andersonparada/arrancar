import { describe, expect, it } from 'vitest';
import { claveDeSuma, crearControlDeSuma } from './control-de-suma';

describe('control de la suma pagada en el mes', () => {
  it('toma el mes de la fecha', () => {
    expect(claveDeSuma('p1', '2026-03-15')).toEqual({ proveedorId: 'p1', mes: '2026-03' });
  });

  it('con dos cambios de mes seguidos, la respuesta del primero no vale aunque llegue al final', () => {
    const control = crearControlDeSuma();
    const marzo = claveDeSuma('p1', '2026-03-10');
    const abril = claveDeSuma('p1', '2026-04-10');
    const primero = control.nuevo();
    const segundo = control.nuevo();

    expect(control.sirve(segundo, abril, abril)).toBe(true);
    expect(control.sirve(primero, marzo, abril)).toBe(false);
  });

  it('si cambió el mes mientras cargaba, la respuesta del mes anterior se descarta', () => {
    const control = crearControlDeSuma();
    const numero = control.nuevo();
    expect(control.sirve(numero, claveDeSuma('p1', '2026-03-31'), claveDeSuma('p1', '2026-04-01'))).toBe(false);
  });

  it('si se eligió otro proveedor mientras cargaba, la respuesta del anterior se descarta', () => {
    const control = crearControlDeSuma();
    const numero = control.nuevo();
    expect(control.sirve(numero, claveDeSuma('p1', '2026-03-05'), claveDeSuma('p2', '2026-03-05'))).toBe(false);
  });

  it('la respuesta de un pedido que sigue siendo el último y vigente sirve', () => {
    const control = crearControlDeSuma();
    const clave = claveDeSuma('p1', '2026-03-05');
    expect(control.sirve(control.nuevo(), clave, claveDeSuma('p1', '2026-03-20'))).toBe(true);
  });
});
