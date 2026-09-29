import { describe, expect, it } from 'vitest';
import { Concepto } from './concepto.js';
import { CONCEPTOS_INICIALES } from './conceptos-iniciales.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

describe('conceptos iniciales', () => {
  it('no repiten nombre ni clave de sistema', () => {
    const nombres = CONCEPTOS_INICIALES.map((c) => c.datos.nombre);
    const claves = CONCEPTOS_INICIALES.map((c) => c.claveDeSistema).filter(Boolean);

    expect(new Set(nombres).size).toBe(nombres.length);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('cumplen las reglas del dominio y nacen con "admite factura" apagado', () => {
    const empresaId = Identificador.nuevo<'Empresa'>();

    for (const { datos, claveDeSistema } of CONCEPTOS_INICIALES) {
      const concepto = claveDeSistema
        ? Concepto.crearDeSistema(empresaId, claveDeSistema, datos)
        : Concepto.crear(empresaId, datos);

      expect(concepto.instantanea().admiteFactura).toBe(false);
      expect(concepto.esDeSistema).toBe(claveDeSistema !== null);
    }
  });
});
