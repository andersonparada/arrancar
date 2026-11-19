import type { DocumentoGuardado, DocumentosProtegidos } from '../../compartido/aplicacion/documentos-protegidos.js';
import type { TareasDeLaTransaccion } from '../../compartido/aplicacion/tareas-de-la-transaccion.js';
import type { RegistroDeErrores } from '../aplicacion/casos-uso/enviar-lote-de-correos.js';
import type { ColaDeEnvio, CorreoPorEnviar, Resolucion } from '../aplicacion/puertos/cola-de-envio.js';
import type { ParametrosDeCorreo } from '../aplicacion/puertos/parametros-de-correo.js';
import type { CorreoNuevo, RepositorioDeCorreos } from '../aplicacion/puertos/repositorio-de-correos.js';
import type { TopesDeCorreo, UsoDeCupos } from '../dominio/cupos-de-correo.js';

export const TOPES_DE_PRUEBA: TopesDeCorreo = {
  porHoraPorCuenta: 100,
  porDiaPorCuenta: 500,
  porDiaPorDestinatario: 20,
  porHoraDeLaInstalacion: 1000,
};

export const SIN_USO: UsoDeCupos = { porHora: 0, porDia: 0, deLaInstalacionPorHora: 0, porDestinatario: {} };

export class RepositorioDeCorreosEnMemoria implements RepositorioDeCorreos {
  uso: UsoDeCupos = SIN_USO;
  readonly insertados: CorreoNuevo[] = [];
  readonly cuposPedidos: string[][] = [];

  async reservarCupo(direcciones: readonly string[]): Promise<UsoDeCupos> {
    this.cuposPedidos.push([...direcciones]);
    return this.uso;
  }

  async insertar(correo: CorreoNuevo): Promise<string> {
    this.insertados.push(correo);
    return `correo-${this.insertados.length}`;
  }
}

export class ParametrosFijos implements ParametrosDeCorreo {
  constructor(private readonly topesFijos: TopesDeCorreo = TOPES_DE_PRUEBA) {}

  async topes(): Promise<TopesDeCorreo> {
    return this.topesFijos;
  }

  async nombreDeLaAplicacion(): Promise<string> {
    return 'Arrancar';
  }

  async conservacion(): Promise<{ diasDelContenido: number; mesesDeLosMetadatos: number }> {
    return { diasDelContenido: 30, mesesDeLosMetadatos: 60 };
  }
}

/** Guarda lo que se le pasa; `confirmar` corre lo pendiente y `deshacer` lo que compensa. */
export class TareasEnLaTransaccion implements TareasDeLaTransaccion {
  private alConfirmar: Array<() => Promise<void>> = [];
  private alDeshacer: Array<() => Promise<void>> = [];

  hayTransaccion(): boolean {
    return true;
  }

  async despuesDeConfirmar(tarea: () => Promise<void>): Promise<void> {
    this.alConfirmar.push(tarea);
  }

  siSeDeshace(tarea: () => Promise<void>): void {
    this.alDeshacer.push(tarea);
  }

  async confirmar(): Promise<void> {
    for (const tarea of this.alConfirmar) await tarea();
  }

  async deshacer(): Promise<void> {
    for (const tarea of this.alDeshacer) await tarea();
  }
}

/** Solo sabe `guardar`: anota lo recibido y responde un documento del tipo programado. */
export class DocumentosFalsos implements DocumentosProtegidos {
  readonly guardados: Array<{ contenido: Buffer; nombre: string | null; recursoDueno: string }> = [];
  tipoMime = 'application/pdf';

  async guardar(
    _operador: unknown,
    contenido: Buffer,
    opciones: { nombre: string | null; recursoDueno: string },
  ): Promise<DocumentoGuardado> {
    this.guardados.push({ contenido, ...opciones });
    return {
      id: `archivo-${this.guardados.length}`,
      tipoMime: this.tipoMime,
      sha256: 'huella',
      tamanoBytes: contenido.length,
      paginas: 1,
    };
  }

  revisar(): never {
    throw new Error('No se usa.');
  }

  guardarRevisado(): never {
    throw new Error('No se usa.');
  }

  abrir(): never {
    throw new Error('No se usa.');
  }

  eliminar(): never {
    throw new Error('No se usa.');
  }
}

export class ColaEnMemoria implements ColaDeEnvio {
  pendientes: CorreoPorEnviar[] = [];
  readonly resoluciones: Resolucion[] = [];
  fallaAlResolver = false;
  tomadas = 0;

  async tomar(limite: number): Promise<CorreoPorEnviar[]> {
    this.tomadas += 1;
    return this.pendientes.splice(0, limite);
  }

  async resolver(resolucion: Resolucion): Promise<string> {
    if (this.fallaAlResolver) throw new Error('La base no responde.');
    this.resoluciones.push(resolucion);
    return resolucion.resultado === 'enviado' ? 'enviado' : 'pendiente';
  }
}

export class RegistroEnMemoria implements RegistroDeErrores {
  readonly errores: string[] = [];

  error(mensaje: string): void {
    this.errores.push(mensaje);
  }
}

/** Un correo por enviar con lo mínimo; `cambios` pisa lo que haga falta. */
export function correoPorEnviar(cambios: Partial<CorreoPorEnviar> = {}): CorreoPorEnviar {
  return {
    id: 'correo-1',
    empresaId: 'empresa-1',
    asunto: 'Aviso de pago 12',
    texto: 'Hola',
    html: '<p>Hola</p>',
    nombreVisible: 'Empresa por medio de Arrancar',
    responderA: null,
    messageId: '<id-1@arrancar.test>',
    intentos: 1,
    destinatarios: [{ clase: 'para', direccion: 'proveedor@ejemplo.com', nombre: 'Proveedor' }],
    adjuntoRuta: null,
    adjuntoNombre: null,
    ...cambios,
  };
}
