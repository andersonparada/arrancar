import { describe, expect, it } from 'vitest';
import { conceptosDelDesglose } from './desglose-del-retiro.js';

const retiro = (montoCentavos: number, faltanteCentavos = 0) => ({ montoCentavos, faltanteCentavos });

describe('el reparto por concepto del cheque del retiro', () => {
  it('sin pagos todo es efectivo para pagos', () => {
    expect(conceptosDelDesglose(retiro(100000), { totalCentavos: 0, deActivoCentavos: 0 })).toEqual([
      { claveDeSistema: 'efectivo_para_pagos', montoCentavos: 100000 },
    ]);
  });

  it('lo pagado va a Operación e Inversión y el resto sigue siendo efectivo', () => {
    expect(conceptosDelDesglose(retiro(100000), { totalCentavos: 50000, deActivoCentavos: 20000 })).toEqual([
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 30000 },
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 20000 },
      { claveDeSistema: 'efectivo_para_pagos', montoCentavos: 50000 },
    ]);
  });

  it('el faltante sale de lo que queda y es un concepto de Operación aparte', () => {
    expect(conceptosDelDesglose(retiro(100000, 10000), { totalCentavos: 60000, deActivoCentavos: 0 })).toEqual([
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 60000 },
      { claveDeSistema: 'faltante_de_efectivo', montoCentavos: 10000 },
      { claveDeSistema: 'efectivo_para_pagos', montoCentavos: 30000 },
    ]);
  });

  it('un retiro todo pagado no deja efectivo ni líneas en cero', () => {
    expect(conceptosDelDesglose(retiro(50000), { totalCentavos: 50000, deActivoCentavos: 50000 })).toEqual([
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 50000 },
    ]);
  });
});
