import { beforeEach, describe, expect, it } from 'vitest';
import { operador, prepararEscenarioDeGastos } from '../../../pruebas/escenario-de-gastos.js';
import { AsignarGastos } from './asignar-gastos.js';
import { QuitarGasto } from './quitar-gasto.js';
import { RegistrarGastoSinDocumento, type PeticionDeGastoSinDocumento } from './registrar-gasto-sin-documento.js';

let e: Awaited<ReturnType<typeof prepararEscenarioDeGastos>>;

beforeEach(async () => {
  e = await prepararEscenarioDeGastos();
});

const sinDocumento = (cambios: Partial<PeticionDeGastoSinDocumento> = {}) =>
  new RegistrarGastoSinDocumento(e.dependenciasDeGastos).ejecutar(operador, {
    anticipoId: e.anticipoId,
    monto: '45.50',
    descripcion: 'Taxi al aeropuerto',
    pagadoA: 'Taxista sin factura',
    conceptoDeGastoId: 'concepto-1',
    motivoSinDocumento: 'No quiso dar factura',
    ...cambios,
  });

const quitar = (gastoId: string, motivo = 'Se puso por error') =>
  new QuitarGasto(e.dependenciasDeGastos).ejecutar(operador, { gastoId, motivo });

describe('gasto sin documento', () => {
  it('nace asignado, no deducible por omisión, con su aviso y su evento', async () => {
    const gasto = await sinDocumento();

    expect(gasto).toMatchObject({
      anticipoId: e.anticipoId,
      clase: 'sin_documento',
      monto: '45.50',
      fecha: '2026-11-18',
      etiqueta: 'Taxi al aeropuerto',
      pagadoA: 'Taxista sin factura',
      tratamientoSinDocumento: 'no_deducible',
    });
    expect(gasto.avisos[0]).toContain('no es deducible');
    expect(e.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.gasto_asignado']);
    expect((await e.gastos.buscar(gasto.id))?.asignadoPor).toBe(operador.usuarioId);
  });

  it('la renta del trabajo vale en un empleado y se rechaza si no lo es', async () => {
    const delEmpleado = await sinDocumento({ tratamiento: 'renta_del_trabajo' });
    e.cambiarElAnticipo({ esEmpleado: false });

    expect(delEmpleado.tratamientoSinDocumento).toBe('renta_del_trabajo');
    await expect(sinDocumento({ tratamiento: 'renta_del_trabajo' })).rejects.toMatchObject({
      codigo: 'renta_del_trabajo_solo_empleados',
    });
  });

  it('se rechaza si la empresa no lo permite, con concepto inactivo, monto cero, textos vacíos o fecha fuera del anticipo', async () => {
    e.politicaDeGastos.sinDocumento = false;
    await expect(sinDocumento()).rejects.toMatchObject({ codigo: 'gastos_sin_documento_no_permitidos' });
    e.politicaDeGastos.sinDocumento = true;
    e.referenciasDelGasto.conceptoActivo = false;
    await expect(sinDocumento()).rejects.toMatchObject({ codigo: 'concepto_de_gasto_invalido' });
    e.referenciasDelGasto.conceptoActivo = true;

    await expect(sinDocumento({ monto: '0.00' })).rejects.toMatchObject({ codigo: 'monto_del_gasto_invalido' });
    await expect(sinDocumento({ pagadoA: '  ' })).rejects.toMatchObject({ codigo: 'texto_del_gasto_invalido' });
    await expect(sinDocumento({ fecha: '2026-11-01' })).rejects.toMatchObject({ codigo: 'fecha_del_gasto_invalida' });
    expect(e.gastos.guardados.size).toBe(0);
  });

  it('un anticipo liquidado ya no recibe gastos', async () => {
    e.cambiarElAnticipo({ estado: 'liquidado' });

    await expect(sinDocumento()).rejects.toMatchObject({ codigo: 'anticipo_no_abierto' });
  });
});

describe('quitar un gasto', () => {
  it('un documento vuelve a la bandeja con su fecha de emisión y se audita como corregir', async () => {
    const enBandeja = await e.enLaBandeja({ retencionesCentavos: 9_000 });
    await new AsignarGastos(e.dependenciasDeGastos).ejecutar(operador, {
      anticipoId: e.anticipoId,
      puedeConRetencion: true,
      documentos: [{ gastoId: enBandeja.id, fecha: '2026-11-15', motivoConRetencion: 'Urgente' }],
    });
    e.publicadorEventos.publicados.length = 0;
    e.auditoria.entradas.length = 0;

    const quitado = await quitar(enBandeja.id);

    expect(quitado).toMatchObject({
      anticipoId: null,
      fecha: '2026-11-12',
      motivoConRetencion: null,
      estado: 'vigente',
    });
    expect(await e.gastos.buscar(enBandeja.id)).toMatchObject({ asignadoPor: null, asignadoEn: null });
    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'cuentas-por-liquidar.gastos',
        accion: 'corregir',
        motivo: 'Se puso por error',
        anterior: { anticipoId: e.anticipoId, motivoConRetencion: 'Urgente', fecha: '2026-11-15' },
      },
    ]);
    expect(e.publicadorEventos.publicados[0]).toMatchObject({
      nombre: 'cuentas-por-liquidar.gasto_quitado',
      datos: { volvioALaBandeja: true, montoCentavos: 47_000, montoRetenidoCentavos: 9_000 },
    });
  });

  it('reasignar un documento con retención pide otra vez el permiso y el motivo', async () => {
    const enBandeja = await e.enLaBandeja({ retencionesCentavos: 9_000 });
    const asignar = new AsignarGastos(e.dependenciasDeGastos);
    await asignar.ejecutar(operador, {
      anticipoId: e.anticipoId,
      puedeConRetencion: true,
      documentos: [{ gastoId: enBandeja.id, motivoConRetencion: 'Urgente' }],
    });
    await quitar(enBandeja.id);

    await expect(
      asignar.ejecutar(operador, {
        anticipoId: e.anticipoId,
        puedeConRetencion: true,
        documentos: [{ gastoId: enBandeja.id }],
      }),
    ).rejects.toMatchObject({ codigo: 'motivo_con_retencion_obligatorio' });
  });

  it('un gasto sin documento queda anulado y se audita como anular', async () => {
    const gasto = await sinDocumento();
    e.auditoria.entradas.length = 0;

    const quitado = await quitar(gasto.id);

    expect(quitado).toMatchObject({ estado: 'anulado' });
    expect(await e.gastos.buscar(gasto.id)).toMatchObject({
      estado: 'anulado',
      motivoDeAnulacion: 'Se puso por error',
      fechaDeAnulacion: '2026-11-18',
    });
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-liquidar.gastos', accion: 'anular', anterior: { estado: 'vigente' } },
    ]);
  });

  it('pide el motivo, y no quita lo que está en la bandeja, ya anulado o en un anticipo liquidado', async () => {
    const enBandeja = await e.enLaBandeja();
    const gasto = await sinDocumento();

    await expect(quitar(gasto.id, '   ')).rejects.toMatchObject({ codigo: 'motivo_invalido' });
    await expect(quitar(enBandeja.id)).rejects.toMatchObject({ codigo: 'gasto_no_disponible' });
    await expect(quitar(crypto.randomUUID())).rejects.toMatchObject({ codigo: 'no_encontrado' });
    e.cambiarElAnticipo({ estado: 'liquidado' });
    await expect(quitar(gasto.id)).rejects.toMatchObject({ codigo: 'anticipo_no_abierto' });
    expect((await e.gastos.buscar(gasto.id))?.estado).toBe('vigente');
  });
});
