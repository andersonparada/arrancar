import { describe, expect, it } from 'vitest';
import {
  armarDocumentoDeVenta,
  type ContextoDelArmado,
  type FacturaAfectada,
  type SolicitudArmada,
} from './armado-del-documento.js';
import { DocumentoAnteriorALaFechaDeInicio, DocumentoInvalido, RegimenDerogado } from './errores-de-documento.js';
import { NotaExcedeLaFactura, NotaSinFactura, NotaSobreFacturaEspecial } from './errores-de-notas.js';
import { AVISO_DE_EMPRESA_INSCRITA } from './regimen-de-la-empresa.js';
import { AVISO_DE_NOTA_DE_ABONO, AVISO_DE_NOTA_DE_CREDITO_TARDIA } from './reglas-de-notas.js';

const CONCEPTO = '22222222-2222-4222-8222-222222222222';
const CLIENTE = {
  id: '44444444-4444-4444-8444-444444444444',
  nit: '576937K',
  dpi: null,
  nombre: 'Distribuidora Quiroa',
};

const solicitud = (cambios: Partial<SolicitudArmada> = {}): SolicitudArmada => ({
  tipo: 'factura',
  tipoDte: null,
  clienteId: CLIENTE.id,
  serie: 'a',
  numero: '15',
  autorizacionFel: null,
  localidadId: null,
  fechaEmision: '2026-03-15',
  documentoAfectadoId: null,
  facturaAnterior: null,
  ivaDelDte: null,
  observaciones: null,
  lineas: [
    {
      conceptoDeIngresoId: CONCEPTO,
      tipo: 'bien',
      claseFiscal: 'gravada',
      descripcion: null,
      total: 11200,
      otrosImpuestos: 0,
    },
  ],
  ...cambios,
});

const contexto = (cambios: Partial<ContextoDelArmado> = {}): ContextoDelArmado => ({
  empresaId: '55555555-5555-4555-8555-555555555555',
  fechaDeInicio: null,
  regimen: { regimenIva: 'general', regimenIsr: 'utilidades' },
  regimenDeLaFacturaAnterior: null,
  tasaDeIva: 1200,
  fechaDeDerogacion: '2025-07-09',
  cliente: CLIENTE,
  facturaAfectada: null,
  destinosActivos: [],
  consumidorFinal: 'sin_cartera',
  ...cambios,
});

const factura = (cambios: Partial<FacturaAfectada> = {}): FacturaAfectada => ({
  id: '66666666-6666-4666-8666-666666666666',
  tipo: 'factura',
  estado: 'vigente',
  clienteId: CLIENTE.id,
  fechaEmision: '2026-03-15',
  destino: null,
  total: 11200,
  iva: 1200,
  totalDeNotasDeCredito: 0,
  ivaDeNotasDeCredito: 0,
  totalDeNotasDeDebito: 0,
  ivaDeNotasDeDebito: 0,
  ...cambios,
});

const nota = (cambios: Partial<SolicitudArmada> = {}) =>
  solicitud({ tipo: 'nota_de_credito', fechaEmision: '2026-03-20', documentoAfectadoId: factura().id, ...cambios });

describe('armar una factura', () => {
  it('calcula los totales por columna, el período y la foto del régimen', () => {
    const { documento, avisos } = armarDocumentoDeVenta(solicitud(), contexto());

    expect(documento).toMatchObject({
      tipo: 'factura',
      periodo: '2026-03-01',
      regimenIvaDeLaEmpresa: 'general',
      regimenIsrDeLaEmpresa: 'utilidades',
      clienteId: CLIENTE.id,
      destino: null,
      muestraEnReportesSat: true,
      receptor: { tipoDeIdentificacion: 'nit', nitReceptor: '576937K' },
      totales: { total: 11200, gravadoBienes: 10000, iva: 1200 },
    });
    expect(avisos).toEqual([]);
  });

  it('serie y número se guardan en mayúsculas y sin espacios dentro', () => {
    expect(armarDocumentoDeVenta(solicitud({ serie: ' ab ', numero: '15' }), contexto()).documento.serie).toBe('AB');
    expect(() => armarDocumentoDeVenta(solicitud({ numero: '1 5' }), contexto())).toThrow(DocumentoInvalido);
  });

  it('sin el régimen general no hay débito aunque la línea sea gravada', () => {
    const regimen = { regimenIva: 'pequeno_contribuyente', regimenIsr: null } as const;

    const { documento, avisos } = armarDocumentoDeVenta(
      solicitud({ tipo: 'factura_pequeno_contribuyente' }),
      contexto({ regimen }),
    );

    expect(documento.totales).toMatchObject({ iva: 0, gravadoBienes: 11200 });
    expect(avisos).toEqual([]);
  });

  it('una familia que no es del régimen avisa, sin bloquear', () => {
    const { avisos } = armarDocumentoDeVenta(solicitud({ tipo: 'factura_pequeno_contribuyente' }), contexto());

    expect(avisos).toHaveLength(1);
  });

  it('el IVA sale de la familia: una FPEQ en mes general no lleva débito y se puede registrar con el IVA 0 del DTE', () => {
    const { documento, avisos } = armarDocumentoDeVenta(
      solicitud({ tipo: 'factura_pequeno_contribuyente', ivaDelDte: 0 }),
      contexto(),
    );

    expect(documento.totales).toMatchObject({ iva: 0, gravadoBienes: 11200 });
    expect(avisos).toHaveLength(1);
  });

  it('una factura con IVA en un mes de pequeño contribuyente conserva el IVA del DTE y avisa', () => {
    const regimen = { regimenIva: 'pequeno_contribuyente', regimenIsr: null } as const;

    const { documento, avisos } = armarDocumentoDeVenta(solicitud({ ivaDelDte: 1200 }), contexto({ regimen }));

    expect(documento.totales.iva).toBe(1200);
    expect(avisos).toHaveLength(1);
  });

  it('la cartera activa recibe la venta a un cliente', () => {
    const { documento } = armarDocumentoDeVenta(solicitud(), contexto({ destinosActivos: ['cuentas-por-cobrar'] }));

    expect(documento.destino).toBe('cuentas-por-cobrar');
  });
});

describe('régimen derogado y fecha de inicio', () => {
  it('rechaza el régimen derogado desde la fecha de derogación de la configuración', () => {
    const regimen = { regimenIva: 'contribuyente_agropecuario', regimenIsr: null } as const;

    const intento = () => armarDocumentoDeVenta(solicitud({ fechaEmision: '2025-08-01' }), contexto({ regimen }));

    expect(intento).toThrow(RegimenDerogado);
  });

  it('antes de la derogación sigue valiendo el histórico', () => {
    const regimen = { regimenIva: 'contribuyente_agropecuario', regimenIsr: null } as const;

    const { documento } = armarDocumentoDeVenta(
      solicitud({ tipo: 'factura_contribuyente_agropecuario', fechaEmision: '2025-05-01' }),
      contexto({ regimen }),
    );

    expect(documento.regimenIvaDeLaEmpresa).toBe('contribuyente_agropecuario');
  });

  it('un documento anterior a la fecha de inicio va como saldo inicial', () => {
    const intento = () => armarDocumentoDeVenta(solicitud(), contexto({ fechaDeInicio: '2026-04-01' }));

    expect(intento).toThrow(DocumentoAnteriorALaFechaDeInicio);
  });
});

describe('factura especial recibida', () => {
  const especial = (cambios: Partial<SolicitudArmada> = {}) =>
    solicitud({ tipo: 'factura_especial_recibida', tipoDte: 'FESP', autorizacionFel: 'x', ...cambios });

  it('en una empresa inscrita avisa que debe emitir su propia factura', () => {
    const { documento, avisos } = armarDocumentoDeVenta(especial(), contexto());

    expect(avisos).toContain(AVISO_DE_EMPRESA_INSCRITA);
    expect(documento.destino).toBeNull();
    expect(documento.totales.iva).toBe(1200);
  });

  it('en el no afiliado no avisa, y el IVA se guarda aunque el régimen no cobre débito', () => {
    const regimen = { regimenIva: 'no_afiliado', regimenIsr: 'utilidades' } as const;

    const { documento, avisos } = armarDocumentoDeVenta(especial(), contexto({ regimen }));

    expect(avisos).toEqual([]);
    expect(documento.totales.iva).toBe(1200);
  });

  it('una nota sobre ella es error propio', () => {
    const afectada = factura({ tipo: 'factura_especial_recibida' });

    const intento = () => armarDocumentoDeVenta(nota(), contexto({ facturaAfectada: afectada }));

    expect(intento).toThrow(NotaSobreFacturaEspecial);
  });
});

describe('notas', () => {
  it('una nota de crédito sobre su factura rebaja el débito en su propio mes', () => {
    const { documento } = armarDocumentoDeVenta(nota(), contexto({ facturaAfectada: factura() }));

    expect(documento).toMatchObject({
      tipo: 'nota_de_credito',
      periodo: '2026-03-01',
      documentoAfectadoId: factura().id,
    });
    expect(documento.totales.iva).toBe(1200);
  });

  it('una nota hereda el tratamiento de su factura aunque el régimen haya cambiado', () => {
    const sinIva = factura({ tipo: 'factura_pequeno_contribuyente', iva: 0 });
    const total = armarDocumentoDeVenta(nota({ ivaDelDte: 0 }), contexto({ facturaAfectada: sinIva }));
    expect(total.documento.totales.iva).toBe(0);

    const regimen = { regimenIva: 'pequeno_contribuyente', regimenIsr: null } as const;
    const conIva = armarDocumentoDeVenta(nota({ ivaDelDte: 1200 }), contexto({ regimen, facturaAfectada: factura() }));
    expect(conIva.documento.totales.iva).toBe(1200);
    const calculada = armarDocumentoDeVenta(nota(), contexto({ regimen, facturaAfectada: factura() }));
    expect(calculada.documento.totales.iva).toBe(1200);
  });

  it('sin factura es error', () => {
    expect(() => armarDocumentoDeVenta(nota({ documentoAfectadoId: null }), contexto())).toThrow(NotaSinFactura);
  });

  it('no puede rebajar más que la factura con sus notas', () => {
    const afectada = factura({ totalDeNotasDeCredito: 5000, ivaDeNotasDeCredito: 500 });

    const intento = () => armarDocumentoDeVenta(nota(), contexto({ facturaAfectada: afectada }));

    expect(intento).toThrow(NotaExcedeLaFactura);
  });

  it('pasados los dos meses avisa, sin bloquear', () => {
    const { avisos } = armarDocumentoDeVenta(
      nota({ fechaEmision: '2026-05-15' }),
      contexto({ facturaAfectada: factura() }),
    );

    expect(avisos).toContain(AVISO_DE_NOTA_DE_CREDITO_TARDIA);
  });

  it('con factura del sistema anterior no consulta el libro y avisa del plazo contra esa fecha', () => {
    const anterior = { serie: 'A', numero: '9', fecha: '2025-12-01' };

    const { documento, avisos } = armarDocumentoDeVenta(
      nota({ documentoAfectadoId: null, facturaAnterior: anterior, fechaEmision: '2026-03-10' }),
      contexto({ fechaDeInicio: '2026-01-01' }),
    );

    expect(documento.facturaAnterior).toEqual(anterior);
    expect(avisos).toContain(AVISO_DE_NOTA_DE_CREDITO_TARDIA);
  });

  it('la nota de abono avisa, no lleva IVA y no tiene tope', () => {
    const { documento, avisos } = armarDocumentoDeVenta(
      nota({ tipo: 'nota_de_abono' }),
      contexto({ facturaAfectada: factura({ totalDeNotasDeCredito: 11200, ivaDeNotasDeCredito: 1200 }) }),
    );

    expect(avisos).toContain(AVISO_DE_NOTA_DE_ABONO);
    expect(documento.totales.iva).toBe(0);
  });

  it('una nota va al destino de su factura', () => {
    const { documento } = armarDocumentoDeVenta(
      nota(),
      contexto({
        facturaAfectada: factura({ destino: 'cuentas-por-cobrar' }),
        destinosActivos: ['cuentas-por-cobrar'],
      }),
    );

    expect(documento.destino).toBe('cuentas-por-cobrar');
  });
});

describe('recibo', () => {
  it('no va en los reportes de la SAT y no lleva IVA', () => {
    const { documento } = armarDocumentoDeVenta(solicitud({ tipo: 'recibo' }), contexto());

    expect(documento).toMatchObject({ muestraEnReportesSat: false, totales: { iva: 0 } });
  });
});
