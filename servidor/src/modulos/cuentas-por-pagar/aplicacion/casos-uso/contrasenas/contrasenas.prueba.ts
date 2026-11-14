import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import { ConsultasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import {
  CargaInicialFija,
  documentoSembrado,
  FechasDeEntradaFijas,
  UmbralFijo,
} from '../../../pruebas/dobles-de-aplicaciones.js';
import { ContrasenasEnMemoria } from '../../../pruebas/dobles-de-contrasenas.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { CrearContrasena } from './crear-contrasena.js';
import { ListarContrasenas } from './listar-contrasenas.js';
import { ObtenerContrasena } from './obtener-contrasena.js';

const operador = operadorDePrueba();
let documentos: DocumentosEnMemoria;
let fechas: FechasDeEntradaFijas;
let contrasenas: ContrasenasEnMemoria;
let crear: CrearContrasena;
let obtener: ObtenerContrasena;
let listar: ListarContrasenas;

beforeEach(() => {
  const aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  fechas = new FechasDeEntradaFijas();
  const consultas = new ConsultasEnMemoria(documentos, aplicaciones);
  contrasenas = new ContrasenasEnMemoria(consultas, aplicaciones);
  contrasenas.proveedoresConocidos.add('proveedor-1');
  const comunes = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-06-01'),
    contrasenas,
    umbral: new UmbralFijo(),
  };
  crear = new CrearContrasena({
    ...comunes,
    documentos,
    consultas,
    repositorio: contrasenas,
    proveedores: contrasenas,
    correlativos: new CorrelativosEnMemoria(),
    cargaInicial: new CargaInicialFija(),
    fechasDeEntrada: fechas,
  });
  obtener = new ObtenerContrasena(comunes);
  listar = new ListarContrasenas(comunes);
});

function sembrar(cambios: Partial<DocumentoPorPagar> = {}, recepcion: string | null = '2026-03-10') {
  const documento = documentoSembrado(cambios);
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, recepcion);
  return documento;
}

const pedido = (ids: string[], cambios: Record<string, unknown> = {}) => ({
  proveedorId: 'proveedor-1',
  fechaDePago: '2026-07-01',
  documentos: ids,
  ...cambios,
});

describe('crear una contraseña', () => {
  it('guarda la contraseña con su número, la fecha de hoy y los montos de sus cargos', async () => {
    const [a, b] = [sembrar({ totalCentavos: 10000 }), sembrar({ totalCentavos: 5000 })];

    const dto = await crear.ejecutar(operador, pedido([a.id, b.id], { observaciones: ' hola ' }));

    expect(dto).toMatchObject({
      numero: '1',
      fecha: '2026-06-01',
      fechaDePago: '2026-07-01',
      observaciones: 'hola',
      estado: 'vigente',
      totales: { total: '150.00', saldo: '150.00', rebajado: '0.00' },
    });
    expect(dto.cargos).toHaveLength(2);
  });

  it('reparte la nota entre los cargos con forma contrasena y fecha la mayor de las tres', async () => {
    const cargo = sembrar({ totalCentavos: 10000 });
    const nota = sembrar({ tipo: 'nota_de_credito', totalCentavos: 3000, vencimiento: null }, '2026-05-20');

    const dto = await crear.ejecutar(operador, pedido([cargo.id, nota.id], { fecha: '2026-05-10' }));

    expect(dto.cargos[0]).toMatchObject({ rebajado: '30.00', saldo: '70.00' });
    expect(dto.notas[0]).toMatchObject({ aplicadoEnLaContrasena: '30.00', saldoLibre: '0.00' });
  });

  it('no gasta el número si algo falla y el siguiente es consecutivo', async () => {
    const cargo = sembrar();
    const ajeno = sembrar({ proveedorId: 'otro' });

    await expect(crear.ejecutar(operador, pedido([ajeno.id]))).rejects.toThrow(/otro proveedor/);
    const primera = await crear.ejecutar(operador, pedido([cargo.id]));

    expect(primera.numero).toBe('1');
  });

  it('rechaza un documento que ya está en una contraseña vigente, nombrándola', async () => {
    const cargo = sembrar();
    await crear.ejecutar(operador, pedido([cargo.id]));

    await expect(crear.ejecutar(operador, pedido([cargo.id]))).rejects.toThrow(/contraseña 1/);
  });

  it('rechaza un proveedor y un documento que no existen', async () => {
    const cargo = sembrar();

    await expect(crear.ejecutar(operador, pedido([cargo.id], { proveedorId: 'nadie' }))).rejects.toThrow(
      RecursoNoEncontrado,
    );
    await expect(crear.ejecutar(operador, pedido(['no-existe']))).rejects.toThrow(RecursoNoEncontrado);
  });

  it('rechaza la fecha anterior a la fecha de inicio de la empresa', async () => {
    const cargo = sembrar({ fechaEmision: '2025-12-01' });

    await expect(crear.ejecutar(operador, pedido([cargo.id], { fecha: '2025-12-15' }))).rejects.toThrow(
      /fecha de inicio/,
    );
  });

  it('si las notas cubren todo no hay contraseña', async () => {
    const cargo = sembrar({ totalCentavos: 1000 });
    const nota = sembrar({ tipo: 'nota_de_credito', totalCentavos: 5000, vencimiento: null });

    await expect(crear.ejecutar(operador, pedido([cargo.id, nota.id]))).rejects.toThrow(/nada que pagar/);
    expect(contrasenas.guardadas).toEqual([]);
  });
});

describe('consultar', () => {
  it('obtiene la ficha y la lista con el saldo y sin pago vencido', async () => {
    const cargo = sembrar({ totalCentavos: 10000 });
    const creada = await crear.ejecutar(operador, pedido([cargo.id]));

    const ficha = await obtener.ejecutar(operador, creada.id);
    const pagina = await listar.ejecutar(operador, { estado: 'vigente' }, { pagina: 1, limite: 50 });

    expect(ficha).toEqual(creada);
    expect(pagina.elementos).toEqual([
      expect.objectContaining({ numero: '1', documentos: 1, saldo: '100.00', pagoVencido: false }),
    ]);
    await expect(obtener.ejecutar(operador, 'nada')).rejects.toThrow(RecursoNoEncontrado);
  });
});
