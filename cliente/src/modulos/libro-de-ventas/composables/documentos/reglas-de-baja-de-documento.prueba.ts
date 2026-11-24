import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { fichaDeDocumento } from './documentos.soporte';
import {
  datosDeAnulacion,
  erroresDeAnulacion,
  explicacionesDeAcciones,
  MAXIMO_DEL_MOTIVO,
  mensajeDeEliminacion,
  opcionesDeCausa,
  resumenDeAnulacion,
} from './reglas-de-baja-de-documento';

beforeEach(() => setActivePinia(createPinia()));

const nota = (estado: 'vigente' | 'anulado') => ({
  id: 'n1',
  tipo: 'nota_de_credito' as const,
  serie: null,
  numero: '1',
  fechaEmision: '2026-11-12',
  total: '100.00',
  estado,
});

describe('anular un documento', () => {
  it('pide causa y motivo y dice cómo corregir', () => {
    const errores = erroresDeAnulacion({ abierta: true, causa: '', motivo: ' ' });

    expect(errores.causa).toContain('Escoja');
    expect(errores.motivo).toContain('Cuente');
    expect(erroresDeAnulacion({ abierta: true, causa: 'error_de_captura', motivo: 'Duplicado' })).toEqual({});
  });

  it('el motivo no pasa del máximo', () => {
    const largo = 'x'.repeat(MAXIMO_DEL_MOTIVO + 1);

    expect(erroresDeAnulacion({ abierta: true, causa: 'error_de_captura', motivo: largo }).motivo).toContain('300');
  });

  it('manda la causa y el motivo recortado', () => {
    expect(datosDeAnulacion({ abierta: true, causa: 'fel_anulada_en_la_sat', motivo: ' Ya anulada ' })).toEqual({
      causa: 'fel_anulada_en_la_sat',
      motivo: 'Ya anulada',
    });
  });

  it('las causas van por nombre después de la invitación a escoger', () => {
    const textos = opcionesDeCausa().map((opcion) => opcion.texto);

    expect(textos[0]).toBe('Escoja la causa');
    expect(textos.slice(1)).toEqual([...textos.slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('el resumen dice qué se anula y avisa de la cartera solo si la tiene', () => {
    expect(resumenDeAnulacion(fichaDeDocumento())).toContain('cuentas por cobrar');
    expect(resumenDeAnulacion(fichaDeDocumento({ destino: null }))).not.toContain('cuentas por cobrar');
    expect(resumenDeAnulacion(fichaDeDocumento())).toContain('Factura A-100');
  });

  it('el mensaje de eliminar dice que no se deshace', () => {
    expect(mensajeDeEliminacion(fichaDeDocumento())).toContain('no se puede deshacer');
  });
});

describe('por qué no se puede anular ni eliminar', () => {
  it('un documento anulado no explica nada', () => {
    expect(explicacionesDeAcciones(fichaDeDocumento({ estado: 'anulado' }))).toEqual([]);
  });

  it('con notas vigentes pide anularlas primero', () => {
    const ficha = fichaDeDocumento({ puedeAnular: false, notas: [nota('vigente')] });

    expect(explicacionesDeAcciones(ficha)[0]).toContain('primero anule las notas');
  });

  it('procesado por la cartera solo se puede anular', () => {
    const ficha = fichaDeDocumento({ procesado: true, puedeEliminar: false });

    expect(explicacionesDeAcciones(ficha)).toEqual([expect.stringContaining('la cartera ya lo procesó')]);
  });

  it('con notas anuladas tampoco se elimina', () => {
    const ficha = fichaDeDocumento({ puedeEliminar: false, notas: [nota('anulado')] });

    expect(explicacionesDeAcciones(ficha)).toEqual([expect.stringContaining('tiene notas')]);
  });

  it('si el servidor deja hacer todo, no explica nada', () => {
    expect(explicacionesDeAcciones(fichaDeDocumento({ puedeEliminar: true }))).toEqual([]);
  });
});
