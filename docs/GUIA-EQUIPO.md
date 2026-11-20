# Guía de trabajo en equipo

Cómo se sube cada aporte para que quede **identificado a nombre de cada integrante** (requisito de todas las entregas).

## Reglas

1. Nadie sube directo a `main`. Cada tarea va en su propia rama y entra por **pull request**.
2. Cada persona trabaja y hace `push` **con su propia cuenta de GitHub**.
3. El pull request lo revisa y lo une otra persona del equipo.
4. Antes de abrir el pull request: `npm test` en el backend y `npm run build` en el frontend sin errores.

## Paso a paso

```bash
# 1. Traer lo último de main
git checkout main
git pull

# 2. Crear la rama de tu tarea
git checkout -b feature/dashboard

# 3. Trabajar y guardar cambios con mensajes claros
git add .
git commit -m "feat(frontend): dashboard con indicadores y módulos"

# 4. Subir la rama
git push -u origin feature/dashboard
```

5. En GitHub: **Compare & pull request** → describe qué hiciste y cómo probarlo → asigna un revisor.

Nombres de rama: `feature/<tema>`, `fix/<tema>`, `docs/<tema>`.
Mensajes de commit: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`.

## Release semanal

Al cerrar cada entrega (antes del lunes 11:59 p. m.):

1. Asegúrate de que `main` tiene todo unido y las capturas de evidencia están en `docs/evidencia`.
2. GitHub → **Releases → Draft a new release**.
3. Tag: `semana-1` (luego `semana-2`, `semana-3`, `semana-4`), sobre la rama `main`.
4. Título: `Entrega 1 · Acceso administrativo`. En la descripción: qué incluye y el enlace a la evidencia.
5. **Publish release** y copia el enlace en el README.

> La evidencia debe tomarse sobre el mismo código del release: primero se toman las capturas, se suben, y después se crea el release.
