import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import {
  ListarBeneficiariosParaElegir,
  ListarConceptosParaGasto,
  ListarMediosParaElegir,
} from '../aplicacion/casos-uso/opciones/consultas-de-opciones.js';
import { OpcionesControlador } from '../http/opciones.controlador.js';
import { rutasDeOpciones } from '../http/opciones.rutas.js';
import { MediosDeBancosEnMediador } from '../infraestructura/medios-de-bancos-en-mediador.js';
import { BeneficiariosParaElegirDrizzle } from '../infraestructura/persistencia/beneficiarios-para-elegir.drizzle.js';
import { ConceptosParaGastoDrizzle } from '../infraestructura/persistencia/conceptos-para-gasto.drizzle.js';

/** Raíz de composición de las listas que piden las ventanas (cuentas, chequeras y conceptos de gasto). */
export function rutasDeOpcionesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return rutasDeOpciones(
    new OpcionesControlador({
      medios: new ListarMediosParaElegir({ unidadDeTrabajo, reloj, medios: new MediosDeBancosEnMediador() }),
      conceptos: new ListarConceptosParaGasto({ unidadDeTrabajo, conceptos: new ConceptosParaGastoDrizzle() }),
      beneficiarios: new ListarBeneficiariosParaElegir({
        unidadDeTrabajo,
        beneficiarios: new BeneficiariosParaElegirDrizzle(),
      }),
    }),
  );
}
