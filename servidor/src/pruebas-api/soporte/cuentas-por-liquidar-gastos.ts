import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { EscenarioDeAnticipos, RUTA_DE_ANTICIPOS } from './cuentas-por-liquidar-anticipos.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  NIT_DEL_PROVEEDOR,
} from './escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './escenarios.js';

export const RUTA_DE_CUENTAS_POR_LIQUIDAR = '/api/cuentas-por-liquidar';

const VER = 'cuentas-por-liquidar.anticipos.ver';
const CREAR = 'cuentas-por-liquidar.gastos.crear';
const ANULAR = 'cuentas-por-liquidar.gastos.anular';
const CON_RETENCION = 'cuentas-por-liquidar.gastos.con-retencion';

/** Los usuarios de las pruebas: cada uno con un permiso más que el anterior. */
export interface UsuariosDeGastos {
  soloVer: ClienteApi;
  asignador: ClienteApi;
  conExcepcion: ClienteApi;
  quitador: ClienteApi;
}

/**
 * Una cuenta con Cuentas por liquidar y el Libro de compras (la empresa es agente de retención del IVA, así que una factura de
 * Q5,600.00 lleva una retención de Q90.00), un proveedor y un beneficiario.
 */
export class EscenarioDeGastos {
  private constructor(
    readonly anticipos: EscenarioDeAnticipos,
    readonly proveedorId: string,
    readonly usuarios: UsuariosDeGastos,
  ) {}

  static async preparar(entorno: EntornoApi, usuario: string): Promise<EscenarioDeGastos> {
    const anticipos = await EscenarioDeAnticipos.preparar(entorno, usuario);
    await configurarEmpresa(anticipos.cuenta, {
      agenteDeRetencionIva: 'contribuyente_especial',
      esAgenteDeRetencionIsr: true,
    });
    const { proveedorId } = await registrarProveedor(anticipos.cuenta, 'Ferretería El Clavo');
    const nuevo = (nombres: string, permisos: string[]) =>
      crearUsuarioConPermisos(entorno, anticipos.cuenta, { nombres, apellidos: usuario, permisos });
    const usuarios = {
      soloVer: await nuevo('Solo ve', [VER]),
      asignador: await nuevo('Asigna', [VER, CREAR]),
      conExcepcion: await nuevo('Con excepción', [VER, CREAR, CON_RETENCION]),
      quitador: await nuevo('Quita', [VER, ANULAR]),
    };
    return new EscenarioDeGastos(anticipos, proveedorId, usuarios);
  }

  propietario(): ClienteApi {
    return this.anticipos.propietario();
  }

  /** Entrega un anticipo de Q20,000.00 a un beneficiario nuevo y devuelve su id. */
  async anticipo(monto = '20000.00'): Promise<string> {
    const letras = () =>
      Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
    const beneficiario = await this.anticipos.tercero(letras(), letras());
    return (await this.anticipos.entregar(this.anticipos.conCheque(beneficiario, monto))).id;
  }

  /** Registra un documento en el libro con destino Cuentas por liquidar; devuelve la respuesta del libro. */
  registrar(cambios: Record<string, unknown> = {}) {
    const base = { conceptoId: this.anticipos.conceptoDeGastoId, proveedorId: this.proveedorId };
    return this.propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(
        { ...base, cuenta: this.anticipos.cuenta, terceroId: '', combustibleId: '' },
        {
          destino: 'cuentas-por-liquidar',
          nitEmisor: NIT_DEL_PROVEEDOR,
          ...cambios,
        },
      ),
    );
  }

  /** Un documento con retención de Q90.00 (factura de Q5,600.00). */
  conRetencion(cambios: Record<string, unknown> = {}) {
    return this.registrar({ lineas: [{ conceptoId: this.anticipos.conceptoDeGastoId, total: '5600.00' }], ...cambios });
  }

  /** El id del gasto de un documento del libro, tal como está en la base. */
  async gastoDelDocumento(documentoId: string): Promise<string> {
    const [fila] = await consultar<{ id: string }>(
      'select id from cuentas_por_liquidar.gastos where documento_de_compra_id = $1',
      [documentoId],
    );
    expect(fila, 'el documento debió llegar a Cuentas por liquidar').toBeDefined();
    return fila!.id;
  }

  /** Registra un documento sin referencia (queda en la bandeja) y devuelve los ids del documento y del gasto. */
  async enLaBandeja(cambios: Record<string, unknown> = {}, conRetencion = false) {
    const respuesta = await (conRetencion ? this.conRetencion(cambios) : this.registrar(cambios));
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const documentoId = respuesta.cuerpo.documento.id as string;
    return {
      documentoId,
      gastoId: await this.gastoDelDocumento(documentoId),
      avisos: respuesta.cuerpo.avisos as string[],
    };
  }

  asignar(cliente: ClienteApi, anticipoId: string, documentos: Array<Record<string, unknown>>) {
    return cliente.post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos/documentos`, { documentos });
  }

  bandeja(cliente: ClienteApi = this.propietario(), consulta = '') {
    return cliente.get(`${RUTA_DE_CUENTAS_POR_LIQUIDAR}/bandeja${consulta}`);
  }

  async gastosDe(anticipoId: string) {
    const respuesta = await this.propietario().get(`${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return respuesta.cuerpo as Array<Record<string, any>>;
  }

  quitar(cliente: ClienteApi, gastoId: string, motivo = 'Se asignó por error') {
    return cliente.post(`${RUTA_DE_CUENTAS_POR_LIQUIDAR}/gastos/${gastoId}/quitar`, { motivo });
  }
}

/** El gasto como quedó en la base. */
export async function gastoEnBase(gastoId: string) {
  const [fila] = await consultar<{
    anticipo_id: string | null;
    estado: string;
    monto: string;
    monto_retenido: string;
    con_retencion: boolean;
    motivo_con_retencion: string | null;
    asignado_por: string | null;
    sin_bancarizar: boolean;
    fecha: string;
    fecha_de_anulacion: string | null;
  }>(
    `select anticipo_id, estado, monto, monto_retenido, con_retencion, motivo_con_retencion, asignado_por, sin_bancarizar,
            fecha::text, fecha_de_anulacion::text
       from cuentas_por_liquidar.gastos where id = $1`,
    [gastoId],
  );
  return fila!;
}

/** Lo auditado de un gasto, con quién lo hizo y cómo estaba antes. */
export const auditoriaDelGasto = (gastoId: string) =>
  consultar<{ accion: string; motivo: string | null; usuario_id: string; anterior: Record<string, any> }>(
    `select accion, motivo, usuario_id, anterior from core.auditoria
      where recurso = 'cuentas-por-liquidar.gastos' and registro_id = $1 order by creado_en`,
    [gastoId],
  );
