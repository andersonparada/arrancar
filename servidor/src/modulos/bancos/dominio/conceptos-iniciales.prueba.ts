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

  it('ya no hay concepto de sistema para el cheque caduco: el inverso hereda el del cheque (P1)', () => {
    const claves = CONCEPTOS_INICIALES.map((c) => c.claveDeSistema).filter(Boolean);

    expect(claves.sort()).toEqual(['pago_a_proveedor', 'saldo_inicial', 'sin_clasificar', 'transferencia']);
    expect(CONCEPTOS_INICIALES.map((c) => c.datos.nombre)).not.toContain('Cheque caduco');
  });

  it('«Cheque rechazado» va en el grupo «Cobros a clientes» (P8)', () => {
    const rechazado = CONCEPTOS_INICIALES.find((c) => c.datos.nombre === 'Cheque rechazado')!;

    expect(rechazado.datos).toMatchObject({ actividadDeFlujo: 'operacion', grupoDeFlujo: 'Cobros a clientes' });
  });

  it('trae los sugeridos de P5 y P8 con su actividad, y ninguno de préstamos a empleados', () => {
    const actividadDe = (nombre: string) => CONCEPTOS_INICIALES.find((c) => c.datos.nombre === nombre)?.datos;

    expect(actividadDe('Dividendos pagados')).toMatchObject({ actividadDeFlujo: 'financiamiento', aplicaA: 'debito' });
    expect(actividadDe('Retiro de socios')).toMatchObject({ actividadDeFlujo: 'financiamiento', aplicaA: 'debito' });
    expect(actividadDe('Fondo de caja chica')).toMatchObject({ actividadDeFlujo: 'ninguna' });
    expect(actividadDe('Venta de activo')).toMatchObject({ actividadDeFlujo: 'inversion', aplicaA: 'credito' });
    expect(actividadDe('Préstamo a empresa relacionada')).toMatchObject({ actividadDeFlujo: 'inversion' });
    for (const nombre of [
      'Anticipo a proveedores',
      'Reintegro de caja chica',
      'IGSS, IRTRA e INTECAP',
      'Préstamo de empresa relacionada',
    ]) {
      expect(actividadDe(nombre)).toBeDefined();
    }
    expect(CONCEPTOS_INICIALES.some((c) => /empleado/i.test(c.datos.nombre))).toBe(false);
  });
});
