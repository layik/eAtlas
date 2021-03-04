import React from 'react';
import {
  FormGroup, InputGroup,
  FormControl, Glyphicon
} from 'react-bootstrap';
import { Button, KIND, SIZE } from 'baseui/button';
import { Card } from 'baseui/card';
import { StyledLink } from "baseui/link";

import './DeckSidebar.css';
import MapboxBaseLayers from '../MapboxBaseLayers';
import {
  xyObjectByProperty,
  searchNominatom,
  humanize, generateLegend, sortNumericArray
} from '../../utils';
// import Variables from '../Variables';
import RBAlert from '../RBAlert';
import { DEV_URL, PRD_URL } from '../../Constants';
// import ColorPicker from '../ColourPicker';
import Modal from '../Modal';
import DataTable from '../Table';

import { crashes_plot_data } from '../Showcases/Plots';
import { isNumber } from '../../JSUtils';
// import Boxplot from '../Boxplot/Boxplot';
import Spenser from '../Showcases/Spenser';

//color-box and others
import '../style.css';

const URL = (process.env.NODE_ENV === 'development' ? DEV_URL : PRD_URL);

export default class DeckSidebar extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      // must match the order in plumber.R
      all_road_types: ["Dual carriageway",
        "Single carriageway", "Roundabout", "Unknown",
        "Slip road", "One way street"],
      year: "2011",
      reset: false,
      multiVarSelect: {},
      barChartVariable: "road_type",
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { data, alert, loading } = this.props;
    const { reset, barChartVariable } = this.state;
    // console.log(loading, nextProps.loading);
    // avoid rerender as directly operating on document.get* 
    // does not look neat. Keeping it React way.
    if (reset !== nextState.reset ||
      alert !== nextProps.alert ||
      loading !== nextProps.loading ||
      barChartVariable !== nextState.barChartVariable) return true;
    //TODO:  a more functional way is needed   

    if (data && nextProps && nextProps.data && data.length > 1 &&
      nextProps.data.length > 1 &&
      data[1].properties.spenser === nextProps.data[1].properties.spenser) {
      return false
    }
    return true;
  }

  /**
   * Render the sidebar empty if no data is loaded.
   * Partly because we like to load from a URL.
   */
  render() {
    const { barChartVariable } = this.state;
    const {
      onSelectCallback, data, colourCallback, urlCallback, alert,
      onlocationChange, column, dark, toggleOpen } = this.props;
    let plot_data = [];
    let plot_data_multi = [[], []];
    const notEmpty = data && data.length > 1;
    plot_data = crashes_plot_data(notEmpty, data, plot_data, plot_data_multi);
    let columnDomain = [];
    let columnData = notEmpty ?
      xyObjectByProperty(data, column || barChartVariable) : [];
    const geomType = notEmpty && data[0].geometry.type.toLowerCase();
    // console.log(geomType);
    if (notEmpty && column && (geomType === 'polygon' ||
      geomType === 'multipolygon' || "linestring") &&
      isNumber(data[0].properties[column])) {
      // we dont need to use generateDomain(data, column)
      // columnData already has this in its x'es
      columnDomain = columnData.map(e => e.x);
      // we will just sort it        
      columnDomain = sortNumericArray(columnDomain);
      // console.log(columnDomain);

      this.props.showLegend(
        generateLegend(
          {
            domain: columnDomain,
            title: humanize(column)
          }
        )
      );
    }

    const resetState = (urlOrName) => {
      this.setState({
        reset: true,
        year: "",
        multiVarSelect: {},
        barChartVariable: "road_type",
      })
    }
    const spenserValues = data && data.length &&
      data.length - data.filter(e => e.properties.spenser === 0).length
    // console.log(spenserValues);
    return (
      <>
        <div
          style={{
            color: dark ? "white" : "black",
            background: dark ? "#242730" : "white"
          }}
          className="side-panel">
          <RBAlert alert={alert} />
          <div
            style={{
              background: dark ? '#29323C' : '#eee'
            }}
            className="side-pane-header">
            <h2>{spenserValues ? spenserValues + " row" + (spenserValues > 1 ? "s" : "") + "."
              : this.props.loading ? "loading..." : "Nothing to show"}
            </h2>
          </div>
          <div>
            <Modal
              toggleOpen={() => typeof toggleOpen === 'function' && toggleOpen()}
              component={<DataTable data={data} />} />
            {notEmpty &&
              <StyledLink href={this.props.apiURL + "&download=true"}>
                {<i
                style={{
                  margin: 5,
                  cursor: 'pointer',
                  fontSize: '1.5em'
                }}
                className={"fa fa-download"}></i>}
                </StyledLink>
            }
            {
              this.state.reset &&
              <Button
                kind={KIND.secondary} size={SIZE.compact}
                onClick={() => {
                  resetState();
                  typeof (urlCallback) === 'function'
                    && urlCallback(URL + "/api/stats19");
                  typeof (this.props.showLegend) === 'function' &&
                    this.props.showLegend(false);
                }}>Reset</Button>
            }
          </div>
          <hr />
          <div className="side-panel-body">
            <div className="side-panel-body-content">
              {<Spenser saeyCallback={(saey, households) => {
                // check saey, if same do not fetch
                onSelectCallback && onSelectCallback({
                  what: 'saey', selected: saey
                }, households);
                this.setState({
                  saey
                })
              }} />}
              <br />
              {/* {notEmpty && <ColorPicker colourCallback={(color) =>
                typeof colourCallback === 'function' &&
                colourCallback(color)} />
              } */}
              {process.env.REACT_APP_MAPBOX_ACCESS_TOKEN &&
                <Card overrides={{ Root: { style: { background: 'inherit' } } }}>
                  Map Styles
                <br />
                  <MapboxBaseLayers
                    dark={dark}
                    onSelectCallback={(selected) =>
                      onSelectCallback &&
                      onSelectCallback({
                        selected: selected,
                        what: 'mapstyle'
                      })
                    }
                  />
                </Card>
              }

            </div>
            <div className="space"></div>
            <form className="search-form" onSubmit={(e) => {
              e.preventDefault();
              // console.log(this.state.search);
              searchNominatom(this.state.search, (json) => {
                // console.log(json && json.length > 0 && json[0].boundingbox);
                let bbox = json && json.length > 0 && json[0].boundingbox;
                bbox = bbox && bbox.map(num => +(num))
                typeof onlocationChange === 'function' && bbox &&
                  onlocationChange({
                    bbox: bbox,
                    lon: +(json[0].lon), lat: +(json[0].lat)
                  })
              })
            }}>
              <FormGroup>
                <InputGroup>
                  <FormControl
                    style={{
                      background: dark ? '#242730' : 'white',
                      color: dark ? 'white' : 'black'
                    }}
                    onChange={(e) => this.setState({ search: e.target.value })}
                    placeholder="fly to..." type="text" />
                  <InputGroup.Addon
                    style={{
                      background: dark ? '#242730' : 'white',
                      color: dark ? 'white' : 'black'
                    }}>
                    <Glyphicon glyph="search" />
                  </InputGroup.Addon>
                </InputGroup>
              </FormGroup>
            </form>
          </div>
        </div>
      </>
    )
  }
}

