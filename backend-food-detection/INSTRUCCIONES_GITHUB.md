# 🚀 INSTRUCCIONES PARA SUBIR A GITHUB Y DESPLEGAR EN VERCEL

## ✅ Estado actual: Repositorio Git inicializado

Tu proyecto ya está listo para subir a GitHub. Sigue estos pasos:

## 📋 Paso 1: Crear repositorio en GitHub

1. Ve a: https://github.com/new
2. Nombre del repositorio: `backend-comidas`
3. Descripción: `Food Detection API with Google Gemini for Flutter apps`
4. Público o Privado (tu elección)
5. **NO** marques "Add a README file" (ya tienes uno)
6. Click en "Create repository"

## 📋 Paso 2: Conectar y subir tu código

Copia y pega estos comandos en tu terminal:

```bash
git remote add origin https://github.com/Jeysson16/backend-comidas.git
git branch -M main
git push -u origin main
```

## 📋 Paso 3: Desplegar en Vercel

### Opción A: Automático (Recomendado)
1. Ve a: https://vercel.com
2. Click en "New Project"
3. Click en "Import Git Repository"
4. Selecciona tu repositorio `backend-comidas`
5. Click en "Import"
6. Vercel detectará automáticamente que es un proyecto Python

### Opción B: Con botón de despliegue
1. Después de subir a GitHub, edita el README.md
2. Cambia la URL del botón por tu repositorio real
3. Cualquiera podrá desplegar tu API con un click

## 📋 Paso 4: Configurar variables de entorno en Vercel

En el dashboard de Vercel, ve a tu proyecto > Settings > Environment Variables:

```
GEMINI_API_KEY = AIzaSyAeDzo48j9aduj0aOsucl413MZ9cqw-5IY
CORS_ORIGINS = *
ENVIRONMENT = production
DEBUG = false
```

## 🎉 ¡Listo!

Después del despliegue tendrás:

- **URL de producción**: `https://backend-comidas-jeysson16.vercel.app`
- **Documentación**: `https://backend-comidas-jeysson16.vercel.app/docs`
- **Despliegue automático**: Cada push a main desplegará automáticamente

## 🔄 Para futuras actualizaciones:

```bash
git add .
git commit -m "Descripción de los cambios"
git push
```

Vercel desplegará automáticamente cada cambio.

## 📱 Para usar en Flutter:

```dart
const String apiUrl = 'https://backend-comidas-jeysson16.vercel.app';
```

## 🆘 Si tienes problemas:

1. **Error de Git**: Asegúrate de tener Git instalado
2. **Error de push**: Verifica que el repositorio existe en GitHub
3. **Error de Vercel**: Revisa que las variables de entorno estén configuradas
4. **Error de API**: Verifica que GEMINI_API_KEY sea válida

---

**¡Tu API está lista para el mundo! 🌍**