# Lectura Viva Rural

Aplicación web estática para GitHub Pages, diseñada para estudiantes de cuarto de primaria.

## Qué permite

- Ver las 20 actividades del proyecto.
- Subir evidencias de actividades desde el navegador.
- Visualizar imágenes, audios, videos, PDF y otros archivos.
- Descargar recursos guardados.
- Exportar los recursos en un archivo JSON.
- Importar recursos en otro computador.

## Importante

Esta versión está pensada para GitHub Pages. No usa PHP, Node.js ni base de datos en servidor.

Los recursos subidos quedan guardados en el navegador mediante IndexedDB. Por eso:

- Si se abre la app en otro computador, no aparecerán los recursos anteriores.
- Para compartir recursos, se debe usar la opción "Exportar recursos JSON".
- Para reutilizarlos en otro computador, se usa "Importar recursos JSON".

## Cómo publicarla en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir todos los archivos de esta carpeta.
3. Entrar al repositorio en GitHub.
4. Ir a Settings.
5. Ir a Pages.
6. En Build and deployment, seleccionar Deploy from a branch.
7. Seleccionar la rama main y la carpeta root.
8. Guardar.
9. Abrir la URL pública que genera GitHub Pages.

## Estructura

```text
lectura-viva-rural-github/
├── index.html
├── actividades.html
├── subir.html
├── recursos.html
├── progreso.html
├── css/
│   └── estilos.css
├── js/
│   └── app.js
└── data/
    └── actividades.json
```

## Para almacenamiento multiusuario real

GitHub Pages no guarda archivos subidos en el repositorio. Para que todos los estudiantes y docentes compartan evidencias en una misma base de datos, se requiere conectar la app a un backend, por ejemplo:

- Firebase
- Supabase
- Appwrite
- Backend propio en Render, Railway, VPS o servidor institucional
- Versión PHP en XAMPP o servidor Apache
