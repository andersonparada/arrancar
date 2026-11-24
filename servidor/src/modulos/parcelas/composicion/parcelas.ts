import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { rutasDelModulo } from '../../core/modulos-sistema/rutas-del-modulo.js';
import { AnularMedicion } from '../aplicacion/casos-uso/mediciones/anular-medicion.js';
import { RegistrarMedicion } from '../aplicacion/casos-uso/mediciones/registrar-medicion.js';
import { ActualizarParcela } from '../aplicacion/casos-uso/parcelas/actualizar-parcela.js';
import { CrearParcela } from '../aplicacion/casos-uso/parcelas/crear-parcela.js';
import { CrearParcelaDeExcel } from '../aplicacion/casos-uso/parcelas/crear-parcela-de-excel.js';
import { EliminarParcela } from '../aplicacion/casos-uso/parcelas/eliminar-parcela.js';
import { InactivarParcela } from '../aplicacion/casos-uso/parcelas/inactivar-parcela.js';
import { ListarArbolDeParcelas } from '../aplicacion/casos-uso/parcelas/listar-arbol-de-parcelas.js';
import { ListarParcelas } from '../aplicacion/casos-uso/parcelas/listar-parcelas.js';
import { ListarParcelasParaExcel } from '../aplicacion/casos-uso/parcelas/listar-parcelas-para-excel.js';
import { ObtenerParcela } from '../aplicacion/casos-uso/parcelas/obtener-parcela.js';
import { ReactivarParcela } from '../aplicacion/casos-uso/parcelas/reactivar-parcela.js';
import type { FilaDeParcelaEnExcel, SolicitudDeParcelaEnExcel } from '../aplicacion/parcelas-en-excel.js';
import { ObtenerCatalogos } from '../aplicacion/casos-uso/catalogos/obtener-catalogos.js';
import { rutasDeCatalogos } from '../http/catalogos.rutas.js';
import { MedicionesControlador } from '../http/mediciones.controlador.js';
import { rutasMediciones } from '../http/mediciones.rutas.js';
import { ParcelasControlador } from '../http/parcelas.controlador.js';
import { columnasDeParcelas } from '../http/parcelas.columnas.js';
import { esquemaParcelaEnExcel } from '../http/parcelas.esquemas-excel.js';
import { rutasParcelas } from '../http/parcelas.rutas.js';
import { AvisosDeParcelaEnMediador } from '../infraestructura/avisos-de-parcela-en-mediador.js';
import { ConfiguracionDeParcelasEnConfiguracion } from '../infraestructura/configuracion-de-parcelas-en-configuracion.js';
import { ConsultasDeCatalogosDrizzle } from '../infraestructura/persistencia/consultas-de-catalogos.drizzle.js';
import { ConsultasLocalidadesParaExcel } from '../infraestructura/persistencia/consultas-localidades-para-excel.drizzle.js';
import { ConsultasMedicionesDrizzle } from '../infraestructura/persistencia/consultas-mediciones.drizzle.js';
import { ConsultasParcelasDrizzle } from '../infraestructura/persistencia/consultas-parcelas.drizzle.js';
import { ConsultasTiposDeParcelaDrizzle } from '../infraestructura/persistencia/consultas-tipos-de-parcela.drizzle.js';
import { LigasDeInmueblesDrizzle } from '../infraestructura/persistencia/ligas-de-inmuebles.drizzle.js';
import { RepositorioMedicionesDrizzle } from '../infraestructura/persistencia/repositorio-mediciones.drizzle.js';
import { RepositorioParcelasDrizzle } from '../infraestructura/persistencia/repositorio-parcelas.drizzle.js';
import { RepositorioTiposDeParcelaDrizzle } from '../infraestructura/persistencia/repositorio-tipos-de-parcela.drizzle.js';
import { atenderOrdenesDeParcelas } from './ordenes-de-parcelas.js';

export const dependenciasDeParcelas = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  reloj: dependenciasCompartidas().reloj,
  repositorio: new RepositorioParcelasDrizzle(),
  consultas: new ConsultasParcelasDrizzle(),
  ligas: new LigasDeInmueblesDrizzle(),
  mediciones: new RepositorioMedicionesDrizzle(),
  consultasDeMediciones: new ConsultasMedicionesDrizzle(),
  configuracion: new ConfiguracionDeParcelasEnConfiguracion(),
  avisos: new AvisosDeParcelaEnMediador(),
});

type Dependencias = ReturnType<typeof dependenciasDeParcelas>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarParcelas(dependencias),
  listarArbol: new ListarArbolDeParcelas(dependencias),
  obtener: new ObtenerParcela(dependencias),
  crear: new CrearParcela(dependencias),
  actualizar: new ActualizarParcela(dependencias),
  inactivar: new InactivarParcela(dependencias),
  reactivar: new ReactivarParcela(dependencias),
  eliminar: new EliminarParcela(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeParcelas(casos: ReturnType<typeof casosDeUso>, dependencias: Dependencias) {
  const listar = new ListarParcelasParaExcel(dependencias);
  const crear = new CrearParcelaDeExcel(dependencias, casos.crear);
  return crearIntercambio<FilaDeParcelaEnExcel, SolicitudDeParcelaEnExcel>({
    nombre: 'Parcelas',
    columnas: columnasDeParcelas({
      localidadId: opcionesDe(new ConsultasLocalidadesParaExcel(), 'nombre', 'codigo'),
      tipoId: opcionesDe(new ConsultasTiposDeParcelaDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaParcelaEnExcel),
    listar: (operador) => listar.ejecutar(operador),
    crear: (operador, solicitud) => crear.ejecutar(operador, solicitud),
  });
}

function casosDeMediciones(dependencias: Dependencias) {
  return { registrar: new RegistrarMedicion(dependencias), anular: new AnularMedicion(dependencias) };
}

/** Raíz de composición de las parcelas y sus mediciones: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeParcelas() {
  const dependencias = dependenciasDeParcelas();
  const casos = casosDeUso(dependencias);
  atenderOrdenesDeParcelas(dependencias);
  return rutasDelModulo([
    rutasParcelas(new ParcelasControlador(casos), intercambioDeParcelas(casos, dependencias)),
    rutasMediciones(new MedicionesControlador(casosDeMediciones(dependencias))),
    rutasDeCatalogos(
      new ObtenerCatalogos({
        unidadDeTrabajo: dependencias.unidadDeTrabajo,
        consultas: new ConsultasDeCatalogosDrizzle(),
        consultasDeTipos: new ConsultasTiposDeParcelaDrizzle(),
        repositorioDeTipos: new RepositorioTiposDeParcelaDrizzle(),
      }),
    ),
  ]);
}
