import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { EliminarMovimiento } from '../aplicacion/casos-uso/movimientos/eliminar-movimiento.js';
import { DesmarcarNota } from '../aplicacion/casos-uso/movimientos/desmarcar-nota.js';
import { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import { MarcarNota } from '../aplicacion/casos-uso/movimientos/marcar-nota.js';
import { ReclasificarVarios } from '../aplicacion/casos-uso/movimientos/reclasificar-varios.js';
import { ReclasificarMovimientos } from '../aplicacion/casos-uso/movimientos/reclasificar-movimientos.js';
import { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import { piezasDeOrigen } from './piezas-de-origen.js';
import { casosDeSugerencias } from './sugerencias.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { NotasControlador } from '../http/notas.controlador.js';
import { rutasNotas } from '../http/notas.rutas.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeMismaFechaEnAnulacionEnConfiguracion } from '../infraestructura/politica-de-misma-fecha-en-anulacion.configuracion.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

/** Las dependencias de las notas; también las usan las órdenes de otros módulos (`ordenes.ts`). */
export function dependenciasDeNotas() {
  const { unidadDeTrabajo, auditoria, correlativos, reloj } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  const conceptos = new ConceptosDeMovimientos(new RepositorioConceptosDrizzle());
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    reloj,
    consultas,
    repositorio: new RepositorioMovimientosDrizzle(),
    conceptos,
    ...piezasDeOrigen(conceptos),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro }),
    politicaDeMismaFecha: new PoliticaDeMismaFechaEnAnulacionEnConfiguracion(),
  };
}

/** Raíz de composición de las notas: comparten dominio con Movimientos, pero solo notas (no el saldo inicial). */
export function rutasDeNotas() {
  const dependencias = dependenciasDeNotas();
  const casos = {
    listar: new ListarMovimientos(dependencias),
    obtener: new ObtenerMovimiento(dependencias),
    crear: new CrearMovimiento(dependencias),
    actualizar: new ActualizarMovimiento(dependencias),
    anular: new AnularMovimiento(dependencias),
    eliminar: new EliminarMovimiento(dependencias),
    marcar: new MarcarNota(dependencias),
    desmarcar: new DesmarcarNota(dependencias),
    reclasificar: new ReclasificarMovimientos(dependencias),
    reclasificarVarios: new ReclasificarVarios(dependencias),
    ...casosDeSugerencias(dependencias),
  };
  return rutasNotas(new NotasControlador(casos));
}
