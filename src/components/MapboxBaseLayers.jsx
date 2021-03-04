import React from 'react';
import MultiSelect from './MultiSelect';

export default class MapboxBaseLayers extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            bases: [
                'dark',
                'basic',
                'streets',
                'bright',
                'light',
                'satellite',
                'No map'
            ],
            selected: props.dark ? "dark" : "streets"
        }
    }

    render() { 
        const {selected, bases} = this.state;
        const {onSelectCallback, dark} = this.props;
        // console.log(selected);
        
        return(
          <MultiSelect
            title={selected === 'dark' ? "Default(dark)" : 
            !dark ? "Default(streets)" : selected}
            single={true}
            values={
              bases.map(e => ({ id: e, value: e }))
            }
            onSelectCallback={(selected) => {
              this.setState({ selected });
              typeof (onSelectCallback) === 'function' &&
                onSelectCallback(selected[0].value)
            }}
          />
        )
    }
}