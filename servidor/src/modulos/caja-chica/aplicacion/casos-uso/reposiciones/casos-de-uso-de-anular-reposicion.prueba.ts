import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { AvisosEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { FONDO_ID, HOY } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { AnularReposicion } from './anular-reposicion.js';
import { AtenderMovimientoDeReposicionPorCambiar } from './atender-movimiento-de-reposicion-por-cambiar.js';
import {
  armarEscenarioDeReposiciones,
  sembrarComprobante,
  type EscenarioDeReposiciones,
} from './dobles-de-reposiciones.soporte.js';
import { RegistrarReposicion } from './registrar-reposicion.js';

const operador = operadorDePrueba();
let m: EscenarioDeReposiciones;

/** Repone dos gastos (uno con documento del libro) y deja limpio lo que se publicó. */
async function reponerDosGastos() {
  const conDocumento = await sembrarComprobante(m, { montoCentavos: 10_000, documentoDeCompraId: 'documento-1' });
  const vale = await sembrarComprobante(m, { montoCentavos: 5_000 });
  const dto = await new RegistrarReposicion(m.dependenciasDeReposiciones).ejecutar(operador, {
    fondoId: FONDO_ID,
    comprobanteIds: [conDocumento.id, vale.id],
    forma: 'cheque',
    chequeraId: 'chequera-1',
  });
  m.publicador.publicados.length = 0;
  m.libro.procesados.clear();
  return dto;
}

const anular = (reposicionId: string, cambios: { motivo?: string; fecha?: string } = {}) =>
  new AnularReposicion(m.dependenciasDeReposiciones).ejecutar(operador, {
    reposicionId,
    motivo: 'Se repuso de más',
    ...cambios,
  });

beforeEach(async () => {
  m = await armarEscenarioDeReposiciones();
});

describe('AnularReposicion', () => {
  it('ordena a Bancos anular el cheque, devuelve los comprobantes a pendientes y los documentos a «sin procesar»', async () => {
    const repuesta = await reponerDosGastos();

    const dto = await anular(repuesta.id);

    expect(dto).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Se repuso de más', fechaDeAnulacion: HOY });
    expect(m.bancos.anulaciones).toEqual([
      {
        origen: { modulo: 'caja-chica', documentoId: repuesta.id },
        movimientoId: repuesta.movimientoId,
        motivo: 'Se repuso de más',
      },
    ]);
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(15_000);
    expect(m.libro.procesados.get('documento-1')).toBe(false);
  });

  it('audita «anular» con la reposición como estaba y publica reposicion_anulada', async () => {
    const repuesta = await reponerDosGastos();

    await anular(repuesta.id);

    expect(m.auditoria.entradas).toMatchObject([
      { recurso: 'caja-chica.reposiciones', accion: 'anular', registroId: repuesta.id, motivo: 'Se repuso de más' },
    ]);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({ numero: 1, estado: 'vigente', monto: '150.00' });
    expect(m.publicador.publicados).toMatchObject([
      {
        nombre: 'caja-chica.reposicion_anulada',
        datos: { reposicionId: repuesta.id, numero: 1, fechaDeAnulacion: HOY, anulacionEnBancos: 'sin_inverso' },
      },
    ]);
  });

  it('con inverso en Bancos la anulación lleva la fecha del inverso', async () => {
    const repuesta = await reponerDosGastos();
    m.bancos.forma = 'con_inverso';
    m.bancos.fechaDelInverso = '2026-11-18';

    const dto = await anular(repuesta.id, { fecha: '2026-11-18' });

    expect(dto.fechaDeAnulacion).toBe('2026-11-18');
    expect(m.bancos.anulaciones[0]).toMatchObject({ fecha: '2026-11-18' });
  });

  it('no anula si el banco ya pagó el cheque: Bancos no recibe nada', async () => {
    const repuesta = await reponerDosGastos();
    m.conciliados.add(repuesta.movimientoId!);

    await expect(anular(repuesta.id)).rejects.toMatchObject({
      codigo: 'reposicion_cobrada',
      message: 'El banco ya pagó el cheque de la reposición 1.',
    });

    expect(m.bancos.anulaciones).toHaveLength(0);
    expect(m.reposiciones.filas.get(repuesta.id)!.estado).toBe('vigente');
  });

  it('no anula dos veces ni la del cierre ni la de un fondo cerrado', async () => {
    const repuesta = await reponerDosGastos();
    await anular(repuesta.id);
    await expect(anular(repuesta.id)).rejects.toMatchObject({ codigo: 'reposicion_ya_anulada' });

    const otra = await sembrarComprobante(m);
    const dto = await new RegistrarReposicion(m.dependenciasDeReposiciones).ejecutar(operador, {
      fondoId: FONDO_ID,
      comprobanteIds: [otra.id],
      forma: 'cheque',
      chequeraId: 'chequera-1',
    });
    m.reposiciones.filas.set(dto.id, { ...m.reposiciones.filas.get(dto.id)!, forma: 'compensada_al_cerrar' });
    await expect(anular(dto.id)).rejects.toMatchObject({ codigo: 'reposicion_del_cierre' });

    m.reposiciones.filas.set(dto.id, { ...m.reposiciones.filas.get(dto.id)!, forma: 'cheque' });
    m.fondos.fondos.set(FONDO_ID, { ...m.fondos.fondos.get(FONDO_ID)!, estado: 'cerrado' });
    await expect(anular(dto.id)).rejects.toMatchObject({ codigo: 'fondo_no_disponible' });
  });

  it('no anula si lo que vuelve a pendiente ya no cabe en el efectivo del fondo', async () => {
    const repuesta = await reponerDosGastos();
    await sembrarComprobante(m, { montoCentavos: 990_000 });

    await expect(anular(repuesta.id)).rejects.toMatchObject({ codigo: 'comprobantes_mayores_que_el_efectivo' });

    expect(m.bancos.anulaciones).toHaveLength(0);
  });

  it('una reposición que no existe o que el usuario no ve da «no encontrada»', async () => {
    await expect(anular('no-existe')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('AtenderMovimientoDeReposicionPorCambiar (aviso de Bancos)', () => {
  const aviso = (cambios: Partial<AvisosEntreModulos['bancos.movimiento_por_cambiar']>) => ({
    movimientoId: 'otro',
    moduloDeOrigen: 'caja-chica',
    documentoDeOrigenId: null,
    cambio: 'anular' as const,
    formaDeAnulacion: 'sin_inverso' as const,
    motivo: 'Desde Bancos',
    fecha: null,
    ...cambios,
  });
  const atender = (cambios: Partial<AvisosEntreModulos['bancos.movimiento_por_cambiar']>) =>
    new AtenderMovimientoDeReposicionPorCambiar(m.dependenciasDeReposiciones).ejecutar(operador, aviso(cambios));

  it('si Bancos anula el cheque, anula la reposición sin volver a ordenar a Bancos', async () => {
    const repuesta = await reponerDosGastos();

    const atendido = await atender({ movimientoId: repuesta.movimientoId! });

    expect(atendido).toBe(true);
    expect(m.reposiciones.filas.get(repuesta.id)).toMatchObject({
      estado: 'anulada',
      motivoDeAnulacion: 'Desde Bancos',
    });
    expect(m.bancos.anulaciones).toHaveLength(0);
    expect(m.comprobantes.pendienteDe(FONDO_ID)).toBe(15_000);
    expect(m.libro.procesados.get('documento-1')).toBe(false);
    expect(m.auditoria.acciones()).toEqual(['caja-chica.reposiciones:anular']);
    expect(m.publicador.nombres()).toEqual(['caja-chica.reposicion_anulada']);
  });

  it('es idempotente: la ya anulada no vuelve a auditarse', async () => {
    const repuesta = await reponerDosGastos();
    await atender({ movimientoId: repuesta.movimientoId! });

    const otra = await atender({ movimientoId: repuesta.movimientoId! });

    expect(otra).toBe(true);
    expect(m.auditoria.entradas).toHaveLength(1);
  });

  it('rechaza cualquier otro cambio, el cheque cobrado y un fondo cerrado', async () => {
    const repuesta = await reponerDosGastos();

    await expect(atender({ movimientoId: repuesta.movimientoId!, cambio: 'corregir' })).rejects.toMatchObject({
      codigo: 'movimiento_de_caja_chica',
    });
    m.conciliados.add(repuesta.movimientoId!);
    await expect(atender({ movimientoId: repuesta.movimientoId! })).rejects.toMatchObject({
      codigo: 'reposicion_cobrada',
    });
    expect(m.reposiciones.filas.get(repuesta.id)!.estado).toBe('vigente');
  });

  it('dice que no es suyo un movimiento que no es de una reposición, para que lo atiendan los fondos', async () => {
    await reponerDosGastos();

    expect(await atender({ movimientoId: 'de-un-fondo' })).toBe(false);
  });
});
