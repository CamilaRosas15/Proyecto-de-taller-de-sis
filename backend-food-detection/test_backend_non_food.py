"""
Test directo del endpoint para imágenes que no son comida
"""
import requests

def test_backend_non_food():
    """Prueba el endpoint del backend con imagen que no es comida"""
    
    base_url = "http://localhost:8000/api/v1/ai"
    
    # Crear datos simulados de una imagen que no es comida
    fake_non_food_data = b"fake_car_image_not_food_for_testing"
    
    files = {'file': ('test_non_food.jpg', fake_non_food_data, 'image/jpeg')}
    
    try:
        print("🚗 Enviando imagen que NO es comida al backend...")
        response = requests.post(f"{base_url}/analyze-food-natural", files=files)
        
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Respuesta exitosa!")
            print("\n" + "="*60)
            print("📝 RESPUESTA DEL BACKEND PARA NO-COMIDA:")
            print("="*60)
            print(response.text)
            print("="*60)
            
            # Verificar el contenido
            if "no contiene comida" in response.text.lower() or "especializada en análisis nutricional" in response.text:
                print("\n✅ ¡PERFECTO! El backend maneja correctamente imágenes que no son comida")
            else:
                print("\n⚠️ La respuesta no parece ser la esperada para no-comida")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Respuesta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ No se pudo conectar al servidor.")
        print("💡 Asegúrate de que el servidor esté corriendo en http://localhost:8000")
    except Exception as e:
        print(f"💥 Error: {str(e)}")

if __name__ == "__main__":
    test_backend_non_food()