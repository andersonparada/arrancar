import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Transferencia } from '../../servicios/transferencias.api';
import { detallesDeTransferencia, tituloDeTransferencia } from './detalles-de-transferencia';

// Da formato con `formatearFecha`/`formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const base: Transferencia = {
  id: 'transferencia-1',
  cuentaOrigenId: 'origen-1',
  cuentaOrigenNombre: 'Cuenta origen',
  cuentaDestinoId: 'destino-1',
  cuentaDestinoNombre: 'Cuenta destino',
  fecha: '2026-09-27',
  monto: '250.00',
  referencia: 'Boleta 9',
  observaciones: null,
  anuladaEn: null,
  motivoDeAnulacion: null,
  movimientoOrigenId: 'origen-mov',
  movimientoDestinoId: 'destino-mov',
  conciliacionOrigenId: null,
  conciliacionDestinoId: null,
  puedeAnular: true,
  puedeEliminar: true,
};

describe('título de la transferencia', () => {
  it('muestra origen → destino', () => {
    expect(tituloDeTransferencia(base)).toBe('Cuenta origen → Cuenta destino');
  });
});

describe('detalles de la transferencia', () => {
  it('lleva fecha, monto y referencia', () => {
    expect(detallesDeTransferencia(base).map((d) => d.etiqueta)).toEqual(['Fecha', 'Monto', 'Referencia']);
  });

  it('agrega el motivo de anulación cuando está anulada', () => {
    const detalles = detallesDeTransferencia({
      ...base,
      anuladaEn: '2026-09-27T10:00:00.000Z',
      motivoDeAnulacion: 'Error',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Error' });
  });
});
