import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { DteRecibido, type DatosDelDte } from '../../../dominio/dte-recibido.js';
import { ProveedorNuevoSinConfirmar } from '../../../dominio/errores-de-bandeja.js';
import { RepositorioDeDteRecibidosEnMemoria } from '../../../pruebas/dobles-de-la-bandeja.js';
import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import { ProveedorNuevoSinPermiso } from '../../errores.js';
import type { CreadorDeProveedores, PedidoDeProveedorNuevo } from '../../puertos/puertos-de-la-bandeja.js';
import type { ProveedorNuevoPedido } from './decisiones-del-dte.js';
import { ProveedorDeLaFila, type OpcionesDelProveedorDeLaFila } from './proveedor-de-la-fila.js';

const NIT = '1234567';
const operador = operadorDePrueba();

/** Terceros de mentira: un tercero por NIT; `existentes` son los que ya están (por ejemplo, un cliente). */
class CreadorFalso implements CreadorDeProveedores {
  readonly pedidos: PedidoDeProveedorNuevo[] = [];
  private readonly porNit = new Map<string, string>();

  constructor(private readonly existentes: ReadonlyMap<string, string> = new Map()) {}

  async crear(_operador: unknown, pedido: PedidoDeProveedorNuevo) {
    this.pedidos.push(pedido);
    const nombreExistente = this.existentes.get(pedido.nit);
    if (!pedido.puedeCrearProveedores) {
      throw new AccesoDenegado('Sin permiso', { accion: nombreExistente ? 'agregar_papel' : 'crear' });
    }
    const proveedorId = this.porNit.get(pedido.nit) ?? crypto.randomUUID();
    const creado = !nombreExistente && !this.porNit.has(pedido.nit);
    this.porNit.set(pedido.nit, proveedorId);
    const propio = pedido.razonSocial ?? [pedido.nombres, pedido.apellidos].filter(Boolean).join(' ');
    return { proveedorId, terceroId: proveedorId, creado, nombre: nombreExistente ?? propio };
  }
}

let filas: RepositorioDeDteRecibidosEnMemoria;
const agregar = async (cambios: Partial<DatosDelDte> = {}) => {
  const fila = DteRecibido.crear({
    empresaId: Identificador.nuevo<'Empresa'>(),
    loteId: crypto.randomUUID(),
    datos: {
      autorizacionFel: crypto.randomUUID(),
      tipoDte: 'FACT',
      serie: 'A',
      numero: '1',
      fechaEmision: '2026-03-10',
      nitEmisor: NIT,
      nombreEmisor: 'RONALD ABEL , PENSAMIENTO MONTES',
      nitReceptor: '7654321',
      total: '112.00',
      iva: '12.00',
      idp: '0',
      otrosImpuestos: '0',
      otrosImpuestosDetalle: {},
      filaOriginal: {},
      estadoSat: 'vigente',
      anuladoEnLaSatEl: null,
      ...cambios,
    },
  });
  await filas.agregar(fila);
  return fila;
};

const individual: ProveedorNuevoPedido = { tipoDePersona: 'individual', nombres: 'RONALD', apellidos: 'MONTES' };
const opciones = (cambios: Partial<OpcionesDelProveedorDeLaFila> = {}): OpcionesDelProveedorDeLaFila => ({
  decisiones: { proveedorId: null },
  proveedoresNuevos: { [NIT]: individual },
  puedeCrearProveedores: true,
  exigirConfirmado: true,
  ...cambios,
});

function resolver(creador: CreadorFalso, fila: DteRecibido, cambios: Partial<OpcionesDelProveedorDeLaFila> = {}) {
  return new ProveedorDeLaFila({ creadorDeProveedores: creador, filas }).resolver(operador, fila, opciones(cambios));
}

beforeEach(() => {
  filas = new RepositorioDeDteRecibidosEnMemoria();
});

describe('proveedor de la fila', () => {
  it('con proveedor ya decidido lo devuelve sin llamar a Terceros', async () => {
    const creador = new CreadorFalso();

    const resuelto = await resolver(creador, await agregar(), { decisiones: { proveedorId: 'p-1' } });

    expect(resuelto).toEqual({ proveedorId: 'p-1', nuevo: null });
    expect(creador.pedidos).toHaveLength(0);
  });

  it('crea el individual con lo confirmado y se lo pone a las filas pendientes del NIT', async () => {
    const creador = new CreadorFalso();
    const [primera, otra] = [await agregar(), await agregar()];

    const resuelto = await resolver(creador, primera);

    expect(creador.pedidos[0]).toEqual({
      nit: NIT,
      tipoDePersona: 'individual',
      nombres: 'RONALD',
      apellidos: 'MONTES',
      razonSocial: null,
      puedeCrearProveedores: true,
    });
    expect(resuelto.nuevo).toMatchObject({ accion: 'crear', nombreExistente: null, usado: individual });
    expect(otra.instantanea().proveedorId).toBe(resuelto.proveedorId);
  });

  it('crea la jurídica con su razón social', async () => {
    const creador = new CreadorFalso();
    const pedido: ProveedorNuevoPedido = { tipoDePersona: 'juridica', razonSocial: 'Agro, S.A.' };

    await resolver(creador, await agregar(), { proveedoresNuevos: { [NIT]: pedido } });

    expect(creador.pedidos[0]).toMatchObject({ tipoDePersona: 'juridica', nombres: null, razonSocial: 'Agro, S.A.' });
  });

  it('dos filas del mismo NIT crean un solo proveedor', async () => {
    const creador = new CreadorFalso();
    const [a, b] = [await agregar(), await agregar()];

    const primero = await resolver(creador, a);
    const segundo = await resolver(creador, b);

    expect(segundo.proveedorId).toBe(primero.proveedorId);
    expect(segundo.nuevo?.accion).toBe('agregar_papel');
  });

  it('un tercero que ya es cliente solo recibe el papel y se informa su nombre', async () => {
    const creador = new CreadorFalso(new Map([[NIT, 'Cliente Existente']]));

    const resuelto = await resolver(creador, await agregar());

    expect(resuelto.nuevo).toMatchObject({ accion: 'agregar_papel', nombreExistente: 'Cliente Existente' });
  });

  it('al confirmar, sin lo confirmado para el NIT no crea nada', async () => {
    const creador = new CreadorFalso();

    const intento = resolver(creador, await agregar(), { proveedoresNuevos: {} });

    await expect(intento).rejects.toThrow(ProveedorNuevoSinConfirmar);
    expect(creador.pedidos).toHaveLength(0);
  });

  it('sin el permiso de crear proveedores no llama a Terceros', async () => {
    const creador = new CreadorFalso();

    const intento = resolver(creador, await agregar(), { puedeCrearProveedores: false });

    await expect(intento).rejects.toThrow(ProveedorNuevoSinPermiso);
    await expect(intento).rejects.toMatchObject({ detalles: { nit: NIT, accion: 'crear' } });
  });

  it('sin el permiso y con el NIT ya en Terceros, el mensaje pide el papel de proveedor', async () => {
    const creador = new CreadorFalso(new Map([[NIT, 'Cliente Existente']]));

    const intento = resolver(creador, await agregar(), { puedeCrearProveedores: false });

    await expect(intento).rejects.toMatchObject({
      codigo: 'proveedor_nuevo_sin_permiso',
      detalles: { nit: NIT, accion: 'agregar_papel' },
      message: expect.stringContaining('ya está en Terceros'),
    });
  });

  it('en la vista previa, sin lo confirmado usa la propuesta en su tipo y la informa', async () => {
    const creador = new CreadorFalso();

    const resuelto = await resolver(creador, await agregar(), { proveedoresNuevos: {}, exigirConfirmado: false });

    expect(resuelto.nuevo?.usado).toEqual({
      tipoDePersona: 'individual',
      nombres: 'RONALD ABEL',
      apellidos: 'PENSAMIENTO MONTES',
    });
    expect(resuelto.nuevo?.propuesta.juridica.razonSocial).toBe('RONALD ABEL , PENSAMIENTO MONTES');
  });
});
