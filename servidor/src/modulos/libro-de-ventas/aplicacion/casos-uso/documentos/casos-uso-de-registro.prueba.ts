import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  DocumentoAnteriorALaFechaDeInicio,
  EmpresaSinDatosFiscales,
  EmpresaSinNit,
  RegimenDerogado,
} from '../../../dominio/errores-de-documento.js';
import { NotaExcedeLaFactura, NotaSinFactura } from '../../../dominio/errores-de-notas.js';
import { AVISO_DE_EMPRESA_INSCRITA } from '../../../dominio/regimen-de-la-empresa.js';
import { AVISO_DE_NOTA_DE_CREDITO_TARDIA } from '../../../dominio/reglas-de-notas.js';
import { CarteraRechaza } from '../../../pruebas/vecinos-de-ventas-en-memoria.soporte.js';
import {
  armarEscenarioDeVentas,
  CLIENTE,
  CONCEPTO,
  solicitudDeVenta,
  type EscenarioDeVentas,
} from '../../../pruebas/escenario-de-ventas.soporte.js';
import { ClienteInactivo, ConceptoDeIngresoInactivo, DocumentoRepetido, PeriodoDeclarado } from '../../errores.js';

let e: EscenarioDeVentas;

beforeEach(() => {
  e = armarEscenarioDeVentas();
});

const registrar = (cambios = {}) => e.registrar.ejecutar(e.operador, solicitudDeVenta(cambios));

describe('registrar una factura', () => {
  it('guarda el documento con sus totales por columna y publica el evento después de confirmar', async () => {
    const { documento, avisos } = await registrar();

    expect(documento).toMatchObject({
      tipo: 'factura',
      periodo: '2026-03-01',
      regimenIvaDeLaEmpresa: 'general',
      estado: 'vigente',
      destino: null,
      totales: { total: '112.00', gravadoBienes: '100.00', iva: '12.00' },
      puedeAnular: true,
      puedeEliminar: true,
    });
    expect(avisos).toEqual([]);
    expect(e.publicadorEventos.nombres()).toEqual(['libro-de-ventas.documento_registrado']);
    expect(e.publicadorEventos.publicados[0]!.datos).toMatchObject({
      documentoId: documento.id,
      totalCentavos: 11200,
      lineas: [{ claseFiscal: 'gravada', baseCentavos: 10000, ivaCentavos: 1200 }],
    });
  });

  it('toma el régimen del mes del documento y bloquea el historial para que no cambie a medias', async () => {
    await registrar({ fechaEmision: '2026-02-10' });

    expect(e.historial.consultas).toEqual([{ periodo: '2026-02-01', bloquear: true }]);
  });

  it('sin datos fiscales para el mes o sin NIT no se registra', async () => {
    e.historial.regimen = null;
    await expect(registrar()).rejects.toThrow(EmpresaSinDatosFiscales);
    e.historial.regimen = { regimenIva: 'general', regimenIsr: 'utilidades' };
    e.empresa.datos.nit = '  ';
    await expect(registrar()).rejects.toThrow(EmpresaSinNit);
    expect(e.repositorio.guardados.size).toBe(0);
  });

  it('un cliente que no existe o está inactivo no recibe ventas', async () => {
    await expect(registrar({ clienteId: crypto.randomUUID() })).rejects.toThrow(RecursoNoEncontrado);
    e.catalogos.clientes.set(CLIENTE, { ...e.catalogos.clientes.get(CLIENTE)!, activo: false });

    await expect(registrar()).rejects.toThrow(ClienteInactivo);
  });

  it('sin cliente se registra como consumidor final', async () => {
    const { documento } = await registrar({ clienteId: null });

    expect(documento).toMatchObject({ clienteId: null, tipoDeIdentificacion: 'cf', nitReceptor: 'CF' });
  });

  it('un concepto que no existe o está inactivo no se usa', async () => {
    const inexistente = { conceptoDeIngresoId: crypto.randomUUID() };
    const linea = solicitudDeVenta().lineas[0]!;

    await expect(registrar({ lineas: [{ ...linea, ...inexistente }] })).rejects.toThrow(RecursoNoEncontrado);
    e.catalogos.conceptosDeIngreso.set(CONCEPTO, { ...e.catalogos.conceptosDeIngreso.get(CONCEPTO)!, activo: false });
    await expect(registrar()).rejects.toThrow(ConceptoDeIngresoInactivo);
  });

  it('una localidad que no es de la empresa se rechaza', async () => {
    await expect(registrar({ localidadId: crypto.randomUUID() })).rejects.toThrow(RecursoNoEncontrado);
  });

  it('el mismo número no se registra dos veces, ni anulado en la SAT, pero sí tras un error de captura', async () => {
    const primera = await registrar({ serie: 'B', numero: '1' });
    const anular = (documentoId: string, cambios: object) =>
      e.anular.ejecutar(e.operador, { documentoId, motivo: 'x', ...cambios } as never);

    await expect(registrar({ serie: 'B', numero: '1' })).rejects.toThrow(DocumentoRepetido);
    await anular(primera.documento.id, { causa: 'fel_anulada_en_la_sat', fechaDeAnulacion: '2026-04-20' });
    await expect(registrar({ serie: 'B', numero: '1' })).rejects.toThrow(DocumentoRepetido);

    const segunda = await registrar({ serie: 'B', numero: '2' });
    await anular(segunda.documento.id, { causa: 'error_de_captura' });
    await expect(registrar({ serie: 'B', numero: '2' })).resolves.toBeDefined();
  });

  it('el IVA del DTE se acepta dentro de la tolerancia', async () => {
    const { documento } = await registrar({ ivaDelDte: '12.03' });

    expect(documento.totales).toMatchObject({ iva: '12.03', gravadoBienes: '99.97' });
  });
});

describe('períodos declarados', () => {
  it('con el control encendido el mes declarado no admite documentos', async () => {
    e.control.declarados.add('2026-03-01');
    e.control.bloquea = true;

    await expect(registrar()).rejects.toThrow(PeriodoDeclarado);
    expect(e.repositorio.guardados.size).toBe(0);
  });

  it('con el control apagado solo avisa que hay que rectificar', async () => {
    e.control.declarados.add('2026-03-01');

    const { avisos } = await registrar();

    expect(avisos).toEqual(['El período 2026-03 ya se declaró: rectifique su declaración.']);
  });
});

describe('derogación y fecha de inicio', () => {
  it('el régimen derogado se rechaza desde la fecha de la configuración, no una fija', async () => {
    e.historial.regimen = { regimenIva: 'contribuyente_agropecuario', regimenIsr: null };
    await expect(registrar({ fechaEmision: '2025-08-01' })).rejects.toThrow(RegimenDerogado);

    e.configuracion.configuracion = { ...e.configuracion.configuracion, fechaDeDerogacion: '2026-01-01' };
    const { documento } = await registrar({ tipo: 'factura_contribuyente_agropecuario', fechaEmision: '2025-08-01' });

    expect(documento.regimenIvaDeLaEmpresa).toBe('contribuyente_agropecuario');
  });

  it('lo anterior a la fecha de inicio se carga como saldo inicial', async () => {
    e.empresa.datos.fechaDeInicio = '2026-04-01';

    await expect(registrar()).rejects.toThrow(DocumentoAnteriorALaFechaDeInicio);
  });
});

describe('la cartera', () => {
  beforeEach(() => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
  });

  it('una venta a un cliente va a la cartera con sus datos en centavos y sus avisos vuelven al usuario', async () => {
    const { documento, avisos } = await registrar();

    expect(documento.destino).toBe('cuentas-por-cobrar');
    expect(e.destinos.recibidos).toEqual([
      {
        documentoId: documento.id,
        tipo: 'factura',
        clase: 'cargo',
        clienteId: CLIENTE,
        documentoAfectadoId: null,
        facturaAnterior: null,
        fechaEmision: '2026-03-15',
        totalCentavos: 11200,
        moneda: 'GTQ',
        tieneVentaDeActivo: false,
      },
    ]);
    expect(avisos).toContain('La cartera avisa algo.');
  });

  it('una venta de activo fijo lo dice a la cartera', async () => {
    e.catalogos.conceptosDeIngreso.set(CONCEPTO, {
      ...e.catalogos.conceptosDeIngreso.get(CONCEPTO)!,
      claveDeSistema: 'venta_de_activo_fijo',
    });

    await registrar();

    expect(e.destinos.recibidos[0]!.tieneVentaDeActivo).toBe(true);
  });

  it('si la cartera rechaza, no se publica nada', async () => {
    e.destinos.rechazar = true;

    await expect(registrar()).rejects.toThrow(CarteraRechaza);
    expect(e.publicadorEventos.publicados).toEqual([]);
  });

  it('la venta a consumidor final no va a la cartera, salvo que la configuración lo diga', async () => {
    const mostrador = await registrar({ clienteId: null });
    expect(mostrador.documento.destino).toBeNull();

    e.configuracion.configuracion = { ...e.configuracion.configuracion, consumidorFinal: 'cuentas_por_cobrar' };
    const conCliente = await registrar({ tipoDeIdentificacion: 'cf', nitReceptor: 'CF' });
    expect(conCliente.documento.destino).toBe('cuentas-por-cobrar');
  });

  it('el recibo y la factura especial no son cartera', async () => {
    const recibo = await registrar({ tipo: 'recibo' });

    expect(recibo.documento).toMatchObject({ destino: null, muestraEnReportesSat: false });
    expect(e.destinos.recibidos).toEqual([]);
  });
});

describe('notas', () => {
  const NUMERO = { serie: 'N' };
  const factura = async () => (await registrar({ serie: 'F', fechaEmision: '2026-03-15' })).documento;
  const nota = (documentoAfectadoId: string, cambios = {}) =>
    registrar({ tipo: 'nota_de_credito', documentoAfectadoId, fechaEmision: '2026-03-20', ...NUMERO, ...cambios });

  it('una nota de crédito corrige su factura y el tope cuenta las notas anteriores', async () => {
    const original = await factura();
    const lineas = (total: string) => [{ ...solicitudDeVenta().lineas[0]!, total }];

    const primera = await nota(original.id, { lineas: lineas('56.00') });
    await expect(nota(original.id, { lineas: lineas('56.01') })).rejects.toThrow(NotaExcedeLaFactura);
    const segunda = await nota(original.id, { lineas: lineas('56.00') });

    expect(primera.documento).toMatchObject({ tipo: 'nota_de_credito', documentoAfectadoId: original.id });
    expect(segunda.documento.totales.total).toBe('56.00');
    expect((await e.obtener.ejecutar(e.operador, original.id)).notas).toHaveLength(2);
  });

  it('bloquea la factura al registrar una nota (dos notas a la vez no pasan del total)', async () => {
    const original = await factura();
    e.repositorio.lecturas.length = 0;

    await nota(original.id);

    expect(e.repositorio.lecturas).toContainEqual({ id: original.id, bloquear: true });
  });

  it('una nota sin factura es error, y con factura del sistema anterior se acepta', async () => {
    await expect(registrar({ tipo: 'nota_de_credito' })).rejects.toThrow(NotaSinFactura);
    e.empresa.datos.fechaDeInicio = '2026-01-01';

    const { documento, avisos } = await registrar({
      tipo: 'nota_de_credito',
      facturaAnterior: { serie: 'A', numero: '9', fecha: '2025-10-01' },
    });

    expect(documento.facturaAnterior).toEqual({ serie: 'A', numero: '9', fecha: '2025-10-01' });
    expect(avisos).toContain(AVISO_DE_NOTA_DE_CREDITO_TARDIA);
  });

  it('una nota de otro cliente o sobre una factura anulada no sirve', async () => {
    const original = await factura();
    const otro = '55555555-5555-4555-8555-555555555555';
    e.catalogos.clientes.set(otro, { id: otro, nombre: 'Otro', nit: null, dpi: null, activo: true });

    await expect(nota(original.id, { clienteId: otro })).rejects.toThrow('mismo cliente');
    await e.anular.ejecutar(e.operador, { documentoId: original.id, causa: 'error_de_captura', motivo: 'x' });
    await expect(nota(original.id)).rejects.toThrow('vigente');
  });

  it('la nota de una factura de la cartera va a la cartera', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];
    const original = await factura();

    const { documento } = await nota(original.id);

    expect(documento.destino).toBe('cuentas-por-cobrar');
    expect(e.destinos.recibidos.at(-1)).toMatchObject({ clase: 'abono', documentoAfectadoId: original.id });
  });
});

describe('factura especial recibida', () => {
  it('se registra con aviso si la empresa está inscrita, y no es cartera', async () => {
    e.destinos.activosDeLaCuenta = ['cuentas-por-cobrar'];

    const { documento, avisos } = await registrar({ tipo: 'factura_especial_recibida' });

    expect(avisos).toContain(AVISO_DE_EMPRESA_INSCRITA);
    expect(documento.destino).toBeNull();
  });
});
