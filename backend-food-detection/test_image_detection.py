#!/usr/bin/env python3
"""
Script para probar la detección de alimentos con una imagen específica
"""

import requests
import json
import os
from pathlib import Path

def test_image_detection():
    """
Prueba la detección de alimentos con una imagen"""
    
    # URL base del API
    base_url = "http://localhost:8000/api/v1"
    
    print("Probando Detección de Alimentos con Imagen")
    print("=" * 60)
    
    # 1. Verificar estado de Gemini
    print("\nVerificando estado de Gemini...")
    try:
        response = requests.get(f"{base_url}/ai/gemini-status")
        if response.status_code == 200:
            result = response.json()
            status = result['gemini_status']
            print(f"Estado: {status['status']}")
            print(f"Configurado: {'Sí' if status['gemini_configured'] else 'No'}")
            print(f"Listo para producción: {'Sí' if status['ready_for_production'] else 'No'}")
            
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
            print("\nDETECCIÓN EXITOSA!")
            
            # Acceder a los datos correctos
            data = result.get("detection_result", {})
            
            # Mostrar identificación del plato
            if "dish_identification" in data:
                dish = data["dish_identification"]
                print(f"\nIDENTIFICACIÓN DEL PLATO:")
                print(f"   Nombre: {dish.get('dish_name', 'No identificado')}")
                print(f"   Tipo: {dish.get('dish_type', 'unknown')}")
                print(f"   Cocina: {dish.get('cuisine_type', 'unknown')}")
                if dish.get('description'):
                    print(f"   Descripción: {dish['description']}")
            
            # Mostrar componentes detectados
            detections = data.get("detections", [])
            print(f"\nCOMPONENTES DETECTADOS ({len(detections)} elementos):")
            
            for i, detection in enumerate(detections, 1):
                name = detection.get('class', detection.get('name', 'Desconocido'))
                print(f"\n   {i}. {name}")
                print(f"      Peso estimado: {detection['estimated_weight']}g")
                print(f"      Confianza: {detection['confidence']:.1%}")
                
                # Nutrición por porción
                nutrition = detection.get('nutrition', {})
                print(f"      Nutrición por porción:")
                print(f"        Calorías: {nutrition.get('calories', 0)} kcal")
                print(f"        Proteína: {nutrition.get('protein', 0)}g")
                print(f"        Carbohidratos: {nutrition.get('carbs', 0)}g")
                print(f"        Grasa: {nutrition.get('fat', 0)}g")
                print(f"        Fibra: {nutrition.get('fiber', 0)}g")
                
                # Nutrición por 100g
                nutrition_100g = detection.get('nutrition_per_100g', {})
                if nutrition_100g:
                    print(f"      Nutrición por 100g:")
                    print(f"        Calorías: {nutrition_100g.get('calories', 0)} kcal")
                    print(f"        Proteína: {nutrition_100g.get('protein', 0)}g")
                    print(f"        Carbohidratos: {nutrition_100g.get('carbs', 0)}g")
                    print(f"        Grasa: {nutrition_100g.get('fat', 0)}g")
                    print(f"        Sodio: {nutrition_100g.get('sodium', 0)}mg")
                
                # Ubicación en la imagen (bbox)
                bbox = detection.get('bbox', [])
                if bbox:
                    print(f"      Ubicación en imagen (bbox): x={bbox[0]:.2f}, y={bbox[1]:.2f}, ancho={bbox[2]:.2f}, alto={bbox[3]:.2f}")
                    print(f"      Nota: bbox representa las coordenadas de ubicación del alimento en la imagen (valores entre 0 y 1)")
            
            # Análisis nutricional general
            meal_analysis = data.get("meal_analysis", {})
            print(f"\nANÁLISIS NUTRICIONAL GENERAL:")
            print(f"   Tipo de comida: {meal_analysis.get('meal_type', 'unknown')}")
            print(f"   Calorías totales: {meal_analysis.get('total_calories', 0)} kcal")
            print(f"   Proteína total: {meal_analysis.get('total_protein', meal_analysis.get('total_protein_grams', 0))}g")
            print(f"   Carbohidratos totales: {meal_analysis.get('total_carbs', meal_analysis.get('total_carbs_grams', 0))}g")
            print(f"   Grasa total: {meal_analysis.get('total_fat', meal_analysis.get('total_fat_grams', 0))}g")
            print(f"   Balance nutricional: {meal_analysis.get('nutritional_balance', 'unknown')}")
            print(f"   Puntuación de salud: {meal_analysis.get('health_score', 0)}/10")
            
            # Mostrar unidades
            units_info = meal_analysis.get('macronutrient_units', '')
            if units_info:
                print(f"\nUNIDADES DE MEDIDA: {units_info}")
            else:
                print(f"\nUNIDADES DE MEDIDA: Todos los macronutrientes (proteína, carbohidratos, grasa, fibra) están expresados en gramos (g). Sodio en miligramos (mg). Calorías en kilocalorías (kcal).")
            
            # Recomendaciones
            recommendations = meal_analysis.get("recommendations", [])
            if recommendations:
                print(f"\nRECOMENDACIONES:")
                for rec in recommendations:
                    print(f"   • {rec}")
                    
        else:
            print(f"Error en la detección: {response.status_code}")
            print(f"Respuesta: {response.text}")
            
    except Exception as e:
        print(f"Error al analizar imagen: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_image_detection()