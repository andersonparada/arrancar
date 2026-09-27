import type { DependenciasCompartidas } from '../core/compartido/aplicacion/dependencias-compartidas.js';
import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { AlcanceDelOperador } from './aplicacion/alcance-del-operador.js';
import { ActualizarEmpresa } from './aplicacion/casos-uso/actualizar-empresa.js';
import { ListarEmpresas } from './aplicacion/casos-uso/listar-empresas.js';
import { ObtenerEmpresa } from './aplicacion/casos-uso/obtener-empresa.js';
import { RegistrarEmpresa } from './aplicacion/casos-uso/registrar-empresa.js';
import { EmpresasControlador } from './http/empresas.controlador.js';
import { rutasEmpresas } from './http/empresas.rutas.js';
import './infraestructura/catalogo-eventos.js';
import { AccesosAEmpresasDrizzle } from './infraestructura/persistencia/accesos-a-empresas.drizzle.js';
import { ConsultasEmpresasDrizzle } from './infraestructura/persistencia/consultas-empresas.drizzle.js';
import { RepositorioEmpresasDrizzle } from './infraestructura/persistencia/repositorio-empresas.drizzle.js';

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerControlador({ unidadDeTrabajo, publicadorEventos }: DependenciasCompartidas): EmpresasControlador {
  const repositorio = new RepositorioEmpresasDrizzle();
  const consultas = new ConsultasEmpresasDrizzle();
  const accesos = new AccesosAEmpresasDrizzle();
  const alcance = new AlcanceDelOperador(accesos);

  return new EmpresasControlador({
    listar: new ListarEmpresas({ unidadDeTrabajo, consultas, alcance }),
    obtener: new ObtenerEmpresa({ unidadDeTrabajo, consultas, alcance }),
    registrar: new RegistrarEmpresa({ unidadDeTrabajo, repositorio, consultas, accesos, publicadorEventos }),
    actualizar: new ActualizarEmpresa({ unidadDeTrabajo, repositorio, consultas, alcance }),
  });
}

export const moduloEmpresas: DefinicionModulo = {
  clave: 'empresas',
  nombre: 'Empresas',
  descripcion: 'Ranchos y parcelas de la cuenta y sus datos generales.',
  esencial: true,
  permisos: [
    { clave: 'empresas.ver', descripcion: 'Ver las empresas de la cuenta' },
    { clave: 'empresas.gestionar', descripcion: 'Crear y editar empresas' },
  ],
  rutas: rutasEmpresas(componerControlador(dependenciasCompartidas())),
};
