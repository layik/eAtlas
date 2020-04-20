import * as helpers from '@turf/helpers';

import { isArray } from "../../JSUtils";

const countryHistory = (data, by = "cases", min = 200, max=500, 
list) => {
  if(!data || data.length === 0) return null;
  
  const map = {}
  data.forEach(feature => {
    const location = feature.properties["countryterritoryCode"];
    const what = feature.properties[by];
    if (location !== null && feature.properties.dateRep) {
      if (isArray(map[location])) {
        map[location].push({x: feature.properties.dateRep, y: what})
      } else {
        map[location] = [{x: feature.properties.dateRep, y: what}]
      }
    }
  });
  const topx = {}
  Object.keys(map).forEach(country => {
    const l = map[country].length;  
      
    if((map[country][0].y > min && map[country][0].y < max) ||
    (list && list.includes(country))) {
      // most recent first
      topx[country] = map[country].reverse()
      // last 21 days
      .slice(l - 21 < 0 ? 0 : (l - 21), l - 1)
    }
  });
  // console.log(topx);
  
  return topx;
}

const breakdown = (data, by = "cases") => {
  if(!data || data.length === 0) return null;
  
  const map = {}
  data.forEach(feature => {
    const location = feature.properties["countryterritoryCode"];
    const cases = feature.properties[by];
    if (location) {
      if (map[location]) {
        map[location] = map[location] + cases
      } else {
        map[location] = typeof cases === 'number' ? +(cases) : cases
      }
    }
  });
  return map;
}

const daysDiff = (s, e) => {
  const start = new Date(s);
  const end = new Date(e);  
  let diff = end.getTime() - start.getTime();
  diff = diff / (1000 * 3600 * 24);
  return diff;
}

const generateMultipolygonGeojsonFrom = (geometries, properties, callback) => {  
  if(!geometries || !properties || !isArray(geometries) ||
  !isArray(properties)) return;
  if(geometries.length !== properties.length) {
    typeof callback === 'function' &&
    callback(undefined, "geometries and properties must be equal.")
  }  
  let collection = [];
  //
  for (let index = 0; index < geometries.length; index++) {
    let polygon = geometries[index]; //just in case too large for forEach.    
    const line = helpers.multiPolygon(
      polygon
      , //properties next
      properties[index]
    )        
    collection.push(line);       
  }  
  collection = helpers.featureCollection(collection);
  // console.log(collection);
  
  typeof callback === 'function' &&
    callback(collection)
}

const assembleGeojsonFrom = (geojson, utlas, date) => {
  if(!geojson || !utlas || !geojson.features ||
    !isArray(geojson.features) ||
    !geojson.features.length) return;
  const gj = {
    type: 'FeatureCollection',
    features: []
  };
  geojson.features.forEach((f, i) => {
    Object.keys(utlas).forEach(la => {
      if(f.properties.ctyua19cd === la) {
        let totalCases = utlas[la].totalCases.value;
        if(date) {
          utlas[la].dailyTotalConfirmedCases.forEach(e => {   
            if(e.date === date) {
              totalCases = e.value
            }
          })
        }
        const feature = {type: "Feature"};
        // gj.features[i].properties = utlas[la];
        feature.geometry = f.geometry;
        feature.properties = {
          ctyua19cd: la,
          name: utlas[la].name.value,
          totalCases: totalCases
        }
        gj.features.push(feature);
      }
    })
  })
  return(gj);
}
export {
  generateMultipolygonGeojsonFrom,
  assembleGeojsonFrom,
  countryHistory,
  breakdown,
  daysDiff
}