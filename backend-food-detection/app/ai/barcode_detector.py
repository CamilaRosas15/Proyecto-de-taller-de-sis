"""
Detector de códigos de barras con integración a OpenFoodFacts
Optimizado para productos peruanos e internacionales
"""

import requests
import logging
from typing import Dict, Optional, List
import json
import os

# Imports condicionales para evitar errores en Vercel
try:
    import cv2
    import numpy as np
    from pyzbar import pyzbar
    BARCODE_LIBS_AVAILABLE = True
except ImportError:
    BARCODE_LIBS_AVAILABLE = False
    cv2 = None
    np = None
    pyzbar = None

logger = logging.getLogger(__name__)

class BarcodeDetector:
    """
    Detector de códigos de barras con integración a múltiples APIs
    Optimizado para el mercado peruano
    """
    
    def __init__(self):
        self.openfoodfacts_url = "https://world.openfoodfacts.org/api/v0/product"
        self.upc_database_url = "https://api.upcitemdb.com/prod/trial/lookup"
        
        # Códigos de país para Perú
        self.peru_country_codes = ["775"]
        
        # Headers para las requests
        self.headers = {
            'User-Agent': 'FoodDetectionAPI/1.0 (Peru Food Scanner)'
        }
        
        # API key para UPC Database (opcional)
        self.upc_api_key = os.environ.get("UPC_DATABASE_API_KEY", None)
    
    def detect_barcode_from_image(self, image_data: bytes) -> List[str]:
        """
        Detecta códigos de barras en una imagen
        
        Args:
            image_data: Datos de la imagen en bytes
            
        Returns:
            Lista de códigos de barras detectados
        """
        if not BARCODE_LIBS_AVAILABLE:
            logger.warning("Librerías de códigos de barras no disponibles en este entorno")
            return []
            
        try:
            # Convertir bytes a imagen OpenCV
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("No se pudo decodificar la imagen")
                return []
            
            # Convertir a escala de grises para mejor detección
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detectar códigos de barras
            barcodes = pyzbar.decode(gray)
            
            detected_codes = []
            for barcode in barcodes:
                # Decodificar el código de barras
                barcode_data = barcode.data.decode('utf-8')
                detected_codes.append(barcode_data)
                logger.info(f"Código de barras detectado: {barcode_data}")
            
            return detected_codes
            
        except Exception as e:
            logger.error(f"Error detectando código de barras: {str(e)}")
            return []
    
    def get_product_info(self, barcode: str) -> Dict:
        """
        Obtiene información del producto usando el código de barras
        Prioriza OpenFoodFacts (gratuito) y opcionalmente usa UPC Database si está configurado
        
        Args:
            barcode: Código de barras del producto
            
        Returns:
            Información del producto
        """
        # Intentar con OpenFoodFacts primero (siempre disponible)
        product_info = self._get_from_openfoodfacts(barcode)
        
        if product_info and product_info.get("found"):
            logger.info(f"Producto encontrado en OpenFoodFacts: {barcode}")
            return product_info
        
        # Solo intentar UPC Database si se configuró API key (opcional)
        if self.upc_api_key:
            logger.info(f"Producto no encontrado en OpenFoodFacts, intentando UPC Database: {barcode}")
            product_info = self._get_from_upc_database(barcode)
            
            if product_info and product_info.get("found"):
                logger.info(f"Producto encontrado en UPC Database: {barcode}")
                return product_info
        else:
            logger.info("UPC Database no configurado (API key no disponible)")
        
        # Si no se encuentra en ninguna API
        logger.warning(f"Producto no encontrado en las bases de datos disponibles: {barcode}")
        return self._create_unknown_product_response(barcode)
    
    def _get_from_openfoodfacts(self, barcode: str) -> Dict:
        """
        Obtiene información de OpenFoodFacts
        """
        try:
            url = f"{self.openfoodfacts_url}/{barcode}.json"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == 1:  # Producto encontrado
                    product = data.get("product", {})
                    
                    # Determinar si es producto peruano
                    is_peruvian = any(barcode.startswith(code) for code in self.peru_country_codes)
                    
                    return {
                        "found": True,
                        "source": "OpenFoodFacts",
                        "barcode": barcode,
                        "product_name": product.get("product_name", "Producto sin nombre"),
                        "brand": product.get("brands", "Marca no especificada"),
                        "category": product.get("categories", "Categoría no especificada"),
                        "image_url": product.get("image_url", ""),
                        "ingredients": product.get("ingredients_text", "Ingredientes no disponibles"),
                        "country_origin": "Perú" if is_peruvian else product.get("countries", "No especificado"),
                        "is_peruvian_product": is_peruvian,
                        "nutrition_per_100g": self._extract_nutrition_openfoodfacts(product),
                        "serving_size": product.get("serving_size", "100g"),
                        "packaging": product.get("packaging", "No especificado"),
                        "labels": product.get("labels", ""),
                        "allergens": product.get("allergens", "No especificados"),
                        "nova_group": product.get("nova_group", 0),  # Nivel de procesamiento
                        "nutriscore": product.get("nutriscore_grade", "").upper()
                    }
            
            return {"found": False, "source": "OpenFoodFacts"}
            
        except Exception as e:
            logger.error(f"Error consultando OpenFoodFacts: {str(e)}")
            return {"found": False, "source": "OpenFoodFacts", "error": str(e)}
    
    def _get_from_upc_database(self, barcode: str) -> Dict:
        """
        Obtiene información de UPC Database como respaldo
        """
        try:
            params = {"upc": barcode}
            response = requests.get(self.upc_database_url, params=params, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("code") == "OK" and data.get("items"):
                    item = data["items"][0]
                    
                    return {
                        "found": True,
                        "source": "UPC Database",
                        "barcode": barcode,
                        "product_name": item.get("title", "Producto sin nombre"),
                        "brand": item.get("brand", "Marca no especificada"),
                        "category": item.get("category", "Categoría no especificada"),
                        "image_url": item.get("images", [""])[0] if item.get("images") else "",
                        "ingredients": "Información no disponible en UPC Database",
                        "country_origin": "No especificado",
                        "is_peruvian_product": False,
                        "nutrition_per_100g": {},  # UPC Database no tiene info nutricional
                        "serving_size": "No especificado",
                        "description": item.get("description", ""),
                        "upc": item.get("upc", barcode)
                    }
            
            return {"found": False, "source": "UPC Database"}
            
        except Exception as e:
            logger.error(f"Error consultando UPC Database: {str(e)}")
            return {"found": False, "source": "UPC Database", "error": str(e)}
    
    def _extract_nutrition_openfoodfacts(self, product: Dict) -> Dict:
        """
        Extrae información nutricional de OpenFoodFacts
        """
        nutriments = product.get("nutriments", {})
        
        return {
            "calories": nutriments.get("energy-kcal_100g", 0),
            "protein": nutriments.get("proteins_100g", 0),
            "carbs": nutriments.get("carbohydrates_100g", 0),
            "fat": nutriments.get("fat_100g", 0),
            "fiber": nutriments.get("fiber_100g", 0),
            "sugar": nutriments.get("sugars_100g", 0),
            "sodium": nutriments.get("sodium_100g", 0),
            "salt": nutriments.get("salt_100g", 0),
            "saturated_fat": nutriments.get("saturated-fat_100g", 0),
            "calcium": nutriments.get("calcium_100g", 0),
            "iron": nutriments.get("iron_100g", 0),
            "vitamin_c": nutriments.get("vitamin-c_100g", 0)
        }
    
    def _create_unknown_product_response(self, barcode: str) -> Dict:
        """
        Crea respuesta para productos no encontrados
        """
        return {
            "found": False,
            "barcode": barcode,
            "message": "Producto no encontrado en OpenFoodFacts",
            "suggestion": "Puedes usar la detección por imagen como alternativa",
            "is_peruvian_product": any(barcode.startswith(code) for code in self.peru_country_codes),
            "country_hint": "Producto peruano" if any(barcode.startswith(code) for code in self.peru_country_codes) else "Producto internacional",
            "note": "OpenFoodFacts es una base de datos colaborativa - puedes contribuir agregando este producto"
        }
    
    def analyze_barcode_format(self, barcode: str) -> Dict:
        """
        Analiza el formato del código de barras y proporciona información
        """
        info = {
            "barcode": barcode,
            "length": len(barcode),
            "format": "Unknown"
        }
        
        if len(barcode) == 13:
            info["format"] = "EAN-13"
            country_code = barcode[:3]
            
            if country_code == "775":
                info["country"] = "Perú"
                info["is_peruvian"] = True
            else:
                info["country"] = self._get_country_by_code(country_code)
                info["is_peruvian"] = False
                
        elif len(barcode) == 12:
            info["format"] = "UPC-A"
            info["country"] = "Estados Unidos/Canadá"
            info["is_peruvian"] = False
            
        elif len(barcode) == 8:
            info["format"] = "EAN-8"
            info["country"] = "Variable"
            info["is_peruvian"] = False
        
        return info
    
    def _get_country_by_code(self, code: str) -> str:
        """
        Obtiene el país por código de barras (códigos más comunes)
        """
        country_codes = {
            "780-789": "Chile",
            "770-771": "Colombia",
            "740-745": "Guatemala",
            "750": "México",
            "773": "Uruguay",
            "779": "Argentina",
            "775": "Perú",
            "690-699": "China",
            "300-379": "Francia",
            "400-440": "Alemania",
            "800-839": "Italia",
            "500-509": "Reino Unido"
        }
        
        for range_code, country in country_codes.items():
            if "-" in range_code:
                start, end = range_code.split("-")
                if start <= code <= end:
                    return country
            elif code.startswith(range_code):
                return country
        
        return "No identificado"