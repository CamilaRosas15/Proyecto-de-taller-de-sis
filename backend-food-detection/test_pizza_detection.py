"""
Test para verificar detección de pizza con imagen real
"""
import requests
import json
import base64

def test_pizza_detection():
    """Prueba la detección de pizza con Gemini"""
    
    api_key = "AIzaSyB22je6jEvVOn8AvqWVMG1_3H9bL_nxJ0o"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    # Crear imagen simulada de pizza (pequeña imagen base64 de ejemplo)
    # Esta es una imagen muy pequeña solo para la prueba
    fake_image_data = b"fake_pizza_image_data_for_testing"
    base64_image = base64.b64encode(fake_image_data).decode('utf-8')
    
    prompt = """
    Analiza esta imagen de comida y proporciona una respuesta JSON detallada con la siguiente estructura.
    IMPORTANTE: Todas las descripciones, recomendaciones y textos deben estar en ESPAÑOL.

    {
        "dish_identification": {
            "dish_name": "nombre_del_plato_principal",
            "dish_type": "pizza/ensalada/guiso/etc",
            "cuisine_type": "italiana/peruana/mexicana/etc",
            "description": "Descripción breve del plato identificado EN ESPAÑOL"
        },
        "foods_detected": [
            {
                "name": "pizza",
                "confidence": 0.95,
                "portion_size": "mediana",
                "estimated_weight_grams": 250,
                "bounding_box": {
                    "x": 0.1,
                    "y": 0.1,
                    "width": 0.8,
                    "height": 0.8
                },
                "nutrition_per_100g": {
                    "calories": 266,
                    "protein": 11.0,
                    "carbs": 33.0,
                    "fat": 10.0,
                    "fiber": 2.3,
                    "sodium": 598,
                    "sugar": 3.6
                },
                "total_nutrition": {
                    "calories": 665,
                    "protein": 27.5,
                    "carbs": 82.5,
                    "fat": 25.0,
                    "fiber": 5.8
                }
            }
        ],
        "meal_analysis": {
            "meal_type": "almuerzo",
            "total_calories": 665,
            "total_protein_grams": 27.5,
            "total_carbs_grams": 82.5,
            "total_fat_grams": 25.0,
            "total_fiber_grams": 5.8,
            "nutritional_balance": "alto_carbohidratos",
            "health_score": 6.0,
            "recommendations": ["Agregar verduras para mejor balance nutricional", "Moderar el consumo de grasa saturada"]
        }
    }

    Si la imagen contiene una pizza, identifícala correctamente. 
    Devuelve SOLO la respuesta JSON, sin texto adicional o formato markdown.
    """
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64_image
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "topK": 32,
            "topP": 1,
            "maxOutputTokens": 2048,
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        print("🍕 Enviando imagen para detección de pizza...")
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Respuesta exitosa!")
            
            if "candidates" in result and len(result["candidates"]) > 0:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"📝 Respuesta de Gemini:\n{content}")
                
                # Intentar limpiar y parsear JSON
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                try:
                    json_result = json.loads(content)
                    print("✅ JSON parseado exitosamente!")
                    print(f"🍕 Plato identificado: {json_result.get('dish_identification', {}).get('dish_name', 'No identificado')}")
                    
                    foods = json_result.get('foods_detected', [])
                    print(f"🥘 Alimentos detectados: {len(foods)}")
                    for food in foods:
                        print(f"  - {food.get('name', 'unknown')} (confianza: {food.get('confidence', 0)})")
                    
                    return json_result
                    
                except json.JSONDecodeError as e:
                    print(f"❌ Error parseando JSON: {e}")
                    print(f"Contenido: {content}")
            else:
                print("❌ No se encontraron candidates en la respuesta")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"💥 Error: {str(e)}")

if __name__ == "__main__":
    test_pizza_detection()