import type { Reloj } from '../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import { SugerirConceptoAlCapturar } from '../aplicacion/casos-uso/sugerencias/sugerir-concepto-al-capturar.js';
import { SugerirConceptosDeSinClasificar } from '../aplicacion/casos-uso/sugerencias/sugerir-conceptos-de-sin-clasificar.js';
import { MotorDeSugerencias } from '../aplicacion/sugerencias/motor-de-sugerencias.js';
import { CuentasPorPagarActivoEnModulosActivos } from '../infraestructura/cuentas-por-pagar-activo-en-modulos-activos.js';
import { ConsultasConceptosDrizzle } from '../infraestructura/persistencia/consultas-conceptos.drizzle.js';
import { ConsultasDeSugerenciasDrizzle } from '../infraestructura/persistencia/consultas-de-sugerencias.drizzle.js';
import { PoliticaDeSugerenciasEnConfiguracion } from '../infraestructura/politica-de-sugerencias.configuracion.js';

/** Los dos casos de uso de las sugerencias de concepto (P7), que comparten el motor de cálculo. */
export function casosDeSugerencias(dependencias: { unidadDeTrabajo: UnidadDeTrabajo; reloj: Reloj }) {
  const consultasDeSugerencias = new ConsultasDeSugerenciasDrizzle();
  const politicaDeSugerencias = new PoliticaDeSugerenciasEnConfiguracion();
  const motor = new MotorDeSugerencias({
    consultasDeSugerencias,
    consultasDeConceptos: new ConsultasConceptosDrizzle(),
    politicaDeSugerencias,
    cuentasPorPagar: new CuentasPorPagarActivoEnModulosActivos(new ModulosActivosDeLaCuentaEnRegistro()),
  });
  const compartidas = { ...dependencias, consultasDeSugerencias, motor };
  return {
    sugerirDeSinClasificar: new SugerirConceptosDeSinClasificar({ ...compartidas, politicaDeSugerencias }),
    sugerirAlCapturar: new SugerirConceptoAlCapturar(compartidas),
  };
}
