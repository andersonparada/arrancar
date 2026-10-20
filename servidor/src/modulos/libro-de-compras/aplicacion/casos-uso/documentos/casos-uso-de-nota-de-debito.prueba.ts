import { beforeEach, describe, expect, it } from 'vitest';
import { NotaDeDebitoAnteriorALaFactura } from '../../../dominio/errores-de-calculo.js';
import {
  FacturaAfectadaIncoherente,
  FacturaNoSirveParaLaNota,
  NotaSuperaLaFactura,
} from '../../../dominio/errores-de-documento.js';
import { NotaSobreFacturaEspecial } from '../../../dominio/errores-de-factura-especial.js';
import { AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO } from '../../../dominio/reglas-de-notas-de-debito.js';
import {
  crearEscenario,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { FacturaParaNota } from '../../puertos/puertos-de-documentos.js';
import { RegistrarDocumento } from './registrar-documento.js';

let { consultas, repositorio, dependencias } = crearEscenario();
const facturaId = crypto.randomUUID();

const registrar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new RegistrarDocumento(dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });

/** Una nota de débito de Q560 sobre la factura de `facturaId`. */
const ndeb = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  registrar({
    tipo: 'nota_de_debito',
    documentoAfectadoId: facturaId,
    numero: '77',
    lineas: [{ ...solicitud().lineas[0]!, total: '560.00' }],
    ...cambios,
  });

const ponerFactura = (cambios: Partial<FacturaParaNota> = {}) =>
  consultas.facturas.set(facturaId, {
    id: facturaId,
    tipo: 'factura',
    estado: 'vigente',
    proveedorId,
    destino: 'cuentas-por-pagar',
    motivoSinCredito: null,
    regimenIvaDeLaEmpresa: 'general',
    fechaEmision: '2026-09-10',
    muestraEnReportesSat: true,
    total: 112000,
    iva: 12000,
    totalDeNotasDeCredito: 0,
    ivaDeNotasDeCredito: 0,
    totalDeNotasDeDebito: 0,
    ivaDeNotasDeDebito: 0,
    ...cambios,
  });

beforeEach(() => {
  ({ consultas, repositorio, dependencias } = crearEscenario());
  ponerFactura();
});

describe('registrar una nota de débito', () => {
  it('la guarda con su familia y su código, da crédito y no lleva retenciones', async () => {
    const { documento, avisos } = await ndeb();

    expect(documento).toMatchObject({
      tipo: 'nota_de_debito',
      tipoDte: 'NDEB',
      documentoAfectadoId: facturaId,
      motivoSinCredito: null,
    });
    expect(documento.totales).toMatchObject({ total: '560.00', iva: '60.00', ivaNoAcreditable: '0.00' });
    expect(documento.retenciones).toEqual([]);
    expect(avisos).toContain(AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO);
  });

  it('no tiene tope: aunque las notas de crédito ya igualen la factura', async () => {
    ponerFactura({ totalDeNotasDeCredito: 112000, ivaDeNotasDeCredito: 12000 });

    await expect(ndeb()).resolves.toBeTruthy();
  });

  it('emitida más de dos meses después de su factura no da crédito (art. 17)', async () => {
    ponerFactura({ fechaEmision: '2026-07-01' });

    const { documento } = await ndeb({ fechaEmision: '2026-09-01', fechaRecepcion: '2026-09-03' });

    expect(documento.motivoSinCredito).toBe('nota_de_debito_tardia');
    expect(documento.totales).toMatchObject({ iva: '60.00', ivaNoAcreditable: '60.00' });
  });

  it('de una factura registrada sin crédito da crédito, y hereda no_vinculado', async () => {
    ponerFactura({ motivoSinCredito: 'empresa_sin_credito' });
    expect((await ndeb()).documento.motivoSinCredito).toBeNull();

    ponerFactura({ motivoSinCredito: 'no_vinculado' });
    expect((await ndeb({ numero: '78' })).documento.motivoSinCredito).toBe('no_vinculado');
  });

  it('antes de la fecha de su factura se rechaza', async () => {
    await expect(ndeb({ fechaEmision: '2026-09-09', fechaRecepcion: '2026-09-11' })).rejects.toThrow(
      NotaDeDebitoAnteriorALaFactura,
    );
    expect(repositorio.agregados).toEqual([]);
  });

  it('sin factura, o con una factura que no sirve, se rechaza', async () => {
    await expect(ndeb({ documentoAfectadoId: null })).rejects.toThrow(FacturaAfectadaIncoherente);
    await expect(registrar({ documentoAfectadoId: facturaId })).rejects.toThrow(FacturaAfectadaIncoherente);

    ponerFactura({ tipo: 'nota_de_credito' });
    await expect(ndeb()).rejects.toThrow(FacturaNoSirveParaLaNota);
    ponerFactura({ estado: 'anulado' });
    await expect(ndeb()).rejects.toThrow(FacturaNoSirveParaLaNota);
    ponerFactura({ tipo: 'factura_especial' });
    await expect(ndeb()).rejects.toThrow(NotaSobreFacturaEspecial);
  });
});

describe('nota de crédito y nota de débito sobre la misma factura', () => {
  const credito = (total: string) =>
    registrar({
      tipo: 'nota_de_credito',
      documentoAfectadoId: facturaId,
      serie: 'N',
      lineas: [{ ...solicitud().lineas[0]!, total }],
    });

  it('la nota de crédito cabe en la factura más sus notas de débito, y sin ellas no', async () => {
    ponerFactura({ totalDeNotasDeCredito: 112000 });
    await expect(credito('300.00')).rejects.toThrow(NotaSuperaLaFactura);

    ponerFactura({
      totalDeNotasDeCredito: 112000,
      ivaDeNotasDeCredito: 12000,
      totalDeNotasDeDebito: 56000,
      ivaDeNotasDeDebito: 6000,
    });
    await expect(credito('300.00')).resolves.toBeTruthy();
  });

  it('la casilla SAT de la nota de crédito va atada a la de su factura', async () => {
    const fueraDelLibro = {
      motivoFueraDelLibro: 'sin_fel',
      autorizacionFel: null,
      tipoDte: null,
      nitEmisor: null,
      serie: null,
    } as const;

    await expect(
      registrar({ tipo: 'nota_de_credito', documentoAfectadoId: facturaId, ...fueraDelLibro }),
    ).rejects.toThrow(FacturaNoSirveParaLaNota);
  });
});
