import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { ConsultasLocalidadesDrizzle } from '../infraestructura/persistencia/consultas-localidades.drizzle.js';
import type { DepartamentoDto, SolicitudDeDepartamento } from '../aplicacion/dto/departamento.dto.js';
import { columnasDeDepartamentos } from '../http/departamentos.columnas.js';
import { esquemaDepartamento } from '../http/departamentos.esquemas-http.js';
import { ActualizarDepartamento } from '../aplicacion/casos-uso/departamentos/actualizar-departamento.js';
import { EliminarDepartamento } from '../aplicacion/casos-uso/departamentos/eliminar-departamento.js';
import { CrearDepartamento } from '../aplicacion/casos-uso/departamentos/crear-departamento.js';
import { ListarDepartamentos } from '../aplicacion/casos-uso/departamentos/listar-departamentos.js';
import { ObtenerDepartamento } from '../aplicacion/casos-uso/departamentos/obtener-departamento.js';
import { DepartamentosControlador } from '../http/departamentos.controlador.js';
import { rutasDepartamentos } from '../http/departamentos.rutas.js';
import { ConsultasDepartamentosDrizzle } from '../infraestructura/persistencia/consultas-departamentos.drizzle.js';
import { RepositorioDepartamentosDrizzle } from '../infraestructura/persistencia/repositorio-departamentos.drizzle.js';

const dependenciasDeDepartamentos = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioDepartamentosDrizzle(),
  consultas: new ConsultasDepartamentosDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeDepartamentos>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarDepartamentos(dependencias),
  obtener: new ObtenerDepartamento(dependencias),
  crear: new CrearDepartamento(dependencias),
  actualizar: new ActualizarDepartamento(dependencias),
  eliminar: new EliminarDepartamento(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeDepartamentos(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<DepartamentoDto, SolicitudDeDepartamento>({
    nombre: 'Departamentos',
    columnas: columnasDeDepartamentos({
      localidadId: opcionesDe(new ConsultasLocalidadesDrizzle(), 'nombre', 'codigo'),
    }),
    validar: validadorDeZod(esquemaDepartamento),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los departamentos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeDepartamentos() {
  const dependencias = dependenciasDeDepartamentos();
  const casos = casosDeUso(dependencias);
  return rutasDepartamentos(new DepartamentosControlador(casos), intercambioDeDepartamentos(casos, dependencias));
}
