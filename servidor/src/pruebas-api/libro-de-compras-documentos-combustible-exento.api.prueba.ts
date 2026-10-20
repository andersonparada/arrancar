import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  documentoDePrueba,
  haceDias,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const AVISO = 'Este combustible está exento de IVA en esa fecha (Decreto 22-2026): revise el exento de la línea.';
const entorno = usarEntornoApi();
const FECHA = haceDias(5);
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const registrar = (linea: Record<string, unknown>) =>
  propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      fechaEmision: FECHA,
      fechaRecepcion: FECHA,
      lineas: [{ conceptoId: escenario.conceptoId, combustibleId: escenario.combustibleId, galones: '10', ...linea }],
    }),
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'combustibleexento');
  const vigencia = await propietario().post('/api/libro-de-compras/vigencias-de-combustible', {
    combustibleId: escenario.combustibleId,
    idpPorGalon: '0.00',
    porcentajeDeEtanol: '0.00',
    ivaExento: true,
    vigenteDesde: haceDias(30),
    vigenteHasta: null,
  });
  expect(vigencia.estado).toBe(201);
  expect(vigencia.cuerpo.ivaExento).toBe(true);
});

afterAll(() => vi.restoreAllMocks());

describe('combustible exento de IVA (Decreto 22-2026)', () => {
  it('propone el exento, deja el IVA en cero y no da crédito', async () => {
    const respuesta = await registrar({ total: '500.00' });

    expect(respuesta.estado).toBe(201);
    const { documento, avisos } = respuesta.cuerpo;
    expect(documento.lineas[0]).toMatchObject({ exento: '500.00', iva: '0.00', base: '0.00' });
    expect(documento.totales).toMatchObject({ iva: '0.00', exento: '500.00' });
    expect(documento.motivoSinCredito).toBe('exento');
    expect(avisos).not.toContain(AVISO);
  });

  it('con IDP escrito, el exento es el total menos el IDP', async () => {
    const respuesta = await registrar({ total: '500.00', idpEscrito: '47.00' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.lineas[0]).toMatchObject({ idp: '47.00', exento: '453.00', iva: '0.00' });
  });

  it('con un exento distinto escrito a mano se respeta y avisa', async () => {
    const respuesta = await registrar({ total: '500.00', exento: '100.00' });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.lineas[0]).toMatchObject({ exento: '100.00' });
    expect(respuesta.cuerpo.avisos).toContain(AVISO);
  });

  it('la vista previa propone el exento igual', async () => {
    const solicitud = documentoDePrueba(escenario, {
      fechaEmision: FECHA,
      fechaRecepcion: FECHA,
      lineas: [
        { conceptoId: escenario.conceptoId, combustibleId: escenario.combustibleId, galones: '10', total: '500.00' },
      ],
    });

    const previa = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, solicitud);

    expect(previa.estado).toBe(200);
    expect(previa.cuerpo.documento.lineas[0]).toMatchObject({ exento: '500.00', iva: '0.00' });
  });
});
