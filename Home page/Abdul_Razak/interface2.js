// ===== SIZE (PRESENTATION MODE) =====
const width = 620;
const height = 430;
const margin = { top: 45, right: 35, bottom: 55, left: 115 };

// clear
d3.select("#chart").selectAll("*").remove();
d3.select("#pieChart").selectAll("*").remove();

// BAR SVG
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

// PIE SVG
const pieW = 520;
const pieH = 430;
const pieR = Math.min(pieW, pieH) / 2 - 45;

const pieSvg = d3.select("#pieChart")
  .append("svg")
  .attr("width", pieW)
  .attr("height", pieH);

const pieG = pieSvg.append("g")
  .attr("transform", `translate(${pieW / 2},${pieH / 2 + 20})`);

const pie = d3.pie().value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(pieR);

const pieColor = d3.scaleOrdinal()
  .domain(["Low","Medium","High","Unknown"])
  .range(["#bde0fe","#5fa8d3","#1d6fa5","#d9eaf4"]);

const tooltip = d3.select(".tooltip");

function showTooltip(e,t){
  tooltip.style("opacity",1)
    .style("left",e.pageX+10+"px")
    .style("top",e.pageY-30+"px")
    .text(t);
}

function hideTooltip(){
  tooltip.style("opacity",0);
}

function severityBin(v){
  const n = +v;
  if(!Number.isFinite(n)) return "Unknown";
  if(n <= 3) return "Low";
  if(n <= 6) return "Medium";
  return "High";
}

// ===== LOAD DATA =====
d3.csv("../Abdul_Razak/lung_cancer_clean.csv", d3.autoType).then(data => {

  const symptomCols = [
    "All Symptoms",
    "Smoking","Passive Smoker","Chest Pain","Coughing of Blood",
    "Fatigue","Weight Loss","Shortness of Breath","Wheezing",
    "Swallowing Difficulty","Clubbing of Finger Nails",
    "Frequent Cold","Dry Cough","Snoring"
  ];

  const realSymptoms = symptomCols.slice(1);

  d3.select("#symptomSelect")
    .selectAll("option")
    .data(symptomCols)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  d3.select("#totalPatients").text(data.length);

  let selectedLevel = null;
  let selectedSymptom = symptomCols[1];

  function drawPie(){

    const rows = selectedLevel
      ? data.filter(d => d.Level === selectedLevel)
      : data;

    const bins = d3.rollups(rows, v => v.length, d => {
      if(selectedSymptom === "All Symptoms"){
        const avg = d3.mean(realSymptoms, k => +d[k]);
        return severityBin(avg);
      }

      return severityBin(d[selectedSymptom]);
    });

    const order = ["Low","Medium","High","Unknown"];

    const pieData = order.map(k => {
      const f = bins.find(b => b[0] === k);
      return { name:k, value:f ? f[1] : 0 };
    });

    const total = d3.sum(pieData, d => d.value);

    pieSvg.selectAll(".pie-title").remove();

    pieSvg.append("text")
      .attr("class","pie-title")
      .attr("x",pieW / 2)
      .attr("y",24)
      .attr("text-anchor","middle")
      .style("font-size","18px")
      .style("font-weight","bold")
      .text(selectedLevel ? `${selectedSymptom} - ${selectedLevel} Risk` : `${selectedSymptom} - All Risk Groups`);

    const arcs = pieG.selectAll("path")
      .data(pie(pieData), d => d.data.name);

    arcs.exit().remove();

    arcs.join(
      enter => enter.append("path")
        .attr("fill", d => pieColor(d.data.name))
        .each(function(d){ this._current = d; })
        .on("mouseenter", function(e,d){
          const pct = total ? (d.data.value / total * 100).toFixed(1) : 0;
          showTooltip(e, `${d.data.name}: ${d.data.value} patients (${pct}%)`);
        })
        .on("mousemove", function(e,d){
          const pct = total ? (d.data.value / total * 100).toFixed(1) : 0;
          showTooltip(e, `${d.data.name}: ${d.data.value} patients (${pct}%)`);
        })
        .on("mouseleave", hideTooltip)
    )
    .transition()
    .duration(700)
    .attrTween("d", function(d){
      const i = d3.interpolate(this._current, d);
      this._current = i(0);
      return t => arc(i(t));
    });

    const labels = pieG.selectAll("text.percent-label")
      .data(pie(pieData), d => d.data.name);

    labels.enter()
      .append("text")
      .attr("class","percent-label")
      .merge(labels)
      .transition()
      .duration(700)
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor","middle")
      .style("font-size","17px")
      .style("font-weight","bold")
      .style("fill","#16324f")
      .text(d => {
        const pct = total ? (d.data.value / total * 100).toFixed(0) : 0;
        return d.data.value ? pct + "%" : "";
      });

    labels.exit().remove();

    const legend = pieSvg.selectAll("g.legend")
      .data(order);

    legend.exit().remove();

    const legendEnter = legend.enter()
      .append("g")
      .attr("class","legend");

    legendEnter.append("rect")
      .attr("width",14)
      .attr("height",14);

    legendEnter.append("text")
      .attr("x",20)
      .attr("y",12)
      .style("font-size","13px");

    pieSvg.selectAll("g.legend")
      .attr("transform",(d,i)=>`translate(18,${45 + i * 24})`);

    pieSvg.selectAll("g.legend rect")
      .attr("fill",d=>pieColor(d));

    pieSvg.selectAll("g.legend text")
      .text(d=>d);
  }

  function render(){

    const counts = d3.rollups(data, v => v.length, d => d.Level);

    const chartData = counts.map(d => ({
      level:d[0],
      count:d[1]
    }));

    const order = ["Low","Medium","High"];
    chartData.sort((a,b)=>order.indexOf(a.level)-order.indexOf(b.level));

    const x = d3.scaleLinear()
      .domain([0,d3.max(chartData,d=>d.count)])
      .nice()
      .range([0,innerW]);

    const y = d3.scaleBand()
      .domain(chartData.map(d=>d.level))
      .range([0,innerH])
      .padding(0.3);

    g.selectAll(".x")
      .data([0])
      .join("g")
      .attr("class","x")
      .attr("transform",`translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5));

    g.selectAll(".y")
      .data([0])
      .join("g")
      .attr("class","y")
      .call(d3.axisLeft(y));

    const bars = g.selectAll("rect.bar")
      .data(chartData,d=>d.level);

    bars.exit().remove();

    bars.join(
      enter => enter.append("rect")
        .attr("class","bar")
        .attr("x",0)
        .attr("y",d=>y(d.level))
        .attr("height",y.bandwidth())
        .attr("width",0)
    )
    .attr("fill",d=>selectedLevel === d.level ? "#ed62d1" : "#1d6fa5")
    .transition()
    .duration(600)
    .attr("y",d=>y(d.level))
    .attr("height",y.bandwidth())
    .attr("width",d=>x(d.count));

    const labels = g.selectAll(".label")
      .data(chartData,d=>d.level);

    labels.enter()
      .append("text")
      .attr("class","label")
      .merge(labels)
      .transition()
      .duration(600)
      .attr("x",d=>x(d.count)+8)
      .attr("y",d=>y(d.level)+y.bandwidth()/2)
      .attr("dominant-baseline","middle")
      .style("font-size","15px")
      .style("font-weight","bold")
      .text(d=>d.count);

    labels.exit().remove();

    g.selectAll("rect.bar")
      .on("click",(e,d)=>{
        selectedLevel = selectedLevel === d.level ? null : d.level;
        d3.select("#selectedGroup").text(selectedLevel || "All");
        render();
        drawPie();
      })
      .on("mouseenter",(e,d)=>{
        const pct = (d.count / data.length * 100).toFixed(1);
        showTooltip(e,`${d.level}: ${d.count} patients (${pct}%)`);
      })
      .on("mousemove",(e,d)=>{
        const pct = (d.count / data.length * 100).toFixed(1);
        showTooltip(e,`${d.level}: ${d.count} patients (${pct}%)`);
      })
      .on("mouseleave",hideTooltip);

    svg.selectAll(".axis-label").remove();

    svg.append("text")
      .attr("class","axis-label")
      .attr("x",margin.left + innerW / 2)
      .attr("y",height - 10)
      .attr("text-anchor","middle")
      .style("font-size","14px")
      .text("Total Patients");

    svg.append("text")
      .attr("class","axis-label")
      .attr("transform","rotate(-90)")
      .attr("x",-(margin.top + innerH / 2))
      .attr("y",22)
      .attr("text-anchor","middle")
      .style("font-size","14px")
      .text("Risk Category");
  }

  d3.select("#symptomSelect").on("change",function(){
    selectedSymptom = this.value;
    drawPie();
  });

  d3.select("#resetBtn").on("click",()=>{
    selectedLevel = null;
    d3.select("#selectedGroup").text("All");
    render();
    drawPie();
  });

  render();
  drawPie();

});