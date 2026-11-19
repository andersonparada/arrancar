/**
 * Prueba de integración contra PostgreSQL (base de pruebas): aislamiento de los activos entre dos empresas de la
 * misma cuenta, llaves compuestas con la empresa y `check` de la base.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { errorDePostgres, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';
import { activos } from './activos.tablas.js';
import { traslados } from './traslados.tablas.js';

let escenario: EscenarioEnBd;

const en = (empresaId: string): ContextoEmpresa => escenario.en(empresaId);
const enA1 = () => en(escenario.empresaA1);

const activo = (empresaId: string, claseId: string, cambios: Partial<typeof activos.$inferInsert> = {}) =>
  ({
    empresaId,
    claseId,
    codigo: 'AF-0001',
    descripcion: 'Tractor',
    tipoDeRegistro: 'activo',
    origen: 'compra',
    estado: 'en_construccion',
    fechaDeAdquisicion: '2026-11-01',
    ...cambios,
  }) satisfies typeof activos.$inferInsert;

const insertar = (valores: typeof activos.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(activos).values(valores).returning());

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('activosaf');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('activos: aislamiento entre dos empresas de la misma cuenta (solo por empresa, AF-P2 a)', () => {
  it('cada empresa ve solo sus activos y sus traslados', async () => {
    const [propio] = await insertar(activo(escenario.empresaA1, escenario.claseA1));
    await enTransaccionSegura(enA1(), (tx) =>
      tx
        .insert(traslados)
        .values({ empresaId: escenario.empresaA1, activoId: propio!.id, esAlta: true, fecha: '2026-11-01' }),
    );
    const visibles = (empresaId: string) =>
      enTransaccionSegura(en(empresaId), async (tx) => ({
        activos: await tx.select().from(activos),
        traslados: await tx.select().from(traslados),
      }));

    const deA1 = await visibles(escenario.empresaA1);
    const deA2 = await visibles(escenario.empresaA2);

    expect(deA1.activos).toHaveLength(1);
    expect(deA1.traslados).toHaveLength(1);
    expect(deA2).toEqual({ activos: [], traslados: [] });
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    const intento = insertar(activo(escenario.empresaA2, escenario.claseA2, { codigo: 'AF-9' }), enA1());

    await expect(intento).rejects.toThrow();
  });

  it('el código no se repite en la empresa (sin mayúsculas), pero otra empresa puede usarlo', async () => {
    const repetido = await errorDePostgres(
      insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'af-0001' })),
    );

    expect(repetido?.constraint).toBe('activos_codigo_unico');
    await expect(
      insertar(activo(escenario.empresaA2, escenario.claseA2), en(escenario.empresaA2)),
    ).resolves.toBeTruthy();
  });

  it('no se cruzan las llaves compuestas: clase, localidad y activo principal de otra empresa', async () => {
    const [ajeno] = await insertar(
      activo(escenario.empresaA2, escenario.claseA2, { codigo: 'AF-77' }),
      en(escenario.empresaA2),
    );

    const clase = await errorDePostgres(insertar(activo(escenario.empresaA1, escenario.claseA2, { codigo: 'AF-10' })));
    const localidad = await errorDePostgres(
      insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'AF-11', localidadId: escenario.localidadA2 })),
    );
    const padre = await errorDePostgres(
      insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'AF-12', activoPadreId: ajeno!.id })),
    );
    const alta = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) =>
        tx
          .insert(traslados)
          .values({ empresaId: escenario.empresaA1, activoId: ajeno!.id, esAlta: true, fecha: '2026-11-01' }),
      ),
    );

    expect(clase?.constraint).toBe('activos_clase_fk');
    expect(localidad?.constraint).toBe('activos_localidad_fk');
    expect(padre?.constraint).toBe('activos_padre_fk');
    expect(alta?.constraint).toBe('traslados_activo_fk');
  });
});

const EN_USO = { estado: 'en_uso', fechaDeInicioDeUso: '2026-11-01' } as const;

describe('activos: restricciones de la base', () => {
  it.each([
    ['código con espacios', { codigo: 'AF 1' }, 'activos_codigo_valido'],
    ['descripción vacía', { descripcion: ' ' }, 'activos_descripcion_larga'],
    ['tipo desconocido', { ...EN_USO, tipoDeRegistro: 'x' as never }, 'activos_tipo_de_registro'],
    [
      'de terceros con origen',
      { ...EN_USO, tipoDeRegistro: 'de_terceros', propietario: 'Vecino', formaDeTenencia: 'otra' },
      'activos_origen_de_terceros',
    ],
    [
      'en construcción de un bien de control',
      { tipoDeRegistro: 'bien_de_control' },
      'activos_en_construccion_solo_activos',
    ],
    ['en uso sin fecha de inicio de uso', { estado: 'en_uso' }, 'activos_inicio_de_uso'],
    [
      'ocioso sin estar en uso',
      { ocioso: true, ociosoDesde: '2026-11-02', motivoDeOcio: 'Sin operador' },
      'activos_ocioso_en_uso',
    ],
    ['ocioso sin fecha ni motivo', { ...EN_USO, porcentajeFiscal: '20.00', ocioso: true }, 'activos_ocioso_coherente'],
    ['cantidad cero', { cantidad: 0 }, 'activos_cantidad'],
    ['catastro en cero', { valorCatastral: '0' }, 'activos_valores_del_inmueble'],
    ['inmueble completo sin valores', { valoresDelInmuebleCompleto: true }, 'activos_inmueble_completo'],
    ['porcentaje fiscal sin estar en uso', { porcentajeFiscal: '20' }, 'activos_libros_con_uso'],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const error = await errorDePostgres(
      insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'AF-CHK', ...cambios } as never)),
    );

    expect(error?.constraint).toBe(restriccion);
  });

  it('un activo no es padre de sí mismo ni tiene dos filas de alta', async () => {
    const [uno] = await insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'AF-ALTA' }));
    const alta = () =>
      enTransaccionSegura(enA1(), (tx) =>
        tx
          .insert(traslados)
          .values({ empresaId: escenario.empresaA1, activoId: uno!.id, esAlta: true, fecha: '2026-11-01' }),
      );
    await alta();

    const segunda = await errorDePostgres(alta());
    const propio = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) =>
        tx.execute(sql`update activos_fijos.activos set activo_padre_id = id where id = ${uno!.id}`),
      ),
    );

    expect(segunda?.constraint).toBe('traslados_alta_unica');
    expect(propio?.constraint).toBe('activos_padre_distinto');
  });

  it('un traslado que no es el alta lleva a quién se entregó y su motivo', async () => {
    const [uno] = await insertar(activo(escenario.empresaA1, escenario.claseA1, { codigo: 'AF-TRAS' }));

    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) =>
        tx.insert(traslados).values({
          empresaId: escenario.empresaA1,
          activoId: uno!.id,
          grupoId: crypto.randomUUID(),
          numero: 1,
          anioDeNumero: 2026,
          fecha: '2026-11-02',
        }),
      ),
    );

    expect(error?.constraint).toBe('traslados_datos_de_entrega');
  });
});
