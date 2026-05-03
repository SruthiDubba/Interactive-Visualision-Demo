const svg = d3.select("#chart"),
     margin = { top: 8, right: 100, bottom: 75, left: 70 };
      
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g")
.attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");

const ageFilter = d3.select("#ageFilter");
const colorMode = d3.select("#colorMode");

d3.csv("cleaned_data.csv").then(data => {

data.forEach(d => {
    d.age_at_diagnosis = +d.age_at_diagnosis;
    d.tumor_size = +d.tumor_size;
    d.overall_survival_months = +d.overall_survival_months;

    let stage = String(d.tumor_stage).trim().toLowerCase();

    if (stage.includes("1") || stage.includes("i")) d.tumor_stage = "Stage 1";
    if (stage.includes("2") || stage.includes("ii")) d.tumor_stage = "Stage 2";
    if (stage.includes("3") || stage.includes("iii")) d.tumor_stage = "Stage 3";
    if (stage.includes("4") || stage.includes("iv")) d.tumor_stage = "Stage 4";

    d.Age_Group = String(d.Age_Group).trim();
});

/* AGE FILTER OPTIONS */

const ageGroups = [...new Set(data.map(d => d.Age_Group))];

ageGroups.forEach(group => {
ageFilter.append("option")
.attr("value", group)
.text(group);
});



/* SCALES */

const x = d3.scaleLinear()
.domain(d3.extent(data, d => d.age_at_diagnosis))
.nice()
.range([0, width]);

const y = d3.scaleLinear()
.domain(d3.extent(data, d => d.overall_survival_months))
.nice()
.range([height, 0]);

const sizeScale = d3.scaleLinear()
.domain(d3.extent(data, d => d.tumor_size))
.range([4, 16]);


/* TUMOR STAGE COLORS */

const colorScale = d3.scaleOrdinal()
.domain(["Stage 1", "Stage 2", "Stage 3", "Stage 4"])
.range(["#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"]);


/* AGE GROUP COLORS */

const ageColor = d3.scaleOrdinal()
.domain(["<40","40-50","50-60","60-70","70+"])
.range([
"#d5abcd",
"#7d1d68",
"#967592",
"#774469",
"#60344d"
]);


/* AXES */

g.append("g")
.attr("transform", `translate(0,${height})`)
.call(d3.axisBottom(x));

g.append("g")
.call(d3.axisLeft(y));



// X-axis label (below the chart)
g.append("text")
  .attr("x", width / 2)
  .attr("y", height + 50)
  .attr("text-anchor", "middle")
  .attr("font-size", "18px")
  .attr("font-weight", "bold")
  .attr("fill", "black")
  .text("Age at Diagnosis");

g.append("g")
.attr("class","grid")
.attr("transform",`translate(0,${height})`)
.call(
d3.axisBottom(x)
.tickSize(-height)
.tickFormat("")
);

// Y-axis label (rotated left)
g.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -50)  // 60px left of chart
  .attr("text-anchor", "middle")
  .attr("font-size", "18px")
  .attr("fill", "black")
  .text("Survival Months");

  g.append("g")
  .attr("class","grid")
  .call(
  d3.axisLeft(y)
  .tickSize(-width)
  .tickFormat("")
);

/* UPDATE CHART FUNCTION */

function updateChart(){

  

let filteredData = data.filter(d =>
    activeStages.has(d.tumor_stage)
);

// Apply Age filter ONLY if not "All"
if (ageFilter.node().value !== "All") {
    filteredData = filteredData.filter(d =>
        d.Age_Group === ageFilter.node().value
    );
}

const circles = g.selectAll("circle")
.data(filteredData);


d3.selectAll(".legend-item")
.on("click", function(){

const stage = this.dataset.stage;

if(activeStages.has(stage)){
activeStages.delete(stage);
d3.select(this).classed("off", true);
}else{
activeStages.add(stage);
d3.select(this).classed("off", false);
}

updateChart();

});



/* ENTER + UPDATE */

circles.enter()
.append("circle")
.merge(circles)
.transition()
.duration(800)
.attr("cx", d => x(d.age_at_diagnosis))
.attr("cy", d => y(d.overall_survival_months))
.attr("r", d => sizeScale(d.tumor_size))

.attr("fill", d => {

if(colorMode.node().value === "stage"){
return colorScale(d.tumor_stage);
}

else{

if(d.age_at_diagnosis < 40) return ageColor("<40");
if(d.age_at_diagnosis < 50) return ageColor("40-50");
if(d.age_at_diagnosis < 60) return ageColor("50-60");
if(d.age_at_diagnosis < 70) return ageColor("60-70");

return ageColor("70+");

}

})

.attr("opacity",0.8)
.style("cursor","pointer");


// REMOVE old trendline
g.selectAll(".trend-line").remove();

// X and Y values
const xVals = filteredData.map(d => d.age_at_diagnosis);
const yVals = filteredData.map(d => d.overall_survival_months);

const n = xVals.length;

const meanX = d3.mean(xVals);
const meanY = d3.mean(yVals);

// Calculate slope + intercept
let num = 0;
let den = 0;

for(let i=0; i<n; i++){
num += (xVals[i]-meanX)*(yVals[i]-meanY);
den += (xVals[i]-meanX)*(xVals[i]-meanX);
}

const slope = num / den;
const intercept = meanY - slope * meanX;

// line points
const x1 = d3.min(xVals);
const y1 = slope * x1 + intercept;

const x2 = d3.max(xVals);
const y2 = slope * x2 + intercept;

// draw line
g.append("line")
.attr("class","trend-line")
.attr("x1", x(x1))
.attr("y1", y(y1))
.attr("x2", x(x2))
.attr("y2", y(y2))
.attr("stroke","#4a0040")
.attr("stroke-width",3)
.attr("stroke-dasharray","6,4");

// Correlation
let sumXY = 0, sumXX = 0, sumYY = 0;

for(let i=0;i<n;i++){
sumXY += (xVals[i]-meanX)*(yVals[i]-meanY);
sumXX += (xVals[i]-meanX)**2;
sumYY += (yVals[i]-meanY)**2;
}

const r = sumXY / Math.sqrt(sumXX * sumYY);

d3.select("#correlationText")
.text(`Correlation (Age vs Survival): ${r.toFixed(2)}`);
/* REMOVE OLD POINTS */

circles.exit().remove();


/* TOOLTIP + CLICK */

g.selectAll("circle")

.on("mouseover", function(event,d){

tooltip.style("opacity",1)

.html(
`Age: ${Math.round(d.age_at_diagnosis)}<br>
Stage: ${d.tumor_stage}<br>
Tumor Size: ${Math.round(d.tumor_size)} cm<br>
Survival: ${Math.round(d.overall_survival_months)} months`
)

.style("left",(event.pageX+15)+"px")
.style("top",(event.pageY-28)+"px");

})

.on("mouseout", () => tooltip.style("opacity",0))

.on("click",(event,d)=>{

window.location.href =
`Sto2.html?size=${d.tumor_size}`;

});

d3.select("#kpiPatients")
.text(filteredData.length);

d3.select("#kpiSurvival")
.text(
Math.round(
d3.mean(filteredData, d => d.overall_survival_months)
) + " m"
);

d3.select("#kpiTumor")
.text(
Math.round(
d3.mean(filteredData, d => d.tumor_size)
) + " cm"
);

// Most common stage
const stageCounts = d3.rollup(
filteredData,
v => v.length,
d => d.tumor_stage
);

let topStage = "-";
let max = 0;

stageCounts.forEach((value,key)=>{
if(value > max){
max = value;
topStage = key;
}
});

d3.select("#kpiStage").text(topStage);

}


/* FILTER EVENTS */

ageFilter.on("change",updateChart);
colorMode.on("change",updateChart);

updateChart();

});

let activeStages = new Set([
"Stage 1",
"Stage 2",
"Stage 3",
"Stage 4"
]);


/* MODAL */

/* MODAL */

const modal = document.getElementById("projectModal");
const btn = document.getElementById("infoBtn");
const closeBtn = document.getElementById("closeModal");

btn.onclick = function () {
modal.style.display = "block";
}

closeBtn.onclick = function () {
modal.style.display = "none";
}

window.onclick = function (event) {
if (event.target == modal) {
modal.style.display = "none";
}
}
