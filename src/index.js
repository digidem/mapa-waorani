const xhr = require('xhr')
const css = require('sheetify')
const elements = require('alianza-elements')
const mapboxgl = require('mapbox-gl')
const ToggleControl = require('mapbox-gl-toggle-control')
const querystring = require('querystring')
const DigidemAttrib = require('@digidem/attribution-control')

if (process.env.NODE_ENV === 'production') {
  require('./service-worker')
}

var Legend = require('./legend')
var communityDOM = require('./community_popup')
var data = {}
var dataIndex = {}

css('mapbox-gl/dist/mapbox-gl.css')
css('alianza-elements/style.css')

var qs = querystring.parse(window.location.search.replace('?', ''))
var lang = qs.lang || 'es'
var body = document.querySelector('body')
if (lang === 'en') body.style = "font-family: 'Montserrat' !important;"
else if (lang === 'es') body.style = "font-family: 'Helvetica' !important;"
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxpeWEiLCJhIjoiY2lzZDVhbjM2MDAwcTJ1cGY4YTN6YmY4cSJ9.NxK9jMmYZsA32ol_IZGs5g'
var defaultCenter = [-77.2593, -1.2322]

var map = window.map = new mapboxgl.Map({
  container: 'map',
  center: defaultCenter,
  zoom: 8,
  maxBounds: [-87, -9, -70, 6],
  style: 'mapbox://styles/aliya/cj5i9q1lb4wnx2rnxmldrtjvt?fresh=true',
  hash: true,
  attributionControl: false
}).on('load', onLoad)

xhr('data.json', {header: {
  'Content-Type': 'application/json'
}}, function (err, resp, body) {
  if (err) console.error(err)
  data = JSON.parse(body)
  Object.keys(data).forEach(function (key) {
    data[key].features.forEach(function (feature) {
      dataIndex[feature.properties.Preset] = feature
    })
  })
  onLoad()
})

function updateLang (_) {
  lang = _
  backButton.updateLang(lang)
  legend.updateLang(lang)
}

map.addControl(new mapboxgl.ScaleControl({
  maxWidth: 150,
  unit: 'metric'
}))

var nav = new mapboxgl.NavigationControl()
map.addControl(new mapboxgl.AttributionControl({compact: true}), 'top-right')
map.addControl(nav, 'top-left')
map.addControl(new mapboxgl.FullscreenControl(), 'top-left')

var legend = Legend({lang: lang})
var legendCtrl = new ToggleControl(legend.el)
legendCtrl.show()
map.addControl(legendCtrl, 'top-left')
legendCtrl._toggleButton.setAttribute('aria-label', 'Toggle Legend')

map.addControl(new DigidemAttrib(), 'bottom-right')

var communityPopup = elements.popup(map)

var backButton = elements.backButton(map, {stop: 9, language: lang}, function () {
  map.easeTo({center: defaultCenter, zoom: 8, duration: 2500})
})

function onLoad () {
  // When a click event occurs near a place, open a popup at the location of
  // the feature, with description HTML from its properties.
  map.on('click', function (e) {
    var _areas = map.queryRenderedFeatures(e.point, {layers: ['Territory fill']})
    var _features = map.queryRenderedFeatures(e.point, {filter: ['!=', '$id', 1]})
    var area = _areas && _areas[0]
    var feature = _features && _features[0]
    if (area && map.getZoom() <= 9) {
      map.easeTo({center: defaultCenter, zoom: 11, duration: 2500})
      communityPopup.remove()
      return
    }
    if (feature) {
      var coords = feature.geometry.type === 'Point' ? feature.geometry.coordinates : map.unproject(e.point)
      var opts = {feature, lang}
      var preset = feature.properties.preset
      if (preset) {
        var airtable = dataIndex[preset.toLowerCase()]
        opts.data = airtable ? airtable.properties : {}
      }
      communityPopup.update(communityDOM(opts))
      communityPopup.setLngLat(coords)
      return
    }
    communityPopup.remove()
  })

  // Use the same approach as above to indicate that the symbols are clickable
  // by changing the cursor style to 'pointer'.
  map.on('mousemove', function (e) {
    var features = map.queryRenderedFeatures(e.point)
    map.getCanvas().style.cursor = (features.length) ? 'pointer' : ''
  })
}
