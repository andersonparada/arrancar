import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { CambiarEstadoDeChequera } from '../aplicacion/casos-uso/chequeras/cambiar-estado-de-chequera.js';
import { CrearChequera } from '../aplicacion/casos-uso/chequeras/crear-chequera.js';
import { ListarChequeras } from '../aplicacion/casos-uso/chequeras/listar-chequeras.js';
import { ListarChequerasDeLaEmpresa } from '../aplicacion/casos-uso/chequeras/listar-chequeras-de-la-empresa.js';
import { ListarCheques } from '../aplicacion/casos-uso/cheques/listar-cheques.js';
import type { ChequeraDto, SolicitudDeChequera } from '../aplicacion/dto/chequera.dto.js';
import { columnasDeChequeras } from '../http/chequeras.columnas.js';
import { ChequerasControlador } from '../http/chequeras.controlador.js';
import { esquemaChequeraImportada } from '../http/chequeras.esquemas-http.js';
import { rutasChequeras } from '../http/chequeras.rutas.js';
import { ConsultasChequerasDrizzle } from '../infraestructura/persistencia/consultas-chequeras.drizzle.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioChequerasDrizzle } from '../infraestructura/persistencia/repositorio-chequeras.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { LimiteDeChequeraEnConfiguracion } from '../infraestructura/limite-de-chequera.configuracion.js';

function dependenciasDeChequeras() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    auditoria,
    repositorio: new RepositorioChequerasDrizzle(),
    repositorioCheques: new RepositorioChequesDrizzle(),
    consultas: new ConsultasChequerasDrizzle(),
    consultasMovimientos: new ConsultasMovimientosDrizzle(),
    limiteDeChequera: new LimiteDeChequeraEnConfiguracion(),
  };
}

function casosDeUsoDeChequeras(dependencias: ReturnType<typeof dependenciasDeChequeras>) {
  const consultasCheques = new ConsultasChequesDrizzle();
  return {
    listar: new ListarChequeras(dependencias),
    listarTodas: new ListarChequerasDeLaEmpresa(dependencias),
    crear: new CrearChequera(dependencias),
    cambiarEstado: new CambiarEstadoDeChequera(dependencias),
    listarCheques: new ListarCheques({ unidadDeTrabajo: dependencias.unidadDeTrabajo, consultas: consultasCheques }),
  };
}

/** Exportar e importar en Excel; cada fila importada crea su chequera con las mismas reglas del formulario. */
function intercambioDeChequeras(casos: ReturnType<typeof casosDeUsoDeChequeras>) {
  return crearIntercambio<ChequeraDto, SolicitudDeChequera>({
    nombre: 'Chequeras',
    columnas: columnasDeChequeras({
      cuentaBancariaId: opcionesDe(new ConsultasCuentasBancariasDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaChequeraImportada),
    listar: (operador) => casos.listarTodas.ejecutar(operador, {}),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las chequeras: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeChequeras() {
  const dependencias = dependenciasDeChequeras();
  const casos = casosDeUsoDeChequeras(dependencias);
  return rutasChequeras(new ChequerasControlador(casos), intercambioDeChequeras(casos));
}
