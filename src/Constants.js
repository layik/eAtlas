function define(name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  });
}

// geospenser.com
define("PRD_URL", 'https://geospenser.com');
define("DEV_URL", 'http://localhost:8000');
define("UI_LIST", [
  "checkbox",
  "radio",
  "buttongroups",
  "dropdown",
  "slider"]) 
define("LAYERSTYLES", [
  "arc",
  "geojson",
  "grid",
  "heatmap",
  "hex",
  "icon",
  "line",
  "path",
  "scatterplot",
  "sgrid",
  "barvis"
])     

define("BLANKSTYLE", {
  "version": 8, "name": "Blank", "center": [0, 0],
  "zoom": 0, "sources": {},
  "sprite": "file://roblabs.com/sprite",
  "glyphs": "file://roblabs.com/fonts/mapbox/{fontstack}/{range}.pbf",
  "layers": [{
    "id": "background", "type": "background", "paint":
      { "background-color": "rgba(255,255,255,1)" }
  }], "id": "blank"
})