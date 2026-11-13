import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import type { Empresa } from '../servicios/empresas.api';
import { detallesDeCargaInicial, detallesDeEmpresa } from './detalles-de-empresa';

// Las fechas dan formato con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const empresa: Empresa = {
  id: 'e1',
  nombre: 'Comercial San José',
  nit: '1234567-8',
  direccion: null,
  telefono: null,
  correo: 'a@b.gt',
  monedaBase: 'GTQ',
  activa: false,
  actualizadoEn: '2026-01-01T00:00:00Z',
};

describe('detalles de la ficha de la empresa', () => {
  it('dice «Sin registrar» en lo que falta y marca el estado', () => {
    const porEtiqueta = Object.fromEntries(detallesDeEmpresa(empresa).map((d) => [d.etiqueta, d.valor]));
    expect(porEtiqueta).toMatchObject({
      NIT: '1234567-8',
      Dirección: 'Sin registrar',
      Teléfono: 'Sin registrar',
      Correo: 'a@b.gt',
      Estado: 'Desactivada',
    });
  });
});

describe('fecha de inicio y carga inicial en la ficha', () => {
  const carga: CargaInicial = {
    empresaId: 'e1',
    fechaDeInicio: '2026-11-01',
    cerrada: false,
    cerradaEn: null,
    cerradaPor: null,
  };
  const porEtiqueta = (c: CargaInicial) =>
    Object.fromEntries(detallesDeCargaInicial(c).map((d) => [d.etiqueta, d.valor]));

  it('muestra la fecha de inicio y que la carga sigue abierta', () => {
    const detalles = porEtiqueta(carga);

    expect(detalles['Fecha de inicio']).toContain('2026');
    expect(detalles['Carga inicial']).toBe('Abierta');
  });

  it('sin fecha dice «Sin registrar»; con la carga cerrada lo dice', () => {
    expect(porEtiqueta({ ...carga, fechaDeInicio: null })['Fecha de inicio']).toBe('Sin registrar');
    expect(porEtiqueta({ ...carga, cerrada: true })['Carga inicial']).toBe('Cerrada');
  });
});
