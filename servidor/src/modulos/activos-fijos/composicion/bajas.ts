import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AbrirActaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-acta-de-baja.js';
import { AbrirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-denuncia-de-baja.js';
import { AbridorDeDocumentosDeBaja } from '../aplicacion/casos-uso/bajas/abrir-documento-de-baja.js';
import { AdjuntadorDeDocumentos } from '../aplicacion/casos-uso/bajas/adjuntar-documento-de-baja.js';
import { AnularBaja } from '../aplicacion/casos-uso/bajas/anular-baja.js';
import { DarDeBaja } from '../aplicacion/casos-uso/bajas/dar-de-baja.js';
import { ObtenerBaja } from '../aplicacion/casos-uso/bajas/obtener-baja.js';
import { RegistrarVenta } from '../aplicacion/casos-uso/bajas/registrar-venta.js';
import { RegistradorDeBajas } from '../aplicacion/casos-uso/bajas/registrador-de-bajas.js';
import { SubirActaDeBaja } from '../aplicacion/casos-uso/bajas/subir-acta-de-baja.js';
import { SubirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/subir-denuncia-de-baja.js';
import { BajasControlador } from '../http/bajas.controlador.js';
import { rutasBajas } from '../http/bajas.rutas.js';
import { CierresDrizzle } from '../infraestructura/persistencia/cierres.drizzle.js';
import { ConsultasActivosDrizzle } from '../infraestructura/persistencia/consultas-activos.drizzle.js';
import { ConsultasBajasDrizzle } from '../infraestructura/persistencia/consultas-bajas.drizzle.js';
import { HistorialDeDepreciacionDrizzle } from '../infraestructura/persistencia/historial-de-depreciacion.drizzle.js';
import { RepositorioActivosDrizzle } from '../infraestructura/persistencia/repositorio-activos.drizzle.js';
import { RepositorioBajasDrizzle } from '../infraestructura/persistencia/repositorio-bajas.drizzle.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';
import { RepositorioCostosDrizzle } from '../infraestructura/persistencia/repositorio-costos.drizzle.js';
import { RepositorioSaldosInicialesDrizzle } from '../infraestructura/persistencia/repositorio-saldos-iniciales.drizzle.js';
import { RepositorioTramosDrizzle } from '../infraestructura/persistencia/repositorio-tramos.drizzle.js';
import { RepositorioTrasladosDrizzle } from '../infraestructura/persistencia/repositorio-traslados.drizzle.js';
import { PrimerMesEnConfiguracion } from '../infraestructura/primer-mes-en-configuracion.js';

function dependenciasDeBajas() {
  const compartidas = dependenciasCompartidas();
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    auditoria: compartidas.auditoria,
    correlativos: compartidas.correlativos,
    reloj: compartidas.reloj,
    documentos: compartidas.documentos,
    publicadorEventos: compartidas.publicadorEventos,
    repositorio: new RepositorioActivosDrizzle(),
    consultas: new ConsultasActivosDrizzle(),
    clases: new RepositorioClasesDrizzle(),
    costos: new RepositorioCostosDrizzle(),
    tramos: new RepositorioTramosDrizzle(),
    historial: new HistorialDeDepreciacionDrizzle(),
    saldos: new RepositorioSaldosInicialesDrizzle(),
    cierres: new CierresDrizzle(),
    primerMes: new PrimerMesEnConfiguracion(),
    traslados: new RepositorioTrasladosDrizzle(),
    bajas: new RepositorioBajasDrizzle(),
    consultasDeBajas: new ConsultasBajasDrizzle(),
  };
}

/** Raíz de composición de las bajas y ventas con su acta y su denuncia. */
export function rutasDeBajas() {
  const dependencias = dependenciasDeBajas();
  const registrador = new RegistradorDeBajas(dependencias);
  const adjuntador = new AdjuntadorDeDocumentos(dependencias);
  const abridor = new AbridorDeDocumentosDeBaja(dependencias);
  return rutasBajas(
    new BajasControlador({
      darDeBaja: new DarDeBaja(registrador),
      registrarVenta: new RegistrarVenta(registrador),
      anular: new AnularBaja(dependencias),
      obtener: new ObtenerBaja(dependencias),
      subirActa: new SubirActaDeBaja(adjuntador),
      subirDenuncia: new SubirDenunciaDeBaja(adjuntador),
      abrirActa: new AbrirActaDeBaja(abridor),
      abrirDenuncia: new AbrirDenunciaDeBaja(abridor),
    }),
  );
}
