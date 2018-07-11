const map = new maptalks.Map('map', {
    center: [121.387, 31.129],
    zoom: 14,
    baseLayer: new maptalks.TileLayer('base', {
        urlTemplate:
            'https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['01', '02', '03', '04'],
        maxAvailableZoom: 18,
        placeholder: true
    })
})

const layerSketch = new maptalks.VectorLayer('sketchPad').addTo(map)

const drawTool = new maptalks.DrawTool({ mode: 'LineString' }).addTo(map).disable()
drawTool.on('drawend', (param) => {
    const { geometry } = param
    geometry.addTo(layerSketch)
    geometry.on('contextmenu', () => {})
})

const modesDraw = ['LineString', 'Polygon', 'Rectangle', 'Circle', 'Ellipse']
let children = []
modesDraw.map((item) => children.push({ item, click: () => drawTool.setMode(item).enable() }))

const toolbar = new maptalks.control.Toolbar({
    items: [
        {
            item: 'Draw',
            children
        },
        {
            item: 'Stop',
            click: () => drawTool.disable()
        },
        {
            item: 'Clear',
            click: () => layerSketch.clear()
        }
    ]
}).addTo(map)
