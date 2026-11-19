import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ElegirMetodoDeCosteo } from '../aplicacion/casos-uso/metodo-de-costeo/elegir-metodo-de-costeo.js';
import { ObtenerPoliticaDeCosteo } from '../aplicacion/casos-uso/metodo-de-costeo/obtener-politica-de-costeo.js';
import { AnularDocumento } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import { KardexDelArticulo } from '../aplicacion/casos-uso/movimientos/kardex-del-articulo.js';
import { ListarDocumentos } from '../aplicacion/casos-uso/movimientos/listar-documentos.js';
import { ListarExistencias } from '../aplicacion/casos-uso/movimientos/listar-existencias.js';
import { ObtenerDocumento } from '../aplicacion/casos-uso/movimientos/obtener-documento.js';
import { RegistrarEntradaManual } from '../aplicacion/casos-uso/movimientos/registrar-entrada-manual.js';
import { RegistrarSalida } from '../aplicacion/casos-uso/movimientos/registrar-salida.js';
import type { DependenciasDelKardex } from '../aplicacion/kardex/dependencias-del-kardex.js';
import { MovimientosControlador } from '../http/movimientos.controlador.js';
import { rutasMovimientos } from '../http/movimientos.rutas.js';
import {
  CargaInicialEnMediador,
  MesesCerradosPendientes,
  MetodoInicialEnConfiguracion,
} from '../infraestructura/entorno-del-kardex.js';
import { AlmacenDelKardexDrizzle } from '../infraestructura/persistencia/almacen-del-kardex.drizzle.js';
import { CatalogosDelKardexDrizzle } from '../infraestructura/persistencia/catalogos-del-kardex.drizzle.js';
import { ConsultasDelKardexDrizzle } from '../infraestructura/persistencia/consultas-del-kardex.drizzle.js';
import { ExistenciasPorBodegaDrizzle } from '../infraestructura/persistencia/existencias-por-bodega.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDeMetodosDrizzle } from '../infraestructura/persistencia/repositorio-de-metodos.drizzle.js';

export function dependenciasDelKardex(): DependenciasDelKardex {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    publicadorEventos: compartidas.publicadorEventos,
    reloj: compartidas.reloj,
    almacen: new AlmacenDelKardexDrizzle(),
    documentos: new RepositorioDeDocumentosDrizzle(),
    existencias: new ExistenciasPorBodegaDrizzle(),
    metodos: new RepositorioDeMetodosDrizzle(),
    catalogos: new CatalogosDelKardexDrizzle(),
    consultas: new ConsultasDelKardexDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    cierres: new MesesCerradosPendientes(),
    metodoInicial: new MetodoInicialEnConfiguracion(),
  };
}

/** Raíz de composición del kardex: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeMovimientos() {
  const dependencias = dependenciasDelKardex();
  return rutasMovimientos(
    new MovimientosControlador({
      registrarEntrada: new RegistrarEntradaManual(dependencias),
      registrarSalida: new RegistrarSalida(dependencias),
      anularEntrada: new AnularDocumento(dependencias, 'entrada_manual'),
      anularSalida: new AnularDocumento(dependencias, 'salida_por_consumo'),
      listarDocumentos: new ListarDocumentos(dependencias),
      obtenerDocumento: new ObtenerDocumento(dependencias),
      listarExistencias: new ListarExistencias(dependencias),
      kardex: new KardexDelArticulo(dependencias),
      obtenerPolitica: new ObtenerPoliticaDeCosteo(dependencias),
      elegirMetodo: new ElegirMetodoDeCosteo(dependencias),
    }),
  );
}
