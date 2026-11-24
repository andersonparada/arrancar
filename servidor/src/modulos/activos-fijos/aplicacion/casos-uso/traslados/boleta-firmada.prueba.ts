import { beforeEach, describe, expect, it } from 'vitest';
import { RevisionDePdfSaturada } from '../../../../core/archivos/dominio/documento.js';
import { BoletasFirmadasEnMemoria, DocumentosDePrueba } from '../../../pruebas/dobles-de-boleta-firmada.js';
import {
  armarTraslados,
  operador,
  solicitudDeTraslado,
  type EscenarioDeTraslados,
} from '../../../pruebas/escenario-de-traslados.soporte.js';
import { BoletaInexistente, BoletaSinFirmada } from '../../errores-de-boleta-firmada.js';
import { AbrirBoletaFirmada } from './abrir-boleta-firmada.js';
import { SubirBoletaFirmada } from './subir-boleta-firmada.js';

const PDF = Buffer.from('%PDF-1.7 de prueba');
let e: EscenarioDeTraslados;
let documentos: DocumentosDePrueba;
let boletas: BoletasFirmadasEnMemoria;
let subir: SubirBoletaFirmada;
let abrir: AbrirBoletaFirmada;

const boletaVigente = async () => {
  const activo = await e.activo({ datos: { cantidad: 1 } });
  return (await e.trasladar(solicitudDeTraslado([activo]))).grupoId;
};
const subida = (grupoId: string) => subir.ejecutar(operador, { grupoId, contenido: PDF, nombre: 'firmada.pdf' });

beforeEach(() => {
  e = armarTraslados();
  documentos = new DocumentosDePrueba();
  boletas = new BoletasFirmadasEnMemoria(e.traslados);
  const dependencias = {
    unidadDeTrabajo: e.dependencias.unidadDeTrabajo,
    auditoria: e.auditoria,
    documentos,
    traslados: e.traslados,
    boletasFirmadas: boletas,
    consultasDeTraslados: e.traslados,
  };
  subir = new SubirBoletaFirmada(dependencias);
  abrir = new AbrirBoletaFirmada(dependencias);
});

describe('SubirBoletaFirmada', () => {
  it('guarda el escaneo, lo muestra en la boleta y lo audita como adjuntar sin archivo anterior', async () => {
    const grupoId = await boletaVigente();
    e.auditoria.entradas.length = 0;

    const firmada = await subida(grupoId);

    expect(firmada).toMatchObject({ tipoMime: 'application/pdf' });
    expect((await e.boleta(grupoId)).firmada).toEqual(firmada);
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.traslados', registroId: grupoId, accion: 'adjuntar', anterior: { firmada: null } },
    ]);
    expect(documentos.guardados.size).toBe(1);
  });

  it('reemplaza el escaneo: borra el archivo anterior y audita cómo estaba', async () => {
    const grupoId = await boletaVigente();
    const primera = await subida(grupoId);
    const [archivoAnterior] = [...documentos.guardados.keys()];
    e.auditoria.entradas.length = 0;

    await subida(grupoId);

    expect(documentos.guardados.size).toBe(1);
    expect(documentos.guardados.has(archivoAnterior!)).toBe(false);
    expect(e.auditoria.entradas).toMatchObject([{ accion: 'adjuntar', anterior: { firmada: primera } }]);
  });

  it('con una boleta que no existe o ya está anulada responde boleta_inexistente sin revisar el archivo', async () => {
    const anulada = await boletaVigente();
    await e.anular(anulada);

    await expect(subida(anulada)).rejects.toBeInstanceOf(BoletaInexistente);
    await expect(subida(crypto.randomUUID())).rejects.toMatchObject({ codigo: 'boleta_inexistente' });
    expect(documentos.revisiones).toBe(0);
  });

  it('si el archivo no se acepta o la fila de revisión está saturada no guarda nada ni audita', async () => {
    const grupoId = await boletaVigente();
    e.auditoria.entradas.length = 0;
    documentos.errorAlRevisar = new RevisionDePdfSaturada('fila_llena');

    await expect(subida(grupoId)).rejects.toBeInstanceOf(RevisionDePdfSaturada);

    expect(documentos.guardados.size).toBe(0);
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});

describe('AbrirBoletaFirmada', () => {
  it('abre el escaneo con un nombre armado por el servidor', async () => {
    const grupoId = await boletaVigente();
    await subida(grupoId);

    const archivo = await abrir.ejecutar(operador, grupoId);

    expect(archivo).toMatchObject({ nombre: 'boleta-firmada.pdf', tipoMime: 'application/pdf' });
  });

  it('sin escaneo responde boleta_sin_firmada', async () => {
    const grupoId = await boletaVigente();

    await expect(abrir.ejecutar(operador, grupoId)).rejects.toBeInstanceOf(BoletaSinFirmada);
  });

  it('la boleta anulada conserva su escaneo y se puede abrir', async () => {
    const grupoId = await boletaVigente();
    await subida(grupoId);
    await e.anular(grupoId);

    await expect(abrir.ejecutar(operador, grupoId)).resolves.toMatchObject({ nombre: 'boleta-firmada.pdf' });
  });
});
