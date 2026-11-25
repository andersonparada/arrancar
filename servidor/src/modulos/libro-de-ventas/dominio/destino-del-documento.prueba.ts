import { describe, expect, it } from 'vitest';
import { resolverDestino, type DatosDelDestino } from './destino-del-documento.js';
import { DestinoInactivo, DestinoNoAdmitido } from './errores-de-baja.js';
import {
  avisosDeLaFechaDeInicio,
  AVISO_DE_MES_INCOMPLETO,
  exigirPosteriorALaFechaDeInicio,
} from './fecha-de-inicio.js';
import { DocumentoAnteriorALaFechaDeInicio } from './errores-de-documento.js';

const datos = (cambios: Partial<DatosDelDestino> = {}): DatosDelDestino => ({
  solicitado: undefined,
  tipo: 'factura',
  tipoDeIdentificacion: 'nit',
  tieneCliente: true,
  activos: ['cuentas-por-cobrar'],
  consumidorFinal: 'sin_cartera',
  ...cambios,
});

describe('destino de un documento', () => {
  it('con cliente y la cartera activa, va a la cartera', () => {
    expect(resolverDestino(datos())).toBe('cuentas-por-cobrar');
  });

  it('sin la cartera activa no va a ninguna parte', () => {
    expect(resolverDestino(datos({ activos: [] }))).toBeNull();
  });

  it('sin cliente (consumidor final de mostrador) no es cartera', () => {
    expect(resolverDestino(datos({ tieneCliente: false, tipoDeIdentificacion: 'cf' }))).toBeNull();
  });

  it('un cliente con CF sigue la configuración del consumidor final', () => {
    expect(resolverDestino(datos({ tipoDeIdentificacion: 'cf' }))).toBeNull();
    expect(resolverDestino(datos({ tipoDeIdentificacion: 'cf', consumidorFinal: 'cuentas_por_cobrar' }))).toBe(
      'cuentas-por-cobrar',
    );
  });

  it('la factura especial y el recibo no son cartera', () => {
    expect(resolverDestino(datos({ tipo: 'factura_especial_recibida' }))).toBeNull();
    expect(resolverDestino(datos({ tipo: 'recibo' }))).toBeNull();
  });

  it('se puede pedir «ninguno» aunque la cartera esté activa', () => {
    expect(resolverDestino(datos({ solicitado: 'ninguno' }))).toBeNull();
  });

  it('pedir la cartera sin cliente, con un tipo que no es cartera o con el módulo apagado es error', () => {
    const pedido = { solicitado: 'cuentas-por-cobrar' } as const;

    expect(() => resolverDestino(datos({ ...pedido, tieneCliente: false }))).toThrow(DestinoNoAdmitido);
    expect(() => resolverDestino(datos({ ...pedido, tipo: 'recibo' }))).toThrow(DestinoNoAdmitido);
    expect(() => resolverDestino(datos({ ...pedido, activos: [] }))).toThrow(DestinoInactivo);
  });

  it('una nota va al mismo destino que su factura', () => {
    expect(resolverDestino(datos({ tipo: 'nota_de_credito', destinoDeLaFactura: 'cuentas-por-cobrar' }))).toBe(
      'cuentas-por-cobrar',
    );
    expect(resolverDestino(datos({ tipo: 'nota_de_credito', destinoDeLaFactura: null }))).toBeNull();
  });

  it('una nota no puede pedir otro destino que su factura', () => {
    const sobreCartera = datos({
      tipo: 'nota_de_credito',
      destinoDeLaFactura: 'cuentas-por-cobrar',
      solicitado: 'ninguno',
    });
    const sobreContado = datos({ tipo: 'nota_de_credito', destinoDeLaFactura: null, solicitado: 'cuentas-por-cobrar' });

    expect(() => resolverDestino(sobreCartera)).toThrow(DestinoNoAdmitido);
    expect(() => resolverDestino(sobreContado)).toThrow(DestinoNoAdmitido);
  });

  it('si la factura está en la cartera y la cartera se apagó, la nota no se registra', () => {
    const intento = () =>
      resolverDestino(datos({ tipo: 'nota_de_credito', destinoDeLaFactura: 'cuentas-por-cobrar', activos: [] }));

    expect(intento).toThrow(DestinoInactivo);
  });
});

describe('fecha de inicio de la empresa', () => {
  it('un documento anterior a la fecha de inicio es error', () => {
    expect(() => exigirPosteriorALaFechaDeInicio('2026-01-31', '2026-02-01')).toThrow(
      DocumentoAnteriorALaFechaDeInicio,
    );
    expect(() => exigirPosteriorALaFechaDeInicio('2026-02-01', '2026-02-01')).not.toThrow();
    expect(() => exigirPosteriorALaFechaDeInicio('1999-01-01', null)).not.toThrow();
  });

  it('si la fecha de inicio no es día 1 avisa que el libro de ese mes queda incompleto', () => {
    expect(avisosDeLaFechaDeInicio('2026-02-20', '2026-02-15')).toEqual([AVISO_DE_MES_INCOMPLETO]);
    expect(avisosDeLaFechaDeInicio('2026-03-20', '2026-02-15')).toEqual([]);
    expect(avisosDeLaFechaDeInicio('2026-02-20', '2026-02-01')).toEqual([]);
    expect(avisosDeLaFechaDeInicio('2026-02-20', null)).toEqual([]);
  });
});
