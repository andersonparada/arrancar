import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import { EscenarioDePagos } from './cuentas-por-pagar-pagar.js';
import type { EntornoApi } from './entorno-api.js';
import { crearUsuarioConPermisos } from './escenarios.js';

export const RUTA_DE_PAGOS = '/api/cuentas-por-pagar/pagos';

export interface CorreoDelPago {
  id: string;
  estado: string;
  asunto: string;
  cuerpo_texto: string;
  responder_a: string | null;
  adjunto_nombre: string | null;
  adjunto_archivo_id: string | null;
  motivo_de_cancelacion: string | null;
}

/**
 * Un escenario de pagos con el correo de la empresa puesto, a Soporte dentro de la empresa y un usuario que solo ve los
 * pagos; con ayudas para armar pagos con contactos y mirar lo que quedó en la bandeja de correo.
 */
export class AvisosDePrueba {
  private constructor(
    readonly e: EscenarioDePagos,
    readonly soloVer: ClienteApi,
  ) {}

  static async preparar(entorno: EntornoApi, usuario: string): Promise<AvisosDePrueba> {
    const e = await EscenarioDePagos.preparar(entorno, usuario);
    const { cuenta } = e.mundo.escenario;
    await comoPropietario('update core.empresas set correo = $1 where id = $2', ['pagos@rancho.com', cuenta.empresaId]);
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Pagos',
      permisos: ['cuentas-por-pagar.pagos.ver'],
    });
    return new AvisosDePrueba(e, soloVer);
  }

  aviso(pagoId: string, cliente: ClienteApi = this.e.propietario()) {
    return cliente.get(`${RUTA_DE_PAGOS}/${pagoId}/aviso`);
  }

  enviar(pagoId: string, cuerpo: Record<string, unknown>, cliente: ClienteApi = this.e.propietario()) {
    return cliente.post(`${RUTA_DE_PAGOS}/${pagoId}/aviso`, cuerpo);
  }

  /** Con `inservible`, el correo se pone directo en la base: el formulario no deja guardar uno que no sirve. */
  private async agregarContacto(terceroId: string, { inservible, ...datos }: Record<string, unknown>): Promise<string> {
    const respuesta = await this.e.propietario().post(`/api/terceros/${terceroId}/contactos`, datos);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    if (inservible) {
      await comoPropietario('update terceros.contactos set correo = $1 where id = $2', [
        inservible,
        respuesta.cuerpo.id,
      ]);
    }
    return respuesta.cuerpo.id;
  }

  /** Un proveedor con un cargo, sus correos y un cheque pagado. */
  async pagoConProveedor(correos: { principal?: string; contactos?: Array<Record<string, unknown>> } = {}) {
    const { proveedor, cargo } = await this.e.proveedorConCargo();
    const [fila] = await comoPropietario<{ tercero_id: string }>(
      'select tercero_id from terceros.proveedores where id = $1',
      [proveedor.proveedorId],
    );
    const terceroId = fila!.tercero_id;
    if (correos.principal) {
      await comoPropietario('update terceros.terceros set correo = $1 where id = $2', [correos.principal, terceroId]);
    }
    const contactos: string[] = [];
    for (const datos of correos.contactos ?? []) contactos.push(await this.agregarContacto(terceroId, datos));
    const pago = await this.e.pagar(this.e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    return { pagoId: pago.cuerpo.id as string, numero: pago.cuerpo.numero as string, terceroId, contactos };
  }

  correosDe(pagoId: string): Promise<CorreoDelPago[]> {
    return comoPropietario<CorreoDelPago>(
      `select id, estado, asunto, cuerpo_texto, responder_a, adjunto_nombre, adjunto_archivo_id, motivo_de_cancelacion
         from core.correos_salientes where registro_origen_id = $1 order by creado_en`,
      [pagoId],
    );
  }

  destinatariosDe(correoId: string) {
    return comoPropietario<{ direccion: string; clase: string; origen: string }>(
      'select direccion, clase, origen from core.destinatarios_de_correos where correo_saliente_id = $1 order by clase desc, direccion',
      [correoId],
    );
  }
}
