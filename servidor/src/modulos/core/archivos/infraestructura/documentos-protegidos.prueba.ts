import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import { AlmacenamientoEnMemoria } from '../../compartido/pruebas/dobles-compartidos.js';
import { TareasDeLaTransaccionPostgres } from '../../compartido/infraestructura/tareas-de-la-transaccion-postgres.js';
import {
  ConsultaFueraDeUnidadDeTrabajo,
  transaccionEnCurso,
  UnidadDeTrabajoPostgres,
} from '../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { RevisionDentroDeTransaccion } from '../aplicacion/errores-de-programacion.js';
import { GestorDeDocumentos } from '../aplicacion/gestor-de-documentos.js';
import type { InspectorDePdf, PdfInspeccionado, TurnoDeRevision } from '../aplicacion/puertos/inspector-de-pdf.js';
import { OptimizadorFalso } from '../pruebas/dobles-de-archivos.js';
import { RepositorioArchivosDrizzle } from './persistencia/repositorio-archivos.drizzle.js';

const DUENO = 'bancos.conciliaciones';
const pdf = Buffer.from('%PDF-1.7\ncontenido');
const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);

class FalloProvocado extends Error {}

/** Anota si había una transacción en curso cuando se le pidió revisar. */
class InspectorQueMiraLaTransaccion implements InspectorDePdf {
  conTransaccion: boolean | null = null;

  async inspeccionar(contenido: Buffer, _turno: TurnoDeRevision): Promise<PdfInspeccionado> {
    try {
      transaccionEnCurso();
      this.conTransaccion = true;
    } catch (error) {
      this.conTransaccion = !(error instanceof ConsultaFueraDeUnidadDeTrabajo);
    }
    return { contenido, paginas: 1 };
  }
}

let contexto: Operador;
let almacenamiento: AlmacenamientoEnMemoria;
let inspector: InspectorQueMiraLaTransaccion;
let gestor: GestorDeDocumentos;

/** Revisa fuera de la transacción y guarda dentro, como lo hará un caso de uso. */
async function guardarEnLaBase() {
  const revisado = await gestor.revisar(contexto, pdf, null);
  return unidadDeTrabajo.ejecutar(contexto, () => gestor.guardarRevisado(contexto, revisado, { recursoDueno: DUENO }));
}

async function vaciar(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciar();
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta de documentos' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'documentos', nombres: 'Documentos', hashContrasena: 'x' })
    .returning();
  const [empresa] = await bd.insert(empresas).values({ cuentaId: cuenta!.id, nombre: 'Empresa' }).returning();
  contexto = { empresaId: empresa!.id, cuentaId: cuenta!.id, usuarioId: usuario!.id, esSuperacceso: false };
});

beforeEach(() => {
  almacenamiento = new AlmacenamientoEnMemoria();
  inspector = new InspectorQueMiraLaTransaccion();
  gestor = new GestorDeDocumentos({
    repositorio: new RepositorioArchivosDrizzle(),
    almacenamiento,
    optimizador: new OptimizadorFalso(),
    inspector,
    tareas: new TareasDeLaTransaccionPostgres(),
  });
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos protegidos con la unidad de trabajo real', () => {
  it('revisar corre fuera de toda transacción (D1)', async () => {
    await gestor.revisar(contexto, pdf, null);

    expect(inspector.conTransaccion).toBe(false);
  });

  it('revisar dentro de una unidad de trabajo falla, y guardar (que revisa por dentro) sigue sirviendo (S6)', async () => {
    const dentro = unidadDeTrabajo.ejecutar(contexto, async () => {
      await expect(gestor.revisar(contexto, pdf, null)).rejects.toBeInstanceOf(RevisionDentroDeTransaccion);
      return gestor.guardar(contexto, pdf, { nombre: null, recursoDueno: DUENO });
    });

    await expect(dentro).resolves.toMatchObject({ tipoMime: 'application/pdf' });
    expect(almacenamiento.contenidos.size).toBe(1);
  });

  it('si la transacción se deshace después de guardar, el archivo se borra del disco y no queda fila (D2)', async () => {
    const revisado = await gestor.revisar(contexto, pdf, null);

    const conFallo = unidadDeTrabajo.ejecutar(contexto, async () => {
      await gestor.guardarRevisado(contexto, revisado, { recursoDueno: DUENO });
      expect(almacenamiento.contenidos.size).toBe(1);
      throw new FalloProvocado();
    });

    await expect(conFallo).rejects.toThrow(FalloProvocado);
    expect(almacenamiento.contenidos.size).toBe(0);
  });

  it('si la transacción se confirma, el archivo y la fila quedan', async () => {
    const revisado = await gestor.revisar(contexto, pdf, 'estado.pdf');

    const guardado = await unidadDeTrabajo.ejecutar(contexto, () =>
      gestor.guardarRevisado(contexto, revisado, { recursoDueno: DUENO }),
    );

    expect(almacenamiento.contenidos.size).toBe(1);
    const abierto = await unidadDeTrabajo.ejecutar(contexto, () => gestor.abrir(guardado.id, DUENO));
    expect(abierto.sha256).toBe(guardado.sha256);
  });

  it('si eliminar se deshace, la fila vuelve y el archivo sigue en el disco (D3)', async () => {
    const guardado = await guardarEnLaBase();

    const conFallo = unidadDeTrabajo.ejecutar(contexto, async () => {
      await gestor.eliminar(guardado.id, DUENO);
      throw new FalloProvocado();
    });

    await expect(conFallo).rejects.toThrow(FalloProvocado);
    expect(almacenamiento.contenidos.size).toBe(1);
    await expect(unidadDeTrabajo.ejecutar(contexto, () => gestor.abrir(guardado.id, DUENO))).resolves.toBeDefined();
  });

  it('si eliminar se confirma, se borra la fila y después el archivo (D3)', async () => {
    const guardado = await guardarEnLaBase();

    await unidadDeTrabajo.ejecutar(contexto, () => gestor.eliminar(guardado.id, DUENO));

    expect(almacenamiento.contenidos.size).toBe(0);
    await expect(unidadDeTrabajo.ejecutar(contexto, () => gestor.abrir(guardado.id, DUENO))).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
  });
});
