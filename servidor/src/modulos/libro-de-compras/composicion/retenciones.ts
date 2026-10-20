import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { AnotarConstancia, QuitarConstancia } from '../aplicacion/casos-uso/retenciones/anotar-constancia.js';
import { AnotarConstanciasEnLote } from '../aplicacion/casos-uso/retenciones/anotar-constancias-en-lote.js';
import { ConsultarEnterosDelAnio } from '../aplicacion/casos-uso/retenciones/consultar-enteros-del-anio.js';
import {
  ConsultarRetencionesDelMes,
  type FiltroDeRetenciones,
} from '../aplicacion/casos-uso/retenciones/consultar-retenciones-del-mes.js';
import { ConsultarPorResolver, ResolverRetencion } from '../aplicacion/casos-uso/retenciones/por-resolver.js';
import { AnularEntero, CorregirEntero, RegistrarEntero } from '../aplicacion/casos-uso/retenciones/registrar-entero.js';
import { EnterosControlador } from '../http/enteros.controlador.js';
import { RetencionesControlador } from '../http/retenciones.controlador.js';
import {
  aFilasExportadasDeRetenciones,
  columnasDeRetenciones,
  type FilaExportadaDeRetencion,
} from '../http/retenciones.columnas.js';
import { rutasDeRetenciones } from '../http/retenciones.rutas.js';
import { CalendarioDeFeriados } from '../infraestructura/calendario-de-feriados.js';
import { ConfiguracionFiscalEnConfiguracion } from '../infraestructura/configuracion-fiscal-en-configuracion.js';
import {
  ConsultasDeEnterosDrizzle,
  RepositorioDeEnterosDrizzle,
} from '../infraestructura/persistencia/enteros-de-retenciones.drizzle.js';
import { ConsultasDeRetencionesDrizzle } from '../infraestructura/persistencia/consultas-de-retenciones.drizzle.js';
import { RepositorioDeRetencionesDrizzle } from '../infraestructura/persistencia/repositorio-de-retenciones.drizzle.js';

const noSeImporta = () => {
  throw new Error('Las retenciones no se importan.');
};

function dependenciasBase() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    reloj: compartidas.reloj,
    configuracion: new ConfiguracionFiscalEnConfiguracion(),
    calendario: new CalendarioDeFeriados(),
    consultas: new ConsultasDeRetencionesDrizzle(),
    repositorio: new RepositorioDeRetencionesDrizzle(),
  };
}

type Base = ReturnType<typeof dependenciasBase>;

function controladorDeRetenciones(base: Base, enteros: ConsultasDeEnterosDrizzle, reporte: ConsultarRetencionesDelMes) {
  return new RetencionesControlador({
    reporte,
    anotar: new AnotarConstancia(base),
    anotarEnLote: new AnotarConstanciasEnLote(base),
    quitar: new QuitarConstancia(base),
    resolver: new ResolverRetencion({ ...base, enteros }),
    porResolver: new ConsultarPorResolver({ ...base, enteros }),
  });
}

function controladorDeEnteros(base: Base, enteros: ConsultasDeEnterosDrizzle) {
  const delEntero = { ...base, consultas: enteros, repositorio: new RepositorioDeEnterosDrizzle() };
  return new EnterosControlador({
    registrar: new RegistrarEntero(delEntero),
    corregir: new CorregirEntero(delEntero),
    anular: new AnularEntero(delEntero),
    matriz: new ConsultarEnterosDelAnio({ ...base, enteros }),
  });
}

/** El Excel del reporte con el mismo filtro que la pantalla; nunca se importa. */
function excelDeRetenciones(reporte: ConsultarRetencionesDelMes) {
  return crearIntercambio<FilaExportadaDeRetencion, never, FiltroDeRetenciones>({
    nombre: 'Retenciones',
    columnas: columnasDeRetenciones,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => {
      if (!filtro) throw new Error('El reporte necesita su filtro.');
      return aFilasExportadasDeRetenciones(await reporte.ejecutar(operador, filtro));
    },
    crear: noSeImporta,
  });
}

/** Raíz de composición de las retenciones: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeRetencionesComponidas() {
  const base = dependenciasBase();
  const enteros = new ConsultasDeEnterosDrizzle();
  const reporte = new ConsultarRetencionesDelMes({ ...base, enteros });
  return rutasDeRetenciones(
    { retenciones: controladorDeRetenciones(base, enteros, reporte), enteros: controladorDeEnteros(base, enteros) },
    excelDeRetenciones(reporte),
  );
}
