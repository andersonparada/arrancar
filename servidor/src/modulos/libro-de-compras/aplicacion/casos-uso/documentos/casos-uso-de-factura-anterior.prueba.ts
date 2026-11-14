import { beforeEach, describe, expect, it } from 'vitest';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import { IvaDeNotasExcedeElDeLaFactura, NotaConIvaDeFacturaExenta } from '../../../dominio/errores-de-calculo.js';
import { FacturaAfectadaIncoherente, NotaSuperaLaFactura } from '../../../dominio/errores-de-documento.js';
import {
  FacturaAnteriorConOtrosDatos,
  FacturaAnteriorEstaEnElLibro,
  FacturaAnteriorInvalida,
  FacturaAnteriorMuyAntigua,
  FacturaAnteriorPosteriorALaFechaDeInicio,
  FacturaAnteriorSinFechaDeInicio,
  FacturaYaEsDelSistemaAnterior,
  NotaRecibidaAntesDeLaFechaDeInicio,
} from '../../../dominio/errores-de-factura-anterior.js';
import { AVISO_NOTA_CON_CAMBIO_DE_REGIMEN } from '../../../dominio/motivo-sin-credito.js';
import {
  crearEscenario,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { FacturaAnteriorSolicitada, SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { FacturaAnteriorConNotas } from '../../puertos/puertos-de-facturas-anteriores.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();

const anterior = (cambios: Partial<FacturaAnteriorSolicitada> = {}): FacturaAnteriorSolicitada => ({
  tipo: 'factura',
  serie: 'B',
  numero: '900',
  fechaEmision: '2026-06-15',
  autorizacionFel: null,
  total: '1120.00',
  iva: '120.00',
  notasDeDebitoAnterioresTotal: null,
  notasDeDebitoAnterioresIva: null,
  motivoSinCredito: null,
  detalleDelMotivo: null,
  ...cambios,
});

const registrar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });

/** Una nota de crédito de Q560 (IVA Q60) sobre la factura anterior pedida. */
const ncre = (pedida: Partial<FacturaAnteriorSolicitada> = {}, cambios: Partial<SolicitudDeDocumento> = {}) =>
  registrar({
    tipo: 'nota_de_credito',
    serie: 'N',
    numero: '5',
    facturaAnterior: anterior(pedida),
    lineas: [{ ...solicitud().lineas[0]!, total: '560.00' }],
    ...cambios,
  });

const guardada = (cambios: Partial<FacturaAnteriorConNotas> = {}): FacturaAnteriorConNotas => ({
  id: crypto.randomUUID(),
  proveedorId,
  tipo: 'factura',
  serie: 'B',
  numero: '900',
  autorizacionFel: null,
  fechaEmision: '2026-06-15',
  total: 112000,
  iva: 12000,
  notasDeDebitoAnterioresTotal: 0,
  notasDeDebitoAnterioresIva: 0,
  motivoSinCredito: null,
  detalleDelMotivo: null,
  notas: {
    vigentes: 0,
    totalDeNotasDeCredito: 0,
    ivaDeNotasDeCredito: 0,
    totalDeNotasDeDebito: 0,
    ivaDeNotasDeDebito: 0,
  },
  ...cambios,
});

beforeEach(() => {
  e = crearEscenario();
  e.empresa.fechaDeInicioDeLaEmpresa = '2026-09-01';
});

describe('nota de crédito sobre una factura del sistema anterior', () => {
  it('sobre una factura que dio crédito rebaja el crédito del mes de recepción y viaja con la factura anterior', async () => {
    const { documento } = await ncre();

    expect(documento).toMatchObject({ documentoAfectadoId: null, motivoSinCredito: null, periodo: '2026-10-01' });
    expect(documento.facturaAnterior).toMatchObject({ numero: '900', total: '1120.00', iva: '120.00' });
    expect(documento.totales).toMatchObject({ iva: '60.00', ivaNoAcreditable: '0.00' });
    expect(e.facturasAnteriores.agregadas).toHaveLength(1);
    expect(e.destinos.recibidos[0]?.facturaAnterior).toEqual({
      tipo: 'factura',
      serie: 'B',
      numero: '900',
      fechaEmision: '2026-06-15',
    });
    expect(e.repositorio.agregados[0]?.facturaAnterior?.id).toBe(e.facturasAnteriores.agregadas[0]?.id);
  });

  it.each(['fuera_de_plazo', 'no_vinculado', 'empresa_sin_credito'] as const)(
    'sobre una factura con motivo %s hereda el motivo y el IVA va al costo',
    async (motivoSinCredito) => {
      const { documento } = await ncre({ motivoSinCredito });

      expect(documento.motivoSinCredito).toBe(motivoSinCredito);
      expect(documento.totales).toMatchObject({ iva: '60.00', ivaNoAcreditable: '60.00' });
    },
  );

  it('sobre una factura sin crédito por otra causa hereda «otra causa» y exige su detalle', async () => {
    await expect(ncre({ motivoSinCredito: 'otra_causa_sin_credito' })).rejects.toThrow(FacturaAnteriorInvalida);

    const { documento } = await ncre({
      motivoSinCredito: 'otra_causa_sin_credito',
      detalleDelMotivo: 'Sin requisitos',
    });

    expect(documento.motivoSinCredito).toBe('otra_causa_sin_credito');
    expect(documento.totales.ivaNoAcreditable).toBe('60.00');
    expect(e.facturasAnteriores.agregadas[0]?.detalleDelMotivo).toBe('Sin requisitos');
  });

  it('sobre un pequeño contribuyente la nota no lleva IVA, y la factura con IVA se rechaza', async () => {
    const { documento } = await ncre({ tipo: 'factura_pequeno_contribuyente', iva: '0.00' });

    expect(documento.motivoSinCredito).toBe('pequeno_contribuyente');
    expect(documento.totales.iva).toBe('0.00');
    await expect(ncre({ tipo: 'factura_pequeno_contribuyente', iva: '120.00', numero: '901' })).rejects.toThrow(
      FacturaAnteriorInvalida,
    );
  });

  it('sobre una factura exenta rechaza la nota con IVA', async () => {
    await expect(ncre({ motivoSinCredito: 'exento', iva: '0.00' })).rejects.toThrow(NotaConIvaDeFacturaExenta);
    await expect(ncre({ motivoSinCredito: 'exento', iva: '120.00' })).rejects.toThrow(FacturaAnteriorInvalida);
  });

  it('avisa que el IVA va al costo si la factura dio crédito y la empresa ya no lo tiene', async () => {
    const base = DatosFiscalesDeEmpresa.porOmision().instantanea();
    e.datosDeEmpresa.fijar(
      operador.empresaId,
      DatosFiscalesDeEmpresa.crear({
        ...base,
        regimenIva: 'pequeno_contribuyente',
        regimenIsr: null,
      }),
    );

    const { documento, avisos } = await ncre();

    expect(documento.motivoSinCredito).toBe('empresa_sin_credito');
    expect(avisos).toContain(AVISO_NOTA_CON_CAMBIO_DE_REGIMEN);
  });
});

describe('topes con la factura anterior', () => {
  it('dos notas que suman más que la factura se rechazan, en total y en IVA', async () => {
    e.facturasAnteriores.filas.push(
      guardada({
        notas: { ...guardada().notas, vigentes: 1, totalDeNotasDeCredito: 100000, ivaDeNotasDeCredito: 1000 },
      }),
    );

    await expect(ncre()).rejects.toThrow(NotaSuperaLaFactura);
    e.facturasAnteriores.filas.length = 0;
    e.facturasAnteriores.filas.push(
      guardada({
        notas: { ...guardada().notas, vigentes: 1, totalDeNotasDeCredito: 50000, ivaDeNotasDeCredito: 11000 },
      }),
    );
    await expect(ncre()).rejects.toThrow(IvaDeNotasExcedeElDeLaFactura);
  });

  it('las notas de débito anteriores suben el tope y las pasa', async () => {
    const existente = guardada({
      notasDeDebitoAnterioresTotal: 56000,
      notasDeDebitoAnterioresIva: 6000,
      notas: { ...guardada().notas, vigentes: 1, totalDeNotasDeCredito: 112000, ivaDeNotasDeCredito: 12000 },
    });
    e.facturasAnteriores.filas.push(existente);
    const pedida = { notasDeDebitoAnterioresTotal: '560.00', notasDeDebitoAnterioresIva: '60.00' };

    await expect(ncre()).rejects.toThrow(FacturaAnteriorConOtrosDatos);
    await expect(ncre(pedida)).resolves.toBeTruthy();
    expect(e.facturasAnteriores.agregadas).toEqual([]);
  });
});

describe('fechas de la nota sobre una factura anterior', () => {
  it('sin fecha de inicio se rechaza', async () => {
    e.empresa.fechaDeInicioDeLaEmpresa = null;
    await expect(ncre()).rejects.toThrow(FacturaAnteriorSinFechaDeInicio);
  });

  it('una nota recibida antes de la fecha de inicio se rechaza', async () => {
    e.empresa.fechaDeInicioDeLaEmpresa = '2026-10-15';
    await expect(ncre({}, { fechaRecepcion: '2026-10-04' })).rejects.toThrow(NotaRecibidaAntesDeLaFechaDeInicio);
  });

  it('emitida antes de la fecha de inicio pero recibida después pasa, con el aviso de fecha de inicio', async () => {
    const { avisos } = await ncre({}, { fechaEmision: '2026-08-20' });
    expect(avisos.join(' ')).toContain('antes de la fecha de inicio');
  });

  it('la factura de la fecha de inicio o posterior se rechaza', async () => {
    await expect(ncre({ fechaEmision: '2026-09-01' })).rejects.toThrow(FacturaAnteriorPosteriorALaFechaDeInicio);
  });

  it('de más de 10 años se rechaza sin citar ley, y entre 4 y 10 solo avisa', async () => {
    const rechazo = ncre({ fechaEmision: '2016-08-31' });
    await expect(rechazo).rejects.toThrow(FacturaAnteriorMuyAntigua);
    await expect(rechazo).rejects.not.toThrow(/art\./);

    const { avisos } = await ncre({ fechaEmision: '2022-08-31' });
    expect(avisos.join(' ')).toContain('de hace más de 4 años');
  });

  it('una nota de débito tardía avisa con la fecha de la factura anterior', async () => {
    const { documento, avisos } = await registrar({
      tipo: 'nota_de_debito',
      serie: 'D',
      numero: '8',
      facturaAnterior: anterior(),
      fechaEmision: '2026-09-10',
      lineas: [{ ...solicitud().lineas[0]!, total: '560.00' }],
    });

    expect(documento.motivoSinCredito).toBe('nota_de_debito_tardia');
    expect(avisos.some((aviso) => aviso.includes('La factura es del 15/06/2026'))).toBe(true);
    expect(avisos.filter((aviso) => aviso.includes('dos meses'))).toHaveLength(1);
  });
});

describe('la fila de la factura anterior', () => {
  it('con los mismos datos se reutiliza', async () => {
    e.facturasAnteriores.filas.push(guardada());

    await ncre();

    expect(e.facturasAnteriores.agregadas).toEqual([]);
    expect(e.facturasAnteriores.corregidas).toEqual([]);
  });

  it('con otros datos y una nota vigente se rechaza, y con solo anuladas se corrige y se audita', async () => {
    const fila = guardada({ total: 100000, iva: 10714, notas: { ...guardada().notas, vigentes: 1 } });
    e.facturasAnteriores.filas.push(fila);
    await expect(ncre()).rejects.toThrow(FacturaAnteriorConOtrosDatos);

    fila.notas.vigentes = 0;
    await ncre();

    expect(e.facturasAnteriores.corregidas[0]).toMatchObject({ id: fila.id, total: 112000 });
    expect(e.auditoria.acciones()).toContain('libro-de-compras.facturas-anteriores:corregir');
  });

  it('la misma autorización FEL con otro número es otros datos', async () => {
    const fel = crypto.randomUUID();
    e.facturasAnteriores.filas.push(
      guardada({ autorizacionFel: fel, numero: '777', notas: { ...guardada().notas, vigentes: 1 } }),
    );

    await expect(ncre({ autorizacionFel: fel })).rejects.toThrow(FacturaAnteriorConOtrosDatos);
  });

  it('una factura que ya está en el libro se rechaza', async () => {
    e.facturasAnteriores.delLibro = { id: crypto.randomUUID() };
    await expect(ncre()).rejects.toThrow(FacturaAnteriorEstaEnElLibro);
  });

  it('registrar una factura que una nota ya cita como anterior se rechaza con el camino', async () => {
    e.facturasAnteriores.notaQueLaCita = { id: crypto.randomUUID(), serie: 'N', numero: '5' };

    const rechazo = registrar({ numero: '900', serie: 'B' });

    await expect(rechazo).rejects.toThrow(FacturaYaEsDelSistemaAnterior);
    await expect(rechazo).rejects.toThrow(/anule la nota N-5/);
  });

  it('la nota con la factura del libro y la del sistema anterior a la vez, o con ninguna, se rechaza', async () => {
    await expect(ncre({}, { documentoAfectadoId: crypto.randomUUID() })).rejects.toThrow(FacturaAfectadaIncoherente);
    await expect(ncre({}, { facturaAnterior: null })).rejects.toThrow(FacturaAfectadaIncoherente);
    await expect(registrar({ facturaAnterior: anterior() })).rejects.toThrow(FacturaAfectadaIncoherente);
  });

  it('si el destino rechaza la nota no queda nada (la unidad de trabajo deshace)', async () => {
    e.destinos.fallo = new Error('destino');
    await expect(ncre()).rejects.toThrow('destino');
  });
});
