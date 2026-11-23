import { describe, expect, it } from 'vitest';
import { ClienteObligatorio, ReceptorInvalido } from './errores-de-documento.js';
import { resolverReceptor, type ClienteDelDocumento } from './receptor.js';

const NIT_VALIDO = '1234567-9';
const cliente = (cambios: Partial<ClienteDelDocumento> = {}): ClienteDelDocumento => ({
  nit: null,
  dpi: null,
  nombre: 'Distribuidora Quiroa',
  ...cambios,
});

describe('receptor del documento', () => {
  it('sin cliente es consumidor final', () => {
    expect(resolverReceptor({}, null)).toEqual({
      tipoDeIdentificacion: 'cf',
      nitReceptor: 'CF',
      nombreReceptor: 'Consumidor final',
    });
    expect(resolverReceptor({ nitReceptor: 'cf', nombreReceptor: 'Juan' }, null).nombreReceptor).toBe('Juan');
  });

  it('sin cliente no cabe un NIT', () => {
    expect(() => resolverReceptor({ nitReceptor: NIT_VALIDO }, null)).toThrow(ClienteObligatorio);
    expect(() => resolverReceptor({ tipoDeIdentificacion: 'nit' }, null)).toThrow(ClienteObligatorio);
  });

  it('con cliente toma su NIT y su nombre', () => {
    const receptor = resolverReceptor({}, cliente({ nit: NIT_VALIDO }));

    expect(receptor).toEqual({
      tipoDeIdentificacion: 'nit',
      nitReceptor: '12345679',
      nombreReceptor: 'Distribuidora Quiroa',
    });
  });

  it('lo que escribe el usuario manda sobre el cliente', () => {
    const receptor = resolverReceptor(
      { nitReceptor: '576937-K', nombreReceptor: 'Otro nombre' },
      cliente({ nit: NIT_VALIDO }),
    );

    expect(receptor).toMatchObject({ nitReceptor: '576937K', nombreReceptor: 'Otro nombre' });
  });

  it('un cliente sin NIT ni CUI va como consumidor final', () => {
    expect(resolverReceptor({}, cliente())).toMatchObject({ tipoDeIdentificacion: 'cf', nitReceptor: 'CF' });
  });

  it('un extranjero lleva su identificación tal cual', () => {
    const receptor = resolverReceptor({ tipoDeIdentificacion: 'extranjero', nitReceptor: 'AB-123456' }, cliente());

    expect(receptor).toMatchObject({ tipoDeIdentificacion: 'extranjero', nitReceptor: 'AB-123456' });
  });

  it('rechaza un NIT con el verificador equivocado', () => {
    expect(() => resolverReceptor({ nitReceptor: '1234567-1' }, cliente())).toThrow(ReceptorInvalido);
  });

  it('un cliente con el tipo cf escrito pero otro NIT es contradictorio', () => {
    expect(() => resolverReceptor({ tipoDeIdentificacion: 'cf', nitReceptor: NIT_VALIDO }, cliente())).toThrow(
      ReceptorInvalido,
    );
  });
});
