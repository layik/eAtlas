/**
 * Main entry to the application.
 * 
 * The crucial bits are:
 * 
     this.state = {
      data,            <= main data holding param   
      layers: [],      <= mapgl layers object
      initialViewState:<= deckgl/mapgl initial state object
      legend: false    <= map legend to avoid rerender.
    }
 * and
 * DeckSidebarContainer which holds DeckSidebar object itself.
 * 
 * Main funcitons:
 * _generateLayer which is the main/factory of filtering state
 * of the map area of the application.
 * 
 */
import React from 'react';
import DeckGL from 'deck.gl';
import MapGL, { NavigationControl, FlyToInterpolator } from 'react-map-gl';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import _ from 'underscore';

import {
  fetchData, generateDeckLayer,
  getParamsFromSearch, getBbx,
  isMobile, colorScale, theme,
  colorRanges, generateDomain,
  convertRange, getMin, getMax, isURL
} from './utils';
import Constants from './Constants';
import DeckSidebarContainer from
  './components/DeckSidebar/DeckSidebarContainer';
import history from './history';

import './App.css';
import Tooltip from './components/Tooltip';
import { sfType } from './geojsonutils';
import { isNumber } from './JSUtils';

const osmtiles = {
  "version": 8,
  "sources": {
    "simple-tiles": {
      "type": "raster",
      "tiles": [
        // "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
        // "http://b.tile.openstreetmap.org/{z}/{x}/{y}.png"
        // "http://tile.stamen.com/toner/{z}/{x}/{y}.png"
        'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg'
      ],
      "tileSize": 256
    }
  },
  "layers": [{
    "id": "simple-tiles",
    "type": "raster",
    "source": "simple-tiles",
  }]
};
const ROOT = (process.env.NODE_ENV === 'development' ? Constants.DEV_URL : Constants.PRD_URL);
const defualtURL = "/api/spenser";

// Set your mapbox access token here
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const gradient = {
  height: '200px',
  // TODO: which browsers?
  backgroundColor: 'red', /* For browsers that do not support gradients */
  backgroundImage: 'linear-gradient(to top, red , yellow)' /* Standard syntax (must be last) */
}

const LIGHT_SETTINGS = {
  lightsPosition: [-0.144528, 49.739968, 8000, -3.807751, 54.104682, 8000],
  ambientRatio: 0.4,
  diffuseRatio: 0.6,
  specularRatio: 0.2,
  lightsStrength: [0.8, 0.0, 0.8, 0.0],
  numberOfLights: 2
};

const initMultiVarSelect = {
  year: new Set(["2018"]),
  age: new Set(["1-14"]),
  sex: new Set(["1"]),
  ethnicity: new Set(["15"])
}

export default class Welcome extends React.Component {
  constructor(props) {
    super(props)
    const init = {
      longitude: -1.9521,
      latitude: 53.1121,
      zoom: 6,
      pitch: 0,
      bearing: 0,
    }
    const param = getParamsFromSearch(props.location.search);
    if (param) {
      //lat=53.814&lng=-1.534&zoom=11.05&bea=0&pit=55&alt=1.5
      Object.keys(param).forEach(key => {
        Object.keys(init).forEach(iKey => {
          if (iKey.startsWith(key)) {
            init[key] = param[key]
          }
        })
      })
    }

    this.state = {
      loading: true,
      layers: [],
      backgroundImage: gradient.backgroundImage,
      radius: 100,
      elevation: 4,
      mapStyle: MAPBOX_ACCESS_TOKEN ? ("mapbox://styles/mapbox/" +
        (props.dark ? "dark" : "streets") + "-v9") : osmtiles,
      initialViewState: init,
      subsetBoundsChange: false,
      lastViewPortChange: new Date(),
      colourName: 'default',
      iconLimit: 500,
      legend: false,
      column: "population",
      saey: "1122018"
    }
    this._generateLayer = this._generateLayer.bind(this)
    this._renderTooltip = this._renderTooltip.bind(this);
    this._fetchAndUpdateState = this._fetchAndUpdateState.bind(this);
    this._fitViewport = this._fitViewport.bind(this);
    this._updateWithGeoJSON = this._updateWithGeoJSON.bind(this);
  }

  componentDidMount() {
    this._fetchAndUpdateState()
  }

  /**
   * Main function to fetch data and update state.
   * 
   * @param {String} aURL to use if not default `/api/stats19` is used.
   * @param {Object} customError to use in case of urlCallback object/urls.
   */
  _fetchAndUpdateState(aURL, customError) {
    if (aURL && !isURL(aURL)) return;
    if (customError && typeof (customError) !== 'object') return;
    // TODO: more sanity checks?
    const fullURL = aURL ?
      // TODO: decide which is better.
      // ROOT + "/api/url?q=" + aURL : // get the server to parse it 
      aURL : // do not get the server to parse it 
      ROOT + defualtURL + "?other=" + this.state.saey;

    fetchData(fullURL, (data, error) => {
      // TODO:DELETE
      // let us show a choropleth of fixed age
      // fixed sex change in years
      // const asObject = data.map(e => ({[e[0]]: e[1].trim()}))
      if (!error) {
        this.setState({ apiURL: fullURL })
        fetchData(ROOT + "/api/msoa.geojson", (geojson, err) => {
          this._stateWithDataAndGeojson(err, geojson, data, customError);
        })
      } else {
        this.setState({
          loading: false,
          alert: { content: 'Could not reach: ' + fullURL }
        })
        //network error?
      }
    })
  }

  _stateWithDataAndGeojson(err, geojson, data, customError) {
    const { saey, households } = this.state;
    if (!err) {
      // console.log(data)
      if (!data) {
        this.setState({
          loading: false,
          alert: { content: 'No results for parameters.' }
        })
        return;
      }
      geojson.features.forEach(feature => {
        delete feature.properties.populationdensity;
        if (households) {
          delete feature.properties.population;
        } else {
          delete feature.properties.households;
        }
        feature.properties[
          households ? "households" : "population"] = 0; // init missing ones 
        for (let i = 0; i < data.length; i++) {
          if (feature.properties.msoa11cd === data[i][0]) {
            feature.properties[
              households ? "households" : "population"] = Number.parseInt(data[i][1]);
            feature.properties.year = households ? saey : saey.substr(saey.length - 4);
            break;
          }
        }
      });
      this.setState({
        loading: false,
        data: geojson,
        alert: customError || null
      });
      // this._fitViewport(geojson);
      this._generateLayer();
    }
    else {
      // alert?
      this.setState({ loading: false });
    }
  }

  /**
   * Welcome should hold own state in selected as:
   * {property: Set(val1, val2), ...}.
   * 
   * @param {*} values includes
   * radius: specific to changing geoms
   * elevation: specific to changing geoms
   * filter: multivariate filter of properties
   * cn: short for colorName passed from callback
   * TODO: other
   */
  _generateLayer(values = {}) {
    const { radius, elevation, cn } = values;
    let { filter } = values

    if (filter && filter.what === 'mapstyle') {
      const newStyle = "mapbox://styles/mapbox/" + filter.selected + "-v9";
      this.setState({
        mapStyle: !MAPBOX_ACCESS_TOKEN ? osmtiles :
          filter && filter.what === 'mapstyle' ?  filter.selected === "No map" ?
          Constants.BLANKSTYLE : newStyle : this.state.mapStyle,
      })
      return;
    }
    let data = this.state.data && this.state.data.features
    // console.log(data[23].properties.population);
    const { colourName, iconLimit } = this.state;
    let column = (filter && filter.what === 'column' && filter.selected) ||
      this.state.column;

    if (!data) return;
    if (filter && filter.what === "%") {
      data = data.slice(0, filter.selected / 100 * data.length)
    }
    // to optimize the search keep state as the source of truth
    if (this.state.coords) {
      data = this.state.filtered;
    }
    const geomType = sfType(data[0]).toLowerCase();
    //if resetting a value    
    if (!filter || filter.selected === "") {
      // console.log("pp");
      // filter = {
      //   what: 'multi',
      //   selected: initMultiVarSelect
      // }
    }
    // console.log(filter);

    if (filter && filter.selected !== "") {
      data = data.filter(
        d => {
          if (filter.what === 'multi') {
            // go through each selection
            const selected = filter.selected;
            // selected.var > Set()
            for (let each of Object.keys(selected)) {
              const nextValue = each === "date" ?
                d.properties[each].split("/")[2] : d.properties[each] + ""
              // each from selected must be in d.properties
              if (!selected[each].has(nextValue)) {
                return false
              }
            }
          }
          if (filter.what === 'coords') {
            // coords in 
            if (_.difference(filter.selected || this.state.coords,
              d.geometry.coordinates.flat()).length !== 0) {
              return false;
            }
          }
          return (true)
        }
      )
    }
    // console.log(data.length);
    let layerStyle = (filter && filter.what ===
      'layerStyle' && filter.selected) || this.state.layerStyle || 'grid';
    if (geomType !== "point") layerStyle = "geojson"
    if (data.length < iconLimit && !column &&
      geomType === "point") layerStyle = 'icon';
    const options = {
      radius: radius ? radius : this.state.radius,
      cellSize: radius ? radius : this.state.radius,
      elevationScale: elevation ? elevation : this.state.elevation,
      lightSettings: LIGHT_SETTINGS,
      colorRange: colorRanges(cn || colourName)
    };
    // generate a domain
    const columnNameOrIndex =
      (filter && filter.what === 'column' && filter.selected) || column || 1;
    if (layerStyle === 'heatmap') {
      options.getPosition = d => d.geometry.coordinates
      // options.getWeight = d => d.properties[columnNameOrIndex]
    }
    if (geomType === 'linestring') {
      layerStyle = "line"
      // https://github.com/uber/deck.gl/blob/master/docs/layers/line-layer.md
      options.getColor = d => [235, 170, 20]
      options.getPath = d => d.geometry.coordinates
      options.onClick = (info) => {
        // console.log(info);
        if (info && info.hasOwnProperty('coordinate')) {
          if (['path', 'arc', 'line'].includes(this.state.layerStyle) &&
            info.object.geometry.coordinates) {
            this._generateLayer({
              filter: {
                what: 'coords',
                selected: info.object.geometry.coordinates[0]
              }
            })
          }
        }
      }
      if (layerStyle === 'line') {
        // options.getSourceColor = d => [Math.sqrt(+(d.properties.base)) * 1000, 140, 0]
        // options.getTargetColor = d => [Math.sqrt(+(d.properties.hs2)) * 1e13, 140, 0]
        options.getSourcePosition = d => d.geometry.coordinates[0] // geojson
        options.getTargetPosition = d => d.geometry.coordinates[1] // geojson
      }
      if (isNumber(data[0] && data[0].properties &&
        data[0].properties[columnNameOrIndex])) {
        const colArray = data.map(f => f.properties[columnNameOrIndex])
        const max = getMax(colArray);
        const min = getMin(colArray)
        options.getWidth = d => {
          let newMax = 10, newMin = 0.1;
          if (data.length > 100000) {
            newMax = 0.5; newMin = 0.005
          }
          const r = convertRange(
            d.properties[columnNameOrIndex], {
            oldMin: min, oldMax: max, newMax: newMax, newMin: newMin
          })
          return r
        }; // avoid id
      }
    }
    const domain = generateDomain(data, columnNameOrIndex);
    if (geomType === "polygon" || geomType === "multipolygon" || layerStyle === 'geojson') {
      options.updateTriggers = {
        getFillColor: [data.map((d) => colorScale(d, columnNameOrIndex, domain))]
      };
      options.getFillColor = (d) => colorScale(d, columnNameOrIndex, domain)
    }
    if (layerStyle === 'barvis') {
      const getColor = (party) => {
        if (!party) return null;
        switch (party) {
          case "lab":
            return [255, 0, 0]
          case "con":
            return [0, 0, 255]
          case "snp":
            return [0, 0, 0]
          case "ld":
            return [253, 187, 48]
          case "pc":
            return [63, 132, 40]
          case "dup":
            return [0, 0, 255]
          default:
            return [0, 0, 0];
        }
      }
      options.getPosition = d => [d.geometry.coordinates[0],
      d.geometry.coordinates[1], 0]
      if (data[0].properties.first_party) options.getColor = d =>
        getColor(d.properties.first_party.toLowerCase())
      if (data[0].properties.result) options.getRotationAngle = d =>
        d.properties.result.includes("gain from") ? 45 : 1
      options.getScale = d => 200
    }
    const alayer = generateDeckLayer(
      layerStyle, data, this._renderTooltip, options
    )

    this.setState({
      loading: false,
      layerStyle, geomType,
      tooltip: "",
      filtered: data,
      layers: [alayer],
      radius: radius ? radius : this.state.radius,
      elevation: elevation ? elevation : this.state.elevation,
      road_type: filter && filter.what === 'road_type' ? filter.selected :
        this.state.road_type,
      colourName: cn || colourName,
      column, // all checked
      coords: filter && filter.what === 'coords' ? filter.selected :
        this.state.coords
    })
  }

  _fitViewport(newData, bboxLonLat) {
    const data = newData || this.state.data;
    if (!data || data.length === 0) return;
    const center = centroid(data).geometry.coordinates;
    const bounds = bboxLonLat ?
      bboxLonLat.bbox : bbox(data)
    // console.log(center, bounds);

    this.map.fitBounds(bounds)
    const viewport = {
      ...this.state.viewport,
      longitude: bboxLonLat ? bboxLonLat.lon : center[0],
      latitude: bboxLonLat ? bboxLonLat.lat : center[1],
      transitionDuration: 500,
      transitionInterpolator: new FlyToInterpolator(),
      // transitionEasing: d3.easeCubic
    };
    this.setState({ viewport })
  }

  _renderTooltip(params) {
    const { x, y, object } = params;
    const hoveredObject = object;
    // console.log(hoveredObject && hoveredObject.points[0].properties.speed_limit);
    // console.log(params)
    // return
    if (!hoveredObject) {
      this.setState({ tooltip: "" })
      return;
    }
    // console.log(this.state.households);
    this.setState({
      tooltip:
        // react did not like x and y props.
        <Tooltip
          dark={this.props.dark}
          saey={this.state.saey}
          households={this.state.households}
          isMobile={isMobile()}
          topx={x} topy={y} hoveredObject={hoveredObject} />
    })
  }

  _updateURL(viewport) {
    const { latitude, longitude, zoom, bearing, pitch, altitude } = viewport;
    const { subsetBoundsChange, lastViewPortChange } = this.state;

    //if we do history.replace/push 100 times in less than 30 secs 
    // browser will crash
    if (new Date() - lastViewPortChange > 1000) {
      history.push(
        `/?lat=${latitude.toFixed(3)}` +
        `&lng=${longitude.toFixed(3)}` +
        `&zoom=${zoom.toFixed(2)}` +
        `&bea=${bearing}` +
        `&pit=${pitch}` +
        `&alt=${altitude}`
      )
      this.setState({ lastViewPortChange: new Date() })
    }
    const bounds = this.map && this.map.getBounds()
    if (bounds && subsetBoundsChange) {
      const box = getBbx(bounds)
      // console.log("bounds", box);
      const { xmin, ymin, xmax, ymax } = box;
      fetchData(ROOT + defualtURL + xmin + "/" +
        ymin + "/" + xmax + "/" + ymax,
        (data, error) => {
          if (!error) {
            // console.log(data.features);
            this.setState({
              data: data.features,
            })
            this._generateLayer()
          } else {
            //network error?
          }
        })
    }

  }

  render() {
    const { tooltip, viewport, initialViewState,
      loading, mapStyle, alert,
      layerStyle, geomType, legend, coords } = this.state;
    // console.log(geomType, legend);

    return (
      <div id="html2pdf">
        {/* just a little catch to hide the loader 
        when no basemap is presetn */}
        <div className="loader" style={{
          zIndex: loading ? 999 : -1,
          visibility: typeof mapStyle === 'string' &&
            mapStyle.endsWith("No map-v9") ? 'hidden' : 'visible'
        }} />
        <MapGL
          ref={ref => {
            // save a reference to the mapboxgl.Map instance
            this.map = ref && ref.getMap();
          }}
          mapStyle={mapStyle}
          onViewportChange={(viewport) => {
            this._updateURL(viewport)
            this.setState({ viewport })
          }}
          height={window.innerHeight - 54 + 'px'}
          width={window.innerWidth + 'px'}
          //crucial bit below
          viewState={viewport ? viewport : initialViewState}
        // mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
        >
          <div className='mapboxgl-ctrl-top-right' style={{
            zIndex: 9
          }}>
            <NavigationControl
              {...viewport}
              onViewportChange={viewport => this.setState({ viewport })}
            />
          </div>
          <DeckGL
            viewState={viewport ? viewport : initialViewState}
            initialViewState={initialViewState}
            layers={this.state.layers}
            // see docs below, url split for readability
            // https://deck.gl/#/documentation/developer-guide/
            // adding-interactivity?
            // section=using-the-built-in-event-handling
            onClick={(e) => {
              // e.object && this._renderTooltip(e)
              if (!e.layer && coords) {
                this.setState({ coords: null })
                this._generateLayer()
              }
            }}
            onHover={(info, evt) => {
              // const mapboxFeatures = this.map.queryRenderedFeatures([evt.offsetX, evt.offsetY]);
              // console.log(this.map.getLayer("vt"))
              // let sp = this.map.queryRenderedFeatures()[0].properties.msoa11cd;              
              // sp = Object.values(JSON.parse(sp))[0]
              // const r = [];
              // while (sp.length) {
              //     r.push(sp.splice(0, 4));
              // }
              // console.log(sp)
            }}
          >
            {tooltip}
          </DeckGL>
        </MapGL>
        <DeckSidebarContainer
          dark={this.props.dark}
          layerStyle={layerStyle}
          isMobile={isMobile()}
          key="decksidebar"
          alert={alert}
          multiVarSelect={initMultiVarSelect}
          data={this.state.filtered}
          loading={loading}
          colourCallback={(colourName) =>
            this._generateLayer({ cn: colourName })
          }
          urlCallback={(url_returned, geojson_returned) => {
            this.setState({
              tooltip: "",
              road_type: "",
              radius: 100,
              elevation: 4,
              loading: true,
              coords: null
            })
            if (geojson_returned) {
              // confirm valid geojson
              this._updateWithGeoJSON(geojson_returned);
            } else {
              this._fetchAndUpdateState(url_returned);
            }
          }}
          column={this.state.column}
          apiURL={this.state.apiURL}
          // households value is set in HouseholdsUI comp via Spenser comp
          onSelectCallback={(selected, households) => {
            const u = ROOT + defualtURL + "?other=" + selected.selected + (
              households ? "&hh=true" : ""
            )
            // console.log(u);
            if (selected.what && selected.what === "saey") {
              this.setState({
                loading: true,
                saey: selected.selected,
                households: households, // state must be named
                column: households ? "households" : "population",
              })
              fetchData(u, (data, error) => {
                if (!error) {
                  // console.log(data);
                  this.setState({ apiURL: u })
                  this._stateWithDataAndGeojson(null, this.state.data,
                    data)
                } else {
                  this.setState({ loading: false })
                  console.log(error);
                }
              })
            } else {
              this._generateLayer({ filter: selected })
            }
          }}
          onChangeRadius={(value) => this._generateLayer({ radius: value })}
          onChangeElevation={(value) => this._generateLayer({ elevation: value })}
          toggleSubsetBoundsChange={(value) => {
            this.setState({
              loading: true,
              subsetBoundsChange: value
            })
            this._fetchAndUpdateState();
          }}
          onlocationChange={(bboxLonLat) => {
            this._fitViewport(bboxLonLat)
          }}
          showLegend={(legend) => this.setState({ legend })}
        />
        {
          legend && (geomType === 'polygon' ||
            geomType === 'multipolygon') &&
          <div
            style={{
              ...theme(this.props.dark),
              textAlign: 'center'
            }}
            className="mapboxgl-ctrl-bottom-right mapbox-legend">
            {legend}
          </div>
        }
      </div>
    );
  }

  _updateWithGeoJSON(geojson_returned) {
    try {
      this.setState({
        loading: false,
        data: geojson_returned
      });
      this._fitViewport(geojson_returned);
      this._generateLayer();
    }
    catch (error) {
      // load up default
      console.log(error);

      this._fetchAndUpdateState(undefined, { content: error.message });
    }
  }
}