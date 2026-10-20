import { describe, expect, it } from 'vitest';
import type { Empresa } from '../servicios/empresas.api';
import { detallesDeEmpresa } from './detalles-de-empresa';

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
