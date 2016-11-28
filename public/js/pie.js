'use strict';

/** Overall radius of the pie chart */
const RADIUS = 200;

/**
 * Draws the line'd legend given a circle path
 * @param {Object} path The circle path
 * @param {Object} arc The circle arc
 * @returns {void}
 */
const drawLegend = ({ path, arc }) => {
  const node = d3.select(path.node().parentNode);
  node.append('svg:circle')
    .attr('class', 'textcircle')
    .attr('r', 4)
    .attr('transform', (d) => {
      d.innerRadius = 0;      // eslint-disable-line no-param-reassign
      d.outerRadius = RADIUS; // eslint-disable-line no-param-reassign
      return `translate(${arc.centroid(d)})`;
    });

  node.append('svg:line')
    .attr('class', 'textline')
    .attr('stroke-width', 2)
    .attr('stroke', 'white')
    .attr('x1', 4)
    .attr('y1', 0)
    .attr('x2', (d) => {
      d.innerRadius = 0;      // eslint-disable-line no-param-reassign
      d.outerRadius = RADIUS; // eslint-disable-line no-param-reassign
      const placement = arc.centroid(d);
      return 320 - placement[0];
    })
    .attr('y2', 0)
    .attr('stroke-linecap', 'round')
    .attr('transform', (d) => {
      d.innerRadius = 0;      // eslint-disable-line no-param-reassign
      d.outerRadius = RADIUS; // eslint-disable-line no-param-reassign
      return `translate(${arc.centroid(d)})`;
    });

  node.append('svg:text')
    .attr('transform', (d) => {
      d.innerRadius = 0;      // eslint-disable-line no-param-reassign
      d.outerRadius = RADIUS; // eslint-disable-line no-param-reassign
      const textPlacement = arc.centroid(d);
      textPlacement[0] += 315 - textPlacement[0];
      textPlacement[1] -= 7;
      return `translate(${textPlacement})`;
    })
    .attr('class', 'title')
    .text(d => d.data.percent);

  node.append('svg:text')
    .attr('transform', (d) => {
      d.innerRadius = 0;      // eslint-disable-line no-param-reassign
      d.outerRadius = RADIUS; // eslint-disable-line no-param-reassign
      const textPlacement = arc.centroid(d);
      textPlacement[0] += 315 - textPlacement[0];
      textPlacement[1] += 20;
      return `translate(${textPlacement})`;
    })
    .attr('class', 'subtitle')
    .text(d => d.data.label);
};

/**
 * Restore everything to full opacity when
 * moving off the visualization.
 * @returns {void}
 */
const mouseleave = () => {
  d3.selectAll('.slice path')
    .style('opacity', 1);
};

/**
 * Called when the mouse is over the circles
 * @param {Object} datum The datum
 * @returns {void}
 */
const mouseover = ({ datum, arc }) => {
  // Fade all the segments.
  const paths = d3.selectAll('.slice path').style('opacity', 0.7);
  const path  = paths.filter(node => node === datum);

  // Remove the other title, text line, and text circle
  d3.selectAll('.title').remove();
  d3.selectAll('.subtitle').remove();
  d3.selectAll('.textline').remove();
  d3.selectAll('.textcircle').remove();

  path.style('opacity', 1);
  drawLegend({ path, arc });
};

/**
 * Adds additional data to the data set such as
 *   - colors
 *   - percentage
 *   - Shadowing
 *   - Transparency
 *   - Scale
 * @param {Array} data The data to augment
 * @returns {Array} The additional data added
 */
const addAdditionalData = ({ data }) => {
  const colors = [
    '#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc',
    '#e5d8bd', '#fddaec', '#f2f2f2', '#b3e2cd', '#fdcdac', '#cbd5e8',
    '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc', '#8dd3c7',
    '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69',
    '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f',
  ];

  // Get the total to get the percent
  const total = data.reduce((accum, { value }) => accum + value, 0);

  // Loop again to compute the colors,
  // percentage, opacity, and deviations
  const newValues = data.slice(0);
  let newI        = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (i > 0) {
      if (data[i].value !== data[i - 1].value) {
        newI += 1;
      }
    }
    const scale  = 1 - (newI * 0.05);
    const bright = ((newI + 1) * 0.3) - 1;
    const dark   = (newI + 0.5) * 0.3;

    let stdDeviation = 5 - (newI * 0.5);
    if (stdDeviation < 1) {
      stdDeviation = 1;
    }
    let matrixOpacity = 0.2 + (newI * 0.06);
    if (matrixOpacity > 0.7) {
      matrixOpacity = 0.7;
    }
    let matrixEndValue = 0.7 - (newI * 0.1);
    if (matrixEndValue < 0.2) {
      matrixEndValue = 0.2;
    }
    // Only add the filter if we are using shadows
    if ($('#scale').is(':checked')) {
      newValues[i].scale = scale;
    } else {
      newValues[i].scale = 1;
    }

    newValues[i].percent = `${Math.round((data[i].value / total) * 100)}%`;

    // Generate a unique key so that every single time a new pie chart is created it's
    // considered new.
    newValues[i].key = Math.random();

    // If they have "colors" checked then use colors, otherwise use white
    let color = colors[i];
    if (!$('#colors').is(':checked')) {
      color = 'white';
    }

    newValues[newValues.length - i - 1].bright = d3.rgb(color).darker(bright).toString();
    newValues[newValues.length - i - 1].dark = d3.rgb(color).darker(dark).toString();
    newValues[newValues.length - i - 1].matrixOpacity = matrixOpacity;
    newValues[newValues.length - i - 1].matrixEndValue = matrixEndValue;
    newValues[i].stdDeviation = stdDeviation;
  }
  return newValues;
};

/**
 * Adds all the circle paths
 * @param {Object} data The data set
 * @param {Object} arc  The arc of the pie
 * @returns {void}
 */
const updatePaths = ({ data, arc }) => {
  data.sort((a, b) => {
    if (a.value < b.value) {
      return -1;
    } else if (a.value > b.value) {
      return 1;
    }
    return 1;
  });

  const pie = d3.layout.pie()
    .value(d => d.value)
    .startAngle(20 * (Math.PI / 180))
    .endAngle(380 * (Math.PI / 180))
    .sort((a, b) => {
      if (a.value < b.value) {
        return -1;
      } else if (a.value > b.value) {
        return 1;
      }
      return 0;
    });

  const vis    = d3.select('.chart').data([data]);
  const slices = vis.select('g').selectAll('.slice').data(pie, ({ data : { key } }) => key);

  slices.exit().remove();

  slices.enter()
    .append('svg:g')
    .attr('class', 'slice');

  const path = slices.append('svg:path')
    .attr('fill', (d, i) => `url(#stairway-pie-defs-cat-${i})`)
    .attr('d', d => arc(d))
    .attr('transform', d => `scale(${d.data.scale})`)
    .on('mouseover', datum => mouseover({ datum, arc }));

  // Only add the filter if we are using shadows
  if ($('#shadows').is(':checked')) {
    path.attr('filter', (d, i) => `url(#stairway-pie-defs-shadow-cat-${i})`);
  }
};

/**
 * Add the gradients to the "def" section
 * @param {Object} data The data set
 * @returns {void}
 */
const addGradients = ({ data }) => {
  const linearGradient =
    d3.select('.chart-defs')
      .selectAll('.chrome-cannot-select-linearGradients')
      .data(data, ({ key }) => key);

  linearGradient.exit().remove();
  linearGradient.enter().append('linearGradient');

  linearGradient
    .attr('id', (d, i) => `stairway-pie-defs-cat-${i}`)
    .attr('class', 'chrome-cannot-select-linearGradients')
    .attr('x1', '0%')
    .attr('y1', '20%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  linearGradient
    .append('stop')
    .attr('offset', '10%')
    .style('stop-color', ({ bright }) => bright)
    .style('stop-opacity', 1);

  linearGradient
    .append('stop')
    .attr('offset', '100%')
    .style('stop-color', ({ dark }) => dark)
    .style('stop-opacity', 1);

  const filter = d3.select('.chart-defs').selectAll('circlefilter')
    .data(data, ({ key }) => key);

  filter.exit().remove();
  filter.enter().append('filter');

  filter.attr('id', (d, i) => `stairway-pie-defs-shadow-cat-${i}`)
  .attr('class', 'circlefilter')
  .attr('x', -1)
  .attr('y', 0)
  .attr('width', '250%')
  .attr('height', '250%');

  filter.append('feOffset')
    .attr('result', 'offOut')
    .attr('in', 'SourceGraphic')
    .attr('dx', 6)
    .attr('dy', 7);

  filter.append('feColorMatrix')
    .attr('result', 'matrixOut')
    .attr('in', 'offOut')
    .attr('type', 'matrix')
    .attr('values', ({ matrixOpacity, matrixEndValue }) =>
      `${matrixOpacity} 0 0 0 0 0 ${matrixOpacity} 0 0 0 0 0 ${matrixOpacity} 0 0 0 0 0 ${matrixEndValue} 0` // eslint-disable-line
    );

  filter.append('feGaussianBlur')
    .attr('result', 'blurOut')
    .attr('in', 'matrixOut')
    .attr('stdDeviation', ({ stdDeviation }) => stdDeviation);

  filter.append('feBlend')
    .attr('in', 'SourceGraphic')
    .attr('in2', 'blurOut')
    .attr('mode', 'normal');
};

/**
 * Sorts the pie data and returns it sorted
 * @param {Object} data The pie data to sort
 * @returns {Object} The pie data sorted
 */
const sortData = ({ data }) => {
  data.sort((a, b) => {
    if (a.value > b.value) {
      return -1;
    } else if (a.value < b.value) {
      return 1;
    }
    return 1;
  });
  return data;
};

/**
 * Function to update the pie chart
 * @param {Object} data The array of data to update the pie chart with
 * @param {Object} arc  The arc of the pie
 * @returns {void}
 */
const updatePieChart = ({ data, arc }) => {
  const sortedData = sortData({ data });
  const augmentedData = addAdditionalData({ data : sortedData });
  addGradients({ data : augmentedData });
  updatePaths({ data : augmentedData, arc });
  const allPaths = d3.selectAll('.slice path');
  drawLegend({ path : d3.select(allPaths[0][allPaths[0].length - 1]), arc });
};

/**
 * Initialize and create the pie chart from the initial data
 * @returns {void}
 */
const init = () => {
  const arc = d3.svg.arc().outerRadius(RADIUS);

  // Margins
  const margin = { top: 20, right: 30, bottom: 30, left: 63 };
  const width  = 800 - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  // create the initial svg area
  const chart = d3.select('.chart')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('svg:g')
    .attr('transform', 'translate(230,200)');

  // Background transparent circle to help with mouse leave
  // events
  chart.append('svg:circle')
    .attr('r', RADIUS)
    .attr('id', 'boundingcircle')
    .style('opacity', 0);

  // Initial data to populate the chart with
  let data = [
    { label: '(John) 95 Units', value: 95 },
    { label: '(Don) 15 Units', value: 15 },
    { label: '(Carl) 84 Units', value: 84 },
    { label: '(Jean) 78 Units', value: 78 },
    { label: '(Evan) 77 Units', value: 77 },
    { label: '(Braden) 76 Units', value: 76 },
    { label: '(Gomo) 40 Units', value: 40 },
  ];
  updatePieChart({ data, arc });

  // Button to update the chart has been clicked
  $('#clickbutton').click(() => {
    const textData = $('#dataarea').val();
    data = jQuery.parseJSON(textData);
    updatePieChart({ data, arc });
  });

  // Add the mouseleave handler to the bounding circle.
  d3.select('#boundingcircle').on('mouseleave', () => mouseleave());
};

// On page load, initialize
window.onload = () => init();

