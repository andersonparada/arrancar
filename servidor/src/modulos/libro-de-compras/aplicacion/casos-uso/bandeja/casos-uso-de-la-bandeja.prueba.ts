import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { DteRecibido, type DatosDelDte } from '../../../dominio/dte-recibido.js';
import { DteNoEstaDescartado } from '../../../dominio/errores-de-bandeja.js';
import { RepositorioDeDteRecibidosEnMemoria } from '../../../pruebas/dobles-de-la-bandeja.js';
import type { AutorizacionesRegistradasFuera } from '../../puertos/puertos-de-la-bandeja.js';
import type { ConfirmadorDeFila } from './confirmador-de-fila.js';
import { ConfirmarDteRecibidos } from './confirmar-dte-recibidos.js';
import { DescartarDteRecibidos, RestaurarDteRecibido } from './descartar-y-restaurar-dte-recibidos.js';
import { EnlaceDeLaBandeja } from './enlace-de-la-bandeja.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';

const operador = operadorDePrueba();
const DATOS: DatosDelDte = {
  autorizacionFel: '6f1f3b0e-1c1a-4b57-9d33-0a1b2c3d4e5f',
  tipoDte: 'FACT',
  serie: 'A',
  numero: '1',
  fechaEmision: '2026-03-10',
  nitEmisor: '1234567',
  nombreEmisor: 'Proveedor',
  nitReceptor: '7654321',
  total: '112.00',
  iva: '12.00',
  idp: '0',
  otrosImpuestos: '0',
  otrosImpuestosDetalle: {},
  filaOriginal: {},
  estadoSat: 'vigente',
  anuladoEnLaSatEl: null,
};

let filas: RepositorioDeDteRecibidosEnMemoria;
const agregar = async (cambios: Partial<DatosDelDte> = {}) => {
  const fila = DteRecibido.crear({
    empresaId: Identificador.nuevo<'Empresa'>(),
    loteId: crypto.randomUUID(),
    datos: { ...DATOS, autorizacionFel: crypto.randomUUID(), ...cambios },
  });
  await filas.agregar(fila);
  return fila;
};
const estadoDe = (fila: DteRecibido) => filas.filas.get(fila.id.valor)!.estado;

beforeEach(() => {
  filas = new RepositorioDeDteRecibidosEnMemoria();
});

describe('EnlaceDeLaBandeja', () => {
  it('pasa a registrado la fila con esa autorización, también una descartada', async () => {
    const pendiente = await agregar();
    const descartada = await agregar();
    descartada.descartar({ motivo: 'No', por: crypto.randomUUID(), en: new Date() });
    const enlace = new EnlaceDeLaBandeja(filas);

    await enlace.enlazar(pendiente.instantanea().autorizacionFel, 'doc-1');
    await enlace.enlazar(descartada.instantanea().autorizacionFel, 'doc-2');

    expect(pendiente.instantanea()).toMatchObject({ estado: 'registrado', documentoId: 'doc-1' });
    expect(descartada.instantanea()).toMatchObject({
      estado: 'registrado',
      documentoId: 'doc-2',
      motivoDeDescarte: null,
    });
  });

  it('una fila ya registrada con otro documento y una autorización sin fila no cambian', async () => {
    const registrada = await agregar();
    registrada.registrar('doc-1');
    const enlace = new EnlaceDeLaBandeja(filas);

    await enlace.enlazar(registrada.instantanea().autorizacionFel, 'doc-2');
    await enlace.enlazar(crypto.randomUUID(), 'doc-3');

    expect(registrada.instantanea().documentoId).toBe('doc-1');
    expect(filas.guardadas).toEqual([]);
  });

  it('soltar devuelve a pendiente la fila del documento, y sin fila no hace nada', async () => {
    const fila = await agregar();
    fila.registrar('doc-1');
    const enlace = new EnlaceDeLaBandeja(filas);

    await enlace.soltar('doc-1');
    await enlace.soltar('doc-sin-fila');

    expect(fila.instantanea()).toMatchObject({ estado: 'pendiente', documentoId: null });
    expect(filas.guardadas).toHaveLength(1);
  });
});

describe('ConfirmarDteRecibidos', () => {
  const sinProponedor = () => ({}) as ProponedorDeDte;
  const orden: string[] = [];

  /** Un confirmador falso: registra el orden en que lo llaman y falla con lo que se le diga. */
  const confirmadorQue = (falla: (id: string) => unknown) =>
    ({
      confirmar: async (_operador: unknown, id: string) => {
        orden.push(id);
        const error = falla(id);
        if (error) throw error;
        return { documentoId: `doc-${id}`, avisos: [] };
      },
    }) as unknown as ConfirmadorDeFila;

  const caso = (
    confirmador: ConfirmadorDeFila,
    interpretarError: (error: unknown) => ErrorEsperado | null = () => null,
  ) =>
    new ConfirmarDteRecibidos({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      filas,
      confirmador,
      crearProponedor: sinProponedor,
      interpretarError,
    });
  const peticion = (ids: string[]) => ({ ids, datosFiscalesPorProveedor: {}, puedeCrearProveedores: false });

  beforeEach(() => {
    orden.length = 0;
  });

  it('procesa por fecha de emisión y las facturas antes que sus notas del mismo día', async () => {
    const nota = await agregar({ tipoDte: 'NCRE', fechaEmision: '2026-03-10' });
    const reciente = await agregar({ fechaEmision: '2026-03-20' });
    const factura = await agregar({ fechaEmision: '2026-03-10' });
    const ids = [nota, reciente, factura].map((fila) => fila.id.valor);

    await caso(confirmadorQue(() => null)).ejecutar(operador, peticion(ids));

    expect(orden).toEqual([factura, nota, reciente].map((fila) => fila.id.valor));
  });

  it('un error esperado de una fila se informa y las demás siguen', async () => {
    const [a, b, c] = [await agregar(), await agregar(), await agregar()];
    const malo = b.id.valor;
    class Falla extends ErrorEsperado {
      readonly codigo = 'falla_de_prueba';
    }

    const { resultados } = await caso(
      confirmadorQue((id) => (id === malo ? new Falla('No se pudo', { campo: 'x' }) : null)),
    ).ejecutar(operador, peticion([a, b, c].map((fila) => fila.id.valor)));

    expect(resultados).toHaveLength(3);
    expect(resultados.find((r) => r.id === malo)).toEqual({
      id: malo,
      error: { codigo: 'falla_de_prueba', mensaje: 'No se pudo', detalles: { campo: 'x' } },
    });
    expect(resultados.filter((r) => 'documentoId' in r)).toHaveLength(2);
  });

  it('lo que la base rechaza se interpreta; lo que nadie entiende frena la solicitud', async () => {
    const fila = await agregar();
    const id = fila.id.valor;
    const rechazo = new Error('violación de unicidad');
    class Repetido extends ErrorEsperado {
      readonly codigo = 'duplicado';
    }

    const interpretado = await caso(
      confirmadorQue(() => rechazo),
      (error) => (error === rechazo ? new Repetido('Ese documento ya está registrado.') : null),
    ).ejecutar(operador, peticion([id]));
    const inesperado = caso(confirmadorQue(() => rechazo)).ejecutar(operador, peticion([id]));

    expect(interpretado.resultados[0]).toMatchObject({ error: { codigo: 'duplicado' } });
    await expect(inesperado).rejects.toBe(rechazo);
  });

  it('una fila que no existe se informa como no encontrada, sin llamar al confirmador', async () => {
    const inexistente = crypto.randomUUID();

    const { resultados } = await caso(confirmadorQue(() => null)).ejecutar(operador, peticion([inexistente]));

    expect(resultados).toEqual([
      { id: inexistente, error: expect.objectContaining({ codigo: new RecursoNoEncontrado('x').codigo }) },
    ]);
    expect(orden).toEqual([]);
  });
});

describe('descartar y restaurar', () => {
  const auditoria = new AuditoriaEnMemoria();
  const registradaFuera = { valor: false };
  const autorizaciones: AutorizacionesRegistradasFuera = { estaRegistrada: async () => registradaFuera.valor };
  const dependencias = () => ({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    filas,
    autorizaciones,
    auditoria,
  });

  beforeEach(() => {
    auditoria.entradas.length = 0;
    registradaFuera.valor = false;
  });

  it('descartar audita cada fila con su motivo y cómo estaba', async () => {
    const [a, b] = [await agregar(), await agregar()];

    await new DescartarDteRecibidos(dependencias()).ejecutar(operador, {
      ids: [a.id.valor, b.id.valor],
      motivo: 'No es de la empresa',
    });

    expect(auditoria.acciones()).toEqual([
      'libro-de-compras.dte-recibidos:descartar',
      'libro-de-compras.dte-recibidos:descartar',
    ]);
    expect(auditoria.entradas[0]).toMatchObject({ motivo: 'No es de la empresa', anterior: { estado: 'pendiente' } });
    expect([estadoDe(a), estadoDe(b)]).toEqual(['descartado', 'descartado']);
  });

  it('restaurar vuelve a pendiente, o a bloqueado si el DTE sigue en otra empresa; solo restaura lo descartado', async () => {
    const fila = await agregar();
    fila.descartar({ motivo: 'No', por: crypto.randomUUID(), en: new Date() });
    const restaurar = new RestaurarDteRecibido(dependencias());

    const libre = await restaurar.ejecutar(operador, fila.id.valor);
    await expect(restaurar.ejecutar(operador, fila.id.valor)).rejects.toBeInstanceOf(DteNoEstaDescartado);
    fila.descartar({ motivo: 'No', por: crypto.randomUUID(), en: new Date() });
    registradaFuera.valor = true;
    const bloqueada = await restaurar.ejecutar(operador, fila.id.valor);

    expect(libre.estado).toBe('pendiente');
    expect(bloqueada).toMatchObject({ estado: 'bloqueado', motivoDeBloqueo: 'registrado_en_otra_empresa' });
    expect(auditoria.acciones()).toEqual([
      'libro-de-compras.dte-recibidos:reactivar',
      'libro-de-compras.dte-recibidos:reactivar',
    ]);
  });
});
