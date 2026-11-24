import type { DependenciasCompartidas } from '../core/compartido/aplicacion/dependencias-compartidas.js';
import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { AlcanceDelOperador } from './aplicacion/alcance-del-operador.js';
import { ActualizarEmpresa } from './aplicacion/casos-uso/actualizar-empresa.js';
import { ListarEmpresas } from './aplicacion/casos-uso/listar-empresas.js';
import { ObtenerEmpresa } from './aplicacion/casos-uso/obtener-empresa.js';
import { RegistrarEmpresa } from './aplicacion/casos-uso/registrar-empresa.js';
import { rutasDelBalanceDeAperturaComponidas } from './composicion/balance-de-apertura.js';
import { rutasDeCierresDeCargaComponidas } from './composicion/cierres-de-carga.js';
import { rutasDeDatosDeEmpresaComponidas } from './composicion/datos-de-empresa.js';
import { EmpresasControlador } from './http/empresas.controlador.js';
import { rutasEmpresas } from './http/empresas.rutas.js';
import { AvisosDeEmpresaEnMediador } from './infraestructura/avisos-de-empresa-en-mediador.js';
import './infraestructura/catalogo-eventos.js';
import { AccesosAEmpresasDrizzle } from './infraestructura/persistencia/accesos-a-empresas.drizzle.js';
import { ConsultasEmpresasDrizzle } from './infraestructura/persistencia/consultas-empresas.drizzle.js';
import { RepositorioEmpresasDrizzle } from './infraestructura/persistencia/repositorio-empresas.drizzle.js';
import { rutasDeTiposDeLocalidad } from './composicion/tipos-de-localidad.js';
import { SembrarTiposDeLocalidad } from './aplicacion/casos-uso/tipos-de-localidad/sembrar-tipos-de-localidad.js';
import { RepositorioTiposDeLocalidadDrizzle } from './infraestructura/persistencia/repositorio-tipos-de-localidad.drizzle.js';
import { rutasDeLocalidades } from './composicion/localidades.js';
import { rutasDeAccesosALocalidades } from './composicion/accesos-a-localidades.js';
import { ALCANCE_DE_LOCALIDADES } from './infraestructura/persistencia/accesos-a-localidades.tablas.js';
import { intercambioDeEmpresas } from './composicion/intercambio-de-empresas.js';
import { rutasDeDepartamentos } from './composicion/departamentos.js';
import { rutasDeInmuebles } from './composicion/inmuebles.js';
// generador: importaciones

/** El controlador de empresas con sus casos de uso, y lo que comparten las demás rutas del módulo. */
function componerEmpresas(compartidas: DependenciasCompartidas) {
  const { unidadDeTrabajo, publicadorEventos, auditoria } = compartidas;
  const repositorio = new RepositorioEmpresasDrizzle();
  const consultas = new ConsultasEmpresasDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const alcance = new AlcanceDelOperador(accesos);
  const avisos = new AvisosDeEmpresaEnMediador();

  const listar = new ListarEmpresas({ unidadDeTrabajo, consultas, alcance });
  const registrar = new RegistrarEmpresa({
    unidadDeTrabajo,
    repositorio,
    consultas,
    accesos,
    publicadorEventos,
    tiposDeLocalidad: new SembrarTiposDeLocalidad(new RepositorioTiposDeLocalidadDrizzle()),
    avisos,
  });
  const controlador = new EmpresasControlador({
    listar,
    obtener: new ObtenerEmpresa({ unidadDeTrabajo, consultas, alcance }),
    registrar,
    actualizar: new ActualizarEmpresa({ unidadDeTrabajo, repositorio, consultas, alcance, auditoria, avisos }),
  });
  return { controlador, consultas, alcance, intercambio: intercambioDeEmpresas({ listar, registrar }) };
}

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerRutas(compartidas: DependenciasCompartidas) {
  const { controlador, consultas, alcance, intercambio } = componerEmpresas(compartidas);
  return rutasDelModulo([
    rutasEmpresas(controlador, intercambio),
    rutasDeDatosDeEmpresaComponidas(compartidas, { consultas, alcance }),
    rutasDeCierresDeCargaComponidas(compartidas, { consultas, alcance }),
    rutasDelBalanceDeAperturaComponidas(compartidas, { consultas, alcance }),
    rutasDeTiposDeLocalidad(),
    rutasDeLocalidades(),
    rutasDeAccesosALocalidades(),
    rutasDeDepartamentos(),
    rutasDeInmuebles(),
    // generador: rutas
  ]);
}

export const moduloEmpresas: DefinicionModulo = {
  clave: 'empresas',
  nombre: 'Empresas',
  descripcion: 'Empresas de la cuenta y sus datos generales.',
  esencial: true,
  permisos: [
    { clave: 'empresas.ver', descripcion: 'Ver las empresas de la cuenta' },
    { clave: 'empresas.crear', descripcion: 'Crear empresas' },
    { clave: 'empresas.editar', descripcion: 'Editar empresas, sus datos fiscales y su fecha de inicio' },
    {
      clave: 'empresas.nit.corregir',
      descripcion: 'Quitar o reemplazar el NIT de una empresa, con su motivo (queda en la auditoría)',
    },
    { clave: 'empresas.importar', descripcion: 'Importar empresas desde Excel (crea una empresa por fila)' },
    { clave: 'empresas.exportar', descripcion: 'Exportar las empresas a Excel' },
    {
      clave: 'empresas.carga-inicial.cerrar',
      descripcion: 'Cerrar la carga inicial de una empresa (deja fija su fecha de inicio)',
    },
    {
      clave: 'empresas.carga-inicial.reabrir',
      descripcion: 'Reabrir la carga inicial cerrada de una empresa, con su motivo',
    },
    {
      clave: 'empresas.carga-inicial.ver-cierres',
      descripcion:
        'Ver el historial de cierres y reaperturas de la carga inicial y la revisión guardada de cada cierre',
    },
    {
      clave: 'empresas.carga-inicial.exportar',
      descripcion: 'Exportar a Excel la revisión guardada de un cierre de la carga inicial',
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
    {
      clave: 'empresas.departamentos.ver',
      descripcion: 'Ver los departamentos de toda la empresa y los de las localidades que ve',
    },
    { clave: 'empresas.departamentos.crear', descripcion: 'Registrar departamentos' },
    { clave: 'empresas.departamentos.editar', descripcion: 'Editar, inactivar y reactivar departamentos' },
    { clave: 'empresas.departamentos.eliminar', descripcion: 'Eliminar departamentos' },
    { clave: 'empresas.departamentos.importar', descripcion: 'Importar departamentos desde Excel' },
    { clave: 'empresas.departamentos.exportar', descripcion: 'Exportar departamentos a Excel' },
    { clave: 'empresas.inmuebles.ver', descripcion: 'Ver los inmuebles registrales (fincas, folios, matrículas)' },
    { clave: 'empresas.inmuebles.crear', descripcion: 'Registrar inmuebles' },
    { clave: 'empresas.inmuebles.editar', descripcion: 'Editar, inactivar y reactivar inmuebles' },
    { clave: 'empresas.inmuebles.eliminar', descripcion: 'Eliminar inmuebles que nadie usa' },
    { clave: 'empresas.inmuebles.importar', descripcion: 'Importar inmuebles desde Excel' },
    { clave: 'empresas.inmuebles.exportar', descripcion: 'Exportar inmuebles a Excel' },
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
