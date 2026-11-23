/**
 * Documentos de venta (LV-2): el régimen de la empresa se toma del mes del documento (con foto en el documento), y la
 * fecha de inicio de la empresa decide qué se registra, qué se carga como saldo inicial y qué facturas anteriores
 * puede citar una nota.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, NIT_DE_LA_EMPRESA, primerDiaDelMes } from './soporte/escenario-de-documentos.js';
import {
  documentoDeVentaDePrueba,
  instalarCarteraFalsa,
  prepararEscenarioDeVentas,
  registrarCliente,
  RUTA_DOCUMENTOS_DE_VENTA as RUTA,
  type EscenarioDeVentas,
} from './soporte/escenario-de-ventas.js';

const entorno = usarEntornoApi();
const MES_PASADO = primerDiaDelMes(-1);
const dia = (mes: string, numero: number) => `${mes.slice(0, 8)}${String(numero).padStart(2, '0')}`;

let cambiante: EscenarioDeVentas;
let conInicio: EscenarioDeVentas;

const registrarEn = (escenario: EscenarioDeVentas, cambios: Record<string, unknown> = {}) =>
  escenario.cuenta.propietario.post(RUTA, documentoDeVentaDePrueba(escenario, cambios));

beforeAll(async () => {
  instalarCarteraFalsa();
  cambiante = await prepararEscenarioDeVentas(entorno, 'ventasregimen');
  conInicio = await prepararEscenarioDeVentas(entorno, 'ventasinicio');
  const inicio = await conInicio.cuenta.propietario.put(`/api/empresas/${conInicio.cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: dia(MES_PASADO, 15),
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
});

afterAll(() => vi.restoreAllMocks());

describe('el régimen del mes del documento', () => {
  it('cada documento guarda el régimen de su mes aunque después cambie el de la empresa', async () => {
    const antes = await registrarEn(cambiante, { fechaEmision: dia(MES_PASADO, 10), serie: 'REG', numero: '1' });
    const cambio = await cambiante.cuenta.propietario.put(`/api/empresas/${cambiante.cuenta.empresaId}`, {
      nombre: 'Rancho fiscal',
      nit: NIT_DE_LA_EMPRESA,
      secciones: {
        'libro-de-compras': {
          tipoDePersona: 'juridica',
          regimenIva: 'pequeno_contribuyente',
          agenteDeRetencionIva: 'ninguno',
          vigenteDesde: primerDiaDelMes(0),
        },
      },
    });
    expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(200);

    const despues = await registrarEn(cambiante, { tipo: 'factura_pequeno_contribuyente', serie: 'REG', numero: '2' });
    const otraDelPasado = await registrarEn(cambiante, {
      fechaEmision: dia(MES_PASADO, 11),
      serie: 'REG',
      numero: '3',
    });

    expect(antes.cuerpo.documento.regimenIvaDeLaEmpresa).toBe('general');
    expect(despues.cuerpo.documento).toMatchObject({
      regimenIvaDeLaEmpresa: 'pequeno_contribuyente',
      totales: { total: '1120.00', gravadoBienes: '1120.00', iva: '0.00' },
    });
    expect(despues.cuerpo.avisos).toEqual([]);
    expect(otraDelPasado.cuerpo.documento.regimenIvaDeLaEmpresa).toBe('general');
    const [fila] = await consultar<{ regimen_iva_de_la_empresa: string; regimen_isr_de_la_empresa: string | null }>(
      'select regimen_iva_de_la_empresa, regimen_isr_de_la_empresa from libro_de_ventas.documentos where id = $1',
      [despues.cuerpo.documento.id],
    );
    expect(fila).toEqual({ regimen_iva_de_la_empresa: 'pequeno_contribuyente', regimen_isr_de_la_empresa: null });
  });

  it('la ficha y la lista muestran el régimen con que se registró cada documento', async () => {
    const lista = await cambiante.cuenta.propietario.get(`${RUTA}?limite=50`);

    const regimenes = new Set(
      lista.cuerpo.elementos.map((fila: { regimenIvaDeLaEmpresa: string }) => fila.regimenIvaDeLaEmpresa),
    );
    expect(regimenes).toEqual(new Set(['general', 'pequeno_contribuyente']));
  });
});

describe('el IVA sale de la familia del documento', () => {
  it('una factura de pequeño contribuyente en un mes general se guarda sin IVA con el IVA 0 del DTE, y avisa', async () => {
    const respuesta = await registrarEn(cambiante, {
      tipo: 'factura_pequeno_contribuyente',
      fechaEmision: dia(MES_PASADO, 12),
      ivaDelDte: '0.00',
      serie: 'FAM',
      numero: '1',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.documento.totales).toMatchObject({ gravadoBienes: '1120.00', iva: '0.00' });
    expect(respuesta.cuerpo.avisos).toHaveLength(1);
  });

  it('una factura con IVA en un mes de pequeño contribuyente conserva el IVA del DTE y avisa', async () => {
    const respuesta = await registrarEn(cambiante, { ivaDelDte: '120.00', serie: 'FAM', numero: '2' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.documento.totales.iva).toBe('120.00');
    expect(respuesta.cuerpo.avisos).toHaveLength(1);
  });

  it('un cliente guardado con NIT CF se factura por omisión como consumidor final', async () => {
    const { clienteId } = await registrarCliente(cambiante.cuenta, 'Cliente de mostrador', { nit: 'CF' });

    const respuesta = await registrarEn(cambiante, {
      clienteId,
      fechaEmision: dia(MES_PASADO, 13),
      serie: 'FAM',
      numero: '3',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({ tipoDeIdentificacion: 'cf', nitReceptor: 'CF' });
  });
});

describe('fecha de inicio de la empresa', () => {
  it('un documento anterior a ella se rechaza y uno de ese mes, posterior, avisa que el libro queda incompleto', async () => {
    const anterior = await registrarEn(conInicio, { fechaEmision: dia(MES_PASADO, 14), serie: 'INI', numero: '1' });
    const delMes = await registrarEn(conInicio, { fechaEmision: dia(MES_PASADO, 20), serie: 'INI', numero: '2' });
    const deHoy = await registrarEn(conInicio, { serie: 'INI', numero: '3' });

    expect(anterior.estado).toBe(422);
    expect(anterior.cuerpo.error.codigo).toBe('documento_anterior_a_la_fecha_de_inicio');
    expect(delMes.estado).toBe(201);
    expect(delMes.cuerpo.avisos).toEqual([expect.stringContaining('libro de ese mes queda incompleto')]);
    expect(deHoy.cuerpo.avisos).toEqual([]);
  });

  it('una nota de crédito cita la factura del sistema anterior solo si es de antes de la fecha de inicio', async () => {
    const anterior = { serie: 'A', numero: '9', fecha: dia(primerDiaDelMes(-3), 5) };

    const correcta = await registrarEn(conInicio, {
      tipo: 'nota_de_credito',
      facturaAnterior: anterior,
      serie: 'N',
      numero: '1',
    });
    const posterior = await registrarEn(conInicio, {
      tipo: 'nota_de_credito',
      facturaAnterior: { ...anterior, fecha: dia(MES_PASADO, 18) },
      serie: 'N',
      numero: '2',
    });
    const sinInicio = await registrarEn(cambiante, {
      tipo: 'nota_de_credito',
      facturaAnterior: anterior,
      serie: 'N',
      numero: '3',
    });
    const dosFacturas = await registrarEn(conInicio, {
      tipo: 'nota_de_credito',
      facturaAnterior: anterior,
      documentoAfectadoId: correcta.cuerpo.documento.id,
      serie: 'N',
      numero: '4',
    });

    expect(correcta.estado, JSON.stringify(correcta.cuerpo)).toBe(201);
    expect(correcta.cuerpo.documento.facturaAnterior).toEqual(anterior);
    expect(correcta.cuerpo.avisos).toEqual([expect.stringContaining('Fuera del plazo del art. 17')]);
    expect(posterior.cuerpo.error.codigo).toBe('factura_anterior_invalida');
    expect(sinInicio.cuerpo.error.codigo).toBe('factura_anterior_invalida');
    expect(dosFacturas.cuerpo.error.codigo).toBe('nota_con_dos_facturas');
  });
});
