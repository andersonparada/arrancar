import { describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { FichaTercero } from '../servicios/terceros.api';
import { conConfirmacionDeDuplicado, DESISTIO } from './confirmar-duplicado';
import { altaCompleta, contactoVacio, datosDeLaFicha, datosVacios, papelesVacios } from './datos-de-tercero';
import { consultaDelListado } from './usar-listado-de-terceros';

describe('alta completa', () => {
  it('entra con el papel de la pantalla y deja fuera los contactos sin nombre', () => {
    const papeles = papelesVacios();
    papeles.proveedor.categoriaId = 'veterinaria';
    const contactos = [{ ...contactoVacio(), nombre: 'Marta' }, contactoVacio()];

    const alta = altaCompleta(datosVacios(), 'proveedor', { papeles, contactos });

    expect(alta.papel).toEqual({ tipo: 'proveedor', categoriaId: 'veterinaria', activo: true, notas: null });
    expect(alta.contactos.map((c) => c.nombre)).toEqual(['Marta']);
  });

  it('al editar solo toma de la ficha los datos que se pueden cambiar', () => {
    const ficha = {
      ...datosVacios(),
      id: 'x',
      nombreMostrar: 'Ana',
      contactos: [],
      cliente: null,
    } as unknown as FichaTercero;

    expect(Object.keys(datosDeLaFicha(ficha)).sort()).toEqual(Object.keys(datosVacios()).sort());
  });
});

describe('listado por papel', () => {
  it('siempre pide el papel de la pantalla y omite los filtros vacíos', () => {
    expect(consultaDelListado('cliente', { texto: '  ', estado: '' })).toEqual({
      papel: 'cliente',
      texto: undefined,
      activo: undefined,
    });
    expect(consultaDelListado('proveedor', { texto: 'Ana', estado: 'false' })).toMatchObject({ activo: false });
  });
});

describe('posible duplicado', () => {
  const parecido = new ErrorApi(409, 'conflicto', 'Se parece a Ana López.');

  it('si el usuario confirma, guarda de todas formas', async () => {
    const guardar = vi.fn().mockRejectedValueOnce(parecido).mockResolvedValueOnce('guardado');

    const resultado = await conConfirmacionDeDuplicado(guardar, () => true);

    expect(resultado).toBe('guardado');
    expect(guardar).toHaveBeenLastCalledWith(true);
  });

  it('si el usuario desiste, no guarda', async () => {
    const guardar = vi.fn().mockRejectedValue(parecido);

    expect(await conConfirmacionDeDuplicado(guardar, () => false)).toBe(DESISTIO);
    expect(guardar).toHaveBeenCalledTimes(1);
  });

  it('cualquier otro error sigue su curso', async () => {
    const otro = new ErrorApi(400, 'validacion', 'Revise los datos.');

    await expect(
      conConfirmacionDeDuplicado(
        () => Promise.reject(otro),
        () => true,
      ),
    ).rejects.toBe(otro);
  });
});
