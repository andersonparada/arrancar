import { beforeEach, describe, expect, it } from 'vitest';
import { operador, prepararEscenarioDeGastos } from '../../../pruebas/escenario-de-gastos.js';
import { AsignarGastos, type PeticionParaAsignarGastos } from './asignar-gastos.js';

let e: Awaited<ReturnType<typeof prepararEscenarioDeGastos>>;

beforeEach(async () => {
  e = await prepararEscenarioDeGastos();
});

const asignar = (cambios: Partial<PeticionParaAsignarGastos> & Pick<PeticionParaAsignarGastos, 'documentos'>) =>
  new AsignarGastos(e.dependenciasDeGastos).ejecutar(operador, {
    anticipoId: e.anticipoId,
    puedeConRetencion: false,
    ...cambios,
  });

describe('asignar documentos de la bandeja', () => {
  it('asigna una tanda, devuelve los gastos y publica un evento por documento', async () => {
    const uno = await e.enLaBandeja();
    const dos = await e.enLaBandeja({ totalCentavos: 10_000 });

    const respuesta = await asignar({ documentos: [{ gastoId: uno.id }, { gastoId: dos.id, fecha: '2026-11-15' }] });

    expect(respuesta.gastos.map((g) => [g.anticipoId, g.fecha, g.monto])).toEqual([
      [e.anticipoId, '2026-11-12', '560.00'],
      [e.anticipoId, '2026-11-15', '100.00'],
    ]);
    expect(e.publicadorEventos.nombres()).toEqual([
      'cuentas-por-liquidar.gasto_asignado',
      'cuentas-por-liquidar.gasto_asignado',
    ]);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('un documento que ya no está en la bandeja se rechaza', async () => {
    const gasto = await e.enLaBandeja();
    await asignar({ documentos: [{ gastoId: gasto.id }] });

    await expect(asignar({ documentos: [{ gastoId: gasto.id }] })).rejects.toMatchObject({
      codigo: 'gasto_no_disponible',
    });
    await expect(asignar({ documentos: [{ gastoId: crypto.randomUUID() }] })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('rechaza una fecha fuera del anticipo y un anticipo liquidado', async () => {
    const gasto = await e.enLaBandeja();

    await expect(asignar({ documentos: [{ gastoId: gasto.id, fecha: '2026-11-09' }] })).rejects.toMatchObject({
      codigo: 'fecha_del_gasto_invalida',
    });
    await expect(asignar({ documentos: [{ gastoId: gasto.id, fecha: '2026-11-19' }] })).rejects.toMatchObject({
      codigo: 'fecha_del_gasto_invalida',
    });
    e.cambiarElAnticipo({ estado: 'liquidado' });
    await expect(asignar({ documentos: [{ gastoId: gasto.id }] })).rejects.toMatchObject({
      codigo: 'anticipo_no_abierto',
    });
    expect((await e.gastos.buscar(gasto.id))?.anticipoId).toBeNull();
  });
});

describe('excepción de retención', () => {
  const conRetencion = () => e.enLaBandeja({ retencionesCentavos: 9_000 });

  it('sin el permiso se rechaza con 403 y el documento sigue en la bandeja', async () => {
    const gasto = await conRetencion();

    const error = await asignar({ documentos: [{ gastoId: gasto.id, motivoConRetencion: 'Urgente' }] }).catch(
      (falla: unknown) => falla,
    );

    expect(error).toMatchObject({ codigo: 'retencion_sin_permiso' });
    expect((error as Error).message).toContain('retención de Q90.00');
    expect((await e.gastos.buscar(gasto.id))?.anticipoId).toBeNull();
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('con el permiso y sin motivo se rechaza', async () => {
    const gasto = await conRetencion();

    await expect(asignar({ documentos: [{ gastoId: gasto.id }], puedeConRetencion: true })).rejects.toMatchObject({
      codigo: 'motivo_con_retencion_obligatorio',
    });
    expect((await e.gastos.buscar(gasto.id))?.anticipoId).toBeNull();
  });

  it('con el permiso y el motivo se asigna, queda quién autorizó y se audita como estaba en la bandeja', async () => {
    const gasto = await conRetencion();

    const respuesta = await asignar({
      documentos: [{ gastoId: gasto.id, motivoConRetencion: '  El proveedor solo cobra en efectivo  ' }],
      puedeConRetencion: true,
    });

    expect(respuesta.gastos[0]).toMatchObject({
      anticipoId: e.anticipoId,
      monto: '470.00',
      montoRetenido: '90.00',
      motivoConRetencion: 'El proveedor solo cobra en efectivo',
    });
    expect(await e.gastos.buscar(gasto.id)).toMatchObject({ asignadoPor: operador.usuarioId });
    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'cuentas-por-liquidar.gastos',
        registroId: gasto.id,
        accion: 'autorizar',
        motivo: 'El proveedor solo cobra en efectivo',
        anterior: { anticipoId: null, conRetencion: true, motivoConRetencion: null },
      },
    ]);
  });

  it('un motivo de retención en un documento que no la lleva se rechaza', async () => {
    const gasto = await e.enLaBandeja();

    await expect(
      asignar({ documentos: [{ gastoId: gasto.id, motivoConRetencion: 'Por si acaso' }], puedeConRetencion: true }),
    ).rejects.toMatchObject({ codigo: 'motivo_con_retencion_no_aplica' });
  });
});

describe('bancarización', () => {
  it('pregunta al libro con el neto más lo retenido y la fecha de asignar', async () => {
    const gasto = await e.enLaBandeja({ retencionesCentavos: 9_000 });

    await asignar({
      documentos: [{ gastoId: gasto.id, fecha: '2026-11-15', motivoConRetencion: 'Urgente' }],
      puedeConRetencion: true,
    });

    expect(e.bancarizacion.preguntas).toMatchObject([
      {
        proveedorId: 'proveedor-1',
        proveedorNombre: 'Ferretería El Clavo',
        fecha: '2026-11-15',
        montoEnEfectivoCentavos: 56_000,
        cargos: [
          {
            documentoDeCompraId: gasto.documentoDeCompraId,
            etiqueta: `A-${gasto.documentoDeCompraId}`,
            totalCentavos: 56_000,
          },
        ],
      },
    ]);
  });

  it('con bloquear marca el gasto sin bancarizar y avisa, pero asigna (el efectivo ya salió)', async () => {
    e.bancarizacion.respuesta = {
      resultado: 'bloquear',
      mensaje: 'Bancarización: pierde el crédito fiscal.',
      efecto: { iva: true, isr: true },
      pagadoEnElMesCentavos: 3_000_000,
    };
    const gasto = await e.enLaBandeja();

    const respuesta = await asignar({ documentos: [{ gastoId: gasto.id }] });

    expect(respuesta.avisos).toEqual(['Bancarización: pierde el crédito fiscal.']);
    expect(respuesta.gastos[0]).toMatchObject({ anticipoId: e.anticipoId, sinBancarizar: true });
  });

  it('con avisar solo avisa, sin marcar', async () => {
    e.bancarizacion.respuesta = {
      resultado: 'avisar',
      mensaje: 'Bancarización: llega al umbral.',
      efecto: null,
      pagadoEnElMesCentavos: 0,
    };
    const gasto = await e.enLaBandeja();

    const respuesta = await asignar({ documentos: [{ gastoId: gasto.id }] });

    expect(respuesta.gastos[0]).toMatchObject({ sinBancarizar: false, avisos: ['Bancarización: llega al umbral.'] });
  });

  it('una nota de crédito no es un pago y no se evalúa', async () => {
    const factura = await e.enLaBandeja();
    const nota = await e.enLaBandeja({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoDeCompraId });

    await asignar({ documentos: [{ gastoId: nota.id }] });

    expect(e.bancarizacion.preguntas).toEqual([]);
  });
});
