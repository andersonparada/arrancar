import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProveedorParaSaldo } from '../../servicios/tipos-de-saldos-iniciales';
import {
  ayudaDeLaCarga,
  detallesDelCuadre,
  opcionesDeProveedorParaCargar,
  opcionesDeProveedorParaFiltro,
  opcionesDeTipoDeSaldo,
  situacionDeLaCarga,
} from './detalles-de-saldo-inicial';

// Las fechas y los montos se formatean con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const proveedores: ProveedorParaSaldo[] = [
  { id: '2', nombre: 'Zeta', activo: true },
  { id: '1', nombre: 'álamo', activo: true },
  { id: '3', nombre: 'Baja', activo: false },
];

describe('situación de la carga', () => {
  it('sin fecha de inicio no se puede cargar y se explica cómo arreglarlo', () => {
    const situacion = situacionDeLaCarga({ fechaDeInicio: null, cerrada: false });
    expect(situacion).toMatchObject({ situacion: 'sin-fecha', puedeCargar: false });
    expect(ayudaDeLaCarga('sin-fecha')).toMatch(/ficha de la empresa/);
  });

  it('abierta se puede cargar; cerrada no', () => {
    expect(situacionDeLaCarga({ fechaDeInicio: '2026-10-04', cerrada: false })).toMatchObject({
      situacion: 'abierta',
      puedeCargar: true,
    });
    const cerrada = situacionDeLaCarga({ fechaDeInicio: '2026-10-04', cerrada: true });
    expect(cerrada).toMatchObject({ situacion: 'cerrada', puedeCargar: false });
    expect(cerrada.texto).toMatch(/Carga cerrada/);
    expect(ayudaDeLaCarga('abierta')).toBe('');
  });
});

describe('opciones de selectores', () => {
  it('el filtro ordena por nombre sin importar acentos y empieza por «Todos»', () => {
    const textos = opcionesDeProveedorParaFiltro(proveedores).map((o) => o.texto);
    expect(textos).toEqual(['Todos los proveedores', 'álamo', 'Baja', 'Zeta']);
  });

  it('para cargar solo hay activos, y al corregir también el que ya tenía el saldo', () => {
    expect(opcionesDeProveedorParaCargar(proveedores, null).map((o) => o.texto)).toEqual([
      'Elija el proveedor',
      'álamo',
      'Zeta',
    ]);
    expect(opcionesDeProveedorParaCargar(proveedores, '3').map((o) => o.texto)).toContain('Baja (inactivo)');
  });

  it('los tipos de documento van por nombre', () => {
    const textos = opcionesDeTipoDeSaldo().map((o) => o.texto);
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
    expect(textos).toContain('Nota de crédito');
  });
});

describe('cuadre', () => {
  it('muestra cada total por separado, con el neto aparte', () => {
    const etiquetas = detallesDelCuadre({
      documentos: 3,
      cargos: '100.00',
      notasAFavor: '30.00',
      neto: '70.00',
      retencionesPorPracticar: '5.00',
    }).map((d) => d.etiqueta);
    expect(etiquetas).toEqual([
      'Documentos',
      'Cargos',
      'Notas a favor',
      'Neto (cargos menos notas)',
      'Retenciones por practicar',
    ]);
  });
});
