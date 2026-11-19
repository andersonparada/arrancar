import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ArticuloInvalido } from '../../../dominio/articulo.js';
import { ArticuloConExistencias, ConversionInvalida, LoteInvalido, UnidadBaseFija } from '../../../dominio/errores.js';
import {
  ArticulosEnMemoria,
  ConversionesEnMemoria,
  CorrelativosEnMemoria,
  LotesEnMemoria,
  prefijoDePrueba,
  relojDePrueba,
} from '../../../pruebas/dobles-de-articulos.js';
import { UsoDelKardexEnMemoria } from '../../../pruebas/dobles-de-uso-del-kardex.js';
import type { SolicitudDeArticulo } from '../../dto/articulo.dto.js';
import { ActualizarArticulo } from './actualizar-articulo.js';
import { CrearArticulo } from './crear-articulo.js';
import { CrearLoteDeArticulo } from './crear-lote-de-articulo.js';
import { EliminarArticulo } from './eliminar-articulo.js';
import { ListarArticulos } from './listar-articulos.js';
import { ListarConversionesDeArticulo } from './listar-conversiones-de-articulo.js';
import { ListarLotesDeArticulo } from './listar-lotes-de-articulo.js';
import { ObtenerArticulo } from './obtener-articulo.js';
import { ProponerCodigoDeArticulo } from './proponer-codigo-de-articulo.js';
import { ReemplazarConversionesDeArticulo } from './reemplazar-conversiones-de-articulo.js';

const operador = operadorDePrueba();
const LIBRA = '00000000-0000-4000-8000-000000000001';
const CAJA = '00000000-0000-4000-8000-000000000002';
const SACO = '00000000-0000-4000-8000-000000000003';

const solicitud = (cambios: Partial<SolicitudDeArticulo> = {}): SolicitudDeArticulo => ({
  codigo: 'ART-0001',
  nombre: 'Concentrado',
  descripcion: 'Alimento balanceado.',
  categoriaId: '00000000-0000-4000-8000-0000000000aa',
  tipoDeInventario: 'mercaderia',
  unidadBaseId: LIBRA,
  manejaLotes: false,
  manejaVencimiento: false,
  codigoDeBarras: null,
  conceptoDeGastoId: null,
  existenciaMinima: '10.0000',
  pesoKgPorUnidadBase: null,
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: ArticulosEnMemoria;
let uso: UsoDelKardexEnMemoria;

function casosDeUso() {
  registros = new ArticulosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  uso = new UsoDelKardexEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    uso,
    auditoria,
    conversiones: new ConversionesEnMemoria(),
    lotes: new LotesEnMemoria(),
    correlativos: new CorrelativosEnMemoria(),
    prefijo: prefijoDePrueba,
    reloj: relojDePrueba,
  };
  return {
    listar: new ListarArticulos(dependencias),
    obtener: new ObtenerArticulo(dependencias),
    crear: new CrearArticulo(dependencias),
    actualizar: new ActualizarArticulo(dependencias),
    eliminar: new EliminarArticulo(dependencias),
    proponerCodigo: new ProponerCodigoDeArticulo(dependencias),
    listarConversiones: new ListarConversionesDeArticulo(dependencias),
    reemplazarConversiones: new ReemplazarConversionesDeArticulo(dependencias),
    listarLotes: new ListarLotesDeArticulo(dependencias),
    crearLote: new CrearLoteDeArticulo(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('artículos', () => {
  it('registra un artículo y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      articuloId: creado.id,
      solicitud: solicitud({ codigo: 'ART-0002', nombre: 'Concentrado de engorde', codigoDeBarras: '7401234' }),
    });

    expect(cambiado).toMatchObject({ codigo: 'ART-0002', codigoDeBarras: '7401234' });
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it.each([
    ['sin código', { codigo: '  ' }],
    ['con un código con espacios', { codigo: 'ART 1' }],
    ['con vencimiento y sin lotes', { manejaVencimiento: true, manejaLotes: false }],
    ['con existencia mínima negativa', { existenciaMinima: '-1' }],
    ['con peso en cero', { pesoKgPorUnidadBase: '0' }],
  ])('no se registra %s', async (_caso, cambios) => {
    await expect(casos.crear.ejecutar(operador, solicitud(cambios))).rejects.toThrow(ArticuloInvalido);
  });

  it('con movimientos no cambia su unidad base ni si maneja lotes, pero sí otros datos', async () => {
    const casos = casosDeUso();
    const creado = await casos.crear.ejecutar(operador, solicitud());
    uso.articulosConMovimientos.add(creado.id);
    const cambio = (cambios: Partial<SolicitudDeArticulo>) =>
      casos.actualizar.ejecutar(operador, { articuloId: creado.id, solicitud: solicitud(cambios) });

    await expect(cambio({ unidadBaseId: CAJA })).rejects.toBeInstanceOf(UnidadBaseFija);
    await expect(cambio({ manejaLotes: true })).rejects.toBeInstanceOf(UnidadBaseFija);
    expect((await cambio({ nombre: 'Otro nombre' })).nombre).toBe('Otro nombre');
  });

  it('con existencias no se inactiva; sin ellas sí', async () => {
    const casos = casosDeUso();
    const creado = await casos.crear.ejecutar(operador, solicitud());
    uso.articulosConExistencias.add(creado.id);
    const inactivar = () =>
      casos.actualizar.ejecutar(operador, { articuloId: creado.id, solicitud: solicitud({ activo: false }) });

    await expect(inactivar()).rejects.toBeInstanceOf(ArticuloConExistencias);
    uso.articulosConExistencias.clear();
    expect((await inactivar()).activo).toBe(false);
  });

  it('se inactiva sin perder sus datos y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      articuloId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['inventarios.articulos:inactivar']);
  });

  it('se elimina y queda en la auditoría con cómo estaba', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(auditoria.acciones()).toEqual(['inventarios.articulos:eliminar']);
    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('código propuesto', () => {
  it('es el prefijo y el correlativo, y salta los códigos que ya existen', async () => {
    await casos.crear.ejecutar(operador, solicitud({ codigo: 'art-0001' }));
    await casos.crear.ejecutar(operador, solicitud({ codigo: 'ART-0002', nombre: 'Otro' }));

    expect(await casos.proponerCodigo.ejecutar(operador)).toEqual({ codigo: 'ART-0003' });
  });
});

describe('conversiones de un artículo', () => {
  const conversion = (unidadId: string, factor = '24', paraCompras = false) => ({ unidadId, factor, paraCompras });

  it('fija las conversiones y la lista reemplaza a la anterior, auditando lo que se quita', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud());
    await casos.reemplazarConversiones.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: { conversiones: [conversion(CAJA, '24', true), conversion(SACO, '50')] },
    });

    const quedan = await casos.reemplazarConversiones.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: { conversiones: [conversion(CAJA, '12', true)] },
    });

    expect(quedan.map((fila) => [fila.unidadId, fila.factor])).toEqual([[CAJA, '12']]);
    expect(auditoria.acciones()).toEqual(['inventarios.conversiones:quitar']);
    expect(await casos.listarConversiones.ejecutar(operador, articulo.id)).toEqual(quedan);
  });

  it.each([
    ['convertir la unidad base', [conversion(LIBRA)]],
    ['repetir una unidad', [conversion(CAJA), conversion(CAJA, '12')]],
    ['un factor en cero', [conversion(CAJA, '0')]],
    ['dos conversiones para compras', [conversion(CAJA, '24', true), conversion(SACO, '50', true)]],
  ])('rechaza %s', async (_caso, conversiones) => {
    const articulo = await casos.crear.ejecutar(operador, solicitud());

    const intento = casos.reemplazarConversiones.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: { conversiones },
    });

    await expect(intento).rejects.toThrow(ConversionInvalida);
  });

  it('no deja que la nueva unidad base sea una de sus conversiones', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud());
    await casos.reemplazarConversiones.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: { conversiones: [conversion(CAJA)] },
    });

    const intento = casos.actualizar.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: solicitud({ unidadBaseId: CAJA }),
    });

    await expect(intento).rejects.toThrow(ConversionInvalida);
  });
});

describe('lotes de un artículo', () => {
  const lote = (cambios = {}) => ({
    codigo: 'L-2026-01',
    fechaDeVencimiento: '2027-01-31',
    fechaDeFabricacion: null,
    observaciones: null,
    ...cambios,
  });

  it('registra lotes de un artículo que los maneja y los lista', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud({ manejaLotes: true, manejaVencimiento: true }));

    const nuevo = await casos.crearLote.ejecutar(operador, { articuloId: articulo.id, solicitud: lote() });

    expect(await casos.listarLotes.ejecutar(operador, articulo.id)).toEqual([nuevo]);
  });

  it('un artículo que no maneja lotes no los recibe', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud());

    const intento = casos.crearLote.ejecutar(operador, { articuloId: articulo.id, solicitud: lote() });

    await expect(intento).rejects.toThrow(LoteInvalido);
  });

  it('el vencimiento es obligatorio si el artículo lo maneja', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud({ manejaLotes: true, manejaVencimiento: true }));

    const intento = casos.crearLote.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: lote({ fechaDeVencimiento: null }),
    });

    await expect(intento).rejects.toThrow(LoteInvalido);
  });

  it('la fabricación no es posterior al vencimiento', async () => {
    const articulo = await casos.crear.ejecutar(operador, solicitud({ manejaLotes: true }));

    const intento = casos.crearLote.ejecutar(operador, {
      articuloId: articulo.id,
      solicitud: lote({ fechaDeFabricacion: '2027-02-01' }),
    });

    await expect(intento).rejects.toThrow(LoteInvalido);
  });
});
