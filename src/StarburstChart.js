import React from "react";
import * as d3 from "d3";
import data from "./data.json";

const newData = {};
const missingData = {};

const childrenMaker = (newData, groupName, newItem) => {
  for (const [key, value] of Object.entries(newItem)) {
    if (newData[`${groupName}`]["children"][`${key}`]) {
      switch (key) {
        case "Patient":
          newData[`${groupName}`]["children"][`${key}`]["value"] =
            Number(newData[`${groupName}`]["children"][`${key}`]["value"]) + 1;
          break;
        case "Age":
          // To calculate Age range
          break;
        default:
          newData[`${groupName}`]["children"][`${key}`]["value"] =
            Number(newData[`${groupName}`]["children"][`${key}`]["value"]) +
            Number(value);
      }
    } else {
      if (value === 999) {
        if (missingData[`${groupName}`]) {
          missingData[`${groupName}`].push(newItem);
        } else {
          missingData[`${groupName}`] = [];
          missingData[`${groupName}`].push(newItem);
        }
      } else {
        switch (key) {
          case "Patient":
            newData[`${groupName}`]["children"][`${key}`] = {};
            newData[`${groupName}`]["children"][`${key}`]["name"] =
              "No. of Patients";
            newData[`${groupName}`]["children"][`${key}`]["value"] = 1;
            break;
          case "Age":
            // To calculate Age range
            break;
          default:
            newData[`${groupName}`]["children"][`${key}`] = {};
            newData[`${groupName}`]["children"][`${key}`]["name"] = key;
            newData[`${groupName}`]["children"][`${key}`]["value"] =
              Number(value);
        }
      }
    }
  }
};

data.map((item) => {
  const newItem = JSON.parse(JSON.stringify(item));
  const groupName = item.Group;
  delete newItem.Group;

  if (!newData[`${groupName}`]) {
    newData[`${groupName}`] = {};
    newData[`${groupName}`]["name"] = item.Group;
    newData[`${groupName}`]["children"] = {};
  }
  childrenMaker(newData, groupName, newItem);
  return null;
});

let newProcessedData = {
  name: "Saturn-1",
  children: Object.values(newData).map((item) => ({
    ...item,
    children: Object.values(item.children),
  })),
};

const SIZE = 975;
const RADIUS = SIZE / 2;

export const StarburstChart = () => {
  const svgRef = React.useRef(null);
  const svgContainer = React.useRef(null); // The PARENT of the SVG
  const [viewBox, setViewBox] = React.useState("0,0,0,0");

  // State to track width and height of SVG Container
  const [width, setWidth] = React.useState();
  const [height, setHeight] = React.useState();

  // This function calculates width and height of the container
  const getSvgContainerSize = () => {
    const newWidth = svgContainer.current.clientWidth;
    setWidth(newWidth);

    const newHeight = svgContainer.current.clientHeight;
    setHeight(newHeight);
  };

  const partition = (data) =>
    d3.partition().size([2 * Math.PI, RADIUS])(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value)
    );

  const color = d3.scaleOrdinal(
    d3.quantize(d3.interpolateRainbow, newProcessedData?.children?.length + 1)
  );

  const format = d3.format(",d");

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(RADIUS / 2)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1 - 1);

  const getAutoBox = () => {
    if (!svgRef.current) {
      return "";
    }

    const { x, y, width, height } = svgRef.current.getBBox();

    return [x, y, width, height].toString();
  };

  const getColor = (d) => {
    while (d.depth > 1) d = d.parent;
    return color(d.data.name);
  };

  const getTextTransform = (d) => {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = (d.y0 + d.y1) / 2;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  const root = partition(newProcessedData);

  React.useEffect(() => {
    setViewBox(getAutoBox());
  }, [data, width, height]);

  React.useEffect(() => {
    // detect 'width' and 'height' on render
    getSvgContainerSize();
    // listen for resize changes, and detect dimensions again when they change
    window.addEventListener("resize", getSvgContainerSize);
    // cleanup event listener
    return () => window.removeEventListener("resize", getSvgContainerSize);
  }, []);

  return (
    <div ref={svgContainer} className="starburst-chart">
      <svg width={SIZE} height={SIZE} viewBox={viewBox} ref={svgRef}>
        <g fillOpacity={0.6}>
          {root
            .descendants()
            .filter((d) => d.depth)
            .map((d, i) => (
              <path key={`${d.data.name}-${i}`} fill={getColor(d)} d={arc(d)}>
                <text>
                  {d
                    .ancestors()
                    .map((d) => d.data.name)
                    .reverse()
                    .join("/")}
                  \n${format(d.value)}
                </text>
              </path>
            ))}
        </g>
        <g
          pointerEvents="none"
          textAnchor="middle"
          fontSize={10}
          fontFamily="sans-serif"
        >
          {root
            .descendants()
            .filter((d) => d.depth && ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 10)
            .map((d, i) => (
              <text
                key={`${d.data.name}-${i}`}
                transform={getTextTransform(d)}
                dy="0.35em"
              >
                {d.data.name}
              </text>
            ))}
        </g>
      </svg>
      <div>
        <strong>Missing Data (999)</strong>
        <ul>
          {Object.keys(missingData).map((item, index) => {
            return (
              <li key={index}>
                {item}: {missingData[`${item}`]?.length} Records
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
