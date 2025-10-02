#!/usr/bin/env python3
"""
Script para probar la detección de alimentos y mostrar la respuesta JSON pura
"""

import requests
import json
import os
from pathlib import Path

def test_json_response():
    """
    Prueba la detección de alimentos con una imagen y muestra la respuesta JSON pura
    """
    
    # URL base del API
    base_url = "http://localhost:8000/api/v1"
    
    print("Probando Detección de Alimentos - Respuesta JSON")
    print("=" * 60)
    
    # 1. Verificar estado de Gemini
    try:
        response = requests.get(f"{base_url}/ai/gemini-status")
        if response.status_code == 200:
            result = response.json()
            status = result['gemini_status']
            if not status['gemini_configured']:
                print("\nGemini no está configurado correctamente")
                return
        else:
            print(f"Error verificando estado: {response.status_code}")
            return
    except Exception as e:
        print(f"Error conectando al servidor: {e}")
        return
    
    # 2. Buscar imagen en el directorio actual
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
    current_dir = Path('.')
    
    # Buscar archivos de imagen
    image_files = []
    for ext in image_extensions:
        image_files.extend(current_dir.glob(f"*{ext}"))
        image_files.extend(current_dir.glob(f"*{ext.upper()}"))
    
    if not image_files:
        print("\nNo se encontraron imágenes en el directorio actual")
        print("Coloca una imagen (.jpg, .png, etc.) en el directorio y vuelve a ejecutar")
        return
    
    # Usar la primera imagen encontrada
    image_path = image_files[0]
    print(f"\nUsando imagen: {image_path.name}")
    
    # 3. Probar detección
    print(f"\nAnalizando imagen con Gemini...")
    try:
        with open(image_path, 'rb') as f:
            files = {'file': (image_path.name, f, 'image/jpeg')}
            
            response = requests.post(
                f"{base_url}/ai/test-detection",
                files=files,
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            print("\nRESPUESTA JSON PURA:")
            print("=" * 60)
            # Imprimir JSON formateado
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Mostrar información sobre macronutrientes y unidades
            print("\nINFORMACIÓN SOBRE MACRONUTRIENTES Y UNIDADES:")
            print("=" * 60)
            
            # Acceder a los datos correctos
            data = result.get("detection_result", {})
            
            # Mostrar unidades de macronutrientes
            meal_analysis = data.get("meal_analysis", {})
            units_info = meal_analysis.get('macronutrient_units', '')
            if units_info:
                print(f"Unidades de medida: {units_info}")
            else:
                print("Unidades de medida: Todos los macronutrientes (proteína, carbohidratos, grasa, fibra) están expresados en gramos (g). Sodio en miligramos (mg). Calorías en kilocalorías (kcal).")
            
            # Explicar bbox
            print("\nExplicación de bbox (Bounding Box):")
            print("- bbox representa las coordenadas de ubicación de los alimentos en la imagen")
            print("- Los valores están normalizados entre 0 y 1 (porcentajes de la imagen total)")
            print("- Formato: [x, y, ancho, alto] donde:")
            print("  * x, y: Coordenadas de la esquina superior izquierda")
            print("  * ancho, alto: Dimensiones del rectángulo que contiene el alimento")
                    
        else:
            print(f"Error en la detección: {response.status_code}")
            print(f"Respuesta: {response.text}")
            
    except Exception as e:
        print(f"Error al analizar imagen: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_json_response()