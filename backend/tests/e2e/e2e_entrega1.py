"""Verificación en navegador real (Chrome) del flujo de la entrega 1.
Uso: python3 e2e_entrega1.py  (backend en :4000 y frontend en :5173)
"""
import os, sys
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
        print(f'  FALLA {nombre}: {str(e).splitlines()[0][:200]}')

with sync_playwright() as p:
    chrome = os.environ.get('CHROME')  # ruta a Chrome; si no, usa el Chromium de Playwright
    nav = p.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else p.chromium.launch()
    pag = nav.new_page(viewport={'width': 1366, 'height': 820})
    pag.on('console', lambda m: m.type == 'error' and errores_consola.append(m.text))
    pag.on('pageerror', lambda e: errores_consola.append(str(e)))

    def login(email, clave):
        pag.fill('input[type=email]', email)
        pag.fill('input[type=password]', clave)
        pag.click('button[type=submit]')

    paso('1. /dashboard sin sesión redirige a /login', lambda: (
        pag.goto(f'{URL}/dashboard'), expect(pag).to_have_url(f'{URL}/login')))
    pag.screenshot(path=f'{SALIDA}/01-login.png')

    paso('2. campos vacíos -> mensaje', lambda: (
        pag.click('button[type=submit]'), expect(pag.get_by_text('Ingresa tu correo y tu contraseña.')).to_be_visible()))

    def credenciales_malas():
        login('admin@turatrash.co', 'malisima')
        expect(pag.get_by_text('Correo o contraseña incorrectos.')).to_be_visible()
    paso('3. credenciales incorrectas -> mensaje comprensible', credenciales_malas)
    pag.screenshot(path=f'{SALIDA}/02-credenciales-incorrectas.png')

    def operador():
        login('operador@turatrash.co', 'Operador123*')
        expect(pag.get_by_text('Esta cuenta no tiene permisos de administrador.')).to_be_visible()
    paso('4. usuario sin rol admin -> bloqueado', operador)
    pag.screenshot(path=f'{SALIDA}/03-usuario-sin-permisos.png')

    def inactivo():
        login('inactivo@turatrash.co', 'Inactivo123*')
        expect(pag.get_by_text('Tu cuenta está desactivada. Contacta al administrador.')).to_be_visible()
    paso('5. cuenta desactivada -> mensaje', inactivo)

    def admin():
        login('admin@turatrash.co', 'Admin123*')
        expect(pag).to_have_url(f'{URL}/dashboard')
        for m in ['Vehículos', 'Conductores', 'Rutas', 'Programación']:
            expect(pag.locator('.modulo', has_text=m)).to_be_visible()
        expect(pag.locator('.indicador').first).to_be_visible()
    paso('6. admin entra y ve los 4 módulos e indicadores', admin)
    pag.wait_for_timeout(800)
    pag.screenshot(path=f'{SALIDA}/04-dashboard.png', full_page=True)

    def recarga():
        pag.reload()
        expect(pag).to_have_url(f'{URL}/dashboard')
        expect(pag.locator('.modulo').first).to_be_visible()
    paso('7. recargar mantiene la sesión', recarga)

    def modulo():
        pag.locator('.modulo', has_text='Vehículos').click()
        expect(pag).to_have_url(f'{URL}/vehiculos')
        expect(pag.locator('table.tabla')).to_be_visible()
    paso('8. abrir módulo de vehículos', modulo)
    pag.screenshot(path=f'{SALIDA}/05-modulo-vehiculos.png', full_page=True)

    def salir():
        pag.get_by_role('button', name='Cerrar sesión').click()
        expect(pag).to_have_url(f'{URL}/login')
        expect(pag.get_by_text('Cerraste sesión correctamente.')).to_be_visible()
    paso('9. cerrar sesión -> login con mensaje', salir)
    pag.screenshot(path=f'{SALIDA}/06-sesion-cerrada.png')

    paso('10. tras cerrar sesión /dashboard vuelve a /login', lambda: (
        pag.goto(f'{URL}/dashboard'), expect(pag).to_have_url(f'{URL}/login')))

    nav.close()

# Los 401/403 esperados del login aparecen como "Failed to load resource" en consola.
reales = [e for e in errores_consola if 'Failed to load resource' not in e]
print(f'\nErrores de consola inesperados: {len(reales)}')
for e in reales[:10]:
    print('   ', e[:200])
print('RESULTADO:', 'TODO OK' if not fallos and not reales else f'{len(fallos)} fallo(s)')
sys.exit(1 if fallos or reales else 0)
