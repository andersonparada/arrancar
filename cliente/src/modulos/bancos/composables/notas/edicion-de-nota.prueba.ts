import { describe, expect, it } from 'vitest';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { DatosNota } from '../../servicios/notas.api';
import { datosDeNota, edicionDe } from './edicion-de-nota';

const datos: DatosNota = {
  cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '12.50',
  referencia: 'Registro de prueba',
  beneficiario: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
};
const nota: Movimiento = {
  id: 'registro-1',
  ...datos,
  saldoInicial: false,
  cuentaBancariaNombre: null,
  anuladoEn: null,
  motivoDeAnulacion: null,
  transferenciaId: null,
  chequeId: null,
  numeroDeCheque: null,
  conciliacionId: null,
};

describe('ventana de notas', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeNota(edicionDe(nota))).toEqual(datos);
    expect(edicionDe(nota).id).toBe(nota.id);
  });

  it('un registro nuevo empieza sin id, con el tipo elegido en el encabezado', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null, tipo: 'credito' });
    expect(edicionDe(undefined, 'debito')).toMatchObject({ abierta: true, id: null, tipo: 'debito' });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeNota(edicionDe())).toMatchObject({ referencia: null, beneficiario: null, observaciones: null });
  });
});
