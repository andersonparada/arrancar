import { PoliticaDeZonaHorariaEnConfiguracion } from '../../core/compartido/infraestructura/politica-de-zona-horaria.configuracion.js';
import { crearLibroDeExcel } from '../../core/intercambio/contexto.js';
import type { DependenciasDelHistorialDeCarga } from '../aplicacion/casos-uso/historial-de-carga/dependencias.js';
import { ExportarCierreDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/exportar-cierre-de-carga-inicial.js';
import { ListarHistorialDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/listar-historial-de-carga-inicial.js';
import { ObtenerCierreDeCargaInicial } from '../aplicacion/casos-uso/historial-de-carga/obtener-cierre-de-carga-inicial.js';
import type { ConsultasEmpresas } from '../aplicacion/puertos/consultas-empresas.js';
import type { AlcanceDelOperador } from '../aplicacion/alcance-del-operador.js';
import { EjecutorEnEmpresa } from '../aplicacion/ejecutor-en-empresa.js';
import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import { CierresDeCargaControlador } from '../http/cierres-de-carga.controlador.js';
import { rutasDeCierresDeCarga } from '../http/cierres-de-carga.rutas.js';
import { ConsultasDeDatosDeEmpresaDrizzle } from '../infraestructura/persistencia/consultas-de-datos-de-empresa.drizzle.js';
import { HistorialDeLaCargaDrizzle } from '../infraestructura/persistencia/historial-de-la-carga.drizzle.js';

interface EmpresasDeLaCuenta {
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
}

/** Raíz de composición de lo que se ve y se exporta después de cerrar la carga inicial. */
export function rutasDeCierresDeCargaComponidas(
  { unidadDeTrabajo }: DependenciasCompartidas,
  empresas: EmpresasDeLaCuenta,
) {
  const dependencias: DependenciasDelHistorialDeCarga = {
    ejecutorEnEmpresa: new EjecutorEnEmpresa({ unidadDeTrabajo, ...empresas }),
    historial: new HistorialDeLaCargaDrizzle(),
    consultas: new ConsultasDeDatosDeEmpresaDrizzle(),
    excel: crearLibroDeExcel(),
    zonaHoraria: new PoliticaDeZonaHorariaEnConfiguracion(),
  };
  return rutasDeCierresDeCarga(
    new CierresDeCargaControlador({
      listarHistorial: new ListarHistorialDeCargaInicial(dependencias),
      obtenerCierre: new ObtenerCierreDeCargaInicial(dependencias),
      exportarCierre: new ExportarCierreDeCargaInicial(dependencias),
    }),
  );
}
