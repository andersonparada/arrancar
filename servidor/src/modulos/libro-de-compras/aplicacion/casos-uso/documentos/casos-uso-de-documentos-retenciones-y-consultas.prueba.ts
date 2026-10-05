import { beforeEach, describe, expect, it } from 'vitest';
import { AccesoDenegado, RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import { MotivoDelAjusteObligatorio } from '../../../dominio/errores-de-documento.js';
import {
  crearEscenario,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { ListarDestinos, ObtenerDestinoSugerido } from './consultas-del-formulario.js';
import { PrevisualizarDocumento } from './previsualizar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let { consultas, repositorio, destinos, completadorDeNit, datosDeEmpresa, publicadorEventos, auditoria, dependencias } =
  crearEscenario();
const registrar = (cambios: Partial<SolicitudDeDocumento> = {}, puedeAjustarRetenciones = false) =>
  new RegistrarDocumento(dependencias).ejecutar(operador, { solicitud: solicitud(cambios), puedeAjustarRetenciones });

beforeEach(() => {
  ({ consultas, repositorio, destinos, completadorDeNit, datosDeEmpresa, publicadorEventos, auditoria, dependencias } =
    crearEscenario());
});

describe('retenciones ajustadas', () => {
  const conRetencion = (ajustes: SolicitudDeDocumento['ajustesDeRetenciones']) => ({
    lineas: [{ ...solicitud().lineas[0]!, total: '5600.00' }],
    ajustesDeRetenciones: ajustes,
  });

  beforeEach(() => {
    const base = DatosFiscalesDeEmpresa.porOmision().instantanea();
    datosDeEmpresa.filas.set(
      operador.empresaId,
      DatosFiscalesDeEmpresa.crear({ ...base, agenteDeRetencionIva: 'contribuyente_especial' }),
    );
  });

  it('cambiar el monto sin motivo se rechaza, y sin el permiso de ajustar también', async () => {
    const sinMotivo = conRetencion([{ regla: 'iva_contribuyente_especial', monto: '50.00', motivo: null }]);
    await expect(registrar(sinMotivo, true)).rejects.toThrow(MotivoDelAjusteObligatorio);

    const conMotivo = conRetencion([{ regla: 'iva_contribuyente_especial', monto: '50.00', motivo: 'Convenio' }]);
    await expect(registrar(conMotivo, false)).rejects.toThrow(AccesoDenegado);
  });

  it('un ajuste con permiso y motivo se guarda con la propuesta y se audita como corrección', async () => {
    const quitar = conRetencion([{ regla: 'iva_contribuyente_especial', monto: '0', motivo: 'Exento' }]);

    const { documento, avisos } = await registrar(quitar, true);

    expect(documento.retenciones[0]).toMatchObject({
      montoPropuesto: '90.00',
      monto: '0.00',
      motivoDelAjuste: 'Exento',
    });
    expect(auditoria.acciones()).toEqual(['libro-de-compras.retenciones:corregir']);
    expect(avisos.join(' ')).toContain('solidaria');
  });
});

describe('vista previa y consultas del formulario', () => {
  it('la vista previa calcula sin guardar, sin completar el NIT y sin avisar al destino', async () => {
    const respuesta = await new PrevisualizarDocumento(dependencias).ejecutar(operador, {
      solicitud: solicitud(),
      puedeAjustarRetenciones: false,
    });

    expect(respuesta.documento.id).toBeNull();
    expect(respuesta.documento.totales.total).toBe('1120.00');
    expect([
      repositorio.agregados,
      completadorDeNit.llamadas,
      destinos.recibidos,
      publicadorEventos.publicados,
    ]).toEqual([[], [], [], []]);
  });

  it('avisa si el proveedor no tiene datos fiscales guardados', async () => {
    const { avisos } = await new PrevisualizarDocumento(dependencias).ejecutar(operador, {
      solicitud: solicitud(),
      puedeAjustarRetenciones: false,
    });

    expect(avisos.join(' ')).toContain('no tiene datos fiscales guardados');
  });

  it('lista los destinos activos y sugiere el último solo si sigue activo', async () => {
    const sugerir = () => new ObtenerDestinoSugerido(dependencias).ejecutar(operador, proveedorId);
    consultas.ultimoDestino = 'cuentas-por-pagar';

    expect(await new ListarDestinos(dependencias).ejecutar(operador)).toEqual([{ clave: 'cuentas-por-pagar' }]);
    expect(await sugerir()).toEqual({ destino: 'cuentas-por-pagar' });
    destinos.instalados = [];
    expect(await sugerir()).toEqual({ destino: null });
    expect(await new ListarDestinos(dependencias).ejecutar(operador)).toEqual([]);
    await expect(new ObtenerDestinoSugerido(dependencias).ejecutar(operador, crypto.randomUUID())).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
