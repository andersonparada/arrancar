import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { bdPropietario } from '../../base-datos/sembrado-de-prueba.soporte.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { AvisadorDeEventosRegistrados } from '../aplicacion/avisador-de-eventos-registrados.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import { EventoDominio } from '../dominio/evento-dominio.js';
import { PublicadorEventosEnMemoria } from '../pruebas/dobles-compartidos.js';
import { registroDeEventos } from './persistencia/registro-de-eventos.tablas.js';
import { PublicacionFueraDeLaTransaccion, PublicadorDeEventos } from './publicador-de-eventos.js';
import { transaccionEnCurso, UnidadDeTrabajoPostgres } from './unidad-de-trabajo-postgres.js';

class FacturaRegistrada extends EventoDominio<{ montoCentavos: number }> {
  readonly nombre = 'libro-de-compras.documento_registrado';
  override readonly version = 2;

  constructor(montoCentavos: number) {
    super({ montoCentavos });
  }
}

class AvisadorEnMemoria implements AvisadorDeEventosRegistrados {
  readonly avisados: string[] = [];
  /** Si se indica, el aviso lanza este error (un módulo que rechaza). */
  falla: Error | undefined;

  async eventosRegistrados(_contexto: ContextoEmpresa, eventos: readonly EventoDominio[]): Promise<void> {
    this.avisados.push(...eventos.map((evento) => evento.id));
    if (this.falla) throw this.falla;
  }
}

class Rechazo extends Error {}

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
const bus = new PublicadorEventosEnMemoria();
const avisador = new AvisadorEnMemoria();
const publicador = new PublicadorDeEventos(bus, avisador);
let cuentaId: string;
let enEmpresaA: ContextoEmpresa;
let enEmpresaB: ContextoEmpresa;

const guardados = () =>
  transaccionEnCurso()
    .select()
    .from(registroDeEventos)
    .orderBy(registroDeEventos.numero)
    .then((filas) => filas);

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const [cuenta] = await bdPropietario.insert(cuentas).values({ nombre: 'Registro de eventos' }).returning();
  cuentaId = cuenta!.id;
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'registrodeeventos', nombres: 'Registro', hashContrasena: 'x' })
    .returning();
  const [a, b] = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId, nombre: 'Eventos A' },
      { cuentaId, nombre: 'Eventos B' },
    ])
    .returning();
  enEmpresaA = { empresaId: a!.id, cuentaId, usuarioId: usuario!.id };
  enEmpresaB = { empresaId: b!.id, cuentaId, usuarioId: usuario!.id };
});

afterAll(async () => {
  await bdPropietario.execute(sql`delete from core.cuentas where nombre = 'Registro de eventos'`);
  await bdPropietario.execute(sql`delete from core.usuarios where usuario = 'registrodeeventos'`);
  await grupoConexiones.end();
});

describe('publicador de eventos con registro', () => {
  it('guarda el evento en el registro con la cuenta, la empresa y el usuario de la transacción', async () => {
    const evento = new FacturaRegistrada(12550);

    await unidadDeTrabajo.ejecutar(enEmpresaA, () => publicador.publicar([evento]));

    const filas = await unidadDeTrabajo.ejecutar(enEmpresaA, guardados);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      id: evento.id,
      nombre: 'libro-de-compras.documento_registrado',
      version: 2,
      datos: { montoCentavos: 12550 },
      cuentaId,
      empresaId: enEmpresaA.empresaId,
      usuarioId: enEmpresaA.usuarioId,
    });
    expect(filas[0]!.ocurridoEn).toEqual(evento.ocurridoEn);
  });

  it('avisa lo registrado dentro de la transacción y deja el bus para después de confirmar', async () => {
    const evento = new FacturaRegistrada(100);
    const publicadosAntes = bus.publicados.length;
    let busAntesDeConfirmar = -1;

    await unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await publicador.publicar([evento]);
      busAntesDeConfirmar = bus.publicados.length - publicadosAntes;
    });

    expect(avisador.avisados).toContain(evento.id);
    expect(busAntesDeConfirmar).toBe(0);
    expect(bus.publicados.slice(publicadosAntes)).toEqual([evento]);
  });

  it('si la transacción se deshace, el evento no queda en el registro ni llega al bus', async () => {
    const evento = new FacturaRegistrada(300);
    const publicadosAntes = bus.publicados.length;

    const trabajo = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await publicador.publicar([evento]);
      throw new Rechazo();
    });

    await expect(trabajo).rejects.toThrow(Rechazo);
    const ids = (await unidadDeTrabajo.ejecutar(enEmpresaA, guardados)).map((fila) => fila.id);
    expect(ids).not.toContain(evento.id);
    expect(bus.publicados).toHaveLength(publicadosAntes);
  });

  it('si un módulo rechaza el aviso, se deshace el evento', async () => {
    const evento = new FacturaRegistrada(400);
    avisador.falla = new Rechazo();

    try {
      const trabajo = unidadDeTrabajo.ejecutar(enEmpresaA, () => publicador.publicar([evento]));
      await expect(trabajo).rejects.toThrow(Rechazo);
    } finally {
      avisador.falla = undefined;
    }

    const ids = (await unidadDeTrabajo.ejecutar(enEmpresaA, guardados)).map((fila) => fila.id);
    expect(ids).not.toContain(evento.id);
  });

  it('numera los eventos en el orden de llegada', async () => {
    await unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      publicador.publicar([new FacturaRegistrada(1), new FacturaRegistrada(2)]),
    );

    const filas = await unidadDeTrabajo.ejecutar(enEmpresaA, guardados);
    const numeros = filas.map((fila) => fila.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(filas.slice(-2).map((fila) => (fila.datos as { montoCentavos: number }).montoCentavos)).toEqual([1, 2]);
  });

  it('lanza si se publica fuera de una unidad de trabajo', async () => {
    await expect(publicador.publicar([new FacturaRegistrada(1)])).rejects.toThrow(PublicacionFueraDeLaTransaccion);
  });

  it('cada empresa solo ve sus eventos', async () => {
    const deB = new FacturaRegistrada(777);
    await unidadDeTrabajo.ejecutar(enEmpresaB, () => publicador.publicar([deB]));

    const vistosPorB = (await unidadDeTrabajo.ejecutar(enEmpresaB, guardados)).map((fila) => fila.id);
    const vistosPorA = (await unidadDeTrabajo.ejecutar(enEmpresaA, guardados)).map((fila) => fila.id);

    expect(vistosPorB).toEqual([deB.id]);
    expect(vistosPorA).not.toContain(deB.id);
  });

  it('la aplicación no puede cambiar, borrar ni escribir en otra empresa', async () => {
    const intentos = [
      (): Promise<unknown> => transaccionEnCurso().update(registroDeEventos).set({ version: 9 }),
      (): Promise<unknown> => transaccionEnCurso().delete(registroDeEventos),
      (): Promise<unknown> =>
        transaccionEnCurso().insert(registroDeEventos).values({
          id: crypto.randomUUID(),
          empresaId: enEmpresaB.empresaId,
          nombre: 'prueba.hecho',
          version: 1,
          datos: {},
          ocurridoEn: new Date(),
        }),
    ];

    for (const intento of intentos) {
      await expect(unidadDeTrabajo.ejecutar(enEmpresaA, intento)).rejects.toThrow();
    }
  });
});
