import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import {
  ConsultarConstanciasPendientes,
  type FiltroDeConstanciasPendientes,
} from '../aplicacion/casos-uso/retenciones/consultar-constancias-pendientes.js';
import { ConstanciasPendientesControlador } from '../http/constancias-pendientes.controlador.js';
import {
  aFilasDeConstanciasPendientes,
  columnasDeConstanciasPendientes,
  type FilaExportadaDeConstanciaPendiente,
} from '../http/constancias-pendientes.columnas.js';
import { rutasDeConstanciasPendientes } from '../http/constancias-pendientes.rutas.js';
import { CalendarioDeFeriados } from '../infraestructura/calendario-de-feriados.js';
import { ConfiguracionFiscalEnConfiguracion } from '../infraestructura/configuracion-fiscal-en-configuracion.js';
import { ConsultasDeRetencionesDrizzle } from '../infraestructura/persistencia/consultas-de-retenciones.drizzle.js';
import { ConsultasDeEnterosDrizzle } from '../infraestructura/persistencia/enteros-de-retenciones.drizzle.js';

const noSeImporta = () => {
  throw new Error('Las constancias pendientes no se importan.');
};

/** El Excel con el mismo filtro que la pantalla; nunca se importa. */
function excelDeConstanciasPendientes(consulta: ConsultarConstanciasPendientes) {
  return crearIntercambio<FilaExportadaDeConstanciaPendiente, never, FiltroDeConstanciasPendientes>({
    nombre: 'Constancias pendientes',
    columnas: columnasDeConstanciasPendientes,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => aFilasDeConstanciasPendientes(await consulta.ejecutar(operador, filtro)),
    soloExportar: true,
    crear: noSeImporta,
  });
}

/** Raíz de composición de las constancias de retención pendientes de todos los meses. */
export function rutasDeConstanciasPendientesComponidas() {
  const compartidas = dependenciasCompartidas();
  const consulta = new ConsultarConstanciasPendientes({
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    reloj: compartidas.reloj,
    configuracion: new ConfiguracionFiscalEnConfiguracion(),
    calendario: new CalendarioDeFeriados(),
    consultas: new ConsultasDeRetencionesDrizzle(),
    enteros: new ConsultasDeEnterosDrizzle(),
  });
  return rutasDeConstanciasPendientes(
    new ConstanciasPendientesControlador(consulta),
    excelDeConstanciasPendientes(consulta),
  );
}
