import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { EjecutorEnEmpresa } from '../../ejecutor-en-empresa.js';
import type { ConsultasDeDatosDeEmpresa } from '../../puertos/consultas-de-datos-de-empresa.js';
import type { RepositorioDeCargasIniciales } from '../../puertos/repositorio-de-cargas-iniciales.js';

/** Recurso dueño del archivo del balance de apertura: solo se sirve desde la ruta de Empresas, con su permiso. */
export const RECURSO_DE_BALANCES_DE_APERTURA = 'empresas.cargas-iniciales';

/** Lo que necesitan los casos de uso del balance de apertura firmado. */
export interface DependenciasDelBalanceDeApertura {
  ejecutorEnEmpresa: EjecutorEnEmpresa;
  repositorioCargas: RepositorioDeCargasIniciales;
  consultas: ConsultasDeDatosDeEmpresa;
  documentos: DocumentosProtegidos;
  auditoria: Auditoria;
}
