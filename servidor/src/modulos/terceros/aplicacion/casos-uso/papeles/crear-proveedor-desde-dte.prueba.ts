import { beforeEach, describe, expect, it } from 'vitest';
import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Nit, NitInvalido } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FaltaElNombre, NitDeProveedorSinNumero, ProveedorInactivo } from '../../../dominio/errores.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import { Tercero } from '../../../dominio/tercero.js';
import { TercerosEnMemoria } from '../../../pruebas/dobles-de-terceros.js';
import { CrearProveedorDesdeDte, type PedidoDeProveedorDesdeDte } from './crear-proveedor-desde-dte.js';

const NIT = '576937K';

let terceros: TercerosEnMemoria;
let caso: CrearProveedorDesdeDte;

async function registrarConNit(cambios: { proveedor?: 'activo' | 'inactivo' } = {}): Promise<Tercero> {
  const identidad = IdentidadDeTercero.crear('juridica', {
    nombres: null,
    apellidos: null,
    razonSocial: 'Agro, S.A.',
    nombreComercial: null,
  });
  const tercero = Tercero.registrar(Identificador.desde(crypto.randomUUID()), {
    identidad,
    nit: Nit.crear(NIT),
    dpi: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    ubicacion: { departamentoCodigo: null, municipioCodigo: null, direccion: null },
    fotoArchivoId: null,
    notas: null,
    activo: true,
  });
  if (cambios.proveedor) {
    const activo = cambios.proveedor === 'activo';
    tercero.asignarPapel({ tipo: 'proveedor', categoriaId: null, activo, notas: null });
  }
  await terceros.agregar(tercero);
  return tercero;
}

function crear(cambios: Partial<PedidoDeProveedorDesdeDte> = {}) {
  return caso.ejecutar(operadorDePrueba(), {
    nit: NIT,
    nombre: 'Agro, S.A.',
    tipoDePersona: 'juridica',
    puedeCrearProveedores: true,
    ...cambios,
  });
}

beforeEach(() => {
  terceros = new TercerosEnMemoria();
  caso = new CrearProveedorDesdeDte({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: terceros,
    consultas: terceros,
  });
});

describe('crear el proveedor de un DTE recibido', () => {
  it('crea el tercero jurídico con razón social, NIT normalizado y papel de proveedor activo', async () => {
    const respuesta = await crear({ nit: ' 576937-k ' });

    expect(respuesta.creado).toBe(true);
    const tercero = (await terceros.buscarPorNit(NIT))!;
    expect(tercero.id.valor).toBe(respuesta.terceroId);
    expect(tercero.instantanea().identidad.nombres.razonSocial).toBe('Agro, S.A.');
    expect(tercero.papel('proveedor')?.activo).toBe(true);
  });

  it('una persona individual lleva el nombre en nombres', async () => {
    await crear({ tipoDePersona: 'individual', nombre: 'Juan Pérez' });

    const identidad = (await terceros.buscarPorNit(NIT))!.instantanea().identidad;
    expect(identidad.nombres.nombres).toBe('Juan Pérez');
  });

  it('no duplica por NIT: si ya es proveedor devuelve el mismo', async () => {
    const existente = await registrarConNit({ proveedor: 'activo' });

    const respuesta = await crear();

    expect(respuesta).toMatchObject({ terceroId: existente.id.valor, creado: false });
    expect(terceros.cantidad()).toBe(1);
  });

  it('a un tercero existente sin el papel se lo asigna', async () => {
    const existente = await registrarConNit();

    const respuesta = await crear();

    expect(respuesta).toMatchObject({ terceroId: existente.id.valor, creado: false });
    expect(existente.papel('proveedor')?.activo).toBe(true);
    expect(terceros.cantidad()).toBe(1);
  });

  it('un proveedor inactivo se rechaza: se reactiva en Proveedores', async () => {
    await registrarConNit({ proveedor: 'inactivo' });

    await expect(crear()).rejects.toThrow(ProveedorInactivo);
  });

  it('sin el permiso de crear proveedores no hace nada', async () => {
    await expect(crear({ puedeCrearProveedores: false })).rejects.toThrow(AccesoDenegado);
    expect(terceros.cantidad()).toBe(0);
  });

  it('rechaza NIT inválido, consumidor final y nombre vacío', async () => {
    await expect(crear({ nit: '5769370' })).rejects.toThrow(NitInvalido);
    await expect(crear({ nit: 'CF' })).rejects.toThrow(NitDeProveedorSinNumero);
    await expect(crear({ nombre: '  ' })).rejects.toThrow(FaltaElNombre);
    expect(terceros.cantidad()).toBe(0);
  });
});
