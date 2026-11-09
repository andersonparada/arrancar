/**
 * Prueba de integración contra PostgreSQL: los casos de uso de saldos iniciales con los repositorios reales, la
 * auditoría real y la carga inicial por el mediador (con un doble de Empresas que anota con qué empresa se le preguntó).
 */
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { AuditoriaPostgres } from '../../../core/compartido/infraestructura/auditoria-postgres.js';
import { UnidadDeTrabajoPostgres } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { RelojFijo } from '../../../core/compartido/pruebas/dobles-compartidos.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { mediador } from '../../../core/mediador/contexto.js';
import { establecerRegistroModulos } from '../../../core/modulos-sistema/registro-global.js';
import { RegistroModulos } from '../../../core/modulos-sistema/registro-modulos.js';
import { definicionesModulos } from '../../../indice.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { CorregirSaldoInicial } from '../../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import { CrearSaldoInicial } from '../../aplicacion/casos-uso/saldos-iniciales/crear-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { ListarSaldosIniciales } from '../../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import type { SolicitudDeSaldoInicial } from '../../aplicacion/dto/saldo-inicial.dto.js';
import { ProveedorNoDisponible, SaldoInicialAutorizado } from '../../dominio/errores-de-saldos-iniciales.js';
import { PlazoFijo } from '../../pruebas/dobles-de-documentos.js';
import { CargaInicialEnMediador } from '../carga-inicial-en-mediador.js';
import { CondicionesDeProveedoresDrizzle } from './condiciones-de-proveedores.drizzle.js';
import { ConsultasDeDocumentosDrizzle } from './consultas-de-documentos.drizzle.js';
import { documentos } from './documentos.tablas.js';
import { contextoDe, errorDePostgres, prepararEscenario, type Escenario } from './escenario.soporte.js';
import { ProveedoresParaSaldosDrizzle } from './proveedores-para-saldos.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from './repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from './repositorio-de-documentos.drizzle.js';
import { RepositorioDeSaldosInicialesDrizzle } from './repositorio-de-saldos-iniciales.drizzle.js';

let e: Escenario;
let operador: Operador;
let preguntadasPorEmpresa: string[];
let crear: CrearSaldoInicial;
let corregir: CorregirSaldoInicial;
let eliminar: EliminarSaldoInicial;
let listar: ListarSaldosIniciales;

const solicitud = (cambios: Partial<SolicitudDeSaldoInicial> = {}): SolicitudDeSaldoInicial => ({
  proveedorId: e.proveedorA,
  tipo: 'factura',
  serie: 'a',
  numero: '1001',
  fechaEmision: '2025-12-20',
  vencimiento: null,
  total: '1120.00',
  retenciones: '120.00',
  retencionesPorPracticar: '40.00',
  saldoPendiente: '900.00',
  referencia: 'CXP-1',
  ...cambios,
});

async function auditoriaDe(registroId: string) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query(
    'select accion, motivo, anterior from core.auditoria where registro_id = $1 order by creado_en',
    [registroId],
  );
  await conexion.end();
  return rows as Array<{ accion: string; motivo: string | null; anterior: Record<string, unknown> }>;
}

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarsaldoscasos');
  establecerRegistroModulos(new RegistroModulos(definicionesModulos));
  mediador.retirarManejadoresDe('empresas');
  mediador.atender('empresas', 'empresas.obtener_carga_inicial', async ({ empresaId }) => {
    preguntadasPorEmpresa.push(empresaId);
    return { fechaDeInicio: '2026-01-01', cerrada: false };
  });
});

beforeEach(() => {
  preguntadasPorEmpresa = [];
  operador = { ...contextoDe(e, e.empresaA1, e.cuentaA), esSuperacceso: false };
  const aplicaciones = new RepositorioDeAplicacionesDrizzle();
  const dependencias: DependenciasDeSaldosIniciales = {
    unidadDeTrabajo: new UnidadDeTrabajoPostgres(bd),
    documentos: new RepositorioDeDocumentosDrizzle(aplicaciones),
    saldosIniciales: new RepositorioDeSaldosInicialesDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    proveedores: new ProveedoresParaSaldosDrizzle(),
    condiciones: new CondicionesDeProveedoresDrizzle(),
    plazo: new PlazoFijo(1),
    auditoria: new AuditoriaPostgres(),
    reloj: new RelojFijo('2026-03-15'),
  };
  crear = new CrearSaldoInicial(dependencias);
  corregir = new CorregirSaldoInicial(dependencias);
  eliminar = new EliminarSaldoInicial(dependencias);
  listar = new ListarSaldosIniciales(dependencias);
});

afterAll(async () => {
  mediador.retirarManejadoresDe('empresas');
  await grupoConexiones.end();
});

describe('CrearSaldoInicial contra la base', () => {
  it('guarda el saldo inicial completado, con serie limpia y vencimiento propuesto, y pregunta por la empresa activa', async () => {
    const dto = await crear.ejecutar(operador, solicitud());

    expect(dto).toMatchObject({
      serie: 'A',
      estado: 'registrado',
      vencimiento: '2026-01-20',
      saldoPendiente: '900.00',
      retencionesPorPracticar: '40.00',
      anterioresAlInicio: '100.00',
      proveedorNombre: 'Proveedor A',
    });
    expect(preguntadasPorEmpresa).toEqual([e.empresaA1]);
    const [fila] = await enTransaccionSegura(operador, (tx) =>
      tx.select().from(documentos).where(eq(documentos.id, dto.id)),
    );
    expect(fila).toMatchObject({ origen: 'saldo_inicial', documentoId: null, registradoPor: e.usuarioId });
  });

  it('un documento repetido lo rechaza el único; otro proveedor o la otra cuenta no chocan', async () => {
    await crear.ejecutar(operador, solicitud({ numero: '2002' }));

    const repetido = await errorDePostgres(crear.ejecutar(operador, solicitud({ numero: '2002' })));
    expect(repetido?.constraint).toBe('documentos_numero_por_proveedor_unico');
    await expect(
      crear.ejecutar(operador, solicitud({ numero: '2002', proveedorId: e.proveedorA2 })),
    ).resolves.toBeDefined();
  });

  it('un proveedor de otra cuenta o inactivo no está disponible', async () => {
    await expect(crear.ejecutar(operador, solicitud({ proveedorId: e.proveedorB, numero: '3001' }))).rejects.toThrow(
      ProveedorNoDisponible,
    );
    await enTransaccionSegura(operador, (tx) =>
      tx.update(proveedores).set({ activo: false }).where(eq(proveedores.id, e.proveedorA2)),
    );

    await expect(crear.ejecutar(operador, solicitud({ proveedorId: e.proveedorA2, numero: '3002' }))).rejects.toThrow(
      ProveedorNoDisponible,
    );
  });
});

describe('corregir, eliminar y listar contra la base', () => {
  it('corregir cambia lo cargado y audita lo anterior; autorizado no se corrige', async () => {
    const { id } = await crear.ejecutar(operador, solicitud({ numero: '4001' }));

    const dto = await corregir.ejecutar(operador, id, solicitud({ numero: '4001', saldoPendiente: '800.00' }));

    expect(dto.saldoPendiente).toBe('800.00');
    const [auditoria] = await auditoriaDe(id);
    expect(auditoria).toMatchObject({ accion: 'corregir', anterior: { id, saldoPendiente: '900.00' } });
    await enTransaccionSegura(operador, (tx) =>
      tx
        .update(documentos)
        .set({ estado: 'autorizado', autorizadoEn: new Date(), autorizadoPor: e.usuarioId, autorizacionPropia: true })
        .where(eq(documentos.id, id)),
    );
    await expect(corregir.ejecutar(operador, id, solicitud({ numero: '4001' }))).rejects.toThrow(
      SaldoInicialAutorizado,
    );
  });

  it('eliminar borra la fila y deja el rastro con motivo y lo anterior, en la misma transacción', async () => {
    const { id } = await crear.ejecutar(operador, solicitud({ numero: '5001' }));

    await eliminar.ejecutar(operador, id, 'Cargado dos veces');

    const filas = await enTransaccionSegura(operador, (tx) =>
      tx.select().from(documentos).where(eq(documentos.id, id)),
    );
    expect(filas).toEqual([]);
    expect(await auditoriaDe(id)).toEqual([
      expect.objectContaining({
        accion: 'eliminar',
        motivo: 'Cargado dos veces',
        anterior: expect.objectContaining({ id }),
      }),
    ]);
  });

  it('lista solo los saldos iniciales de la empresa activa, con la carga', async () => {
    await crear.ejecutar(operador, solicitud({ numero: '6001' }));
    const deOtraEmpresa = { ...operador, empresaId: e.empresaA2 };
    await crear.ejecutar(deOtraEmpresa, solicitud({ numero: '6002' }));

    const pagina = await listar.ejecutar(operador, {}, { pagina: 1, limite: 100 });

    const numeros = pagina.elementos.map((elemento) => elemento.numero);
    expect(numeros).toContain('6001');
    expect(numeros).not.toContain('6002');
    expect(pagina.carga).toEqual({ fechaDeInicio: '2026-01-01', cerrada: false });
  });
});
