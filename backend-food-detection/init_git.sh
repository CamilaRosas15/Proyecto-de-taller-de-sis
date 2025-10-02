#!/bin/bash

# 🚀 Script para inicializar y subir el proyecto a GitHub

echo "🔧 Inicializando repositorio Git..."

# Verificar si ya existe un repositorio git
if [ ! -d ".git" ]; then
    git init
    echo "✅ Repositorio Git inicializado"
else
    echo "ℹ️ Repositorio Git ya existe"
fi

# Agregar todos los archivos
echo "📁 Agregando archivos al repositorio..."
git add .

# Hacer commit inicial
echo "💾 Creando commit inicial..."
git commit -m "🍽️ Initial commit: Food Detection API ready for Vercel deployment

- ✅ FastAPI backend with Google Gemini 1.5 Flash
- ✅ Food detection and nutrition analysis
- ✅ Optimized for Flutter mobile apps
- ✅ CORS configured for mobile development
- ✅ Ready for Vercel deployment from GitHub
- ✅ Comprehensive documentation included"

echo "🎉 ¡Repositorio preparado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Crear repositorio en GitHub: https://github.com/new"
echo "2. Ejecutar estos comandos:"
echo ""
echo "   git remote add origin https://github.com/TU_USUARIO/backend-comidas.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Ir a Vercel y conectar el repositorio"
echo "4. Configurar GEMINI_API_KEY en las variables de entorno"
echo ""
echo "🚀 ¡Tu API estará desplegada automáticamente!"