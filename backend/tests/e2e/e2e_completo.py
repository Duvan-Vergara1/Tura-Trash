"""Verificación en Chrome de los módulos de las entregas 2, 3 y 4.
Requiere backend (:4000) con `npm run db:seed` recién ejecutado y frontend (:5173).
"""
import os, re, sys
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('FRONT', 'http://localhost:5173')
SALIDA = os.environ.get('SALIDA', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capturas'))
os.makedirs(SALIDA, exist_ok=True)
fallos, errores_consola = [], []

def paso(nombre, fn):
    try:
        fn()
        print(f'  OK  {nombre}')
    except Exception as e:  # noqa
        fallos.append(nombre)
        print(f'  FALLA {nombre}: {str(e).splitlines()[0][:220]}')

def foto(pag, nombre, completa=True):
    pag.wait_for_timeout(500)
    pag.screenshot(path=f'{SALIDA}/{nombre}.png', full_page=completa)

with sync_playwright() as p:
    chrome = os.environ.get('CHROME')  # ruta a Chrome; si no, usa el Chromium de Playwright
    nav = p.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else p.chromium.launch()
    pag = nav.new_page(viewport={'width': 1366, 'height': 860})
    pag.on('console', lambda m: m.type == 'error' and errores_consola.append(m.text))
    pag.on('pageerror', lambda e: errores_consola.append(str(e)))
    respuesta_dialogo = {'texto': ''}
    pag.on('dialog', lambda d: d.accept(respuesta_dialogo['texto']) if d.type == 'prompt' else d.accept())

    modal = lambda: pag.locator('.modal__caja')
    campo = lambda etiqueta: modal().locator('label.campo', has_text=etiqueta).locator('input, select, textarea').first

    pag.goto(f'{URL}/login')
    pag.fill('input[type=email]', 'admin@turatrash.co')
    pag.fill('input[type=password]', 'Admin123*')
    pag.click('button[type=submit]')
    expect(pag).to_have_url(f'{URL}/dashboard')
    total_vehiculos = int(pag.locator('.indicador', has_text='Total').first.locator('.indicador__valor').inner_text())

    # ------------------------------------------------------------ Vehículos
    def vehiculo_validacion():
        pag.goto(f'{URL}/vehiculos')
        pag.get_by_role('button', name='+ Nuevo vehículo').click()
        modal().get_by_role('button', name='Guardar').click()
        expect(modal().locator('.campo__error').first).to_be_visible()
        expect(modal().get_by_text(re.compile('formato ABC123'))).to_be_visible()
    paso('V1. formulario vacío muestra errores por campo', vehiculo_validacion)
    foto(pag, '10-vehiculo-errores', False)

    def vehiculo_crear():
        campo('Placa').fill('qwe-789')
        campo('Marca').fill('Mercedes')
        campo('Modelo').fill('Atego')
        campo('Año').fill('2022')
        campo('Capacidad').fill('8000')
        modal().get_by_role('button', name='Guardar').click()
        expect(pag.get_by_text('Vehículo registrado.')).to_be_visible()
        expect(pag.locator('td .placa', has_text='QWE789')).to_be_visible()
    paso('V2. registrar vehículo (placa normalizada a QWE789)', vehiculo_crear)

    def vehiculo_duplicado():
        pag.get_by_role('button', name='+ Nuevo vehículo').click()
        campo('Placa').fill('QWE789')
        campo('Marca').fill('Otro')
        campo('Modelo').fill('X')
        modal().get_by_role('button', name='Guardar').click()
        expect(modal().locator('.campo__error', has_text='Ya existe un vehículo con esa placa.')).to_be_visible()
        modal().get_by_role('button', name='Cancelar').click()
    paso('V3. placa repetida -> error claro', vehiculo_duplicado)

    def vehiculo_editar_estado():
        fila = pag.locator('tr', has_text='QWE789')
        fila.get_by_role('button', name='Editar').click()
        modal().get_by_role('button', name='Mantenimiento', exact=True).click()
        modal().get_by_role('button', name='Guardar').click()
        expect(pag.get_by_text('Vehículo actualizado.')).to_be_visible()
        expect(pag.locator('tr', has_text='QWE789').get_by_text('Mantenimiento')).to_be_visible()
    paso('V4. editar y cambiar estado operativo', vehiculo_editar_estado)

    def vehiculo_consultar():
        pag.locator('tr', has_text='QWE789').get_by_role('button', name='Ver').click()
        expect(modal().get_by_text('Mercedes Atego')).to_be_visible()
        pag.keyboard.press('Escape')
    paso('V5. consultar detalle', vehiculo_consultar)

    def vehiculo_desactivar():
        pag.locator('tr', has_text='QWE789').get_by_role('button', name='Desactivar').click()
        expect(pag.get_by_text('Vehículo QWE789 desactivado.')).to_be_visible()
        expect(pag.locator('tr', has_text='QWE789').get_by_text('Desactivado')).to_be_visible()
    paso('V6. desactivar vehículo', vehiculo_desactivar)
    foto(pag, '11-vehiculos')

    # ---------------------------------------------------------- Conductores
    def conductor_crear():
        pag.goto(f'{URL}/conductores')
        pag.get_by_role('button', name='+ Nuevo conductor').click()
        campo('Nombres').fill('Prueba')
        campo('Apellidos').fill('Navegador Chrome')
        campo('Número de documento').fill('98765432')
        campo('Número *').fill('LICE2E1')
        campo('Vence').fill('2028-12-31')
        modal().get_by_role('button', name='Guardar').click()
        expect(pag.get_by_text('Conductor registrado.')).to_be_visible()
    paso('C1. registrar conductor con licencia', conductor_crear)

    def conductor_duplicado():
        pag.get_by_role('button', name='+ Nuevo conductor').click()
        campo('Nombres').fill('Otro')
        campo('Apellidos').fill('Duplicado')
        campo('Número de documento').fill('98765432')
        campo('Número *').fill('LICE2E1')
        campo('Vence').fill('2028-12-31')
        modal().get_by_role('button', name='Guardar').click()
        expect(modal().locator('.campo__error', has_text='Ya existe un conductor con ese número de documento.')).to_be_visible()
        expect(modal().locator('.campo__error', has_text='Ya existe un conductor con ese número de licencia.')).to_be_visible()
        modal().get_by_role('button', name='Cancelar').click()
    paso('C2. documento repetido -> error claro', conductor_duplicado)
    foto(pag, '12-conductores')

    # -------------------------------------------------------- Barrios/rutas
    def barrio_crear():
        pag.goto(f'{URL}/barrios')
        pag.get_by_role('button', name='+ Nuevo barrio').click()
        campo('Nombre').fill('Barrio Prueba E2E')
        modal().get_by_role('button', name='Guardar').click()
        expect(pag.get_by_text('Barrio registrado.')).to_be_visible()
    paso('B1. registrar barrio', barrio_crear)

    def ruta_crear():
        pag.goto(f'{URL}/rutas/nueva')
        pag.locator('label.campo', has_text='Nombre').locator('input').fill('Ruta E2E Navegador')
        pag.locator('label.campo', has_text='Descripción').locator('textarea').fill('Ruta creada desde la prueba en Chrome')
        pag.locator('.casillas label', has_text='Barrio Prueba E2E').locator('input').check()
        mapa = pag.locator('.leaflet-container')
        expect(mapa).to_be_visible()
        caja = mapa.bounding_box()
        for dx, dy in [(0.3, 0.5), (0.5, 0.45), (0.7, 0.55)]:
            pag.mouse.click(caja['x'] + caja['width'] * dx, caja['y'] + caja['height'] * dy)
            pag.wait_for_timeout(150)
        expect(pag.get_by_text('Puntos: 3')).to_be_visible()
        foto(pag, '13-ruta-dibujando', False)
        pag.get_by_role('button', name='Guardar ruta').click()
        expect(pag).to_have_url(f'{URL}/rutas')
        expect(pag.get_by_text('Ruta "Ruta E2E Navegador" creada.')).to_be_visible()
        expect(pag.locator('tr', has_text='Ruta E2E Navegador').get_by_text(re.compile('3 puntos'))).to_be_visible()
    paso('R1. crear ruta dibujando 3 puntos en el mapa', ruta_crear)

    def ruta_reconstruir():
        pag.locator('tr', has_text='Ruta E2E Navegador').get_by_role('link', name='Ver / editar').click()
        expect(pag.get_by_text('Puntos: 3')).to_be_visible()
        expect(pag.locator('.leaflet-overlay-pane path')).to_have_count(4)  # 1 línea + 3 puntos
    paso('R2. el recorrido guardado se reconstruye en el mapa', ruta_reconstruir)
    foto(pag, '14-ruta-reconstruida', False)

    def ruta_suspender():
        pag.goto(f'{URL}/rutas')
        respuesta_dialogo['texto'] = 'Prueba de suspensión'
        pag.locator('tr', has_text='Ruta E2E Navegador').get_by_role('button', name='Suspender').click()
        expect(pag.get_by_text('Ruta suspendida.')).to_be_visible()
        pag.locator('tr', has_text='Ruta E2E Navegador').get_by_role('button', name='Activar').click()
        expect(pag.get_by_text('Ruta activada.')).to_be_visible()
    paso('R3. suspender (con motivo) y activar ruta', ruta_suspender)
    foto(pag, '15-rutas')

    # ---------------------------------------------------------- Programación
    def turno_crear():
        pag.goto(f'{URL}/turnos')
        pag.get_by_role('button', name='+ Nuevo turno').click()
        campo('Nombre').fill('Noche E2E')
        campo('Hora de inicio').fill('22:00')
        campo('Hora de finalización').fill('23:59')
        modal().get_by_role('button', name='Guardar').click()
        expect(pag.get_by_text('Turno creado.')).to_be_visible()
    paso('T1. crear turno con hora de inicio y fin', turno_crear)

    def programar_ok():
        pag.goto(f'{URL}/programacion')
        pag.get_by_role('button', name='+ Programar ruta').click()
        campo('Ruta').select_option(label='Ruta E2E Navegador')
        campo('Turno').select_option(label='Noche E2E (22:00 – 23:59)')
        campo('Vehículo').select_option(index=1)
        campo('Conductor').select_option(index=1)
        expect(modal().get_by_text('Sin conflictos')).to_be_visible(timeout=5000)
        foto(pag, '16-programacion-formulario', False)
        modal().get_by_role('button', name='Guardar programación').click()
        expect(pag.get_by_text('Programación creada.')).to_be_visible()
    paso('P1. programar ruta: revisión en vivo sin conflictos y guardar', programar_ok)

    def programar_conflicto():
        pag.get_by_role('button', name='+ Programar ruta').click()
        campo('Ruta').select_option(label='Ruta Avenida Simón Bolívar')
        campo('Turno').select_option(label='Noche E2E (22:00 – 23:59)')
        campo('Vehículo').select_option(index=1)
        campo('Conductor').select_option(index=1)
        expect(modal().get_by_text('Conflictos de horario:')).to_be_visible(timeout=5000)
        foto(pag, '17-programacion-conflicto', False)
        modal().get_by_role('button', name='Guardar programación').click()
        expect(modal().locator('.aviso--error').first).to_contain_text('conflicto')
        modal().get_by_role('button', name='Cancelar').click()
    paso('P2. conflicto de vehículo/conductor se advierte y no se guarda', programar_conflicto)

    def recursos_filtrados():
        pag.get_by_role('button', name='+ Programar ruta').click()
        opciones_vehiculo = campo('Vehículo').locator('option').all_inner_texts()
        assert not any('TRB104' in o or 'TRB105' in o or 'TRB106' in o or 'QWE789' in o for o in opciones_vehiculo), opciones_vehiculo
        opciones_ruta = campo('Ruta').locator('option').all_inner_texts()
        assert not any('Orgánicos' in o or 'Escombros' in o for o in opciones_ruta), opciones_ruta
        opciones_conductor = campo('Conductor').locator('option').all_inner_texts()
        assert not any('Grueso' in o or 'Obregón' in o or 'Rentería' in o for o in opciones_conductor), opciones_conductor
        modal().get_by_role('button', name='Cancelar').click()
    paso('P3. no ofrece vehículos/conductores/rutas no asignables', recursos_filtrados)

    def cancelar_programacion():
        respuesta_dialogo['texto'] = 'Prueba de cancelación'
        pag.locator('tr', has_text='Ruta E2E Navegador').get_by_role('button', name='Cancelar').click()
        expect(pag.get_by_text('Programación cancelada.')).to_be_visible()
    paso('P4. cancelar programación con motivo', cancelar_programacion)
    pag.locator('.filtros select').first.select_option('')
    foto(pag, '18-programaciones')

    # ------------------------------------------------------------ Dashboard
    def dashboard_final():
        pag.goto(f'{URL}/dashboard')
        expect(pag.locator('table.tabla tbody tr').first).to_be_visible()
        nuevo_total = int(pag.locator('.indicador', has_text='Total').first.locator('.indicador__valor').inner_text())
        assert nuevo_total == total_vehiculos + 1, f'{total_vehiculos} -> {nuevo_total}'
    paso('D1. indicadores cambian con los datos (1 vehículo más)', dashboard_final)

    def dashboard_mapa():
        pag.locator('table.tabla tbody tr').first.get_by_role('button', name='Ver mapa').click()
        expect(modal().locator('.leaflet-container')).to_be_visible()
        expect(modal().locator('.leaflet-overlay-pane path').first).to_be_visible()
        foto(pag, '19-dashboard-mapa', False)
        pag.keyboard.press('Escape')
    paso('D2. desde un servicio del día se abre el mapa del recorrido', dashboard_mapa)

    def dashboard_filtro():
        pag.locator('.filtros label', has_text='Vehículo').locator('select').select_option(label='TRB102')
        pag.wait_for_timeout(600)
        filas = pag.locator('table.tabla tbody tr')
        assert filas.count() >= 1
        for i in range(filas.count()):
            assert 'TRB102' in filas.nth(i).inner_text()
    paso('D3. filtrar servicios del día por vehículo', dashboard_filtro)

    def dashboard_estado():
        pag.locator('table.tabla tbody tr').first.locator('select').select_option('EN_CURSO')
        pag.wait_for_timeout(600)
        pag.reload()
        expect(pag.locator('.indicador', has_text='Servicios hoy')).to_contain_text('1 en curso')
    paso('D4. cambiar el estado de un servicio del día', dashboard_estado)
    foto(pag, '20-dashboard-final')

    # ----------------------------------------------------------------- Móvil
    pag.set_viewport_size({'width': 390, 'height': 844})
    pag.goto(f'{URL}/dashboard')
    pag.wait_for_timeout(600)
    foto(pag, '21-movil-dashboard', False)
    nav.close()

reales = [e for e in errores_consola if 'Failed to load resource' not in e]
print(f'\nErrores de consola inesperados: {len(reales)}')
for e in reales[:10]:
    print('   ', e[:200])
print('RESULTADO:', 'TODO OK' if not fallos and not reales else f'{len(fallos)} fallo(s): {fallos}')
sys.exit(1 if fallos or reales else 0)
