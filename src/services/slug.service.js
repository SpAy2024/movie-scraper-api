/**
 * Servicio de utilidades para generar slugs y normalizar textos
 */
class SlugService {
    /**
     * Convierte un texto en slug (similar a la función slugify de Kotlin)
     */
    slugify(input) {
        if (!input || input.trim() === '') return '';
        
        // Excepción específica para ciertas películas
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('guardián') && 
            (lowerInput.includes('refugio') || lowerInput.includes('protector'))) {
            return 'shelter-el-protector';
        }
        
        // Normalizar y eliminar acentos
        let s = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Convertir a minúsculas
        s = s.toLowerCase();
        
        // Eliminar caracteres especiales (solo letras, números, espacios y guiones)
        s = s.replace(/[^a-z0-9\s-]/g, '');
        
        // Reemplazar espacios por guiones
        s = s.replace(/\s+/g, '-');
        
        // Eliminar guiones múltiples
        s = s.replace(/-+/g, '-');
        
        // Eliminar guiones al inicio/final
        s = s.replace(/^-|-$/g, '');
        
        console.log(`🔠 Slugify: "${input}" -> "${s}"`);
        return s;
    }
    
    /**
     * Slug específico para CineCalidad (agrega sufijo)
     */
    slugifyCineCalidad(input) {
        let s = this.slugify(input);
        if (s && s !== '') {
            s += '-online-descarga';
        }
        console.log(`🔠 SlugifyCineCalidad: "${input}" -> "${s}"`);
        return s;
    }
}

module.exports = new SlugService();