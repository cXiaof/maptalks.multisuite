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

const cdmp = new maptalks.MultiSuite()
const layer = new maptalks.VectorLayer('sketchPad').addTo(map)
layer.on('addGeo', () =>
    layer
        .getGeometries()
        .forEach((geo) => geo.on('contextmenu', () => geo.setMenu(getOptions(geo)).openMenu()))
)

let once = false
const drawTool = new maptalks.DrawTool({ mode: 'Point' }).addTo(map).disable()
drawTool.on('drawend', (param) => {
    const { geometry } = param
    geometry.addTo(layer)
    if (once) drawTool.disable()
})

const modes = ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle', 'Ellipse']
const getDrawModes = (attr) => {
    let arr = []
    modes.map((item) =>
        arr.push({
            item,
            click: () => {
                once = attr
                drawTool.setMode(item).enable()
            }
        })
    )
    return arr
}
const children = getDrawModes(false)
const childrenOnce = getDrawModes(true)

const toolbar = new maptalks.control.Toolbar({
    items: [
        {
            item: 'Draw',
            children
        },
        {
            item: 'DrawOnce',
            children: childrenOnce
        },
        {
            item: 'Stop',
            click: () => drawTool.disable()
        },
        {
            item: 'Clear',
            click: () => {
                layer.clear()
                cdmp.cancel()
            }
        }
    ]
}).addTo(map)

const getOptions = (geometry) => {
    return {
        items: [
            {
                item: 'combine',
                click: () => cdmp.combine(geometry)
            },
            '-',
            {
                item: 'decompose',
                click: () => cdmp.decompose(geometry)
            },
            '-',
            {
                item: 'split',
                click: () => cdmp.split(geometry)
            },
            '-',
            {
                item: 'peel',
                click: () => cdmp.peel(geometry)
            },
            '-',
            {
                item: 'fill',
                click: () => cdmp.fill(geometry)
            },
            '-',
            {
                item: 'submit',
                click: () => cdmp.submit((result, deals) => console.log(result, deals))
            },
            '-',
            {
                item: 'cancel',
                click: () => cdmp.cancel()
            }
        ]
    }
}
