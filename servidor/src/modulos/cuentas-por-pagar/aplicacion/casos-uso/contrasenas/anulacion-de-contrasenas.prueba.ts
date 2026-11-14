import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
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
import { lineaDePago } from '../../../pruebas/lineas-de-pago.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { AnularContrasena, type ReglaParaAnularContrasena } from './anular-contrasena.js';
import { CrearContrasena } from './crear-contrasena.js';

const operador = operadorDePrueba();
let documentos: DocumentosEnMemoria;
let aplicaciones: AplicacionesEnMemoria;
let fechas: FechasDeEntradaFijas;
let contrasenas: ContrasenasEnMemoria;
let auditoria: AuditoriaEnMemoria;
let crear: CrearContrasena;
let anular: AnularContrasena;

function armarAnular(reglas?: readonly ReglaParaAnularContrasena[]) {
  const consultas = new ConsultasEnMemoria(documentos, aplicaciones);
  const comunes = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-06-01'),
    contrasenas,
    umbral: new UmbralFijo(),
  };
  const paraEditar = {
    ...comunes,
    auditoria,
    repositorio: contrasenas,
  };
  crear = new CrearContrasena({
    ...comunes,
    documentos,
    consultas,
    repositorio: contrasenas,
    fechasDeEntrada: fechas,
    proveedores: contrasenas,
    correlativos: new CorrelativosEnMemoria(),
    cargaInicial: new CargaInicialFija(),
  });
  return new AnularContrasena(paraEditar, reglas);
}

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  fechas = new FechasDeEntradaFijas();
  auditoria = new AuditoriaEnMemoria();
  contrasenas = new ContrasenasEnMemoria(new ConsultasEnMemoria(documentos, aplicaciones), aplicaciones);
  contrasenas.proveedoresConocidos.add('proveedor-1');
  anular = armarAnular();
});

function sembrar(cambios: Partial<DocumentoPorPagar> = {}) {
  const documento = documentoSembrado(cambios);
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, '2026-03-10');
  return documento;
}

const nota = () => sembrar({ tipo: 'nota_de_credito', totalCentavos: 3000, vencimiento: null });

const hacer = (ids: string[]) =>
  crear.ejecutar(operador, { proveedorId: 'proveedor-1', fechaDePago: '2026-07-01', documentos: ids });

describe('anular una contraseña', () => {
  it('la deja anulada con su motivo, borra lo que sus notas aplicaron y audita cómo estaba', async () => {
    const creada = await hacer([sembrar({ totalCentavos: 10000 }).id, nota().id]);
    expect(aplicaciones.lista.filter(({ forma }) => forma === 'contrasena')).toHaveLength(1);

    const dto = await anular.ejecutar(operador, { id: creada.id, motivo: ' Se perdió el papel ' });

    expect(dto.estado).toBe('anulada');
    expect(dto.anulacion).toMatchObject({ motivo: 'Se perdió el papel' });
    expect(dto.puedeAnular).toBe(false);
    expect(dto.puedeEditar).toBe(false);
    expect(aplicaciones.lista.filter(({ forma }) => forma === 'contrasena')).toEqual([]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.contrasenas',
        registroId: creada.id,
        accion: 'anular',
        motivo: 'Se perdió el papel',
        anterior: expect.objectContaining({ id: creada.id, estado: 'vigente' }),
      }),
    ]);
    expect(auditoria.entradas[0]!.anterior).toMatchObject({ totales: expect.objectContaining({ saldo: '70.00' }) });
  });

  it('suelta sus documentos: otra contraseña puede llevarlos', async () => {
    const cargo = sembrar();
    const creada = await hacer([cargo.id]);
    await expect(hacer([cargo.id])).rejects.toThrow(/ya está en la contraseña/);

    await anular.ejecutar(operador, { id: creada.id, motivo: 'Error' });

    await expect(hacer([cargo.id])).resolves.toMatchObject({ estado: 'vigente' });
  });

  it('rechaza anular dos veces, sin motivo y una que no existe, sin auditar de más', async () => {
    const creada = await hacer([sembrar().id]);
    await anular.ejecutar(operador, { id: creada.id, motivo: 'Error' });

    await expect(anular.ejecutar(operador, { id: creada.id, motivo: 'Otra vez' })).rejects.toThrow(/anulada/);
    await expect(anular.ejecutar(operador, { id: creada.id, motivo: ' ' })).rejects.toThrow(/motivo/i);
    await expect(anular.ejecutar(operador, { id: 'nada', motivo: 'x' })).rejects.toThrow(/no existe|no se encontr/i);
    expect(auditoria.entradas).toHaveLength(1);
  });

  it('con un pago vigente no se anula: se anula primero el pago, y nada cambia', async () => {
    const cargo = sembrar();
    const creada = await hacer([cargo.id]);
    documentos.pagos.push(lineaDePago({ contrasenaId: creada.id, cargoId: cargo.id, numero: 4 }));

    await expect(anular.ejecutar(operador, { id: creada.id, motivo: 'Error' })).rejects.toMatchObject({
      codigo: 'contrasena_con_pagos',
    });

    expect(contrasenas.guardadas[0]!.vigente).toBe(true);
    expect(auditoria.entradas).toEqual([]);
  });

  it('con un pago sin movimiento en Bancos (cuenta de apertura) tampoco se anula', async () => {
    const cargo = sembrar();
    const creada = await hacer([cargo.id]);
    documentos.pagos.push(lineaDePago({ contrasenaId: creada.id, cargoId: cargo.id, forma: 'cuenta_de_apertura' }));

    await expect(anular.ejecutar(operador, { id: creada.id, motivo: 'Error' })).rejects.toThrow(/pagos vigentes/);
  });

  it('con solo pagos anulados se anula, y los pagos de otra contraseña no cuentan', async () => {
    const cargo = sembrar();
    const creada = await hacer([cargo.id]);
    documentos.pagos.push(
      lineaDePago({ contrasenaId: creada.id, cargoId: cargo.id, estado: 'anulado' }),
      lineaDePago({ contrasenaId: 'otra-contrasena', cargoId: cargo.id }),
    );

    const dto = await anular.ejecutar(operador, { id: creada.id, motivo: 'Error' });

    expect(dto.estado).toBe('anulada');
  });

  it('una regla de anulación puede frenarla y nada cambia', async () => {
    const frena: ReglaParaAnularContrasena = () => {
      throw new Error('Tiene pagos.');
    };
    const conRegla = armarAnular([frena]);
    const creada = await hacer([sembrar().id]);

    await expect(conRegla.ejecutar(operador, { id: creada.id, motivo: 'Error' })).rejects.toThrow('Tiene pagos.');

    expect(contrasenas.guardadas[0]!.vigente).toBe(true);
    expect(auditoria.entradas).toEqual([]);
  });
});
