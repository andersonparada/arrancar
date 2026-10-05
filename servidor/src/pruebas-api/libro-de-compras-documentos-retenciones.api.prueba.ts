import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const EMISION = haceDias(3);
const SECCION = 'libro-de-compras';
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;
let opcional: string;
let pequeno: string;

const linea = (total: string) => ({ conceptoId: escenario.conceptoId, total });

const nitsPorProveedor = new Map<string, string>();

/** Cada proveedor usa siempre el mismo NIT: el primer documento se lo completa y los demás deben coincidir. */
function nitDe(proveedorId: string): string {
  if (!nitsPorProveedor.has(proveedorId))
    nitsPorProveedor.set(proveedorId, nitValido(String(1000001 + nitsPorProveedor.size)));
  return nitsPorProveedor.get(proveedorId)!;
}

const registrar = (proveedorId: string, cambios: Record<string, unknown> = {}) =>
  escenario.cuenta.propietario.post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      proveedorId,
      nitEmisor: nitDe(proveedorId),
      fechaEmision: EMISION,
      fechaRecepcion: HOY,
      lineas: [linea('5600.00')],
      ...cambios,
    }),
  );

const retencionesGuardadas = (documentoId: string) =>
  consultar<{ regla: string; fecha: string; monto: string; monto_propuesto: string; motivo_del_ajuste: string | null }>(
    `select regla, to_char(fecha, 'YYYY-MM-DD') as fecha, monto, monto_propuesto, motivo_del_ajuste
     from libro_de_compras.retenciones where documento_id = $1 order by regla`,
    [documentoId],
  );

beforeAll(async () => {
  destino = instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'retencionesdocumentos');
  await configurarEmpresa(escenario.cuenta, {
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  });
  opcional = (
    await registrarProveedor(escenario.cuenta, 'Simplificado', {
      secciones: { [SECCION]: { regimenIsr: 'opcional_simplificado' } },
    })
  ).proveedorId;
  pequeno = (
    await registrarProveedor(escenario.cuenta, 'Pequeño', {
      secciones: { [SECCION]: { esPequenoContribuyente: true } },
    })
  ).proveedorId;
});

afterAll(() => vi.restoreAllMocks());

describe('retenciones al registrar', () => {
  it('la del IVA lleva la fecha de recepción y se guarda propuesta y final', async () => {
    const respuesta = await registrar(escenario.proveedorId);

    expect(respuesta.estado).toBe(201);
    const [retencion] = respuesta.cuerpo.documento.retenciones;
    expect(retencion).toMatchObject({
      impuesto: 'iva',
      regla: 'iva_contribuyente_especial',
      base: '600.00',
      porcentaje: '15.00',
      montoPropuesto: '90.00',
      monto: '90.00',
      fecha: HOY,
    });
    expect(respuesta.cuerpo.documento.netoAPagar).toBe('5510.00');
    expect(destino.recibidos.at(-1)).toMatchObject({ totalCentavos: 560000, retencionesCentavos: 9000 });
    expect(await retencionesGuardadas(respuesta.cuerpo.documento.id)).toEqual([
      {
        regla: 'iva_contribuyente_especial',
        fecha: HOY,
        monto: '90.00',
        monto_propuesto: '90.00',
        motivo_del_ajuste: null,
      },
    ]);
  });

  it('la del ISR del régimen opcional simplificado lleva la fecha de emisión', async () => {
    const respuesta = await registrar(opcional);

    const reglas = Object.fromEntries(
      respuesta.cuerpo.documento.retenciones.map((r: { regla: string }) => [r.regla, r]),
    );
    expect(reglas.isr_opcional_simplificado).toMatchObject({
      base: '5000.00',
      montoPropuesto: '250.00',
      fecha: EMISION,
    });
    expect(reglas.iva_contribuyente_especial.fecha).toBe(HOY);
  });

  it('la del 5 % a un pequeño contribuyente lleva la fecha de recepción', async () => {
    const respuesta = await registrar(pequeno, { tipo: 'factura_pequeno_contribuyente', lineas: [linea('3000.00')] });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.retenciones).toEqual([
      expect.objectContaining({ regla: 'iva_pequeno_contribuyente', base: '3000.00', monto: '150.00', fecha: HOY }),
    ]);
  });

  it('el mínimo de Q2,500.00 se retiene, y una compra menor no lleva retención', async () => {
    const justo = await registrar(escenario.proveedorId, { lineas: [linea('2500.00')] });
    const menor = await registrar(escenario.proveedorId, { lineas: [linea('2499.99')] });

    expect(justo.cuerpo.documento.retenciones).toHaveLength(1);
    expect(menor.cuerpo.documento.retenciones).toEqual([]);
  });

  it('con la fecha de recepción de hace meses avisa que el entero ya venció', async () => {
    const vieja = haceDias(120);

    const respuesta = await registrar(escenario.proveedorId, { fechaEmision: vieja, fechaRecepcion: vieja });

    expect(respuesta.cuerpo.avisos.join(' ')).toContain('venció');
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('o vence en los próximos días si hubo feriados');
  });
});

describe('retenciones ajustadas', () => {
  const ajuste = (monto: string, motivo: string | null) => ({
    ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto, motivo }],
  });

  it('quitar la retención con motivo se guarda con la propuesta, se audita y avisa la responsabilidad solidaria', async () => {
    const respuesta = await registrar(escenario.proveedorId, ajuste('0', 'Proveedor exento por resolución'));

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('responde solidariamente');
    const id = respuesta.cuerpo.documento.id as string;
    expect(await retencionesGuardadas(id)).toEqual([
      expect.objectContaining({
        monto: '0.00',
        monto_propuesto: '90.00',
        motivo_del_ajuste: 'Proveedor exento por resolución',
      }),
    ]);
    const auditadas = await consultar<{ accion: string; motivo: string; anterior: { monto: string; regla: string } }>(
      "select accion, motivo, anterior from core.auditoria where recurso = 'libro-de-compras.retenciones' and registro_id = $1",
      [id],
    );
    expect(auditadas).toEqual([
      expect.objectContaining({
        accion: 'corregir',
        motivo: 'Proveedor exento por resolución',
        anterior: expect.objectContaining({ regla: 'iva_contribuyente_especial', monto: '90.00' }),
      }),
    ]);
  });

  it('cambiar el monto sin motivo se rechaza y no deja nada', async () => {
    const respuesta = await registrar(escenario.proveedorId, { numero: 'SIN-MOTIVO', ...ajuste('50.00', null) });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('motivo_del_ajuste_obligatorio');
    expect(await consultar("select id from libro_de_compras.documentos where numero = 'SIN-MOTIVO'")).toHaveLength(0);
  });

  it('un monto mayor a la base o una retención que no se propuso se rechazan', async () => {
    const pasaDeLaBase = await registrar(escenario.proveedorId, ajuste('700.00', 'Error'));
    const noPropuesta = await registrar(escenario.proveedorId, {
      ajustesDeRetenciones: [{ regla: 'isr_opcional_simplificado', monto: '0', motivo: 'No aplica' }],
    });

    expect(pasaDeLaBase.cuerpo.error.codigo).toBe('ajuste_de_retencion_invalido');
    expect(noPropuesta.cuerpo.error.codigo).toBe('ajuste_de_retencion_invalido');
  });
});
