import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { usarAvisos } from '../almacenes/avisos';
import { ErrorApi } from '../servicios/cliente-http';
import { quitarErrorAlCambiar, sinErrorDe, usarErrorDescartable, usarFormulario } from './usar-formulario';

describe('usarFormulario', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('reparte los errores de validación por campo sin avisar', async () => {
    const { enviar, errores } = usarFormulario();
    const detalles = [{ campo: 'nombre', mensaje: 'Falta el nombre.' }];
    const error = new ErrorApi(400, { codigo: 'dato_invalido', mensaje: 'Datos inválidos', detalles });
    expect(await enviar(() => Promise.reject(error))).toBe(false);
    expect(errores.value).toEqual({ nombre: 'Falta el nombre.' });
    expect(usarAvisos().avisos).toHaveLength(0);
  });

  it('un conflicto que señala un campo lo marca y además avisa', async () => {
    const { enviar, errores } = usarFormulario();
    const detalles = { campo: 'secciones.libro-de-compras.vigenteDesde', periodo: '2026-10-01' };
    const error = new ErrorApi(409, {
      codigo: 'vigencia_fiscal_en_uso',
      mensaje: 'Hay documentos en octubre.',
      detalles,
    });
    await enviar(() => Promise.reject(error));
    expect(errores.value).toEqual({ 'secciones.libro-de-compras.vigenteDesde': 'Hay documentos en octubre.' });
    expect(usarAvisos().avisos.map((a) => a.mensaje)).toEqual(['Hay documentos en octubre.']);
  });

  it('un error sin campo solo avisa', async () => {
    const { enviar, errores } = usarFormulario();
    await enviar(() => Promise.reject(new Error('Sin conexión')));
    expect(errores.value).toEqual({});
    expect(usarAvisos().avisos).toHaveLength(1);
  });

  it('quita el error de un campo en cuanto cambia su valor, sin tocar los demás', async () => {
    const { enviar, errores } = usarFormulario();
    const motivo = ref('');
    quitarErrorAlCambiar(errores, 'motivo', () => motivo.value);
    const detalles = [
      { campo: 'motivo', mensaje: 'Escriba el motivo.' },
      { campo: 'observaciones', mensaje: 'Demasiado largo.' },
    ];
    await enviar(() => Promise.reject(new ErrorApi(400, { codigo: 'dato_invalido', mensaje: 'Datos', detalles })));
    motivo.value = 'C';
    await nextTick();
    expect(errores.value).toEqual({ observaciones: 'Demasiado largo.' });
  });

  it('volver a enviar sin cambiar el campo no reaparece con el error limpio', async () => {
    const { enviar, errores } = usarFormulario();
    const motivo = ref('');
    quitarErrorAlCambiar(errores, 'motivo', () => motivo.value);
    motivo.value = 'Corrección';
    await nextTick();
    expect(errores.value).toEqual({});
    expect(await enviar(() => Promise.resolve())).toBe(true);
  });
});

describe('sinErrorDe', () => {
  it('devuelve otro objeto sin el campo indicado', () => {
    const original = { motivo: 'Falta.', fecha: 'Inválida.' };
    expect(sinErrorDe(original, 'motivo')).toEqual({ fecha: 'Inválida.' });
    expect(original).toEqual({ motivo: 'Falta.', fecha: 'Inválida.' });
  });

  it('devuelve el mismo objeto si el campo no tiene error', () => {
    const original = { fecha: 'Inválida.' };
    expect(sinErrorDe(original, 'motivo')).toBe(original);
  });
});

describe('usarErrorDescartable', () => {
  const montar = (campo: string) => {
    const errores = ref<Record<string, string>>({});
    const formulario = ref({ nombre: '', lineas: [{ monto: '' }] });
    const valor = campo === 'nombre' ? () => formulario.value.nombre : () => formulario.value.lineas[0]!.monto;
    const visible = usarErrorDescartable(() => errores.value[campo], valor);
    return { errores, formulario, visible };
  };

  it('oculta el error de un campo simple al cambiarlo y no toca el de otros', async () => {
    const a = montar('nombre');
    const b = montar('lineas.0.monto');
    a.errores.value = { nombre: 'Falta.' };
    b.errores.value = { 'lineas.0.monto': 'Mal.' };
    await nextTick();
    expect([a.visible.value, b.visible.value]).toEqual(['Falta.', 'Mal.']);
    a.formulario.value.nombre = 'X';
    await nextTick();
    expect(a.visible.value).toBeUndefined();
    expect(b.visible.value).toBe('Mal.');
  });

  it('en un campo anidado se oculta al cambiar ese valor', async () => {
    const { errores, formulario, visible } = montar('lineas.0.monto');
    errores.value = { 'lineas.0.monto': 'Mal.' };
    await nextTick();
    formulario.value.lineas[0]!.monto = '5';
    await nextTick();
    expect(visible.value).toBeUndefined();
  });

  it('un error nuevo, aunque sea el mismo texto, vuelve a verse', async () => {
    const { errores, formulario, visible } = montar('nombre');
    errores.value = { nombre: 'Falta.' };
    await nextTick();
    formulario.value.nombre = 'X';
    await nextTick();
    errores.value = {};
    await nextTick();
    errores.value = { nombre: 'Falta.' };
    await nextTick();
    expect(visible.value).toBe('Falta.');
  });
});
