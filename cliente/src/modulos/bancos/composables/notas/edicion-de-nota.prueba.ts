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
  conceptoId: 'concepto-1',
  interesBruto: null,
  isrRetenido: null,
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
  numero: null,
  anioDeNumero: 0,
  moduloDeOrigen: null,
  documentoDeOrigenId: null,
  conciliacionId: null,
  revertidoEn: null,
  motivoDeReversion: null,
  revierteAId: null,
  puedeAnular: true,
  puedeEliminar: true,
  conceptoNombre: 'Concepto de prueba',
  puedeReclasificar: true,
};

describe('ventana de notas', () => {
  it('el concepto viaja con la nota y una nota nueva empieza sin concepto', () => {
    expect(edicionDe(nota).conceptoId).toBe('concepto-1');
    expect(edicionDe().conceptoId).toBeNull();
    expect(datosDeNota(edicionDe()).conceptoId).toBe('');
  });

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

  it('los intereses viajan como texto, o como null si la nota no los lleva', () => {
    const conIntereses = { ...nota, monto: '90.00', interesBruto: '100.00', isrRetenido: '10.00' };

    expect(edicionDe(conIntereses)).toMatchObject({ interesBruto: '100.00', isrRetenido: '10.00' });
    expect(datosDeNota(edicionDe(conIntereses))).toMatchObject({ interesBruto: '100.00', isrRetenido: '10.00' });
    expect(datosDeNota(edicionDe())).toMatchObject({ interesBruto: null, isrRetenido: null });
  });
});
