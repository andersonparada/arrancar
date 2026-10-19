import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { usarAvisos } from '../almacenes/avisos';
import { ErrorApi } from '../servicios/cliente-http';
import { usarFormulario } from './usar-formulario';

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
});
