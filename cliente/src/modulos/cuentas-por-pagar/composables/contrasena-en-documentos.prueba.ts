import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDelDocumento } from '../servicios/tipos';
import { detallesDeFicha, etiquetaDeContrasena } from './detalles-de-documento';
import { avisoDeDocumentoEnContrasena } from './reglas-de-acciones';
import { cantidadDeFiltros, consultaDeDocumentos, filtrosIniciales } from './filtros-de-documentos';

describe('contraseña en Documentos por pagar', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('«Sin contraseña» cuenta como filtro y viaja solo si está puesto', () => {
    expect(cantidadDeFiltros({ ...filtrosIniciales(), sinContrasena: true })).toBe(1);
    expect(consultaDeDocumentos(filtrosIniciales(), 1).sinContrasena).toBeUndefined();
    expect(consultaDeDocumentos({ ...filtrosIniciales(), sinContrasena: true }, 1).sinContrasena).toBe(true);
  });

  it('la etiqueta lleva el número ya formateado', () => {
    expect(etiquetaDeContrasena({ numero: '2026-15' })).toBe('Contraseña 2026-15');
  });

  it('la ficha muestra la contraseña solo si el documento está en una', () => {
    const base = {
      proveedorNombre: 'P',
      tipo: 'factura',
      serie: null,
      numero: '1',
      fechaEmision: '2026-01-01',
      origen: 'libro_de_compras',
      fechaRecepcion: '2026-01-02',
      clase: 'cargo',
      vencimiento: null,
      estado: 'autorizado',
    };
    const con = { ...base, contrasena: { id: 'c1', numero: '7' } } as unknown as FichaDelDocumento;
    const sin = { ...base, contrasena: null } as unknown as FichaDelDocumento;
    expect(detallesDeFicha(con).find((d) => d.etiqueta === 'Contraseña de pago')?.valor).toBe('7');
    expect(detallesDeFicha(sin).some((d) => d.etiqueta === 'Contraseña de pago')).toBe(false);
  });

  it('el aviso de la ficha dice la contraseña y qué no se puede hacer', () => {
    expect(avisoDeDocumentoEnContrasena('2026-3', false)).toContain('contraseña 2026-3');
    expect(avisoDeDocumentoEnContrasena('2026-3', false)).toContain('anular, eliminar');
    expect(avisoDeDocumentoEnContrasena('3', true)).toContain('aplicar ni ajustar');
  });
});
