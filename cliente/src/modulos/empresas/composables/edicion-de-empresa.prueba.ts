import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { Empresa } from '../servicios/empresas.api';
import {
  cambiaElNitExistente,
  datosDeLaEmpresa,
  edicionDe,
  nitBloqueado,
  normalizarNit,
  senalarElMotivo,
  type EdicionDeEmpresa,
} from './edicion-de-empresa';

describe('edición de empresa con secciones de otros módulos', () => {
  it('una edición nueva empieza sin secciones', () => {
    expect(edicionDe().secciones).toEqual({});
  });

  it('envía solo las secciones que ya tienen valor', () => {
    const edicion = edicionDe();
    edicion.secciones = { 'libro-de-compras': { regimenIva: 'general' }, otro: undefined };
    expect(datosDeLaEmpresa(edicion).secciones).toEqual({ 'libro-de-compras': { regimenIva: 'general' } });
  });
});

describe('cambio de NIT de la empresa', () => {
  const conNit = (nit: string): EdicionDeEmpresa => {
    const empresa = { id: 'e1', nombre: 'Finca', nit, activa: true } as Empresa;
    return edicionDe(empresa);
  };

  it('normalizarNit quita guion y espacios y pone mayúscula', () => {
    expect(normalizarNit(' 12 34-5k ')).toBe('12345K');
    expect(normalizarNit(null)).toBe('');
  });

  it('el mismo NIT con guion o en minúscula no pide motivo y manda null', () => {
    const edicion = conNit('12345-K');
    edicion.nit = '12345k';
    expect(cambiaElNitExistente(edicion)).toBe(false);
    expect(datosDeLaEmpresa(edicion).motivoDelNit).toBeNull();
  });

  it('quitar el NIT pide motivo y lo manda recortado', () => {
    const edicion = conNit('12345-K');
    edicion.nit = '   ';
    edicion.motivoDelNit = '  error de captura ';
    expect(cambiaElNitExistente(edicion)).toBe(true);
    expect(datosDeLaEmpresa(edicion).motivoDelNit).toBe('error de captura');
    edicion.nit = '';
    expect(cambiaElNitExistente(edicion)).toBe(true);
  });

  it('agregar NIT a una empresa sin NIT no pide motivo ni bloquea el campo', () => {
    const edicion = conNit('');
    edicion.nit = '999';
    expect(cambiaElNitExistente(edicion)).toBe(false);
    expect(nitBloqueado(edicion, false)).toBe(false);
  });

  it('el campo se bloquea solo con NIT y sin permiso', () => {
    const edicion = conNit('12345-K');
    expect(nitBloqueado(edicion, false)).toBe(true);
    expect(nitBloqueado(edicion, true)).toBe(false);
  });

  it('señala el motivo cuando el servidor lo pide y deja pasar otros errores', () => {
    const pedido = new ErrorApi(400, { codigo: 'motivo_del_cambio_de_nit_requerido', mensaje: 'Falta el motivo' });
    const resultado = senalarElMotivo(pedido) as ErrorApi;
    expect(resultado.detalles).toEqual({ campo: 'motivoDelNit' });
    expect(resultado.message).toBe('Falta el motivo');
    const prohibido = new ErrorApi(403, { codigo: 'prohibido', mensaje: 'No' });
    expect(senalarElMotivo(prohibido)).toBe(prohibido);
  });
});
