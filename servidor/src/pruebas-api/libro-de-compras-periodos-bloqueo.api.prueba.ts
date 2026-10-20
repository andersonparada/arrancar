import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { documentoDePrueba, HOY, NIT_DE_LA_EMPRESA, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import { diaDe, declarar, encenderElBloqueo, fechasDe, mesDe, reabrir } from './soporte/escenario-de-periodos.js';
import {
  filasDelDocumento,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const CLAVE = 'libro-de-compras';
/** El período declarado; Q es un mes anterior con otro régimen y sin documentos. */
const P = mesDe(-3);
const Q = mesDe(-6);
let e: EscenarioDeRetenciones;
let anuladaId: string;
let vigenteId: string;
/** Una factura del período sin notas, para anular y eliminar. */
let libreId: string;

const propietario = () => e.propietario;
const cuenta = () => e.escenario.cuenta;
const rutaDeDatos = () => `/api/libro-de-compras/empresas/${cuenta().empresaId}/datos-fiscales`;

/** Un documento crudo (sin la verificación de `e.registrar`) del proveedor del escenario, para ver el rechazo. */
const registrarCrudo = (cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(e.escenario, { ...fechasDe(P), ...cambios }));

const AGENTE = { agenteDeRetencionIva: 'contribuyente_especial', esAgenteDeRetencionIsr: true };
/** Un régimen distinto del general que no retiene nada. */
const OTRO_REGIMEN = {
  regimenIva: 'no_afiliado',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: false,
};

const guardarFiscal = (seccion: Record<string, unknown>) =>
  propietario().put(`/api/empresas/${cuenta().empresaId}`, {
    nombre: 'Rancho fiscal',
    nit: NIT_DE_LA_EMPRESA,
    secciones: { [CLAVE]: { tipoDePersona: 'juridica', ...AGENTE, ...seccion } },
  });

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'periodosbloqueo');
  // Un escalón de otro régimen solo en el mes Q, para probar el bloqueo de las vigencias.
  expect((await guardarFiscal({ ...OTRO_REGIMEN, vigenteDesde: Q })).estado).toBe(200);
  expect((await guardarFiscal({ regimenIva: 'general', vigenteDesde: mesDe(-5) })).estado).toBe(200);
  anuladaId = (await e.registrar(e.opcional, fechasDe(P))).id;
  vigenteId = (await e.registrar(e.opcional, fechasDe(P))).id;
  libreId = (await e.registrar(e.opcional, fechasDe(P))).id;
  const anulada = await propietario().post(`${RUTA_DOCUMENTOS}/${anuladaId}/anular`, {
    causa: 'error_de_captura',
    motivo: 'Error',
  });
  expect(anulada.estado).toBe(200);
  expect((await declarar(propietario(), Q)).estado).toBe(200);
  expect((await declarar(propietario(), P)).estado).toBe(200);
  expect((await encenderElBloqueo(propietario())).estado).toBe(200);
});

afterAll(() => vi.restoreAllMocks());

describe('registrar en un período declarado y bloqueado', () => {
  it('con el período pedido responde 409 con el primer período abierto y no guarda nada', async () => {
    const antes = (await propietario().get(RUTA_DOCUMENTOS)).cuerpo.total;

    const respuesta = await registrarCrudo({ periodo: P });

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('periodo_declarado');
    expect(respuesta.cuerpo.error.detalles).toMatchObject({
      campo: 'periodo',
      periodo: P,
      periodoPropuesto: mesDe(-2),
      propuestaEnPlazo: true,
    });
    expect((await propietario().get(RUTA_DOCUMENTOS)).cuerpo.total).toBe(antes);
  });

  it('sin período pedido propone y usa el primer período abierto, y lo explica en un aviso', async () => {
    const respuesta = await registrarCrudo();

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.documento.periodo).toBe(mesDe(-2));
    expect(respuesta.cuerpo.avisos.join(' ')).toContain(`${P.slice(0, 7)} está declarado y no admite documentos`);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain(`se propone ${mesDe(-2).slice(0, 7)}`);
  });

  it('la vista previa avisa y no bloquea, ni con el período pedido', async () => {
    const respuesta = await propietario().post(
      `${RUTA_DOCUMENTOS}/calcular`,
      documentoDePrueba(e.escenario, { ...fechasDe(P), periodo: P }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.documento.periodo).toBe(P);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('está declarado y no admite documentos');
    expect(respuesta.cuerpo.avisos.join(' ')).toContain(`Puede registrarla en ${mesDe(-2).slice(0, 7)}`);
  });

  it('una nota de crédito recibida en el período declarado no tiene alternativa: hay que reabrirlo', async () => {
    const lineas = [{ conceptoId: e.escenario.conceptoId, total: '560.00' }];

    const respuesta = await registrarCrudo({ tipoDte: 'NCRE', serie: 'N', documentoAfectadoId: vigenteId, lineas });

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.detalles).toMatchObject({ periodo: P, periodoPropuesto: null });
  });

  it('una nota de crédito de una factura del período, recibida este mes, sí se registra', async () => {
    const lineas = [{ conceptoId: e.escenario.conceptoId, total: '560.00' }];

    const respuesta = await e.registrar(e.opcional, {
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: vigenteId,
      lineas,
      fechaEmision: HOY,
      fechaRecepcion: HOY,
    });

    expect(respuesta.cuerpo.documento.periodo).toBe(mesDe(0));
  });
});

describe('anular y eliminar en un período declarado y bloqueado', () => {
  it('responde 409 y el documento queda como estaba', async () => {
    const anular = await propietario().post(`${RUTA_DOCUMENTOS}/${libreId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });
    const eliminar = await propietario().delete(`${RUTA_DOCUMENTOS}/${libreId}`);

    expect(anular.estado).toBe(409);
    expect(anular.cuerpo.error.codigo).toBe('periodo_declarado');
    expect(eliminar.estado).toBe(409);
    expect((await propietario().get(`${RUTA_DOCUMENTOS}/${libreId}`)).cuerpo.estado).toBe('vigente');
  });
});

describe('lo que el bloqueo no toca', () => {
  it('anotar la constancia, enterar el mes y resolver lo «por resolver» siguen funcionando', async () => {
    const reporte = await reporteDelMes(propietario(), P);
    const retencionId = filasDelDocumento(reporte, vigenteId)[0].id as string;
    const porResolver = filasDelDocumento(reporte, anuladaId)[0].id as string;

    const constancia = await propietario().put(`${RUTA_RETENCIONES}/${retencionId}/constancia`, {
      numero: 'k-1',
      fecha: HOY,
    });
    const entero = await propietario().post(`${RUTA_RETENCIONES}/enteros`, {
      mes: P.slice(0, 7),
      grupo: 'iva_agentes',
      fechaDePago: diaDe(mesDe(-2)),
      documentoDePago: 'F-1',
      monto: '1.00',
    });
    const resuelta = await propietario().put(`${RUTA_RETENCIONES}/${porResolver}/resolucion`, {
      resolucion: 'no_requiere',
      nota: 'No aplica',
    });

    expect(constancia.estado, JSON.stringify(constancia.cuerpo)).toBe(200);
    expect(entero.estado, JSON.stringify(entero.cuerpo)).toBe(201);
    expect(resuelta.estado, JSON.stringify(resuelta.cuerpo)).toBe(200);
  });
});

describe('las vigencias del régimen de la empresa', () => {
  it('un cambio que cubre un período declarado responde 409 con el primer período declarado', async () => {
    const respuesta = await guardarFiscal({ ...OTRO_REGIMEN, vigenteDesde: mesDe(-5) });

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('vigencia_fiscal_en_periodo_declarado');
    expect(respuesta.cuerpo.error.detalles).toEqual({
      campo: 'secciones.libro-de-compras.vigenteDesde',
      periodo: P,
    });
  });

  it('quitar la vigencia de un mes declarado sin documentos también responde 409', async () => {
    const historial = (await propietario().get(rutaDeDatos())).cuerpo.historial as Array<{
      id: string;
      vigenteDesde: string | null;
    }>;
    const escalon = historial.find((vigencia) => vigencia.vigenteDesde === Q)!;

    const respuesta = await propietario().delete(`${rutaDeDatos()}/vigencias/${escalon.id}`);

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('vigencia_fiscal_en_periodo_declarado');
    expect(respuesta.cuerpo.error.detalles.periodo).toBe(Q);
  });

  it('reabierto el período, la vigencia se quita', async () => {
    const historial = (await propietario().get(rutaDeDatos())).cuerpo.historial as Array<{
      id: string;
      vigenteDesde: string | null;
    }>;
    const escalon = historial.find((vigencia) => vigencia.vigenteDesde === Q)!;
    expect((await reabrir(propietario(), Q)).estado).toBe(200);

    const respuesta = await propietario().delete(`${rutaDeDatos()}/vigencias/${escalon.id}`);

    expect(respuesta.estado).toBe(204);
  });
});

describe('reabrir devuelve la libertad de registrar, anular y eliminar', () => {
  it('con el período reabierto el documento se anula', async () => {
    expect((await reabrir(propietario(), P)).estado).toBe(200);

    const anular = await propietario().post(`${RUTA_DOCUMENTOS}/${libreId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });
    const registrar = await registrarCrudo({ periodo: P });

    expect(anular.estado, JSON.stringify(anular.cuerpo)).toBe(200);
    expect(registrar.estado, JSON.stringify(registrar.cuerpo)).toBe(201);
    expect(registrar.cuerpo.documento.periodo).toBe(P);
  });
});
