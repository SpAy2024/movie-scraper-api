const CineCalidadProvider = require('./CineCalidadProvider');

class CineCalidadAMProvider extends CineCalidadProvider {
    constructor() {
        super();
        this.name = 'cinecalidadam';
        this.baseURL = 'https://www.cinecalidad.am';
    }
}

module.exports = CineCalidadAMProvider;