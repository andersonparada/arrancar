import { describe, expect, it } from 'vitest';
import { accionesDelDocumento, type HechosDelDocumento } from './acciones-posibles.js';

const hechos = (cambios: Partial<HechosDelDocumento> = {}): HechosDelDocumento => ({
  origen: 'libro_de_compras',
  tipo: 'factura',
  estado: 'pendiente',
  notasVigentes: 0,
  notasEnTotal: 0,
  ...cambios,
});

describe('acciones posibles de un documento por pagar', () => {
  it('uno pendiente se completa, se anula y se elimina, pero no se autoriza', () => {
    expect(accionesDelDocumento(hechos())).toEqual({
      puedeRegistrar: true,
      puedeAutorizar: false,
      puedeDesautorizar: false,
      puedeCambiarVencimiento: false,
      puedeAnular: true,
      puedeEliminar: true,
    });
  });

  it('uno registrado se autoriza, cambia de vencimiento, se anula y se elimina', () => {
    expect(accionesDelDocumento(hechos({ estado: 'registrado' }))).toMatchObject({
      puedeRegistrar: false,
      puedeAutorizar: true,
      puedeCambiarVencimiento: true,
      puedeAnular: true,
      puedeEliminar: true,
    });
  });

  it('uno autorizado se desautoriza y se anula, pero ya no se elimina', () => {
    expect(accionesDelDocumento(hechos({ estado: 'autorizado' }))).toMatchObject({
      puedeAutorizar: false,
      puedeDesautorizar: true,
      puedeCambiarVencimiento: true,
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('uno anulado no admite ninguna acción', () => {
    expect(accionesDelDocumento(hechos({ estado: 'anulado' }))).toEqual({
      puedeRegistrar: false,
      puedeAutorizar: false,
      puedeDesautorizar: false,
      puedeCambiarVencimiento: false,
      puedeAnular: false,
      puedeEliminar: false,
    });
  });

  it('con notas vigentes no se anula, y con notas de cualquier estado no se elimina', () => {
    expect(accionesDelDocumento(hechos({ notasVigentes: 1, notasEnTotal: 1 }))).toMatchObject({
      puedeAnular: false,
      puedeEliminar: false,
    });
    expect(accionesDelDocumento(hechos({ notasVigentes: 0, notasEnTotal: 1 }))).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('una nota de crédito no vence, así que no cambia de vencimiento', () => {
    expect(accionesDelDocumento(hechos({ tipo: 'nota_de_credito', estado: 'registrado' }))).toMatchObject({
      puedeCambiarVencimiento: false,
      puedeAutorizar: true,
    });
  });

  it('un saldo inicial no se anula ni se elimina por Documentos, pero se autoriza y cambia de vencimiento', () => {
    expect(accionesDelDocumento(hechos({ origen: 'saldo_inicial', estado: 'registrado' }))).toEqual({
      puedeRegistrar: false,
      puedeAutorizar: true,
      puedeDesautorizar: false,
      puedeCambiarVencimiento: true,
      puedeAnular: false,
      puedeEliminar: false,
    });
    expect(accionesDelDocumento(hechos({ origen: 'saldo_inicial', estado: 'autorizado' }))).toMatchObject({
      puedeDesautorizar: true,
      puedeAnular: false,
    });
  });
});
