import type { DependenciasCompartidas } from '../core/compartido/aplicacion/dependencias-compartidas.js';
import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { AlcanceDelOperador } from './aplicacion/alcance-del-operador.js';
import { ActualizarEmpresa } from './aplicacion/casos-uso/actualizar-empresa.js';
import { ListarEmpresas } from './aplicacion/casos-uso/listar-empresas.js';
import { ObtenerEmpresa } from './aplicacion/casos-uso/obtener-empresa.js';
import { RegistrarEmpresa } from './aplicacion/casos-uso/registrar-empresa.js';
import { rutasDeDatosDeEmpresaComponidas } from './composicion/datos-de-empresa.js';
import { EmpresasControlador } from './http/empresas.controlador.js';
import { rutasEmpresas } from './http/empresas.rutas.js';
import './infraestructura/catalogo-eventos.js';
import { AccesosAEmpresasDrizzle } from './infraestructura/persistencia/accesos-a-empresas.drizzle.js';
import { ConsultasEmpresasDrizzle } from './infraestructura/persistencia/consultas-empresas.drizzle.js';
import { RepositorioEmpresasDrizzle } from './infraestructura/persistencia/repositorio-empresas.drizzle.js';
import { rutasDeTiposDeLocalidad } from './composicion/tipos-de-localidad.js';
import { SembrarTiposDeLocalidad } from './aplicacion/casos-uso/tipos-de-localidad/sembrar-tipos-de-localidad.js';
import { RepositorioTiposDeLocalidadDrizzle } from './infraestructura/persistencia/repositorio-tipos-de-localidad.drizzle.js';
import { rutasDeLocalidades } from './composicion/localidades.js';
import { ALCANCE_DE_LOCALIDADES } from './infraestructura/persistencia/accesos-a-localidades.tablas.js';
// generador: importaciones

/** El controlador de empresas con sus casos de uso, y lo que comparten las demás rutas del módulo. */
function componerEmpresas(compartidas: DependenciasCompartidas) {
  const { unidadDeTrabajo, publicadorEventos, auditoria } = compartidas;
  const repositorio = new RepositorioEmpresasDrizzle();
  const consultas = new ConsultasEmpresasDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const alcance = new AlcanceDelOperador(accesos);

  const controlador = new EmpresasControlador({
    listar: new ListarEmpresas({ unidadDeTrabajo, consultas, alcance }),
    obtener: new ObtenerEmpresa({ unidadDeTrabajo, consultas, alcance }),
    registrar: new RegistrarEmpresa({
      unidadDeTrabajo,
      repositorio,
      consultas,
      accesos,
      publicadorEventos,
      tiposDeLocalidad: new SembrarTiposDeLocalidad(new RepositorioTiposDeLocalidadDrizzle()),
    }),
    actualizar: new ActualizarEmpresa({ unidadDeTrabajo, repositorio, consultas, alcance, auditoria }),
  });
  return { controlador, consultas, alcance };
}

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerRutas(compartidas: DependenciasCompartidas) {
  const { controlador, consultas, alcance } = componerEmpresas(compartidas);
  return rutasDelModulo([
    rutasEmpresas(controlador),
    rutasDeDatosDeEmpresaComponidas(compartidas, { consultas, alcance }),
    rutasDeTiposDeLocalidad(),
    rutasDeLocalidades(),
    // generador: rutas
  ]);
}

export const moduloEmpresas: DefinicionModulo = {
  clave: 'empresas',
  nombre: 'Empresas',
  descripcion: 'Ranchos y parcelas de la cuenta y sus datos generales.',
  esencial: true,
  permisos: [
    { clave: 'empresas.ver', descripcion: 'Ver las empresas de la cuenta' },
    { clave: 'empresas.crear', descripcion: 'Crear empresas' },
    { clave: 'empresas.editar', descripcion: 'Editar empresas, sus datos fiscales y su fecha de inicio' },
    {
      clave: 'empresas.carga-inicial.cerrar',
      descripcion: 'Cerrar la carga inicial de una empresa (deja fija su fecha de inicio)',
    },
    {
      clave: 'empresas.carga-inicial.reabrir',
      descripcion: 'Reabrir la carga inicial cerrada de una empresa, con su motivo',
    },
    { clave: 'empresas.tipos-de-localidad.ver', descripcion: 'Ver tipos de localidad' },
    { clave: 'empresas.tipos-de-localidad.crear', descripcion: 'Registrar tipos de localidad' },
    { clave: 'empresas.tipos-de-localidad.editar', descripcion: 'Editar, inactivar y reactivar tipos de localidad' },
    { clave: 'empresas.tipos-de-localidad.eliminar', descripcion: 'Eliminar tipos de localidad' },
    { clave: 'empresas.tipos-de-localidad.importar', descripcion: 'Importar tipos de localidad desde Excel' },
    { clave: 'empresas.tipos-de-localidad.exportar', descripcion: 'Exportar tipos de localidad a Excel' },
    { clave: 'empresas.localidades.ver', descripcion: 'Ver las localidades que se le asignaron' },
    { clave: 'empresas.localidades.ver-todas', descripcion: 'Ver y usar todas las localidades de la empresa' },
    { clave: 'empresas.localidades.crear', descripcion: 'Registrar localidades' },
    { clave: 'empresas.localidades.editar', descripcion: 'Editar, inactivar y reactivar localidades' },
    { clave: 'empresas.localidades.eliminar', descripcion: 'Eliminar localidades' },
    {
      clave: 'empresas.localidades.asignar',
      descripcion: 'Dar y quitar a los usuarios el acceso a las localidades (ve todas en esa ventana)',
    },
    { clave: 'empresas.localidades.importar', descripcion: 'Importar localidades desde Excel' },
    { clave: 'empresas.localidades.exportar', descripcion: 'Exportar localidades a Excel' },
    // generador: permisos
  ],
  recursosConAlcance: [
    {
      clave: 'empresas.localidades',
      descripcion: 'Localidades',
      permisoVerTodos: 'empresas.localidades.ver-todas',
      permisoAsignar: 'empresas.localidades.asignar',
      alcance: ALCANCE_DE_LOCALIDADES,
    },
  ],
  rutas: componerRutas(dependenciasCompartidas()),
};
