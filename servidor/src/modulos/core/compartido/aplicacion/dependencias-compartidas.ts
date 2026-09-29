import type { Auditoria } from './auditoria.js';
import type { Correlativos } from './correlativos.js';
import type { PublicadorEventos } from './publicador-eventos.js';
import type { Reloj } from './reloj.js';
import type { UnidadDeTrabajo } from './unidad-de-trabajo.js';
import type { VerificadorDeFotos } from './verificador-de-fotos.js';

/** Lo que el núcleo entrega a cada módulo al armarlo (ver el `modulo.ts` de cada uno). */
export interface DependenciasCompartidas {
  unidadDeTrabajo: UnidadDeTrabajo;
  publicadorEventos: PublicadorEventos;
  auditoria: Auditoria;
  correlativos: Correlativos;
  reloj: Reloj;
  fotos: VerificadorDeFotos;
}
