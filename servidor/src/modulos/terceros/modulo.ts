import { z } from 'zod';
import type { DependenciasCompartidas } from '../core/compartido/aplicacion/dependencias-compartidas.js';
import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { AvisoDeParecidos } from './aplicacion/aviso-de-parecidos.js';
import { CambiarCategoria } from './aplicacion/casos-uso/categorias/cambiar-categoria.js';
import { CrearCategoria } from './aplicacion/casos-uso/categorias/crear-categoria.js';
import { ListarCategorias } from './aplicacion/casos-uso/categorias/listar-categorias.js';
import { AgregarContacto } from './aplicacion/casos-uso/contactos/agregar-contacto.js';
import { BuscarContactos } from './aplicacion/casos-uso/contactos/buscar-contactos.js';
import { CambiarContacto } from './aplicacion/casos-uso/contactos/cambiar-contacto.js';
import { EliminarContacto } from './aplicacion/casos-uso/contactos/eliminar-contacto.js';
import { ListarContactos } from './aplicacion/casos-uso/contactos/listar-contactos.js';
import { AsignarPapel } from './aplicacion/casos-uso/papeles/asignar-papel.js';
import { QuitarPapel } from './aplicacion/casos-uso/papeles/quitar-papel.js';
import { ActualizarTercero } from './aplicacion/casos-uso/terceros/actualizar-tercero.js';
import { ListarTerceros } from './aplicacion/casos-uso/terceros/listar-terceros.js';
import { ObtenerFichaDeTercero } from './aplicacion/casos-uso/terceros/obtener-ficha-de-tercero.js';
import { RegistrarTercero } from './aplicacion/casos-uso/terceros/registrar-tercero.js';
import { CategoriasControlador, ContactosControlador } from './http/contactos-y-categorias.controlador.js';
import { TercerosControlador } from './http/terceros.controlador.js';
import { rutasTerceros, type ControladoresDeTerceros } from './http/terceros.rutas.js';
import './infraestructura/catalogo-eventos.js';
import { BusquedaDeContactosDrizzle } from './infraestructura/persistencia/busqueda-de-contactos.drizzle.js';
import {
  ConsultasCategoriasDrizzle,
  ConsultasContactosDrizzle,
} from './infraestructura/persistencia/consultas-contactos-y-categorias.drizzle.js';
import { ConsultasTercerosDrizzle } from './infraestructura/persistencia/consultas-terceros.drizzle.js';
import {
  RepositorioCategoriasDrizzle,
  RepositorioContactosDrizzle,
  RepositorioTercerosDrizzle,
} from './infraestructura/persistencia/repositorios.drizzle.js';

/** Las implementaciones concretas de los puertos del módulo. */
function crearPiezas() {
  const consultasContactos = new ConsultasContactosDrizzle();
  const consultas = new ConsultasTercerosDrizzle(consultasContactos);
  return {
    repositorio: new RepositorioTercerosDrizzle(),
    contactos: new RepositorioContactosDrizzle(),
    categorias: new RepositorioCategoriasDrizzle(),
    consultas,
    consultasContactos,
    consultasCategorias: new ConsultasCategoriasDrizzle(),
    avisoDeParecidos: new AvisoDeParecidos(consultas),
  };
}

type Piezas = ReturnType<typeof crearPiezas> & DependenciasCompartidas;

function controladorDeTerceros(piezas: Piezas): TercerosControlador {
  const {
    unidadDeTrabajo,
    publicadorEventos,
    auditoria,
    repositorio,
    categorias,
    contactos,
    consultas,
    avisoDeParecidos,
  } = piezas;
  const paraGuardar = { unidadDeTrabajo, repositorio, consultas, avisoDeParecidos, publicadorEventos, auditoria };
  return new TercerosControlador({
    listar: new ListarTerceros({ unidadDeTrabajo, consultas }),
    obtenerFicha: new ObtenerFichaDeTercero({ unidadDeTrabajo, consultas }),
    registrar: new RegistrarTercero({ ...paraGuardar, categorias, contactos }),
    actualizar: new ActualizarTercero(paraGuardar),
    asignarPapel: new AsignarPapel({ ...paraGuardar, categorias }),
    quitarPapel: new QuitarPapel(paraGuardar),
  });
}

function controladorDeContactos(piezas: Piezas) {
  const { unidadDeTrabajo, auditoria, repositorio, contactos, consultas, consultasContactos } = piezas;
  return new ContactosControlador({
    listar: new ListarContactos({ unidadDeTrabajo, terceros: consultas, contactos: consultasContactos }),
    agregar: new AgregarContacto({ unidadDeTrabajo, terceros: repositorio, contactos, consultas: consultasContactos }),
    cambiar: new CambiarContacto({ unidadDeTrabajo, contactos, consultas: consultasContactos }),
    eliminar: new EliminarContacto({ unidadDeTrabajo, contactos, consultas: consultasContactos, auditoria }),
    buscar: new BuscarContactos({ unidadDeTrabajo, busqueda: new BusquedaDeContactosDrizzle() }),
  });
}

function controladorDeCategorias({ unidadDeTrabajo, auditoria, categorias, consultasCategorias }: Piezas) {
  const dependencias = { unidadDeTrabajo, auditoria, repositorio: categorias, consultas: consultasCategorias };
  return new CategoriasControlador({
    listar: new ListarCategorias(dependencias),
    crear: new CrearCategoria(dependencias),
    cambiar: new CambiarCategoria(dependencias),
  });
}

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerControladores(compartidas: DependenciasCompartidas): ControladoresDeTerceros {
  const piezas = { ...compartidas, ...crearPiezas() };
  return {
    terceros: controladorDeTerceros(piezas),
    contactos: controladorDeContactos(piezas),
    categorias: controladorDeCategorias(piezas),
  };
}

/**
 * Clientes y proveedores. La clave técnica sigue siendo `terceros` (esquema,
 * permisos y rutas); el usuario lo ve como "Clientes".
 */
export const moduloTerceros: DefinicionModulo = {
  clave: 'terceros',
  nombre: 'Clientes',
  descripcion: 'Clientes y proveedores de la cuenta: sus datos, contactos y papeles.',
  dependeDe: [],
  permisos: [
    { clave: 'terceros.ver', descripcion: 'Ver clientes y proveedores' },
    { clave: 'terceros.crear', descripcion: 'Registrar clientes y proveedores, y agregar sus contactos' },
    {
      clave: 'terceros.editar',
      descripcion: 'Editar, inactivar y reactivar clientes y proveedores, y editar sus contactos',
    },
    { clave: 'terceros.eliminar', descripcion: 'Eliminar contactos de clientes y proveedores' },
    { clave: 'clientes.crear', descripcion: 'Registrar a alguien ya como cliente' },
    { clave: 'clientes.editar', descripcion: 'Asignar o cambiar el papel de cliente' },
    { clave: 'clientes.eliminar', descripcion: 'Quitar el papel de cliente' },
    {
      clave: 'proveedores.crear',
      descripcion: 'Registrar a alguien ya como proveedor y crear categorías de proveedores',
    },
    { clave: 'proveedores.editar', descripcion: 'Asignar o cambiar el papel de proveedor y editar sus categorías' },
    { clave: 'proveedores.eliminar', descripcion: 'Quitar el papel de proveedor' },
  ],
  configuracion: [
    definirConfiguracion({
      clave: 'terceros.papeles.habilitados',
      descripcion: 'Papeles disponibles (cliente, proveedor) en esta instalación, cuenta o empresa.',
      esquema: z.array(z.enum(['cliente', 'proveedor'])),
      predeterminado: ['cliente', 'proveedor'],
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'terceros.clientes.permitir_consumidor_final',
      descripcion: 'Permite registrar clientes como consumidor final (NIT "CF").',
      esquema: z.boolean(),
      predeterminado: true,
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
  ],
  rutas: rutasTerceros(componerControladores(dependenciasCompartidas())),
};
