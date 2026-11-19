/**
 * Prueba de integración contra PostgreSQL (base de pruebas): aislamiento de los costos entre dos empresas de la misma
 * cuenta, llaves compuestas con la empresa y `check` de la base (diseño §5.4).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { errorDePostgres, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';
import { activos } from './activos.tablas.js';
import { costos } from './costos.tablas.js';

let escenario: EscenarioEnBd;
let activoA1: string;
let activoA2: string;

const en = (empresaId: string): ContextoEmpresa => escenario.en(empresaId);
const enA1 = () => en(escenario.empresaA1);

const costo = (cambios: Partial<typeof costos.$inferInsert> = {}) =>
  ({
    empresaId: escenario.empresaA1,
    activoId: activoA1,
    origen: 'manual',
    claseDeCosto: 'importacion',
    fecha: '2026-11-05',
    monto: '2500.00',
    documentoDeSoporte: 'DUCA 26-0000123',
    ...cambios,
  }) satisfies typeof costos.$inferInsert;

const insertar = (valores: typeof costos.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(costos).values(valores).returning());

const restriccion = (valores: typeof costos.$inferInsert) =>
  errorDePostgres(insertar(valores)).then((e) => e?.constraint);

async function crearActivo(empresaId: string, claseId: string): Promise<string> {
  const [fila] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(activos)
      .values({
        empresaId,
        claseId,
        codigo: 'AF-0001',
        descripcion: 'Tractor',
        tipoDeRegistro: 'activo',
        origen: 'compra',
        estado: 'en_construccion',
        fechaDeAdquisicion: '2026-11-01',
      })
      .returning(),
  );
  return fila!.id;
}

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('costosaf');
  activoA1 = await crearActivo(escenario.empresaA1, escenario.claseA1);
  activoA2 = await crearActivo(escenario.empresaA2, escenario.claseA2);
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('costos: aislamiento entre dos empresas de la misma cuenta (solo por empresa, AF-P2 a)', () => {
  it('cada empresa ve solo sus costos y no puede escribir a nombre de otra', async () => {
    await insertar(costo());
    const visibles = (empresaId: string) => enTransaccionSegura(en(empresaId), (tx) => tx.select().from(costos));

    expect(await visibles(escenario.empresaA1)).toHaveLength(1);
    expect(await visibles(escenario.empresaA2)).toEqual([]);
    await expect(insertar(costo({ empresaId: escenario.empresaA2, activoId: activoA2 }), enA1())).rejects.toThrow();
  });

  it('no se cruza la llave compuesta: el costo de una empresa no cuelga del activo de otra', async () => {
    expect(await restriccion(costo({ activoId: activoA2 }))).toBe('costos_activo_fk');
  });
});

describe('costos: lo que la base garantiza', () => {
  it('la línea del libro y su documento van juntos y la línea debe existir en el libro', async () => {
    const sinDocumento = await restriccion(
      costo({ origen: 'linea_de_compra', lineaDeDocumentoId: crypto.randomUUID(), documentoDeSoporte: null }),
    );
    const inexistente = await restriccion(
      costo({
        origen: 'linea_de_compra',
        lineaDeDocumentoId: crypto.randomUUID(),
        documentoDeCompraId: crypto.randomUUID(),
        documentoDeSoporte: null,
      }),
    );
    const manualConLinea = await restriccion(costo({ lineaDeDocumentoId: crypto.randomUUID() }));

    expect(sinDocumento).toBe('costos_de_linea_completo');
    expect(inexistente).toBe('costos_linea_fk');
    expect(manualConLinea).toBe('costos_linea_y_documento');
  });

  it('el costo manual lleva su documento de soporte', async () => {
    expect(await restriccion(costo({ documentoDeSoporte: null }))).toBe('costos_manual_con_soporte');
  });

  it('el monto no es cero y solo la nota de crédito es negativa', async () => {
    expect(await restriccion(costo({ monto: '0.00' }))).toBe('costos_monto_con_signo');
    expect(await restriccion(costo({ monto: '-10.00' }))).toBe('costos_monto_con_signo');
    expect(await restriccion(costo({ monto: '10.00', claseDeCosto: 'nota_de_credito' }))).toBe(
      'costos_monto_con_signo',
    );
  });

  it('fuera del libro fiscal lleva motivo y solo en costos manuales (V-8)', async () => {
    const sinMotivo = await restriccion(costo({ aplicaAlLibroFiscal: false }));
    const conMotivoDentro = await restriccion(costo({ motivoFueraDelLibroFiscal: 'Sin documento' }));
    const fueraDeUnaLinea = await restriccion(
      costo({
        origen: 'saldo_inicial',
        documentoDeSoporte: null,
        aplicaAlLibroFiscal: false,
        motivoFueraDelLibroFiscal: 'x',
      }),
    );

    expect(sinMotivo).toBe('costos_fuera_del_libro_fiscal');
    expect(conMotivoDentro).toBe('costos_fuera_del_libro_fiscal');
    expect(fueraDeUnaLinea).toBe('costos_fuera_del_libro_solo_manual');
    await expect(
      insertar(costo({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Desmantelamiento' })),
    ).resolves.toBeTruthy();
  });

  it('la clase de costo y el origen son de la lista', async () => {
    expect(await restriccion(costo({ claseDeCosto: 'division_cedida' as never }))).toBe('costos_clase_de_costo');
    expect(await restriccion(costo({ origen: 'inventario' as never }))).toBe('costos_origen');
  });

  it('la anulación va completa: estado, quién, cuándo y por qué', async () => {
    const incompleta = await restriccion(costo({ estado: 'anulado' }));
    const completa = await insertar(
      costo({ estado: 'anulado', anuladoEn: new Date(), anuladoPor: escenario.usuarioId, motivoDeAnulacion: 'Error' }),
    );

    expect(incompleta).toBe('costos_anulacion_completa');
    expect(completa).toHaveLength(1);
  });

  it('un activo tiene un solo costo vigente de saldo inicial', async () => {
    const saldo = costo({ origen: 'saldo_inicial', documentoDeSoporte: null, claseDeCosto: 'adquisicion' });
    await insertar(saldo);

    expect(await restriccion(saldo)).toBe('costos_saldo_inicial_unico');
  });

  it('los textos no pasan de su largo', async () => {
    expect(await restriccion(costo({ documentoDeSoporte: 'x'.repeat(151) }))).toBe('costos_textos_largos');
    expect(await restriccion(costo({ descripcion: ' ' }))).toBe('costos_textos_largos');
  });
});
