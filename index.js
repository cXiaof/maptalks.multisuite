import { Point2D, Intersection } from 'kld-intersections'

const options = {
    needCollection: false
}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._updateSameType(options.needCollection)
    }

    combine(geometry) {
        if (geometry instanceof maptalks.Geometry) {
            const { type, _layer } = geometry
            this.geometry = geometry
            this.layer = _layer
            const map = _layer.map
            _layer.hide()
            this._addTo(map)
        }
        return this
    }

    needCollection(need) {
        this._updateSameType(need)
        return this
    }

    remove() {
        if (this.layer) this.layer.show()
        if (this._suiteLayer) this._suiteLayer.remove()
        delete this._suiteLayer
        delete this._layerName
    }

    _addTo(map) {
        if (this._suiteLayer) this.remove()
        const layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._suiteLayer = new maptalks.VectorLayer(this._layerName).addTo(map)
        this._map = map
    }

    _updateSameType(need) {
        need = need !== undefined ? need : this.options['needCollection']
        need = need !== undefined ? need : options.needCollection
        this._sameType = need
    }
}

CDSP.mergeOptions(options)
