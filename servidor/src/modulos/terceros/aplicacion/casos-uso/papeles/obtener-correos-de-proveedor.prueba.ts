import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import { Tercero } from '../../../dominio/tercero.js';
import { TercerosEnMemoria } from '../../../pruebas/dobles-de-terceros.js';
import type { ContactoDto } from '../../dto/contacto.dto.js';
import { ObtenerCorreosDeProveedor } from './obtener-correos-de-proveedor.js';

let terceros: TercerosEnMemoria;
let contactos: ContactoDto[];
let caso: ObtenerCorreosDeProveedor;

async function registrarProveedor(): Promise<Tercero> {
  const identidad = IdentidadDeTercero.crear('juridica', {
    nombres: null,
    apellidos: null,
    razonSocial: 'Agroservicios La Peña',
    nombreComercial: null,
  });
  const tercero = Tercero.registrar(Identificador.desde(crypto.randomUUID()), {
    identidad,
    nit: null,
    dpi: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    ubicacion: { departamentoCodigo: null, municipioCodigo: null, direccion: null },
    fotoArchivoId: null,
    notas: null,
    activo: true,
  });
  tercero.asignarPapel({ tipo: 'proveedor', categoriaId: null, activo: true, notas: null });
  await terceros.agregar(tercero);
  return tercero;
}

const contacto = (cambios: Partial<ContactoDto>): ContactoDto => ({
  id: crypto.randomUUID(),
  nombre: 'Contacto',
  cargo: null,
  telefono: null,
  whatsapp: null,
  correo: null,
  notas: null,
  recibeAvisosDePago: false,
  ...cambios,
});

beforeEach(() => {
  terceros = new TercerosEnMemoria();
  contactos = [];
  caso = new ObtenerCorreosDeProveedor({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: terceros,
    consultas: terceros,
    contactos: { listarDeTercero: async () => contactos },
  });
});

describe('ObtenerCorreosDeProveedor', () => {
  it('devuelve el nombre del proveedor y los correos de sus contactos con su marca', async () => {
    const proveedor = await registrarProveedor();
    contactos = [
      contacto({ nombre: 'Ana', correo: 'ana@ejemplo.com', recibeAvisosDePago: true }),
      contacto({ nombre: 'Luis', correo: null }),
    ];

    const respuesta = await caso.ejecutar(operadorDePrueba(), proveedor.id.valor);

    expect(respuesta).toMatchObject({ terceroId: proveedor.id.valor, nombre: 'Agroservicios La Peña', correo: null });
    expect(
      respuesta.contactos.map(({ nombre, correo, recibeAvisosDePago }) => [nombre, correo, recibeAvisosDePago]),
    ).toEqual([
      ['Ana', 'ana@ejemplo.com', true],
      ['Luis', null, false],
    ]);
  });

  it('no devuelve de los contactos más que lo necesario para avisar', async () => {
    const proveedor = await registrarProveedor();
    contactos = [contacto({ telefono: '55551234', notas: 'privado', correo: 'a@b.com' })];

    const respuesta = await caso.ejecutar(operadorDePrueba(), proveedor.id.valor);

    expect(Object.keys(respuesta.contactos[0] ?? {}).sort()).toEqual(['correo', 'id', 'nombre', 'recibeAvisosDePago']);
  });

  it('un proveedor que no existe no se encuentra', async () => {
    await expect(caso.ejecutar(operadorDePrueba(), crypto.randomUUID())).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });
});
