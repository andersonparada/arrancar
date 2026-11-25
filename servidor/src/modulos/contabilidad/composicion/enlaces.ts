import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import {
  GuardarEnlaceDeExcel,
  ListarEnlacesParaExcel,
  revisarEnlacesRepetidos,
} from '../aplicacion/casos-uso/enlaces/enlaces-de-excel.js';
import { GuardarEnlace } from '../aplicacion/casos-uso/enlaces/guardar-enlace.js';
import { ListarEnlaces } from '../aplicacion/casos-uso/enlaces/listar-enlaces.js';
import { ListarLlavesDeEnlace } from '../aplicacion/casos-uso/enlaces/listar-llaves-de-enlace.js';
import { QuitarEnlace } from '../aplicacion/casos-uso/enlaces/quitar-enlace.js';
import type { EnlaceDto, SolicitudDeEnlaceDeExcel } from '../aplicacion/dto/enlace.dto.js';
import { columnasDeEnlaces } from '../http/enlaces.columnas.js';
import { EnlacesControlador } from '../http/enlaces.controlador.js';
import { esquemaEnlaceDeExcel } from '../http/enlaces.esquemas-http.js';
import { rutasEnlaces } from '../http/enlaces.rutas.js';
import { LlavesDeEnlaceEnMediador } from '../infraestructura/llaves-de-enlace-en-mediador.js';
import { ModulosActivosEnRegistro } from '../infraestructura/modulos-activos-en-registro.js';
import { ConsultasCuentasDrizzle } from '../infraestructura/persistencia/consultas-cuentas.drizzle.js';
import { ConsultasEnlacesDrizzle } from '../infraestructura/persistencia/consultas-enlaces.drizzle.js';
import { RepositorioCuentasDrizzle } from '../infraestructura/persistencia/repositorio-cuentas.drizzle.js';
import { RepositorioEnlacesDrizzle } from '../infraestructura/persistencia/repositorio-enlaces.drizzle.js';

const dependenciasDeEnlaces = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioEnlacesDrizzle(),
  consultas: new ConsultasEnlacesDrizzle(),
  cuentas: new RepositorioCuentasDrizzle(),
  llaves: new LlavesDeEnlaceEnMediador(),
  modulosActivos: new ModulosActivosEnRegistro(),
});

type Dependencias = ReturnType<typeof dependenciasDeEnlaces>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarEnlaces(dependencias),
  llaves: new ListarLlavesDeEnlace(dependencias),
  guardar: new GuardarEnlace(dependencias),
  quitar: new QuitarEnlace(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que la pantalla. */
function intercambioDeEnlaces(casos: ReturnType<typeof casosDeUso>, dependencias: Dependencias) {
  const exportar = new ListarEnlacesParaExcel(dependencias);
  const importar = new GuardarEnlaceDeExcel(casos.guardar, casos.llaves);
  return crearIntercambio<EnlaceDto, SolicitudDeEnlaceDeExcel>({
    nombre: 'Enlaces contables',
    columnas: columnasDeEnlaces(new ConsultasCuentasDrizzle()),
    validar: validadorDeZod(esquemaEnlaceDeExcel),
    revisarLote: revisarEnlacesRepetidos,
    listar: (operador) => exportar.ejecutar(operador),
    crear: (operador, solicitud) => importar.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los enlaces: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeEnlaces() {
  const dependencias = dependenciasDeEnlaces();
  const casos = casosDeUso(dependencias);
  return rutasEnlaces(new EnlacesControlador(casos), intercambioDeEnlaces(casos, dependencias));
}
