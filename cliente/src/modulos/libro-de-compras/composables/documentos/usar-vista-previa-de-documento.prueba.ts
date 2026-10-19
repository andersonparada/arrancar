import { effectScope, nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { RespuestaDeDocumento } from '../../servicios/registro-de-documentos.api';
import { edicionVacia } from './edicion-de-documento';
import { PAUSA_DE_LA_VISTA_PREVIA, usarVistaPreviaDeDocumento } from './usar-vista-previa-de-documento';

const calcular = vi.hoisted(() => vi.fn());
vi.mock('../../servicios/registro-de-documentos.api', () => ({ apiRegistroDeDocumentos: { calcular } }));
// `onBeforeUnmount` se usa fuera de un componente en estas pruebas.
vi.mock('vue', async (importar) => {
  const vue: Record<string, unknown> = await importar();
  return { ...vue, onBeforeUnmount: vi.fn() };
});

const respuesta = (periodo = '2026-10-01'): RespuestaDeDocumento =>
  ({
    documento: { periodo, fechaRecepcion: '2026-10-18', retenciones: [], lineas: [] },
    avisos: [],
  }) as unknown as RespuestaDeDocumento;

function formularioListo() {
  const edicion = reactive(edicionVacia(new Date(2026, 9, 18)));
  Object.assign(edicion, { proveedorId: 'p-1', numero: '100' });
  Object.assign(edicion.lineas[0]!, { conceptoId: 'c-1', total: 112 });
  return edicion;
}

describe('usarVistaPreviaDeDocumento', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    calcular.mockReset();
    calcular.mockResolvedValue(respuesta());
  });
  afterEach(() => vi.useRealTimers());

  it('espera 400 ms desde la última tecla antes de pedir el cálculo', async () => {
    const edicion = formularioListo();
    effectScope().run(() => usarVistaPreviaDeDocumento(edicion));
    edicion.serie = 'A';
    await nextTick();
    await vi.advanceTimersByTimeAsync(PAUSA_DE_LA_VISTA_PREVIA - 1);
    expect(calcular).not.toHaveBeenCalled();
    edicion.serie = 'AB';
    await nextTick();
    await vi.advanceTimersByTimeAsync(PAUSA_DE_LA_VISTA_PREVIA - 1);
    expect(calcular).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(calcular).toHaveBeenCalledTimes(1);
  });

  it('al salir de un campo calcula de inmediato, y no repite la misma petición', async () => {
    const edicion = formularioListo();
    const previa = effectScope().run(() => usarVistaPreviaDeDocumento(edicion))!;
    await previa.calcularYa();
    expect(calcular).toHaveBeenCalledTimes(1);
    await previa.calcularYa();
    expect(calcular).toHaveBeenCalledTimes(1);
    expect(previa.respuesta.value?.documento.periodo).toBe('2026-10-01');
  });

  it('sin lo mínimo (proveedor, número y una línea) no pide nada', async () => {
    const edicion = reactive(edicionVacia(new Date(2026, 9, 18)));
    const previa = effectScope().run(() => usarVistaPreviaDeDocumento(edicion))!;
    await previa.calcularYa();
    expect(calcular).not.toHaveBeenCalled();
    expect(previa.respuesta.value).toBeNull();
  });

  it('un error de reglas se explica como problema y deja las cifras anteriores marcadas como viejas', async () => {
    const edicion = formularioListo();
    const previa = effectScope().run(() => usarVistaPreviaDeDocumento(edicion))!;
    await previa.calcularYa();
    edicion.numero = '101';
    calcular.mockRejectedValue(new ErrorApi(422, { codigo: 'empresa_sin_datos_fiscales', mensaje: 'Complételos.' }));
    await previa.calcularYa();
    expect(previa.problema.value).toMatchObject({ tipo: 'empresa', mensaje: 'Complételos.' });
    expect(previa.respuesta.value).not.toBeNull();
    expect(previa.desactualizada.value).toBe(true);
  });

  it('un error de validación se reparte por campo', async () => {
    const edicion = formularioListo();
    const previa = effectScope().run(() => usarVistaPreviaDeDocumento(edicion))!;
    const detalles = [{ campo: 'nitEmisor', mensaje: 'NIT inválido.' }];
    calcular.mockRejectedValue(new ErrorApi(400, { codigo: 'validacion', mensaje: 'Revise.', detalles }));
    await previa.calcularYa();
    expect(previa.errores.value).toEqual({ nitEmisor: 'NIT inválido.' });
    expect(previa.problema.value).toBeNull();
  });

  it('descarta la respuesta de una petición vieja', async () => {
    const edicion = formularioListo();
    const previa = effectScope().run(() => usarVistaPreviaDeDocumento(edicion))!;
    let responderLaPrimera: (valor: RespuestaDeDocumento) => void = () => {};
    calcular.mockReturnValueOnce(new Promise<RespuestaDeDocumento>((resolver) => (responderLaPrimera = resolver)));
    const primera = previa.calcularYa();
    edicion.numero = '101';
    calcular.mockResolvedValueOnce(respuesta('2026-09-01'));
    await previa.calcularYa();
    responderLaPrimera(respuesta('2026-08-01'));
    await primera;
    expect(previa.respuesta.value?.documento.periodo).toBe('2026-09-01');
  });
});
