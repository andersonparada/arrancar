/**
 * Aplicar a mano el saldo libre de una nota de crédito a otros cargos del proveedor (CP2-3): varios cargos, todo o nada,
 * montos, fechas, nota anulada, cargo pendiente, referencia, y quitar la aplicación con su auditoría y sus permisos.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import {
  notaConSaldoLibre,
  sembrarAplicacionManual,
  type NotaConSaldoLibre,
} from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
const NOMBRES = ['Alfa', 'Bravo', 'Cobre', 'Delta', 'Eco', 'Fénix', 'Gama', 'Halcón', 'Índigo', 'Jade', 'Kilo', 'Lima'];
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let soloVer: ClienteApi;
let secuencia = 0;

const propietario = () => escenario.cuenta.propietario;
const aplicar = (notaPropia: string, cuerpo: Record<string, unknown>, cliente = propietario()) =>
  cliente.post(`${RUTA}/documentos/${notaPropia}/aplicaciones`, cuerpo);
const lineas = (...pares: Array<[string, string]>) => pares.map(([cargoId, monto]) => ({ cargoId, monto }));
const ficha = async (id: string) => (await propietario().get(`${RUTA}/documentos/${id}`)).cuerpo;
const manuales = async (notaPropia: string) =>
  consultar<{ monto: string; fecha: string; referencia: string | null; cargo_id: string }>(
    `select monto::text, fecha::text, referencia, cargo_id from cuentas_por_pagar.aplicaciones_de_notas
      where nota_id = $1 and forma = 'manual' order by creado_en`,
    [notaPropia],
  );
const auditoriaDeQuitar = () =>
  consultar<{ registro_id: string; motivo: string; anterior: Record<string, unknown> }>(
    `select registro_id, motivo, anterior from core.auditoria
      where recurso = 'cuentas-por-pagar.aplicaciones-de-notas' and accion = 'quitar' and cuenta_id = $1`,
    [escenario.cuenta.cuentaId],
  );

type Contexto = NotaConSaldoLibre & { proveedorId: string; nitEmisor: string };

/** Un proveedor propio con una factura y una nota que deja Q100.00 de saldo libre. */
async function unaNota(cambios: Record<string, unknown> = {}): Promise<Contexto> {
  const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
    nombre: `${NOMBRES[secuencia]} S.A.`,
    nit: String(5600000 + secuencia++),
    diasDeCredito: 30,
  });
  return { proveedorId, nitEmisor, ...(await notaConSaldoLibre(documentos, { proveedorId, nitEmisor, ...cambios })) };
}

/** Otra factura de Q1,120.00 del mismo proveedor; devuelve su id de Cuentas por pagar. */
async function otroCargo({ proveedorId, nitEmisor }: Contexto, cambios: Record<string, unknown> = {}) {
  const libroId = await documentos.registrar({ proveedorId, nitEmisor, ...cambios });
  return (await documentos.fila(libroId))!.id;
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpaplicaciones', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo mira',
    apellidos: 'Aplicaciones',
    permisos: ['cuentas-por-pagar.documentos.ver'],
  });
});

describe('aplicar el saldo libre', () => {
  it('rebaja varios cargos con forma manual, hoy y la referencia, también uno pendiente', async () => {
    const contexto = await unaNota();
    const [a, b] = [await otroCargo(contexto), await otroCargo(contexto)];

    const respuesta = await aplicar(contexto.notaPropia, {
      referencia: '  Acuerdo 7  ',
      aplicaciones: lineas([a, '40.00'], [b, '60.00']),
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ id: contexto.notaPropia, saldo: '0.00', aplicado: '1120.00' });
    expect(await manuales(contexto.notaPropia)).toEqual([
      expect.objectContaining({ cargo_id: a, monto: '40.00', referencia: 'Acuerdo 7' }),
      expect.objectContaining({ cargo_id: b, monto: '60.00', referencia: 'Acuerdo 7' }),
    ]);
    expect(await ficha(a)).toMatchObject({ estado: 'pendiente', aplicado: '40.00', saldo: '1080.00' });
  });

  it('rechaza un cargo de otro proveedor y no guarda ninguna de las líneas', async () => {
    const contexto = await unaNota();
    const propio = await otroCargo(contexto);
    const ajeno = (await unaNota()).facturaPropia;

    const respuesta = await aplicar(contexto.notaPropia, { aplicaciones: lineas([propio, '10.00'], [ajeno, '10.00']) });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toMatchObject({
      codigo: 'cargo_no_disponible',
      detalles: { campo: 'aplicaciones.1.cargoId' },
    });
    expect(await manuales(contexto.notaPropia)).toEqual([]);
  });

  it('rechaza más que el saldo del cargo y una suma mayor que el saldo libre', async () => {
    const contexto = await unaNota();
    const debito = await documentos.registrarNota('NDEB', contexto.facturaId, {
      total: '50.00',
      proveedorId: contexto.proveedorId,
      nitEmisor: contexto.nitEmisor,
    });
    const [pequeno, grande] = [(await documentos.fila(debito))!.id, await otroCargo(contexto)];

    const delCargo = await aplicar(contexto.notaPropia, { aplicaciones: lineas([pequeno, '50.01']) });
    const delTotal = await aplicar(contexto.notaPropia, {
      aplicaciones: lineas([pequeno, '50.00'], [grande, '50.01']),
    });

    expect(delCargo.cuerpo.error).toMatchObject({ codigo: 'aplicacion_mayor_que_el_saldo' });
    expect(delTotal.cuerpo.error).toMatchObject({ codigo: 'aplicacion_mayor_que_el_saldo_libre' });
    expect(await manuales(contexto.notaPropia)).toEqual([]);
  });

  it('rechaza montos en cero, cargos repetidos y una referencia de más de 100 caracteres', async () => {
    const contexto = await unaNota();
    const cargo = await otroCargo(contexto);

    const cero = await aplicar(contexto.notaPropia, { aplicaciones: lineas([cargo, '0.00']) });
    const repetido = await aplicar(contexto.notaPropia, { aplicaciones: lineas([cargo, '1.00'], [cargo, '2.00']) });
    const larga = await aplicar(contexto.notaPropia, {
      referencia: 'x'.repeat(101),
      aplicaciones: lineas([cargo, '1.00']),
    });

    expect(cero.cuerpo.error.codigo).toBe('monto_de_aplicacion_invalido');
    expect(repetido.cuerpo.error.codigo).toBe('cargo_repetido');
    expect(larga.cuerpo.error.codigo).toBe('referencia_de_aplicacion_invalida');
  });

  it('rechaza una nota anulada y un documento que no es nota de crédito', async () => {
    const contexto = await unaNota();
    const cargo = await otroCargo(contexto);
    const anulada = await propietario().post(`${RUTA}/documentos/${contexto.notaPropia}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error',
    });
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);

    const deAnulada = await aplicar(contexto.notaPropia, { aplicaciones: lineas([cargo, '10.00']) });
    const deFactura = await aplicar(cargo, { aplicaciones: lineas([contexto.facturaPropia, '10.00']) });

    expect(deAnulada.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
    expect(deFactura.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
    expect((await aplicar(crypto.randomUUID(), { aplicaciones: lineas([cargo, '1.00']) })).estado).toBe(404);
  });
});

describe('la fecha de la aplicación', () => {
  it('no puede ser futura ni anterior a la recepción de la nota o de un cargo', async () => {
    const contexto = await unaNota({ fechaRecepcion: haceDias(3) });
    const cargo = await otroCargo(contexto, { fechaRecepcion: haceDias(1) });
    const pedir = (fecha: string) => aplicar(contexto.notaPropia, { fecha, aplicaciones: lineas([cargo, '10.00']) });

    const futura = await pedir(haceDias(-1));
    const antesDelCargo = await pedir(haceDias(2));
    const antesDeLaNota = await pedir(haceDias(4));
    const valida = await pedir(haceDias(1));

    for (const respuesta of [futura, antesDelCargo, antesDeLaNota]) {
      expect(respuesta.estado).toBe(400);
      expect(respuesta.cuerpo.error).toMatchObject({
        codigo: 'fecha_de_aplicacion_invalida',
        detalles: { campo: 'fecha' },
      });
    }
    expect(valida.estado, JSON.stringify(valida.cuerpo)).toBe(200);
    expect(await manuales(contexto.notaPropia)).toEqual([expect.objectContaining({ fecha: haceDias(1) })]);
  });
});

describe('quitar una aplicación', () => {
  async function conUnaManual() {
    const contexto = await unaNota();
    const cargo = await otroCargo(contexto);
    await aplicar(contexto.notaPropia, { aplicaciones: lineas([cargo, '40.00']) });
    const [fila] = await consultar<{ id: string }>(
      "select id from cuentas_por_pagar.aplicaciones_de_notas where nota_id = $1 and forma = 'manual'",
      [contexto.notaPropia],
    );
    return { ...contexto, cargo, aplicacionId: fila!.id };
  }

  it('la quita con auditoría y devuelve el monto al saldo libre y al cargo', async () => {
    const { aplicacionId, notaPropia, cargo } = await conUnaManual();

    const respuesta = await propietario().delete(`${RUTA}/aplicaciones/${aplicacionId}`, {
      motivo: 'Se pactó otra cosa',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(204);
    expect(await manuales(notaPropia)).toEqual([]);
    expect(await ficha(notaPropia)).toMatchObject({ saldo: '100.00' });
    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00' });
    const [auditada] = (await auditoriaDeQuitar()).filter(({ registro_id: id }) => id === aplicacionId);
    expect(auditada).toMatchObject({
      motivo: 'Se pactó otra cosa',
      anterior: { monto: '40.00', forma: 'manual', referencia: null, notaId: notaPropia, cargoId: cargo },
    });
    expect(auditada!.anterior).toHaveProperty('notaNumero');
    expect(auditada!.anterior).toHaveProperty('cargoNumero');
  });

  it('no quita la automática, pide motivo y responde 404 si no existe', async () => {
    const contexto = await unaNota();
    const [automatica] = await consultar<{ id: string }>(
      "select id from cuentas_por_pagar.aplicaciones_de_notas where nota_id = $1 and forma = 'automatica'",
      [contexto.notaPropia],
    );
    const { aplicacionId } = await conUnaManual();

    const deLaRecepcion = await propietario().delete(`${RUTA}/aplicaciones/${automatica!.id}`, { motivo: 'x' });
    const sinMotivo = await propietario().delete(`${RUTA}/aplicaciones/${aplicacionId}`, { motivo: '  ' });
    const noExiste = await propietario().delete(`${RUTA}/aplicaciones/${crypto.randomUUID()}`, { motivo: 'x' });

    expect(deLaRecepcion.cuerpo.error.codigo).toBe('aplicacion_no_se_quita');
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_invalido');
    expect(noExiste.estado).toBe(404);
  });

  it('quitar la aplicación permite anular el cargo que la recibió', async () => {
    const { aplicacionId, cargo } = await conUnaManual();
    const cuerpo = { causa: 'error_de_captura', motivo: 'Error' };
    expect((await propietario().post(`${RUTA}/documentos/${cargo}/anular`, cuerpo)).cuerpo.error.codigo).toBe(
      'cargo_con_aplicaciones_manuales',
    );

    await propietario().delete(`${RUTA}/aplicaciones/${aplicacionId}`, { motivo: 'Se deshace' });

    expect((await propietario().post(`${RUTA}/documentos/${cargo}/anular`, cuerpo)).estado).toBe(200);
  });
});

describe('los permisos', () => {
  it('aplicar y quitar piden documentos.aplicar-notas; ver los cargos, documentos.ver', async () => {
    const contexto = await unaNota();
    const cargo = await otroCargo(contexto);
    const aplicacionId = await sembrarAplicacionManual({
      notaPropia: contexto.notaPropia,
      cargoPropio: cargo,
      monto: '10.00',
    });

    const sinPermiso = await aplicar(contexto.notaPropia, { aplicaciones: lineas([cargo, '10.00']) }, soloVer);
    const sinPermisoParaQuitar = await soloVer.delete(`${RUTA}/aplicaciones/${aplicacionId}`, { motivo: 'x' });
    const vista = await soloVer.get(`${RUTA}/documentos/${contexto.notaPropia}/cargos-para-aplicar`);

    expect(sinPermiso.estado).toBe(403);
    expect(sinPermisoParaQuitar.estado).toBe(403);
    expect(vista.estado).toBe(200);
    expect((await manuales(contexto.notaPropia)).length).toBe(1);
  });
});
