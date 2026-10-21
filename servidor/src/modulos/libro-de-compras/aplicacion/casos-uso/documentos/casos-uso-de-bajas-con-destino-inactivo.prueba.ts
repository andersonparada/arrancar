import { beforeEach, describe, expect, it } from 'vitest';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();
let documentoId = '';
const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });
const anular = (origen?: 'cuentas-por-pagar') =>
  new AnularDocumento(bajas()).ejecutar(operador, { documentoId, causa: 'error_de_captura', motivo: 'Prueba', origen });
const eliminar = (origen?: 'cuentas-por-pagar') =>
  new EliminarDocumento(bajas()).ejecutar(operador, { documentoId, origen });

beforeEach(async () => {
  e = crearEscenario();
  await new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(),
    puedeAjustarRetenciones: false,
  });
  const documento = e.repositorio.agregados[0]!;
  documentoId = documento.id;
  e.guardados.sembrar(documento);
  e.publicadorEventos.publicados.length = 0;
});

describe('bajas con el destino desactivado', () => {
  const MENSAJE = 'Active Cuentas por pagar para dar de baja este documento.';

  it('anular se rechaza con el mensaje de activar el módulo y no cambia nada', async () => {
    e.destinos.instalados = [];

    await expect(anular()).rejects.toMatchObject({ codigo: 'destino_inactivo', message: MENSAJE });
    expect(e.destinos.avisosDeAnular).toEqual([]);
    expect(e.auditoria.entradas).toEqual([]);
    expect(e.publicadorEventos.publicados).toEqual([]);
  });

  it('eliminar se rechaza igual y el documento sigue en el libro', async () => {
    e.destinos.instalados = [];

    await expect(eliminar()).rejects.toMatchObject({ codigo: 'destino_inactivo', message: MENSAJE });
    expect(e.destinos.avisosDeEliminar).toEqual([]);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('con el destino activo, las bajas siguen su camino', async () => {
    await expect(anular()).resolves.toBeDefined();
  });

  it('si la baja la pide el propio destino, no hace falta revisar si está activo', async () => {
    e.destinos.instalados = [];

    await expect(eliminar('cuentas-por-pagar')).resolves.toBeDefined();
    expect(e.destinos.avisosDeEliminar).toEqual([]);
  });
});
