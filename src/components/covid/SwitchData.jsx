import * as React from "react";
import { StatefulButtonGroup, MODE } from 'baseui/button-group';
import { Button, KIND, SIZE } from "baseui/button";

const urls = {
  UTLA:  '/api/covid19',
  Regions: '/api/covid19r',
  World: '/api/covid19w'
}
export default (props) => {
  const { onSelectCallback } = props;
  return (
    <StatefulButtonGroup
      mode={MODE.radio}
      initialState={{ selected: 0 }}
    >
      {
        Object.keys(urls).map(each =>
          <Button
            key={each}
            kind={KIND.secondary}
            size={SIZE.compact}
            onClick={() =>
              onSelectCallback && onSelectCallback(urls[each])
            }>
            {each}
          </Button>)
      }
    </StatefulButtonGroup>
  );
}