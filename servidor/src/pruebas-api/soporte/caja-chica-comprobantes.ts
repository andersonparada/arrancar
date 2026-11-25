import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';
import { EscenarioDeCajaChica, RUTA_DE_FONDOS } from './caja-chica-fondos.js';

export const RUTA_DE_CAJA_CHICA = '/api/caja-chica';
export const RUTA_DE_BANDEJA = `${RUTA_DE_CAJA_CHICA}/bandeja`;

/** Un documento que da retención: con la empresa como agente de IVA, una compra de Q5,600.00 retiene Q90.00. */
export const LINEA_CON_RETENCION = '5600.00';
/** Un documento sin retención (menor de Q2,500.00): Q1,120.00. */
export const LINEA_SIN_RETENCION = '1120.00';

/** Lo que devuelve el libro al registrar. */
export interface DocumentoRegistrado {
  documentoId: string;
  avisos: string[];
}

/** Caja chica con Libro de compras: la empresa es agente de retención de IVA y hay un proveedor y un concepto de gasto. */
export class EscenarioDeComprobantes {
  private constructor(
    readonly caja: EscenarioDeCajaChica,
    readonly libro: EscenarioDeDocumentos,
  ) {}

  static async preparar(entorno: EntornoApi, usuario: string): Promise<EscenarioDeComprobantes> {
    const caja = await EscenarioDeCajaChica.preparar(entorno, usuario);
    const { cuenta } = caja;
    await configurarEmpresa(cuenta, { agenteDeRetencionIva: 'contribuyente_especial', esAgenteDeRetencionIsr: true });
    const { proveedorId, terceroId } = await registrarProveedor(cuenta, 'Veterinaria El Quiroa');
    const concepto = await cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Medicinas',
      tipoPorOmision: 'bien',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    });
    expect(concepto.estado).toBe(201);
    const libro = { cuenta, proveedorId, terceroId, conceptoId: concepto.cuerpo.id as string, combustibleId: '' };
    return new EscenarioDeComprobantes(caja, libro);
  }

  propietario(): ClienteApi {
    return this.caja.propietario();
  }

  get proveedorId(): string {
    return this.libro.proveedorId;
  }

  get conceptoId(): string {
    return this.libro.conceptoId;
  }

  /** Abre un fondo con cheque; los fondos de estas pruebas no repiten nombre. */
  abrirFondo(nombre: string, cambios: Record<string, unknown> = {}) {
    return this.caja.abrir(this.caja.conCheque(nombre, cambios));
  }

  /** El cuerpo de un documento del libro con destino Caja chica; `total` fija su línea y el resto lo ajusta. */
  cuerpoDeDocumento(cambios: Record<string, unknown> = {}) {
    const { total = LINEA_SIN_RETENCION, ...resto } = cambios;
    return documentoDePrueba(this.libro, {
      destino: 'caja-chica',
      lineas: [{ conceptoId: this.libro.conceptoId, total }],
      ...resto,
    });
  }

  /** El id del usuario que inició la cuenta (con todos los permisos). */
  async propietarioId(): Promise<string> {
    const [fila] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      this.libro.cuenta.usuario,
    ]);
    return fila!.id;
  }

  /** Registra un documento en el libro con destino Caja chica; `cambios` lo ajusta (p. ej. `referenciaDeDestino`). */
  async registrarEnElLibro(cambios: Record<string, unknown> = {}): Promise<DocumentoRegistrado> {
    const cuerpo = this.cuerpoDeDocumento(cambios);
    const respuesta = await this.propietario().post(RUTA_DOCUMENTOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return { documentoId: respuesta.cuerpo.documento.id, avisos: respuesta.cuerpo.avisos };
  }

  /** La bandeja de Caja chica que ve el cliente. */
  async bandeja(cliente: ClienteApi = this.propietario(), consulta = ''): Promise<any[]> {
    const respuesta = await cliente.get(`${RUTA_DE_BANDEJA}${consulta}`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return respuesta.cuerpo;
  }

  /** El comprobante del documento, de la bandeja. */
  async enLaBandeja(documentoId: string): Promise<any> {
    return (await this.bandeja()).find((fila) => fila.documentoDeCompraId === documentoId);
  }

  /** Asigna documentos de la bandeja al fondo; devuelve la respuesta tal cual para probar lo que se rechaza. */
  asignar(fondoId: string, documentos: Record<string, unknown>[], cliente: ClienteApi = this.propietario()) {
    return cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/comprobantes/documentos`, { documentos });
  }

  /** Asigna y comprueba que salió bien. */
  async asignarBien(fondoId: string, documentos: Record<string, unknown>[], cliente?: ClienteApi) {
    const respuesta = await this.asignar(fondoId, documentos, cliente);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return respuesta.cuerpo;
  }

  /** Los comprobantes del fondo, por estado. */
  async delFondo(fondoId: string, estado = 'pendiente', cliente: ClienteApi = this.propietario()) {
    const respuesta = await cliente.get(`${RUTA_DE_FONDOS}/${fondoId}/comprobantes?estado=${estado}`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return respuesta.cuerpo;
  }

  /** Un vale de gasto de Q50.00 con lo mínimo; `cambios` lo ajusta. */
  cuerpoDeVale(cambios: Record<string, unknown> = {}) {
    return {
      monto: '50.00',
      descripcion: 'Peaje',
      pagadoA: 'Pedro López',
      conceptoDeGastoId: this.conceptoId,
      motivoSinDocumento: 'El peaje no da factura',
      ...cambios,
    };
  }

  registrarVale(fondoId: string, cambios: Record<string, unknown> = {}, cliente: ClienteApi = this.propietario()) {
    return cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/vales-de-gasto`, this.cuerpoDeVale(cambios));
  }
}

/** La fila del comprobante en la base, con sus columnas de excepción y asignación. */
export async function comprobanteEnBase(comprobanteId: string) {
  const [fila] = await comoPropietario<{
    fondo_id: string | null;
    estado: string;
    monto: string;
    monto_retenido: string;
    motivo_con_retencion: string | null;
    motivo_sobre_el_tope: string | null;
    sin_bancarizar: boolean;
    asignado_por: string | null;
    asignado_en: string | null;
    numero: number | null;
    fecha: string;
    motivo_documento_anulado: string | null;
  }>(
    `select fondo_id, estado, monto::text, monto_retenido::text, motivo_con_retencion, motivo_sobre_el_tope,
            sin_bancarizar, asignado_por, asignado_en::text, numero, fecha::text, motivo_documento_anulado
       from caja_chica.comprobantes where id = $1`,
    [comprobanteId],
  );
  return fila!;
}

/** El comprobante sigue en la base (un comprobante eliminado por el libro ya no está). */
export async function existeElComprobante(comprobanteId: string): Promise<boolean> {
  const filas = await comoPropietario('select 1 from caja_chica.comprobantes where id = $1', [comprobanteId]);
  return filas.length > 0;
}

/** Las entradas de auditoría de un comprobante, la más antigua primero. */
export const auditoriaDelComprobante = (comprobanteId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; anterior: any }>(
    `select accion, motivo, anterior from core.auditoria
      where recurso = 'caja-chica.comprobantes' and registro_id = $1 order by creado_en, id`,
    [comprobanteId],
  );

/** El id del usuario de la empresa por su nombre (los de estas pruebas son únicos). */
export async function usuarioIdDe(empresaId: string, nombres: string): Promise<string> {
  const [fila] = await comoPropietario<{ id: string }>(
    `select u.id from core.usuarios u join core.empresa_usuarios eu on eu.usuario_id = u.id
      where u.nombres = $1 and eu.empresa_id = $2`,
    [nombres, empresaId],
  );
  return fila!.id;
}

let numeroDeReposicion = 0;

/** Siembra una reposición compensada que cubre el comprobante (la reposición llega en CC-4): queda «repuesto». */
export async function reponerEnBase(
  e: EscenarioDeComprobantes,
  por: { fondoId: string; comprobanteId: string; monto: string },
): Promise<number> {
  numeroDeReposicion += 1;
  await comoPropietario(
    `with r as (
       insert into caja_chica.reposiciones (empresa_id, fondo_id, numero, fecha, forma, monto, custodio)
       values ($1, $2, $3, current_date, 'compensada_al_cerrar', $4::numeric, 'Juan Pérez') returning id)
     insert into caja_chica.reposicion_comprobantes (reposicion_id, comprobante_id, empresa_id, fondo_id, monto)
     select r.id, $5, $1, $2, $4::numeric from r`,
    [e.libro.cuenta.empresaId, por.fondoId, numeroDeReposicion, por.monto, por.comprobanteId],
  );
  return numeroDeReposicion;
}
