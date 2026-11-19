import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { edicionDeMotivo, faltaElMotivo } from './edicion-de-motivo';
import { usarVentanaDeAccion } from './usar-ventana-de-accion';

beforeEach(() => setActivePinia(createPinia()));

function armar(enviar: (motivo: string) => Promise<string>) {
  const alTerminar = vi.fn();
  const ventana = usarVentanaDeAccion({
    inicial: edicionDeMotivo,
    validar: faltaElMotivo,
    enviar: ({ motivo }) => enviar(motivo),
    exito: (respuesta) => `Listo: ${respuesta}`,
    alTerminar,
  });
  return { ventana, alTerminar };
}

describe('usarVentanaDeAccion', () => {
  it('abre con una edición nueva y limpia lo que quedó de antes', async () => {
    const { ventana } = armar(async () => 'ok');
    ventana.edicion.value.motivo = 'viejo';
    ventana.errores.value = { motivo: 'x' };
    await ventana.abrir();
    expect(ventana.abierta.value).toBe(true);
    expect(ventana.edicion.value.motivo).toBe('');
    expect(ventana.errores.value).toEqual({});
  });

  it('sin lo que falta no envía y deja el error en su campo', async () => {
    const enviar = vi.fn(async () => 'ok');
    const { ventana, alTerminar } = armar(enviar);
    await ventana.abrir();
    await ventana.guardar();
    expect(enviar).not.toHaveBeenCalled();
    expect(ventana.errores.value.motivo).toContain('Escriba el motivo');
    expect(alTerminar).not.toHaveBeenCalled();
    expect(ventana.abierta.value).toBe(true);
  });

  it('al salir bien avisa, se cierra y avisa a quien la usa', async () => {
    const { ventana, alTerminar } = armar(async () => 'hecho');
    await ventana.abrir();
    ventana.edicion.value.motivo = 'Porque sí';
    await ventana.guardar();
    expect(ventana.abierta.value).toBe(false);
    expect(alTerminar).toHaveBeenCalledWith('hecho');
    expect(usarAvisos().avisos.map((a) => a.mensaje)).toContain('Listo: hecho');
  });

  it('si el servidor rechaza un campo, queda abierta con el error en ese campo', async () => {
    const rechazo = new ErrorApi(400, {
      codigo: 'datos_invalidos',
      mensaje: 'Datos inválidos',
      detalles: [{ campo: 'motivo', mensaje: 'Muy corto' }],
    });
    const { ventana, alTerminar } = armar(() => Promise.reject(rechazo));
    await ventana.abrir();
    ventana.edicion.value.motivo = 'x';
    await ventana.guardar();
    expect(ventana.abierta.value).toBe(true);
    expect(ventana.errores.value).toEqual({ motivo: 'Muy corto' });
    expect(alTerminar).not.toHaveBeenCalled();
  });
});
