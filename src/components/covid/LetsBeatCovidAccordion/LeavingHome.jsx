import React, { useState } from "react";
import { RadioGroup, Radio } from "baseui/radio";


export default (props) => {
  const [value, setValue] = useState("symptoms");
  return (
    <RadioGroup
      value={value}
      onChange={e => { 
        setValue(e.target.value); 
        typeof props.onSelectCallback === "function" && 
          props.onSelectCallback("self_isolation_steps", e.target.value) 
      }}
      name="number"
    >
      <Radio value="not_leaving_house">Not leaving house at all</Radio>
      <Radio value="work_and_essentials">Work and essentials</Radio>
      <Radio value="essentials">Essentials</Radio>
      <Radio value="none">None</Radio>
    </RadioGroup>
  );
}