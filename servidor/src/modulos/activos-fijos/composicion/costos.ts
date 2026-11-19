import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { DescartarLinea } from '../aplicacion/casos-uso/bandeja/descartar-linea.js';
import { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/bandeja/devolver-linea.js';
import { ListarBandeja } from '../aplicacion/casos-uso/bandeja/listar-bandeja.js';
import { AnularCosto } from '../aplicacion/casos-uso/costos/anular-costo.js';
import { CapitalizarLineas } from '../aplicacion/casos-uso/costos/capitalizar-lineas.js';
import { ListarCostosDeActivo } from '../aplicacion/casos-uso/costos/listar-costos-de-activo.js';
import { RechazarDocumentoConCostos } from '../aplicacion/casos-uso/costos/rechazar-documento-con-costos.js';
import { RegistrarCostoManual } from '../aplicacion/casos-uso/costos/registrar-costo-manual.js';
import { BandejaControlador } from '../http/bandeja.controlador.js';
import { rutasBandeja } from '../http/bandeja.rutas.js';
import { CostosControlador } from '../http/costos.controlador.js';
import { rutasCostos } from '../http/costos.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { PrefijoEnConfiguracion } from '../infraestructura/prefijo-en-configuracion.js';
import { UmbralEnConfiguracion } from '../infraestructura/umbral-en-configuracion.js';
import { ConsultasBandejaDrizzle } from '../infraestructura/persistencia/consultas-bandeja.drizzle.js';
import { ConsultasCostosDrizzle } from '../infraestructura/persistencia/consultas-costos.drizzle.js';
import { LineasDelLibroDrizzle } from '../infraestructura/persistencia/lineas-del-libro.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioDescartesDrizzle } from '../infraestructura/persistencia/repositorio-descartes.drizzle.js';
import { UbicacionesEnEmpresas } from '../infraestructura/persistencia/ubicaciones-en-empresas.drizzle.js';

function dependenciasDeCostos() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    reloj: compartidas.reloj,
    publicadorEventos: compartidas.publicadorEventos,
    repositorio: new RepositorioActivosDrizzle(),
    clases: new RepositorioClasesDrizzle(),
    ubicaciones: new UbicacionesEnEmpresas(),
    cargaInicial: new CargaInicialEnMediador(),
    prefijo: new PrefijoEnConfiguracion(),
    costos: new RepositorioCostosDrizzle(),
    consultasDeCostos: new ConsultasCostosDrizzle(),
    lineas: new LineasDelLibroDrizzle(),
  };
}

/**
 * Raíz de composición de los costos: sus rutas y los avisos del libro. Activos fijos escucha `documento_por_anular` y
 * `documento_por_eliminar` (llegan a todos los módulos, no solo al destino del documento) y los rechaza si el documento
 * tiene costos vigentes (R-1); con el módulo inactivo el mediador no lo llama.
 */
export function rutasDeCostos() {
  const dependencias = dependenciasDeCostos();
  const rechazar = new RechazarDocumentoConCostos(dependencias);
  mediador.escuchar('activos-fijos', 'libro-de-compras.documento_por_anular', (aviso, operador) =>
    rechazar.ejecutar(operador, aviso),
  );
  mediador.escuchar('activos-fijos', 'libro-de-compras.documento_por_eliminar', (aviso, operador) =>
    rechazar.ejecutar(operador, aviso),
  );
  return rutasCostos(
    new CostosControlador({
      listar: new ListarCostosDeActivo(dependencias),
      registrarManual: new RegistrarCostoManual(dependencias),
      anular: new AnularCosto(dependencias),
    }),
  );
}

/** Raíz de composición de la bandeja «Por capitalizar»: capitalizar es de los costos; listar y descartar, de la bandeja. */
export function rutasDeBandeja() {
  const dependencias = dependenciasDeCostos();
  const deBandeja = {
    ...dependencias,
    bandeja: new ConsultasBandejaDrizzle(),
    umbral: new UmbralEnConfiguracion(),
    descartes: new RepositorioDescartesDrizzle(),
  };
  return rutasBandeja(
    new BandejaControlador({
      listar: new ListarBandeja(deBandeja),
      capitalizar: new CapitalizarLineas(dependencias),
      descartar: new DescartarLinea(deBandeja),
      devolver: new DevolverLineaALaBandeja(deBandeja),
    }),
  );
}
