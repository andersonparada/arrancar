/**
 * Prueba de integración contra PostgreSQL: las contraseñas de pago (checks, únicos, llaves compuestas, cascada y RLS)
 * y la forma `contrasena` de las aplicaciones de notas.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
let numeroSiguiente = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

async function crearDocumento(proveedorId = e.proveedorA) {
  const documentoId = await crearDocumentoDeLibro(contexto(), proveedorId);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, { proveedorId }))
      .returning(),
  );
  return fila!;
}

const contrasenaValida = (cambios: Partial<typeof contrasenas.$inferInsert> = {}): typeof contrasenas.$inferInsert => {
  numeroSiguiente += 1;
  return {
    empresaId: e.empresaA1,
    proveedorId: e.proveedorA,
    numero: numeroSiguiente,
    fecha: '2026-03-10',
    fechaDePago: '2026-04-10',
    ...cambios,
  };
};

async function crearContrasena(cambios: Partial<typeof contrasenas.$inferInsert> = {}) {
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx.insert(contrasenas).values(contrasenaValida(cambios)).returning(),
  );
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

const meter = (contrasenaId: string, documentoId: string, cambios: { proveedorId?: string; vigente?: boolean } = {}) =>
  enTransaccionSegura(contexto(), (tx) =>
    tx.insert(contrasenaDocumentos).values({
      empresaId: e.empresaA1,
      proveedorId: cambios.proveedorId ?? e.proveedorA,
      contrasenaId,
      documentoId,
      vigente: cambios.vigente,
    }),
  );

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarcontrasenas');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('contraseñas', () => {
  it('guarda una contraseña vigente sin impresión', async () => {
    const fila = await crearContrasena({ observaciones: 'Del sistema anterior' });

    expect(fila).toMatchObject({ estado: 'vigente', anioDeNumero: 0, impresaEn: null, anuladaEn: null });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primera = await crearContrasena();

    expect(
      await restriccion(
        enTransaccionSegura(contexto(), (tx) => tx.insert(contrasenas).values(contrasenaValida({ numero: 0 }))),
      ),
    ).toBe('contrasenas_numero_positivo');
    expect(await restriccion(crearContrasena({ numero: primera.numero }))).toBe('contrasenas_numero_unico');
    await expect(crearContrasena({ numero: primera.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la fecha de pago no es anterior a la fecha', async () => {
    expect(await restriccion(crearContrasena({ fecha: '2026-03-10', fechaDePago: '2026-03-09' }))).toBe(
      'contrasenas_pago_desde_la_fecha',
    );
    await expect(crearContrasena({ fecha: '2026-03-10', fechaDePago: '2026-03-10' })).resolves.toBeDefined();
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await restriccion(crearContrasena({ observaciones }))).toBe('contrasenas_observaciones_validas');
    }
    await expect(crearContrasena({ observaciones: 'x'.repeat(500) })).resolves.toBeDefined();
  });

  it('el estado es vigente o anulada, y la anulación se escribe completa', async () => {
    const anulacion = { anuladaEn: new Date(), anuladaPor: e.usuarioId, motivoDeAnulacion: 'Error de captura' };

    expect(await restriccion(crearContrasena({ estado: 'pagada' }))).toBe('contrasenas_estado_valido');
    expect(await restriccion(crearContrasena({ estado: 'anulada' }))).toBe('contrasenas_anulacion_completa');
    expect(await restriccion(crearContrasena({ ...anulacion }))).toBe('contrasenas_anulacion_completa');
    expect(await restriccion(crearContrasena({ estado: 'anulada', ...anulacion, anuladaPor: null }))).toBe(
      'contrasenas_anulacion_completa',
    );
    await expect(crearContrasena({ estado: 'anulada', ...anulacion })).resolves.toBeDefined();
  });

  it('el motivo de anulación es de 1 a 300 caracteres', async () => {
    const anulada = { estado: 'anulada', anuladaEn: new Date(), anuladaPor: e.usuarioId };

    expect(await restriccion(crearContrasena({ ...anulada, motivoDeAnulacion: '' }))).toBe('contrasenas_motivo_rango');
    expect(await restriccion(crearContrasena({ ...anulada, motivoDeAnulacion: 'x'.repeat(301) }))).toBe(
      'contrasenas_motivo_rango',
    );
    await expect(crearContrasena({ ...anulada, motivoDeAnulacion: 'x'.repeat(300) })).resolves.toBeDefined();
  });

  it('el proveedor debe existir', async () => {
    const inexistente = await errorDePostgres(crearContrasena({ proveedorId: crypto.randomUUID() }));

    expect(inexistente?.constraint).toBe('contrasenas_proveedor_fk');
  });

  it('cada empresa ve solo sus contraseñas', async () => {
    await crearContrasena();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(contrasenas),
    );

    expect(enA2).toEqual([]);
  });
});

describe('documentos de una contraseña', () => {
  it('mete un documento del mismo proveedor, una sola vez por contraseña', async () => {
    const contrasena = await crearContrasena();
    const documento = await crearDocumento();
    await meter(contrasena.id, documento.id);

    expect(await restriccion(meter(contrasena.id, documento.id))).toBe('contrasena_documentos_par_unico');
  });

  it('rechaza un documento de otro proveedor, venga como venga el proveedor de la fila', async () => {
    const contrasena = await crearContrasena();
    const ajeno = await crearDocumento(e.proveedorA2);

    const conProveedorDeLaContrasena = await errorDePostgres(meter(contrasena.id, ajeno.id));
    const conProveedorDelDocumento = await errorDePostgres(
      meter(contrasena.id, ajeno.id, { proveedorId: e.proveedorA2 }),
    );

    expect(conProveedorDeLaContrasena?.constraint).toBe('contrasena_documentos_documento_fk');
    expect(conProveedorDelDocumento?.constraint).toBe('contrasena_documentos_contrasena_fk');
  });

  it('un documento no está en dos contraseñas vigentes, pero sí en una vigente y una anulada', async () => {
    const documento = await crearDocumento();
    const primera = await crearContrasena();
    const segunda = await crearContrasena();
    const tercera = await crearContrasena();
    await meter(primera.id, documento.id);

    expect(await restriccion(meter(segunda.id, documento.id))).toBe('contrasena_documentos_vigente_unico');
    await expect(meter(segunda.id, documento.id, { vigente: false })).resolves.toBeDefined();
    await expect(meter(tercera.id, documento.id, { vigente: false })).resolves.toBeDefined();
  });

  it('al eliminar el documento se va su fila; una contraseña con documentos no se borra', async () => {
    const contrasena = await crearContrasena();
    const documento = await crearDocumento();
    await meter(contrasena.id, documento.id);

    const alBorrarLaContrasena = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) => tx.delete(contrasenas).where(eq(contrasenas.id, contrasena.id))),
    );
    await enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, documento.id)));
    const quedan = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(contrasenaDocumentos).where(eq(contrasenaDocumentos.contrasenaId, contrasena.id)),
    );

    expect(alBorrarLaContrasena?.code).toBe('23503');
    expect(quedan).toEqual([]);
  });

  it('cada empresa ve solo los documentos de sus contraseñas', async () => {
    const contrasena = await crearContrasena();
    await meter(contrasena.id, (await crearDocumento()).id);

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(contrasenaDocumentos),
    );

    expect(enA2).toEqual([]);
  });
});

describe('aplicaciones de la contraseña', () => {
  const aplicar = (contrasenaId: string | null, forma: string, referencia: string | null = null) =>
    crearDocumento().then(async (nota) => {
      const cargo = await crearDocumento();
      return enTransaccionSegura(contexto(), (tx) =>
        tx.insert(aplicacionesDeNotas).values({
          empresaId: e.empresaA1,
          proveedorId: e.proveedorA,
          notaId: nota.id,
          cargoId: cargo.id,
          monto: '10',
          forma,
          fecha: '2026-03-10',
          referencia,
          contrasenaId,
        }),
      );
    });

  it('la forma contraseña lleva su contraseña, y solo ella', async () => {
    const contrasena = await crearContrasena();

    await expect(aplicar(contrasena.id, 'contrasena')).resolves.toBeDefined();
    expect(await restriccion(aplicar(null, 'contrasena'))).toBe('aplicaciones_contrasena_de_su_forma');
    expect(await restriccion(aplicar(contrasena.id, 'manual'))).toBe('aplicaciones_contrasena_de_su_forma');
    expect(await restriccion(aplicar(contrasena.id, 'automatica'))).toBe('aplicaciones_contrasena_de_su_forma');
  });

  it('la forma contraseña no lleva referencia', async () => {
    const contrasena = await crearContrasena();

    expect(await restriccion(aplicar(contrasena.id, 'contrasena', 'Acuerdo'))).toBe('aplicaciones_referencia_valida');
  });

  it('la contraseña debe existir', async () => {
    expect(await restriccion(aplicar(crypto.randomUUID(), 'contrasena'))).toBe('aplicaciones_contrasena_fk');
  });
});
