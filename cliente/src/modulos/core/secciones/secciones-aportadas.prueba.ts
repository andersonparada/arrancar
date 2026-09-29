import { describe, expect, it } from 'vitest';
import type { DefinicionModuloCliente, SeccionAportada } from '../tipos';
import { erroresDeLaSeccion, seccionesDe, seccionesParaEnviar } from './secciones-aportadas';

const componente = () => Promise.resolve({ default: {} });
const seccion = (cambios: Partial<SeccionAportada>): SeccionAportada => ({
  en: 'proveedor',
  titulo: 'Sección',
  orden: 10,
  formulario: componente,
  ...cambios,
});
const modulo = (clave: string, secciones?: SeccionAportada[]): DefinicionModuloCliente => ({
  clave,
  rutas: [],
  menu: [],
  secciones,
});

describe('secciones que un módulo aporta', () => {
  const modulos = [
    modulo('terceros'),
    modulo('libro-de-compras', [
      seccion({ titulo: 'Fiscal de proveedor' }),
      seccion({ en: 'empresa', titulo: 'Fiscal de empresa' }),
    ]),
    modulo('cuentas-por-pagar', [seccion({ titulo: 'Crédito', orden: 5 })]),
  ];

  it('solo las del formulario pedido y de módulos activos, en su orden', () => {
    const activos = (clave: string) => clave !== 'terceros';

    const titulos = seccionesDe(modulos, 'proveedor', activos).map(({ seccion: s }) => s.titulo);

    expect(titulos).toEqual(['Crédito', 'Fiscal de proveedor']);
    expect(seccionesDe(modulos, 'empresa', activos).map(({ modulo: m }) => m)).toEqual(['libro-de-compras']);
  });

  it('un módulo inactivo no aporta nada', () => {
    const soloLibro = (clave: string) => clave === 'libro-de-compras';

    expect(seccionesDe(modulos, 'proveedor', soloLibro).map(({ modulo: m }) => m)).toEqual(['libro-de-compras']);
    expect(seccionesDe(modulos, 'proveedor', () => false)).toEqual([]);
  });

  it('con el mismo orden, respeta el del índice de módulos', () => {
    const empatados = [
      modulo('primero', [seccion({ titulo: 'A' })]),
      modulo('segundo', [seccion({ titulo: 'B' })]),
    ];

    expect(seccionesDe(empatados, 'proveedor', () => true).map(({ modulo: m }) => m)).toEqual(['primero', 'segundo']);
  });
});

describe('errores de una sección', () => {
  const errores = {
    nombre: 'Falta el nombre.',
    'secciones.libro-de-compras.regimenIsr': 'Escoja el régimen.',
    'secciones.otro-modulo.campo': 'De otro módulo.',
  };

  it('quita el prefijo y deja solo los de su módulo', () => {
    expect(erroresDeLaSeccion(errores, 'libro-de-compras')).toEqual({ regimenIsr: 'Escoja el régimen.' });
  });

  it('sin errores suyos, devuelve un objeto vacío', () => {
    expect(erroresDeLaSeccion({ nombre: 'x' }, 'libro-de-compras')).toEqual({});
  });
});

describe('secciones que se envían', () => {
  it('omite las que aún no tienen valor', () => {
    const valores = { 'libro-de-compras': { esPequenoContribuyente: false }, otro: undefined };

    expect(seccionesParaEnviar(valores)).toEqual({ 'libro-de-compras': { esPequenoContribuyente: false } });
  });

  it('sin secciones, un objeto vacío', () => {
    expect(seccionesParaEnviar({})).toEqual({});
  });
});
