import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { CombustibleSinTasaVigente } from '../../../dominio/errores-de-calculo.js';
import {
  CatalogoInactivo,
  DestinoNoDisponible,
  EmpresaSinNit,
  NitDelEmisorNoCoincide,
  NotaSuperaLaFactura,
  ProveedorInactivo,
} from '../../../dominio/errores-de-documento.js';
import {
  combustibleId,
  crearEscenario,
  NIT_DEL_PROVEEDOR,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { DocumentoRepetido } from '../../errores.js';
import { RegistrarDocumento } from './registrar-documento.js';

let {
  proveedores,
  catalogos,
  consultas,
  repositorio,
  destinos,
  empresa,
  completadorDeNit,
  publicadorEventos,
  dependencias,
} = crearEscenario();
const registrar = (cambios: Partial<SolicitudDeDocumento> = {}, puedeAjustarRetenciones = false) =>
  new RegistrarDocumento(dependencias).ejecutar(operador, { solicitud: solicitud(cambios), puedeAjustarRetenciones });

beforeEach(() => {
  ({
    proveedores,
    catalogos,
    consultas,
    repositorio,
    destinos,
    empresa,
    completadorDeNit,
    publicadorEventos,
    dependencias,
  } = crearEscenario());
});

describe('registrar un documento: el proveedor y su NIT (H10)', () => {
  it('guarda el documento, lo manda al destino y publica el evento', async () => {
    const { documento } = await registrar();

    expect(documento.totales).toMatchObject({ total: '1120.00', iva: '120.00', base: '1000.00' });
    expect(repositorio.agregados).toHaveLength(1);
    expect(destinos.recibidos).toEqual([expect.objectContaining({ documentoId: documento.id, totalCentavos: 112000 })]);
    expect(publicadorEventos.nombres()).toEqual(['libro-de-compras.documento_registrado']);
  });

  it('si el proveedor no tiene NIT, le manda el del documento', async () => {
    await registrar({ nitEmisor: '576937-k' });

    expect(completadorDeNit.llamadas).toEqual([{ proveedorId, nit: NIT_DEL_PROVEEDOR }]);
  });

  it('si ya tiene el mismo NIT no manda nada, y si tiene otro lo rechaza', async () => {
    proveedores.filas.set(proveedorId, { ...proveedores.filas.get(proveedorId)!, nit: NIT_DEL_PROVEEDOR });
    await registrar();
    expect(completadorDeNit.llamadas).toEqual([]);

    await expect(registrar({ nitEmisor: '12345679', numero: '2' })).rejects.toThrow(NitDelEmisorNoCoincide);
  });

  it('un recibo desmarcado no necesita el NIT del emisor ni toca el del proveedor', async () => {
    const { documento } = await registrar({
      tipo: 'recibo',
      motivoFueraDelLibro: 'sin_fel',
      nitEmisor: null,
      serie: null,
      autorizacionFel: null,
    });

    expect(documento).toMatchObject({ nitEmisor: null, muestraEnReportesSat: false, nitReceptor: '12345679' });
    expect(completadorDeNit.llamadas).toEqual([]);
  });

  it('rechaza un proveedor ajeno, uno inactivo y una empresa sin NIT', async () => {
    proveedores.filas.set(proveedorId, { ...proveedores.filas.get(proveedorId)!, activo: false });
    await expect(registrar()).rejects.toThrow(ProveedorInactivo);
    await expect(registrar({ proveedorId: crypto.randomUUID() })).rejects.toThrow(RecursoNoEncontrado);

    proveedores.filas.set(proveedorId, { ...proveedores.filas.get(proveedorId)!, activo: true });
    empresa.nitDeLaEmpresa = null;
    await expect(registrar()).rejects.toThrow(EmpresaSinNit);
  });

  it('un documento igual en la empresa se rechaza con el enlace al registrado; la serie y el número se normalizan', async () => {
    const { documento } = await registrar({ serie: ' a b ', numero: ' 7 ' });

    await expect(registrar({ serie: 'AB', numero: '7' })).rejects.toThrow(DocumentoRepetido);
    expect(repositorio.agregados[0]).toMatchObject({ id: documento.id, serie: 'AB', numero: '7' });
  });
});

describe('registrar un documento: destino, catálogos y notas', () => {
  it('un destino que no está activo se rechaza, y el que lo rechaza no deja evento', async () => {
    destinos.instalados = [];
    await expect(registrar()).rejects.toThrow(DestinoNoDisponible);

    destinos.instalados = ['cuentas-por-pagar'];
    destinos.fallo = new Error('el destino lo rechazó');
    await expect(registrar()).rejects.toThrow('el destino lo rechazó');
    expect(publicadorEventos.publicados).toEqual([]);
  });

  it('un concepto inactivo se rechaza y un combustible sin tasa vigente también', async () => {
    catalogos.listaDeConceptos[0]!.activo = false;
    await expect(registrar()).rejects.toThrow(CatalogoInactivo);

    catalogos.listaDeConceptos[0]!.activo = true;
    catalogos.listaDeCombustibles.push({ combustibleId, nombre: 'Diésel', activo: true, vigencia: null });
    const lineas = [{ ...solicitud().lineas[0]!, combustibleId, galones: '10.000' }];
    await expect(registrar({ lineas })).rejects.toThrow(CombustibleSinTasaVigente);
  });

  it('una nota que, con las anteriores, supera el total de la factura se rechaza', async () => {
    const facturaId = crypto.randomUUID();
    consultas.facturas.set(facturaId, {
      id: facturaId,
      tipo: 'factura',
      estado: 'vigente',
      proveedorId,
      destino: 'cuentas-por-pagar',
      motivoSinCredito: null,
      fechaEmision: '2026-10-01',
      total: 112000,
      iva: 12000,
      totalDeNotas: 100000,
      ivaDeNotas: 0,
    });

    await expect(registrar({ tipo: 'nota_de_credito', documentoAfectadoId: facturaId, serie: 'N' })).rejects.toThrow(
      NotaSuperaLaFactura,
    );
  });
});
