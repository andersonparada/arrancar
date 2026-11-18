import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ListarEmpresas } from '../aplicacion/casos-uso/listar-empresas.js';
import type { RegistrarEmpresa } from '../aplicacion/casos-uso/registrar-empresa.js';
import type { EmpresaDto, SolicitudDeEmpresa } from '../aplicacion/dto/empresa.dto.js';
import { columnasDeEmpresas } from '../http/empresas.columnas.js';
import { esquemaEmpresa } from '../http/empresas.esquemas-http.js';

/**
 * Exportar e importar empresas en Excel. Cada fila importada pasa por el mismo caso de uso que el formulario
 * (acceso del creador, tipos de localidad iniciales y avisos a los demás módulos), sin secciones aportadas.
 */
export function intercambioDeEmpresas(casos: { listar: ListarEmpresas; registrar: RegistrarEmpresa }) {
  return crearIntercambio<EmpresaDto, SolicitudDeEmpresa>({
    nombre: 'Empresas',
    columnas: columnasDeEmpresas,
    validar: validadorDeZod(esquemaEmpresa.omit({ secciones: true })),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.registrar.ejecutar(operador, solicitud),
    notasDeInstrucciones: [
      'Cada fila crea una empresa nueva en su cuenta, con sus tipos de localidad iniciales; no se actualizan las existentes.',
    ],
  });
}
