import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CargaInicialCerrada, SinFechaDeInicio } from '../../../dominio/errores-de-apertura.js';
import { DocumentosEnMemoria } from '../../../pruebas/dobles-de-estado-de-cuenta.js';
import { SaldoInicialSinEvidencia } from '../../errores-de-estado-de-cuenta.js';
import type { CabeceraDeSaldoInicial } from '../../puertos/repositorio-de-saldos-iniciales.js';
import { AbrirEvidenciaDeApertura } from './abrir-evidencia-de-apertura.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from './eliminar-saldo-inicial.js';
import { QuitarEvidenciaDeApertura } from './quitar-evidencia-de-apertura.js';
import { ConsultasEnMemoria } from './soporte-de-pruebas-de-saldos-iniciales.js';
import { SubirEvidenciaDeApertura } from './subir-evidencia-de-apertura.js';

const operador = operadorDePrueba();
const CUENTA = 'cuenta-1';
const PDF = Buffer.from('%PDF-1.7 de prueba');
const subida = (nombre: string | null = 'anterior.pdf', cuentaBancariaId = CUENTA) => ({
  cuentaBancariaId,
  contenido: PDF,
  nombre,
});

let documentos: DocumentosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let consultas: ConsultasEnMemoria;
let cabecera: CabeceraDeSaldoInicial | null;
let carga: { fechaDeInicio: string | null; cerrada: boolean };
let dependencias: DependenciasDeSaldosIniciales;

/** Los dobles de lo que tocan estos casos de uso; el resto de las dependencias no se usa aquí. */
function armar(): DependenciasDeSaldosIniciales {
  const cabeceras = {
    bloquearCuenta: async () => ({ activa: true }),
    buscarDeLaCuenta: async () => cabecera,
    ponerEvidencia: async (_id: string, archivoId: string | null) => {
      cabecera = { ...cabecera!, evidenciaArchivoId: archivoId };
      if (archivoId === null) consultas.evidencias.delete(CUENTA);
      else consultas.evidencias.set(CUENTA, { archivoId, datos: documentos.datosDelEstadoDeCuenta(archivoId)! });
    },
    eliminar: async () => {
      cabecera = null;
    },
  };
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria,
    documentos,
    consultas,
    cabeceras,
    cargaInicial: { obtener: async () => carga },
    consultasConciliaciones: { listar: async () => [] },
    ficha: { deLaCuenta: async () => ({ cuentaBancariaId: CUENTA }) },
    repositorioMovimientos: { eliminar: async () => undefined },
    chequesDeApertura: { liberar: async () => undefined },
  } as unknown as DependenciasDeSaldosIniciales;
}

beforeEach(() => {
  documentos = new DocumentosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  consultas = new ConsultasEnMemoria();
  consultas.cuentasDeLaEmpresa = [];
  cabecera = {
    id: 'cabecera-1',
    cuentaBancariaId: CUENTA,
    saldoSegunLibrosAnteriores: null,
    observaciones: null,
    evidenciaArchivoId: null,
  };
  carga = { fechaDeInicio: '2026-01-01', cerrada: false };
  dependencias = armar();
});

describe('subir la evidencia de la apertura', () => {
  it('la adjunta sin auditoría y el dato no trae ruta ni id', async () => {
    const dto = await new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida());

    expect(dto).toMatchObject({ tipoMime: 'application/pdf', nombreOriginal: 'anterior.pdf' });
    expect(Object.keys(dto)).not.toContain('id');
    expect(cabecera!.evidenciaArchivoId).not.toBeNull();
    expect(documentos.guardados.size).toBe(1);
    expect(auditoria.entradas).toHaveLength(0);
  });

  it('reemplazarla borra la anterior y audita quitar con sus datos', async () => {
    const subir = new SubirEvidenciaDeApertura(dependencias);
    await subir.ejecutar(operador, subida('primera.pdf'));

    await subir.ejecutar(operador, subida('segunda.pdf'));

    expect(documentos.guardados.size).toBe(1);
    expect(auditoria.acciones()).toEqual(['bancos.saldos-iniciales:quitar']);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: 'cabecera-1',
      anterior: { evidencia: { nombreOriginal: 'primera.pdf' } },
    });
  });

  it('con la carga cerrada rechaza y qpdf ni se llama', async () => {
    carga = { fechaDeInicio: '2026-01-01', cerrada: true };

    await expect(new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida())).rejects.toBeInstanceOf(
      CargaInicialCerrada,
    );
    expect(documentos.revisiones).toBe(0);
  });

  it('sin fecha de inicio rechaza, y sin saldo inicial en la cuenta responde no encontrado', async () => {
    const subir = new SubirEvidenciaDeApertura(dependencias);
    carga = { fechaDeInicio: null, cerrada: false };
    await expect(subir.ejecutar(operador, subida())).rejects.toBeInstanceOf(SinFechaDeInicio);

    carga = { fechaDeInicio: '2026-01-01', cerrada: false };
    cabecera = null;
    await expect(subir.ejecutar(operador, subida())).rejects.toBeInstanceOf(RecursoNoEncontrado);
    expect(documentos.revisiones).toBe(0);
  });

  it('si el archivo no se acepta no cambia nada', async () => {
    documentos.errorAlRevisar = new Error('no es un PDF');

    await expect(new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida())).rejects.toThrow(
      'no es un PDF',
    );
    expect(cabecera!.evidenciaArchivoId).toBeNull();
    expect(documentos.guardados.size).toBe(0);
  });
});

describe('abrir y quitar la evidencia', () => {
  it('abrir sin archivo responde 404 y con archivo arma el nombre en el servidor', async () => {
    const abrir = new AbrirEvidenciaDeApertura(dependencias);
    await expect(abrir.ejecutar(operador, CUENTA)).rejects.toBeInstanceOf(SaldoInicialSinEvidencia);

    await new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida('../../raro.pdf'));
    const abierto = await abrir.ejecutar(operador, CUENTA);

    expect(abierto).toMatchObject({ nombre: 'evidencia-de-apertura.pdf', tipoMime: 'application/pdf' });
  });

  it('quitar borra el archivo y audita quitar con lo que había', async () => {
    await new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida('uno.pdf'));

    await new QuitarEvidenciaDeApertura(dependencias).ejecutar(operador, CUENTA);

    expect(cabecera!.evidenciaArchivoId).toBeNull();
    expect(documentos.guardados.size).toBe(0);
    expect(auditoria.entradas[0]).toMatchObject({
      accion: 'quitar',
      recurso: 'bancos.saldos-iniciales',
      anterior: { evidencia: { nombreOriginal: 'uno.pdf' } },
    });
  });

  it('quitar sin archivo responde 404 y con la carga cerrada rechaza', async () => {
    const quitar = new QuitarEvidenciaDeApertura(dependencias);
    await expect(quitar.ejecutar(operador, CUENTA)).rejects.toBeInstanceOf(SaldoInicialSinEvidencia);

    carga = { fechaDeInicio: '2026-01-01', cerrada: true };
    await expect(quitar.ejecutar(operador, CUENTA)).rejects.toBeInstanceOf(CargaInicialCerrada);
  });
});

describe('eliminar el saldo inicial', () => {
  it('borra también el archivo de la evidencia', async () => {
    await new SubirEvidenciaDeApertura(dependencias).ejecutar(operador, subida());

    await new EliminarSaldoInicial(dependencias).ejecutar(operador, {
      cuentaBancariaId: CUENTA,
      motivo: 'se cargó mal',
    });

    expect(documentos.guardados.size).toBe(0);
    expect(auditoria.acciones()).toContain('bancos.saldos-iniciales:eliminar');
  });
});
