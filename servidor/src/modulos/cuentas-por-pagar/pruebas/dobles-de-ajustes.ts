import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import type {
  AjusteNuevo,
  AnulacionDeAjuste,
  RepositorioDeAjustes,
  TopeDeDiferenciaMenor,
} from '../aplicacion/puertos/puertos-de-ajustes.js';
import type { AjusteDeSaldo } from '../dominio/ajustes.js';
import type { DocumentoPorPagar } from '../dominio/documento-por-pagar.js';
import type { DocumentosEnMemoria } from './dobles-de-documentos.js';

/** Los ajustes viven en la lista de los documentos en memoria, para que las consultas los vean. */
export class AjustesEnMemoria implements RepositorioDeAjustes {
  /** Lo que se anuló, con quién y por qué. */
  readonly anulaciones: Array<AnulacionDeAjuste & { id: string }> = [];

  constructor(private readonly documentos: DocumentosEnMemoria) {}

  async agregar(nota: DocumentoPorPagar, ajuste: AjusteNuevo): Promise<string> {
    const id = crypto.randomUUID();
    this.documentos.ajustes.push({
      id,
      documentoId: nota.id,
      ...ajuste,
      estado: 'vigente',
      motivoDeAnulacion: null,
    });
    return id;
  }

  async buscar(id: string): Promise<AjusteDeSaldo | null> {
    const ajuste = this.documentos.ajustes.find((candidato) => candidato.id === id);
    return ajuste ? { ...ajuste } : null;
  }

  async anular(id: string, anulacion: AnulacionDeAjuste): Promise<void> {
    const ajuste = this.documentos.ajustes.find((candidato) => candidato.id === id)!;
    ajuste.estado = 'anulado';
    ajuste.motivoDeAnulacion = anulacion.motivo;
    this.anulaciones.push({ id, ...anulacion });
  }
}

/** El tope de la diferencia menor, fijo (Q25.00 por omisión). */
export class TopeFijo implements TopeDeDiferenciaMenor {
  constructor(public topeCentavos = 2500) {}

  async centavos(_contexto: ContextoEmpresa): Promise<number> {
    return this.topeCentavos;
  }
}
