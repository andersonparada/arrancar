import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  filaGuardada,
  operadorDeLaBandeja,
  RUTA_DTE,
  sembrarFila,
  sembrarLote,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';
import { mesDe } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const NIT_DEL_PROVEEDOR = nitValido('4400001');
let escenario: EscenarioDeDocumentos;
let operador: Operador;
let loteId: string;
let proveedorId: string;
let facturaId: string;

const propietario = (): ClienteApi => escenario.cuenta.propietario;
const sembrar = (cambios: CambiosDeLaFila = {}) =>
  sembrarFila(operador, loteId, { nitEmisor: NIT_DEL_PROVEEDOR, ...cambios });
const completar = (cuerpo: Record<string, unknown>) => propietario().patch(RUTA_DTE, cuerpo);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'bandejacompletar');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  operador = await operadorDeLaBandeja(escenario);
  loteId = await sembrarLote(operador, { encabezadosNoReconocidos: ['Columna rara'] });
  proveedorId = (await registrarProveedor(escenario.cuenta, 'Agro del Norte, S.A.', { nit: NIT_DEL_PROVEEDOR }))
    .proveedorId;
  // Un documento anterior del proveedor: de ahí salen el último concepto y el destino que se proponen.
  const previo = await propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { proveedorId, nitEmisor: NIT_DEL_PROVEEDOR }),
  );
  expect(previo.estado, JSON.stringify(previo.cuerpo)).toBe(201);
  facturaId = previo.cuerpo.documento.id;
});

afterAll(() => vi.restoreAllMocks());

describe('lista de la bandeja', () => {
  it('cada fila pendiente trae lo que se propondría: proveedor por NIT, último concepto y destino, recepción y período', async () => {
    const id = await sembrar();

    const respuesta = await propietario().get(`${RUTA_DTE}?busqueda=${NIT_DEL_PROVEEDOR}`);

    expect(respuesta.estado).toBe(200);
    const fila = respuesta.cuerpo.elementos.find((elemento: any) => elemento.id === id);
    expect(fila).toMatchObject({
      estado: 'pendiente',
      nitEmisor: NIT_DEL_PROVEEDOR,
      total: '1120.00',
      borrador: { proveedorId: null, conceptoId: null, destino: null, fechaRecepcion: null, periodo: null },
      propuesta: {
        proveedorId,
        conceptoId: escenario.conceptoId,
        destino: 'cuentas-por-pagar',
        fechaRecepcion: HOY,
        recepcionObligatoria: false,
        periodo: mesDe(0),
        avisoDelPeriodo: null,
      },
    });
    expect(fila).not.toHaveProperty('filaOriginal');
  });

  it('un NIT sin proveedor no propone proveedor, concepto ni destino', async () => {
    const id = await sembrar({ nitEmisor: nitValido('4400002') });

    const respuesta = await propietario().get(`${RUTA_DTE}?conProveedor=false&estado=pendiente`);

    const fila = respuesta.cuerpo.elementos.find((elemento: any) => elemento.id === id);
    expect(fila.propuesta).toMatchObject({ proveedorId: null, conceptoId: null, destino: null });
  });

  it('filtra por estado, fechas de emisión, texto y tipo, y pagina', async () => {
    const vieja = await sembrar({ fechaEmision: haceDias(40), nombreEmisor: 'Ferretería Don Lalo' });

    const porTexto = await propietario().get(`${RUTA_DTE}?busqueda=lalo`);
    const porFechas = await propietario().get(`${RUTA_DTE}?hasta=${haceDias(30)}`);
    const porTipo = await propietario().get(`${RUTA_DTE}?tipoDte=NCRE`);
    const pagina = await propietario().get(`${RUTA_DTE}?limite=1&pagina=2`);

    expect(porTexto.cuerpo.elementos.map((e: any) => e.id)).toEqual([vieja]);
    expect(porFechas.cuerpo.elementos.map((e: any) => e.id)).toContain(vieja);
    expect(porFechas.cuerpo.elementos.every((e: any) => e.fechaEmision <= haceDias(30))).toBe(true);
    expect(porTipo.cuerpo.total).toBe(0);
    expect(pagina.cuerpo).toMatchObject({ pagina: 2, limite: 1 });
    expect(pagina.cuerpo.elementos).toHaveLength(1);
    expect(pagina.cuerpo.total).toBeGreaterThan(2);
  });
});

describe('completar en lote', () => {
  it('aplica la propuesta de cada fila a los campos que se piden, y solo a esos', async () => {
    const [a, b] = [await sembrar(), await sembrar()];

    const respuesta = await completar({
      ids: [a, b],
      aplicarPropuestas: ['proveedorId', 'conceptoId', 'destino', 'fechaRecepcion'],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    for (const id of [a, b]) {
      expect(await filaGuardada(id)).toMatchObject({
        proveedor_id: proveedorId,
        concepto_id: escenario.conceptoId,
        destino: 'cuentas-por-pagar',
        periodo: null,
      });
    }
    expect(respuesta.cuerpo.elementos[0].borrador).toMatchObject({ proveedorId, fechaRecepcion: HOY, periodo: null });
  });

  it('lo que se escribe a mano manda, y null lo deja sin completar', async () => {
    const id = await sembrar({ conceptoId: escenario.conceptoId });

    const respuesta = await completar({
      ids: [id],
      cambios: { conceptoId: null, noVinculado: true, periodo: mesDe(1), fechaRecepcion: HOY },
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await filaGuardada(id)).toMatchObject({ concepto_id: null, no_vinculado: true });
    expect(respuesta.cuerpo.elementos[0].borrador).toMatchObject({ periodo: mesDe(1), fechaRecepcion: HOY });
  });

  it('rechaza una recepción anterior a la emisión y un período que no es primer día de mes', async () => {
    const id = await sembrar();

    const recepcion = await completar({ ids: [id], cambios: { fechaRecepcion: haceDias(1, HOY) } });
    const periodo = await completar({ ids: [id], cambios: { periodo: `${mesDe(0).slice(0, 8)}15` } });

    expect(recepcion.estado).toBe(400);
    expect(recepcion.cuerpo.error.codigo).toBe('borrador_de_dte_invalido');
    expect(periodo.estado).toBe(400);
    expect(periodo.cuerpo.error.codigo).toBe('borrador_de_dte_invalido');
  });

  it('el proveedor y el concepto deben existir y la factura solo va en las notas', async () => {
    const id = await sembrar();

    const proveedor = await completar({ ids: [id], cambios: { proveedorId: crypto.randomUUID() } });
    const concepto = await completar({ ids: [id], cambios: { conceptoId: crypto.randomUUID() } });
    const factura = await completar({ ids: [id], cambios: { documentoAfectadoId: facturaId } });

    expect(proveedor.estado).toBe(404);
    expect(concepto.estado).toBe(404);
    expect(factura.estado).toBe(400);
    expect(factura.cuerpo.error.codigo).toBe('factura_solo_en_notas');
  });

  it('una nota sí lleva la factura que corrige', async () => {
    const id = await sembrar({ tipoDte: 'NCRE' });

    const respuesta = await completar({ ids: [id], cambios: { documentoAfectadoId: facturaId } });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await filaGuardada(id)).toMatchObject({ documento_afectado_id: facturaId });
  });

  it('todas las filas cambian o ninguna: una fila descartada frena todo', async () => {
    const pendiente = await sembrar();
    const descartada = await sembrar();
    await propietario().post(`${RUTA_DTE}/descartar`, { ids: [descartada], motivo: 'No es de la empresa' });

    const respuesta = await completar({ ids: [pendiente, descartada], cambios: { noVinculado: true } });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('dte_no_esta_pendiente');
    expect((await filaGuardada(pendiente)).no_vinculado).toBe(false);
  });
});

describe('descartar y restaurar', () => {
  it('descarta con su motivo, lo audita y se puede restaurar', async () => {
    const id = await sembrar();

    const descarte = await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: ' Compra personal ' });
    const auditoria = () =>
      consultar<{ accion: string; motivo: string | null; anterior: any }>(
        `select accion, motivo, anterior from core.auditoria
         where recurso = 'libro-de-compras.dte-recibidos' and registro_id = $1 order by creado_en`,
        [id],
      );

    expect(descarte.estado, JSON.stringify(descarte.cuerpo)).toBe(200);
    expect(descarte.cuerpo.elementos[0]).toMatchObject({
      id,
      estado: 'descartado',
      motivoDeDescarte: 'Compra personal',
    });
    expect(await filaGuardada(id)).toMatchObject({ estado: 'descartado', motivo_de_descarte: 'Compra personal' });
    const [descartado] = await auditoria();
    expect(descartado).toMatchObject({ accion: 'descartar', motivo: 'Compra personal' });
    expect(descartado!.anterior).toMatchObject({ estado: 'pendiente', autorizacionFel: expect.any(String) });

    const restauracion = await propietario().post(`${RUTA_DTE}/${id}/restaurar`);

    expect(restauracion.estado, JSON.stringify(restauracion.cuerpo)).toBe(200);
    expect(restauracion.cuerpo).toMatchObject({ id, estado: 'pendiente', motivoDeDescarte: null });
    expect((await auditoria()).map((fila) => fila.accion)).toEqual(['descartar', 'reactivar']);
  });

  it('exige el motivo y no restaura lo que no está descartado', async () => {
    const id = await sembrar();

    const sinMotivo = await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: '   ' });
    const largo = await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: 'x'.repeat(301) });
    const restaurar = await propietario().post(`${RUTA_DTE}/${id}/restaurar`);

    expect(sinMotivo.estado).toBe(400);
    expect(largo.estado).toBe(400);
    expect(largo.cuerpo.error.codigo).toBe('motivo_de_descarte_invalido');
    expect(restaurar.estado).toBe(422);
    expect(restaurar.cuerpo.error.codigo).toBe('dte_no_esta_descartado');
    expect((await filaGuardada(id)).estado).toBe('pendiente');
  });

  it('una fila ya descartada no se descarta otra vez', async () => {
    const id = await sembrar();
    await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: 'Uno' });

    const otra = await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: 'Dos' });

    expect(otra.estado).toBe(422);
    expect(otra.cuerpo.error.codigo).toBe('transicion_de_dte_invalida');
  });

  it('una fila que no existe responde 404', async () => {
    const respuesta = await propietario().post(`${RUTA_DTE}/${crypto.randomUUID()}/restaurar`);

    expect(respuesta.estado).toBe(404);
  });
});

describe('permisos', () => {
  const permisosDe = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Bandeja', permisos });

  it('ver y completar piden documentos.importar; descartar, dte-recibidos.descartar; confirmar, documentos.crear', async () => {
    const id = await sembrar();
    const solo = await permisosDe('Solo ver', ['libro-de-compras.documentos.ver']);
    const importador = await permisosDe('Importador', ['libro-de-compras.documentos.importar']);
    const cuerpo = { ids: [id] };

    const sinImportar = [await solo.get(RUTA_DTE), await solo.patch(RUTA_DTE, cuerpo)];
    const sinDescartar = [
      await importador.post(`${RUTA_DTE}/descartar`, { ...cuerpo, motivo: 'x' }),
      await importador.post(`${RUTA_DTE}/${id}/restaurar`),
    ];
    const sinCrear = [
      await importador.post(`${RUTA_DTE}/confirmar`, cuerpo),
      await importador.post(`${RUTA_DTE}/vista-previa`, cuerpo),
      await importador.get(`${RUTA_DTE}/${id}/solicitud`),
    ];

    expect([...sinImportar, ...sinDescartar, ...sinCrear].map((r) => r.estado)).toEqual(Array(7).fill(403));
    expect((await importador.get(RUTA_DTE)).estado).toBe(200);
    expect((await importador.patch(RUTA_DTE, cuerpo)).estado).toBe(200);
  });
});
