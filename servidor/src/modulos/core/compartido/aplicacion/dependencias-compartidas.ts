import type { BandejaDeSalida } from '../../correo/aplicacion/bandeja-de-salida.js';
import type { Auditoria } from './auditoria.js';
import type { Correlativos } from './correlativos.js';
import type { DocumentosProtegidos } from './documentos-protegidos.js';
import type { PublicadorEventos } from './publicador-eventos.js';
import type { Reloj } from './reloj.js';
import type { UnidadDeTrabajo } from './unidad-de-trabajo.js';
import type { VerificadorDeFotos } from './verificador-de-fotos.js';

/** Lo que el núcleo entrega a cada módulo al armarlo (ver el `modulo.ts` de cada uno). */
export interface DependenciasCompartidas {
  unidadDeTrabajo: UnidadDeTrabajo;
  publicadorEventos: PublicadorEventos;
  /**
   * Publica dentro de la unidad de trabajo y deja el evento en `core.registro_de_eventos` (lanza fuera de una
   * transacción). Convive con `publicadorEventos` mientras los módulos cambian a este (CT-0a2 y CT-0a3).
   */
  publicadorDeEventos: PublicadorEventos;
  auditoria: Auditoria;
  correlativos: Correlativos;
  reloj: Reloj;
  fotos: VerificadorDeFotos;
  documentos: DocumentosProtegidos;
  /** Para mandar correo dentro de la unidad de trabajo del módulo (ver `core/correo`). */
  bandeja: BandejaDeSalida;
}
