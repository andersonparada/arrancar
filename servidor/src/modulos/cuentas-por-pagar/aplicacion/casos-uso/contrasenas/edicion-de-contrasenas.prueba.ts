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
import { AgregarDocumentosAContrasena } from './agregar-documentos-a-contrasena.js';
import { CrearContrasena } from './crear-contrasena.js';
import { EditarContrasena } from './editar-contrasena.js';
import { QuitarDocumentoDeContrasena } from './quitar-documento-de-contrasena.js';

const operador = operadorDePrueba();
let documentos: DocumentosEnMemoria;
let aplicaciones: AplicacionesEnMemoria;
let fechas: FechasDeEntradaFijas;
let contrasenas: ContrasenasEnMemoria;
let auditoria: AuditoriaEnMemoria;
let crear: CrearContrasena;
let editar: EditarContrasena;
let agregar: AgregarDocumentosAContrasena;
let quitar: QuitarDocumentoDeContrasena;

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  fechas = new FechasDeEntradaFijas();
  auditoria = new AuditoriaEnMemoria();
  const consultas = new ConsultasEnMemoria(documentos, aplicaciones);
  contrasenas = new ContrasenasEnMemoria(consultas, aplicaciones);
  contrasenas.proveedoresConocidos.add('proveedor-1');
  const comunes = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-06-01'),
    contrasenas,
    umbral: new UmbralFijo(),
  };
  const compartidas = { documentos, consultas, repositorio: contrasenas, fechasDeEntrada: fechas };
  crear = new CrearContrasena({
    ...comunes,
    ...compartidas,
    proveedores: contrasenas,
    correlativos: new CorrelativosEnMemoria(),
    cargaInicial: new CargaInicialFija(),
  });
  const paraEditar = { ...comunes, ...compartidas, auditoria, cargaInicial: new CargaInicialFija() };
  editar = new EditarContrasena(paraEditar);
  agregar = new AgregarDocumentosAContrasena(paraEditar);
  quitar = new QuitarDocumentoDeContrasena(paraEditar);
});

function sembrar(cambios: Partial<DocumentoPorPagar> = {}, recepcion: string | null = '2026-03-10') {
  const documento = documentoSembrado(cambios);
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, recepcion);
  return documento;
}

const nota = (cambios: Partial<DocumentoPorPagar> = {}, recepcion = '2026-03-10') =>
  sembrar({ tipo: 'nota_de_credito', totalCentavos: 3000, vencimiento: null, ...cambios }, recepcion);

const hacer = (ids: string[], cambios: Record<string, unknown> = {}) =>
  crear.ejecutar(operador, { proveedorId: 'proveedor-1', fechaDePago: '2026-07-01', documentos: ids, ...cambios });

describe('cambiar la fecha prometida y las observaciones', () => {
  it('la fecha sin motivo se rechaza y nada cambia', async () => {
    const creada = await hacer([sembrar().id]);

    await expect(editar.ejecutar(operador, { id: creada.id, fechaDePago: '2026-08-01' })).rejects.toThrow(/motivo/i);

    expect(contrasenas.guardadas[0]!.fechaDePago).toBe('2026-07-01');
    expect(auditoria.entradas).toEqual([]);
  });

  it('la fecha con motivo se cambia y se audita con lo que había', async () => {
    const creada = await hacer([sembrar().id], { observaciones: 'Original' });

    const dto = await editar.ejecutar(operador, {
      id: creada.id,
      fechaDePago: '2026-08-01',
      motivo: ' El proveedor lo pidió ',
    });

    expect(dto.fechaDePago).toBe('2026-08-01');
    expect(auditoria.entradas).toEqual([
      {
        recurso: 'cuentas-por-pagar.contrasenas',
        registroId: creada.id,
        accion: 'corregir',
        anterior: { fechaDePago: '2026-07-01', observaciones: 'Original' },
        motivo: 'El proveedor lo pidió',
      },
    ]);
  });

  it('solo las observaciones, o la misma fecha, no se audita ni pide motivo', async () => {
    const creada = await hacer([sembrar().id]);

    const dto = await editar.ejecutar(operador, { id: creada.id, fechaDePago: '2026-07-01', observaciones: ' Nueva ' });
    const vacia = await editar.ejecutar(operador, { id: creada.id, observaciones: '  ' });

    expect(dto.observaciones).toBe('Nueva');
    expect(vacia.observaciones).toBeNull();
    expect(auditoria.entradas).toEqual([]);
  });

  it('rechaza una fecha anterior a la de la contraseña, una contraseña anulada y una que no existe', async () => {
    const creada = await hacer([sembrar().id]);

    await expect(editar.ejecutar(operador, { id: creada.id, fechaDePago: '2026-05-01', motivo: 'x' })).rejects.toThrow(
      /anterior a la fecha de la contraseña/,
    );
    contrasenas.guardadas[0]!.vigente = false;
    await expect(editar.ejecutar(operador, { id: creada.id, observaciones: 'x' })).rejects.toThrow(/anulada/);
    await expect(editar.ejecutar(operador, { id: 'nada', observaciones: 'x' })).rejects.toThrow(
      /no existe|no se encontr/i,
    );
  });
});

describe('agregar documentos', () => {
  it('suma un cargo y una nota recibida después, con la fecha de su recepción', async () => {
    const primero = sembrar({ totalCentavos: 10000 });
    const creada = await hacer([primero.id], { fecha: '2026-05-10' });
    const otro = sembrar({ totalCentavos: 5000 });
    const recibida = nota({}, '2026-05-25');

    const dto = await agregar.ejecutar(operador, { contrasenaId: creada.id, documentos: [otro.id, recibida.id] });

    expect(dto.cargos).toHaveLength(2);
    expect(dto.totales).toMatchObject({ total: '150.00', rebajado: '30.00', saldo: '120.00' });
    expect(aplicaciones.lista.filter(({ forma }) => forma === 'contrasena')).toEqual([
      expect.objectContaining({ notaId: recibida.id, montoCentavos: 3000, fecha: '2026-05-25' }),
    ]);
  });

  it('rechaza un documento ya en una contraseña, uno de otro proveedor y pasar de cien', async () => {
    const creada = await hacer([sembrar().id]);
    const otra = await hacer([sembrar().id]);
    const ajeno = sembrar({ proveedorId: 'otro' });

    await expect(
      agregar.ejecutar(operador, { contrasenaId: creada.id, documentos: [otra.cargos[0]!.documentoId] }),
    ).rejects.toThrow(/ya está en la contraseña/);
    await expect(agregar.ejecutar(operador, { contrasenaId: creada.id, documentos: [ajeno.id] })).rejects.toThrow(
      /otro proveedor/,
    );
    const muchos = Array.from({ length: 100 }, (_, n) => `doc-${n}`);
    await expect(agregar.ejecutar(operador, { contrasenaId: creada.id, documentos: muchos })).rejects.toThrow(
      /hasta 100/,
    );
  });
});

describe('una contraseña con pagos', () => {
  async function conPagoEnElPrimero(estado: 'vigente' | 'anulado' = 'vigente') {
    const [a, b] = [sembrar(), sembrar()];
    const creada = await hacer([a!.id, b!.id]);
    documentos.pagos.push(lineaDePago({ contrasenaId: creada.id, cargoId: a!.id, estado }));
    return { creada, conPago: a!, sinPago: b! };
  }

  it('se sigue editando: la fecha prometida cambia y la contraseña informa su pago', async () => {
    const { creada } = await conPagoEnElPrimero();

    const dto = await editar.ejecutar(operador, { id: creada.id, fechaDePago: '2026-08-01', motivo: 'Lo pidió' });

    expect(dto).toMatchObject({ fechaDePago: '2026-08-01', puedeEditar: true, puedeAnular: false });
    expect(dto.pagos).toEqual([
      expect.objectContaining({ numero: '1', forma: 'cheque', estado: 'vigente', monto: '10.00' }),
    ]);
    expect(dto.estadoDePago).toBe('en_parte');
  });

  it('agrega documentos y quita el que no tiene pagos', async () => {
    const { creada, sinPago } = await conPagoEnElPrimero();

    await agregar.ejecutar(operador, { contrasenaId: creada.id, documentos: [sembrar().id] });
    const dto = await quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: sinPago.id, motivo: 'No va' });

    expect(dto.cargos).toHaveLength(2);
    expect(dto.cargos.map(({ documentoId }) => documentoId)).not.toContain(sinPago.id);
  });

  it('no quita el documento con un pago vigente ni con uno anulado, y nada cambia', async () => {
    for (const estado of ['vigente', 'anulado'] as const) {
      const { creada, conPago } = await conPagoEnElPrimero(estado);

      await expect(
        quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: conPago.id, motivo: 'No va' }),
      ).rejects.toMatchObject({ codigo: 'documento_con_pagos_en_la_contrasena' });
    }
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('quitar un documento', () => {
  it('quitar una nota devuelve su saldo libre y audita con la contraseña como estaba', async () => {
    const cargo = sembrar({ totalCentavos: 10000 });
    const credito = nota();
    const creada = await hacer([cargo.id, credito.id]);

    const dto = await quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: credito.id, motivo: 'No va' });

    expect(dto.notas).toEqual([]);
    expect(dto.totales).toMatchObject({ rebajado: '0.00', saldo: '100.00' });
    expect(aplicaciones.lista.filter(({ forma }) => forma === 'contrasena')).toEqual([]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        accion: 'quitar',
        registroId: creada.id,
        motivo: 'No va',
        anterior: expect.objectContaining({ id: creada.id, totales: expect.objectContaining({ saldo: '70.00' }) }),
      }),
    ]);
  });

  it('rechaza quitar el último cargo, quitar sin motivo y un documento que no está', async () => {
    const [a, b] = [sembrar(), sembrar()];
    const creada = await hacer([a.id, b.id]);
    await quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: a.id, motivo: 'Sobra' });

    await expect(
      quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: b.id, motivo: 'Sobra' }),
    ).rejects.toThrow(/al menos una factura/);
    await expect(
      quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: b.id, motivo: ' ' }),
    ).rejects.toThrow(/motivo/i);
    await expect(
      quitar.ejecutar(operador, { contrasenaId: creada.id, documentoId: a.id, motivo: 'Sobra' }),
    ).rejects.toThrow(/no existe|no se encontr/i);
  });
});
