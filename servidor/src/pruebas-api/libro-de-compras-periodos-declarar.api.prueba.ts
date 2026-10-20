import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  HOY,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import {
  apagarElBloqueo,
  declarar,
  detalleDe,
  encenderElBloqueo,
  mesDe,
  reabrir,
  registrarEn,
  RUTA_PERIODOS,
} from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const P = mesDe(-2);
let escenario: EscenarioDeDocumentos;
let facturaId: string;

const propietario = () => escenario.cuenta.propietario;
const auditoriaDe = (accion: string) =>
  consultar<{ motivo: string | null; anterior: any }>(
    "select motivo, anterior from core.auditoria where recurso = 'libro-de-compras.periodos' and accion = $1",
    [accion],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'periodosdeclarar');
  facturaId = (await registrarEn(escenario, P)).id;
  await registrarEn(escenario, P);
});

afterAll(() => vi.restoreAllMocks());

describe('listar los períodos', () => {
  it('trae los doce meses del año, abiertos, con el bloqueo apagado y los meses terminados marcados', async () => {
    const anio = HOY.slice(0, 4);

    const respuesta = await propietario().get(`${RUTA_PERIODOS}?anio=${anio}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.anio).toBe(Number(anio));
    expect(respuesta.cuerpo.control).toMatchObject({ encendido: false, actualizadoEn: null, actualizadoPor: null });
    expect(respuesta.cuerpo.periodos).toHaveLength(12);
    expect(respuesta.cuerpo.periodos.every((p: { estado: string }) => p.estado === 'abierto')).toBe(true);
    const terminados = respuesta.cuerpo.periodos.filter((p: { terminado: boolean }) => p.terminado).length;
    expect(terminados).toBe(Number(HOY.slice(5, 7)) - 1);
  });

  it('sin año trae el actual', async () => {
    const respuesta = await propietario().get(RUTA_PERIODOS);

    expect(respuesta.cuerpo.anio).toBe(Number(HOY.slice(0, 4)));
  });
});

describe('declarar un período', () => {
  it('no declara el mes actual, ni una presentación anterior al mes siguiente, ni un número con símbolos', async () => {
    const actual = await declarar(propietario(), mesDe(0));
    const temprano = await declarar(propietario(), P, { fechaDePresentacion: P });
    const simbolos = await declarar(propietario(), P, { numeroDeFormulario: '12#3' });
    const sinFormulario = await declarar(propietario(), P, { formulario: 'sin_formulario', numeroDeFormulario: '9' });

    expect(actual.cuerpo.error.codigo).toBe('periodo_sin_terminar');
    expect(temprano.cuerpo.error.codigo).toBe('fecha_de_presentacion_invalida');
    expect(simbolos.cuerpo.error.codigo).toBe('numero_de_formulario_invalido');
    expect(sinFormulario.cuerpo.error.codigo).toBe('numero_de_formulario_invalido');
    expect((await detalleDe(propietario(), P)).periodo.estado).toBe('abierto');
  });

  it('declara con número y fecha opcionales: formulario del régimen, hoy por omisión, foto del libro y avisos', async () => {
    const respuesta = await declarar(propietario(), P);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.periodo).toMatchObject({ periodo: P, estado: 'declarado', terminado: true });
    expect(respuesta.cuerpo.periodo.declaradoPor).toMatchObject({ nombre: expect.any(String) });
    expect(respuesta.cuerpo.declaracion).toMatchObject({
      secuencia: 1,
      evento: 'declaracion',
      formulario: 'SAT-2237',
      numeroDeFormulario: null,
      fechaDePresentacion: HOY,
      tipoDeLibro: 'completo',
      diferencia: null,
    });
    expect(respuesta.cuerpo.declaracion.foto).toMatchObject({ version: 1, tipoDeLibro: 'completo', documentos: 2 });
    expect(respuesta.cuerpo.declaracion.foto.resumen.totales.total).toBe('2240.00');
    const avisos = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).toContain('Los emisores pueden anular un DTE hasta el vencimiento');
    expect(avisos).not.toContain('bandeja');
  });

  it('el detalle trae el historial con su foto, sin cambios desde la declaración y la revisión', async () => {
    const detalle = await detalleDe(propietario(), P);

    expect(detalle.periodo).toMatchObject({ estado: 'declarado', ultimaDeclaracion: { evento: 'declaracion' } });
    expect(detalle.historial).toHaveLength(1);
    expect(detalle.historial[0].foto.documentos).toBe(2);
    expect(detalle.cambioDesdeLaDeclaracion).toEqual({
      contraLaSecuencia: 1,
      huellaCambio: false,
      cambios: [],
      documentos: [],
    });
    expect(detalle.revision.map((aviso: { codigo: string }) => aviso.codigo)).toEqual(['anulacion_de_dte']);
  });

  it('la lista del año marca el período declarado con su última declaración', async () => {
    const lista = await propietario().get(`${RUTA_PERIODOS}?anio=${P.slice(0, 4)}`);

    const periodo = lista.cuerpo.periodos.find((p: { periodo: string }) => p.periodo === P);
    expect(periodo).toMatchObject({ estado: 'declarado', ultimaDeclaracion: { formulario: 'SAT-2237' } });
  });
});

describe('con el bloqueo apagado el período declarado sigue admitiendo cambios', () => {
  it('registrar avisa con la declaración y anular funciona; el detalle dice que el libro cambió', async () => {
    const registrado = await registrarEn(escenario, P);
    const anulada = await propietario().post(`${RUTA_DOCUMENTOS}/${facturaId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });

    expect(registrado.cuerpo.avisos.join(' ')).toContain('El período');
    expect(registrado.cuerpo.avisos.join(' ')).toContain(`se declaró el ${HOY} (SAT-2237)`);
    expect(registrado.cuerpo.avisos).not.toContain(
      'Ese período puede estar declarado: si ya lo presentó, tendrá que rectificar.',
    );
    expect(anulada.estado).toBe(200);
    const { cambioDesdeLaDeclaracion: cambio } = await detalleDe(propietario(), P);
    expect(cambio.huellaCambio).toBe(true);
    expect(cambio.documentos.map((d: { cambio: string }) => d.cambio).sort()).toEqual(['anulado', 'registrado']);
  });

  it('declarar de nuevo es una rectificación con la diferencia contra la anterior, sin reabrir', async () => {
    const respuesta = await declarar(propietario(), P, { numeroDeFormulario: 'r-77', fechaDePresentacion: HOY });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.declaracion).toMatchObject({
      secuencia: 2,
      evento: 'rectificacion',
      numeroDeFormulario: 'R77',
    });
    const { diferencia, foto } = respuesta.cuerpo.declaracion;
    expect(foto.documentos).toBe(2);
    expect(diferencia.contraLaSecuencia).toBe(1);
    expect(diferencia.huellaCambio).toBe(true);
    expect(diferencia.documentos.map((d: { cambio: string }) => d.cambio).sort()).toEqual(['anulado', 'registrado']);
    expect(diferencia.cambios).toEqual([]);
    expect((await detalleDe(propietario(), P)).historial.map((h: { evento: string }) => h.evento)).toEqual([
      'declaracion',
      'rectificacion',
    ]);
  });

  it('una rectificación cuyas cifras cambian las trae anterior, actual y cambio', async () => {
    await registrarEn(escenario, P, { lineas: [{ conceptoId: escenario.conceptoId, total: '560.00' }] });

    const respuesta = await declarar(propietario(), P);

    expect(respuesta.cuerpo.declaracion.evento).toBe('rectificacion');
    expect(respuesta.cuerpo.declaracion.diferencia.cambios).toEqual(
      expect.arrayContaining([
        { clave: 'documentos', anterior: '2', actual: '3', cambio: '1' },
        { clave: 'resumen.totales.total', anterior: '2240.00', actual: '2800.00', cambio: '560.00' },
      ]),
    );
  });
});

describe('reabrir un período', () => {
  it('pide motivo, no reabre uno que no está declarado y deja la reapertura en el historial y la auditoría', async () => {
    const sinMotivo = await propietario().post(`${RUTA_PERIODOS}/${P.slice(0, 7)}/reabrir`, {});
    const abierto = await reabrir(propietario(), mesDe(-5));

    const respuesta = await reabrir(propietario(), P, '  Falta la factura del proveedor X ');

    expect(sinMotivo.estado).toBe(400);
    expect(abierto.cuerpo.error.codigo).toBe('periodo_no_declarado');
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.periodo).toMatchObject({ estado: 'abierto', declaradoEn: null });
    expect(respuesta.cuerpo.declaracion).toMatchObject({
      secuencia: 4,
      evento: 'reapertura',
      motivo: 'Falta la factura del proveedor X',
      formulario: null,
    });
    const auditado = await auditoriaDe('reabrir');
    expect(auditado).toHaveLength(1);
    expect(auditado[0]).toMatchObject({
      motivo: 'Falta la factura del proveedor X',
      anterior: { periodo: P, estado: 'declarado', ultimaDeclaracion: { evento: 'rectificacion' } },
    });
  });

  it('después de reabrir se vuelve a declarar y es una rectificación; reabrir de nuevo exige haber declarado', async () => {
    const otraVez = await reabrir(propietario(), P);
    const declarada = await declarar(propietario(), P);

    expect(otraVez.cuerpo.error.codigo).toBe('periodo_no_declarado');
    expect(declarada.cuerpo.declaracion).toMatchObject({ secuencia: 5, evento: 'rectificacion' });
    const historial = (await detalleDe(propietario(), P)).historial;
    expect(historial.map((h: { evento: string }) => h.evento)).toEqual([
      'declaracion',
      'rectificacion',
      'rectificacion',
      'reapertura',
      'rectificacion',
    ]);
  });
});

describe('encender y apagar el bloqueo', () => {
  it('encender lo deja en la lista con quién y cuándo, y se audita', async () => {
    const respuesta = await encenderElBloqueo(propietario());

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ encendido: true, actualizadoPor: { nombre: expect.any(String) } });
    expect(respuesta.cuerpo.actualizadoEn).not.toBeNull();
    const lista = await propietario().get(RUTA_PERIODOS);
    expect(lista.cuerpo.control.encendido).toBe(true);
    expect(await auditoriaDe('corregir')).toEqual([{ motivo: null, anterior: { encendido: false } }]);
  });

  it('con el bloqueo encendido no se declara de nuevo un período declarado: primero se reabre', async () => {
    const respuesta = await declarar(propietario(), P);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('periodo_ya_declarado');
  });

  it('encenderlo otra vez no hace nada ni audita; apagarlo pide motivo', async () => {
    const otraVez = await encenderElBloqueo(propietario());
    const sinMotivo = await apagarElBloqueo(propietario());
    const largo = await apagarElBloqueo(propietario(), 'x'.repeat(501));

    expect(otraVez.estado).toBe(200);
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_del_periodo_invalido');
    expect(largo.estado).toBe(400);
    expect(await auditoriaDe('corregir')).toHaveLength(1);
  });

  it('apagarlo con su motivo se audita y los registros vuelven a pasar', async () => {
    const respuesta = await apagarElBloqueo(propietario(), 'La empresa prefiere avisos');

    expect(respuesta.cuerpo.encendido).toBe(false);
    const auditado = await auditoriaDe('corregir');
    expect(auditado.at(-1)).toMatchObject({ motivo: 'La empresa prefiere avisos', anterior: { encendido: true } });
    expect((await registrarEn(escenario, P)).cuerpo.documento.periodo).toBe(P);
  });
});
