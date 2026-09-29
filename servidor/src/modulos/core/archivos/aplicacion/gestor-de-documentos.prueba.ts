import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import { AlmacenamientoEnMemoria, operadorDePrueba } from '../../compartido/pruebas/dobles-compartidos.js';
import { DocumentoDemasiadoGrande, DocumentoNoAceptado, PdfConContenidoActivo } from '../dominio/documento.js';
import {
  InspectorDePdfFalso,
  OptimizadorFalso,
  OptimizadorQueRechaza,
  RepositorioArchivosEnMemoria,
} from '../pruebas/dobles-de-archivos.js';
import { GestorDeDocumentos } from './gestor-de-documentos.js';

const DUENO = 'bancos.conciliaciones';
const operador = operadorDePrueba();
const pdf = Buffer.from('%PDF-1.7\ncontenido');
const huella = (contenido: Buffer) => createHash('sha256').update(contenido).digest('hex');

let almacenamiento: AlmacenamientoEnMemoria;
let repositorio: RepositorioArchivosEnMemoria;
let inspector: InspectorDePdfFalso;
let gestor: GestorDeDocumentos;

function armar(optimizador = new OptimizadorFalso()): GestorDeDocumentos {
  return new GestorDeDocumentos({ repositorio, almacenamiento, optimizador, inspector });
}

beforeEach(() => {
  almacenamiento = new AlmacenamientoEnMemoria();
  repositorio = new RepositorioArchivosEnMemoria();
  inspector = new InspectorDePdfFalso();
  gestor = armar();
});

describe('guardar un PDF', () => {
  it('guarda lo que devuelve el inspector, no lo que llegó, y registra las dos huellas', async () => {
    const guardado = await gestor.guardar(operador, pdf, { nombre: 'estado.pdf', recursoDueno: DUENO });

    const limpio = Buffer.concat([pdf, Buffer.from('\n%limpio')]);
    expect(guardado).toMatchObject({ tipoMime: 'application/pdf', paginas: 3, sha256: huella(limpio) });
    expect(repositorio.guardados[0]).toMatchObject({
      clase: 'documento',
      recursoDueno: DUENO,
      sha256Recibido: huella(pdf),
      rutaMiniatura: null,
      empresaId: operador.empresaId,
      subidoPor: operador.usuarioId,
    });
    const [ruta] = [...almacenamiento.contenidos.keys()];
    expect(ruta).toMatch(new RegExp(`^${operador.empresaId}/\\d{4}/\\d{2}/[\\w-]+\\.pdf$`));
    expect(almacenamiento.contenidos.get(ruta!)).toEqual(limpio);
  });

  it('un PDF presentado con nombre y tipo de imagen se trata como PDF: manda el contenido', async () => {
    await gestor.guardar(operador, pdf, { nombre: 'foto.png', recursoDueno: DUENO });

    expect(inspector.inspeccionados).toHaveLength(1);
  });

  it('si el inspector lo rechaza no se guarda nada', async () => {
    inspector.error = new PdfConContenidoActivo(['/JavaScript']);

    await expect(gestor.guardar(operador, pdf, { nombre: null, recursoDueno: DUENO })).rejects.toBeInstanceOf(
      PdfConContenidoActivo,
    );
    expect(almacenamiento.contenidos.size).toBe(0);
    expect(repositorio.guardados).toHaveLength(0);
  });

  it('rechaza más de 10 MB sin llamar al inspector', async () => {
    const enorme = Buffer.concat([pdf, Buffer.alloc(10 * 1024 * 1024)]);

    await expect(gestor.guardar(operador, enorme, { nombre: null, recursoDueno: DUENO })).rejects.toBeInstanceOf(
      DocumentoDemasiadoGrande,
    );
    expect(inspector.inspeccionados).toHaveLength(0);
  });

  it('si falla el registro en la base, borra el archivo del disco', async () => {
    repositorio.guardar = async () => {
      throw new Error('se cayó la base');
    };

    await expect(gestor.guardar(operador, pdf, { nombre: null, recursoDueno: DUENO })).rejects.toThrow('se cayó');
    expect(almacenamiento.contenidos.size).toBe(0);
  });
});

describe('guardar una foto de un documento', () => {
  it('la reduce a 2400 de lado y la guarda como WebP sin miniatura', async () => {
    const guardado = await gestor.guardar(operador, Buffer.from('foto'), { nombre: 'cheque.jpg', recursoDueno: DUENO });

    expect(guardado).toMatchObject({ tipoMime: 'image/webp', paginas: null });
    expect(repositorio.guardados[0]).toMatchObject({ clase: 'documento', ancho: 2400, alto: 1200 });
    expect([...almacenamiento.contenidos.keys()]).toHaveLength(1);
  });

  it('lo que no es PDF ni foto aceptada es un documento no aceptado', async () => {
    const estricto = armar(new OptimizadorQueRechaza());

    await expect(
      estricto.guardar(operador, Buffer.from('texto'), { nombre: null, recursoDueno: DUENO }),
    ).rejects.toBeInstanceOf(DocumentoNoAceptado);
  });

  it('rechaza más de 15 MB', async () => {
    const enorme = Buffer.alloc(15 * 1024 * 1024 + 1);

    await expect(gestor.guardar(operador, enorme, { nombre: null, recursoDueno: DUENO })).rejects.toBeInstanceOf(
      DocumentoDemasiadoGrande,
    );
  });
});

describe('abrir y eliminar', () => {
  it('abre el documento de su dueño y solo el de su dueño', async () => {
    const { id } = await gestor.guardar(operador, pdf, { nombre: null, recursoDueno: DUENO });

    const abierto = await gestor.abrir(id, DUENO);

    expect(abierto.tipoMime).toBe('application/pdf');
    await expect(gestor.abrir(id, 'otro.recurso')).rejects.toBeInstanceOf(RecursoNoEncontrado);
    await expect(gestor.abrir(crypto.randomUUID(), DUENO)).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('eliminar borra la fila y el archivo', async () => {
    const { id } = await gestor.guardar(operador, pdf, { nombre: null, recursoDueno: DUENO });

    await gestor.eliminar(id, DUENO);

    expect(almacenamiento.contenidos.size).toBe(0);
    await expect(gestor.abrir(id, DUENO)).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('no elimina el documento de otro dueño', async () => {
    const { id } = await gestor.guardar(operador, pdf, { nombre: null, recursoDueno: DUENO });

    await expect(gestor.eliminar(id, 'otro.recurso')).rejects.toBeInstanceOf(RecursoNoEncontrado);
    expect(almacenamiento.contenidos.size).toBe(1);
  });
});
