// Dataset: lung_cancer_clean.csv
// Chart 3: Age Group vs Cancer Risk
// Chart 4: Cause Ranking for High Risk Patients

const tooltip = d3.select(".tooltip");

function showTooltip(e, t){
  tooltip.style("opacity", 1)
    .style("left", e.pageX + 10 + "px")
    .style("top", e.pageY - 30 + "px")
    .text(t);
}

function hideTooltip(){
  tooltip.style("opacity", 0);
}

function ageGroup(age){
  const a = +age;

  if(a < 25) return "Under 25";
  if(a <= 35) return "25 - 35";
  if(a <= 45) return "36 - 45";
  if(a <= 55) return "46 - 55";
  return "56+";
}

d3.select("#ageChart").selectAll("*").remove();
d3.select("#causeChart").selectAll("*").remove();

d3.csv("../Ziad_Arif/lung_cancer_clean.csv", d3.autoType).then(data => {

  const cleanData = data
    .map(d => ({
      Age: +d.Age,
      Level: (d.Level || "").toString().trim(),

      Smoking: +d.Smoking,
      PassiveSmoker: +d["Passive Smoker"],
      AirPollution: +d["Air Pollution"],
      AlcoholUse: +d["Alcohol use"],
      DustAllergy: +d["Dust Allergy"],
      OccupationalHazards: +d["Occupational Hazards"],
      GeneticRisk: +d["Genetic Risk"],
      Obesity: +d.Obesity,
      ChronicLungDisease: +d["chronic Lung Disease"],
      BalancedDiet: +d["Balanced Diet"]
    }))
    .filter(d => d.Level !== "" && Number.isFinite(d.Age));

  d3.select("#totalPatients").text(cleanData.length);

  let selectedAgeGroup = null;

  drawAgeChart();
  drawCauseChart();

  d3.select("#resetBtn").on("click", () => {
    selectedAgeGroup = null;
    d3.select("#selectedAge").text("All");
    drawAgeChart();
    drawCauseChart();
  });

  function drawAgeChart(){

    d3.select("#ageChart").selectAll("*").remove();

    const width = 620;
    const height = 430;
    const margin = { top: 45, right: 120, bottom: 70, left: 70 };

    const svg = d3.select("#ageChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const ageGroups = ["Under 25", "25 - 35", "36 - 45", "46 - 55", "56+"];
    const riskLevels = ["Low", "Medium", "High"];

    const chartData = [];

    ageGroups.forEach(group => {
      riskLevels.forEach(risk => {
        const count = cleanData.filter(d =>
          ageGroup(d.Age) === group && d.Level === risk
        ).length;

        chartData.push({
          ageGroup: group,
          risk: risk,
          count: count
        });
      });
    });

    const x0 = d3.scaleBand()
      .domain(ageGroups)
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const x1 = d3.scaleBand()
      .domain(riskLevels)
      .range([0, x0.bandwidth()])
      .padding(0.08);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
      .domain(riskLevels)
      .range(["#bde0fe", "#5fa8d3", "#1d6fa5"]);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Age Group vs Lung Cancer Risk");

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    const groups = svg.selectAll(".age-group")
      .data(ageGroups)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${x0(d)},0)`);

    groups.selectAll("rect")
      .data(group => chartData.filter(d => d.ageGroup === group))
      .enter()
      .append("rect")
      .attr("x", d => x1(d.risk))
      .attr("y", d => y(d.count))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", d => {
        if(selectedAgeGroup && selectedAgeGroup !== d.ageGroup) return "#cfd8dc";
        return color(d.risk);
      })
      .style("cursor", "pointer")
      .on("click", function(e, d){
        selectedAgeGroup = selectedAgeGroup === d.ageGroup ? null : d.ageGroup;
        d3.select("#selectedAge").text(selectedAgeGroup || "All");
        drawAgeChart();
        drawCauseChart();
      })
      .on("mouseenter", function(e, d){
        showTooltip(e, `${d.ageGroup}, ${d.risk} Risk: ${d.count} patients`);
      })
      .on("mousemove", function(e, d){
        showTooltip(e, `${d.ageGroup}, ${d.risk} Risk: ${d.count} patients`);
      })
      .on("mouseleave", hideTooltip);

    const legend = svg.selectAll(".age-legend")
      .data(riskLevels)
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${width - 100}, ${55 + i * 24})`);

    legend.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", d => color(d));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "13px")
      .text(d => d);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 18)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Age Group");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Number of Patients");
  }

  function drawCauseChart(){

    d3.select("#causeChart").selectAll("*").remove();

    const width = 620;
    const height = 430;
    const margin = { top: 45, right: 40, bottom: 55, left: 170 };

    const svg = d3.select("#causeChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const rows = selectedAgeGroup
      ? cleanData.filter(d => ageGroup(d.Age) === selectedAgeGroup && d.Level === "High")
      : cleanData.filter(d => d.Level === "High");

    const causes = [
      { name: "Smoking", key: "Smoking" },
      { name: "Passive Smoker", key: "PassiveSmoker" },
      { name: "Air Pollution", key: "AirPollution" },
      { name: "Alcohol Use", key: "AlcoholUse" },
      { name: "Dust Allergy", key: "DustAllergy" },
      { name: "Occupational Hazards", key: "OccupationalHazards" },
      { name: "Genetic Risk", key: "GeneticRisk" },
      { name: "Obesity", key: "Obesity" },
      { name: "Chronic Lung Disease", key: "ChronicLungDisease" },
      { name: "Balanced Diet", key: "BalancedDiet" }
    ];

    const causeData = causes.map(c => ({
      name: c.name,
      value: d3.mean(rows, d => d[c.key]) || 0
    }))
    .sort((a, b) => d3.descending(a.value, b.value));

    const x = d3.scaleLinear()
      .domain([0, d3.max(causeData, d => d.value)])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(causeData.map(d => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(selectedAgeGroup ? `High Risk Causes (${selectedAgeGroup})` : "High Risk Cause Ranking");

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.selectAll("rect")
      .data(causeData)
      .enter()
      .append("rect")
      .attr("x", margin.left)
      .attr("y", d => y(d.name))
      .attr("width", d => x(d.value) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#1d6fa5")
      .on("mouseenter", function(e, d){
        showTooltip(e, `${d.name}: ${d.value.toFixed(2)} average score`);
      })
      .on("mousemove", function(e, d){
        showTooltip(e, `${d.name}: ${d.value.toFixed(2)} average score`);
      })
      .on("mouseleave", hideTooltip);

    svg.selectAll(".cause-label")
      .data(causeData)
      .enter()
      .append("text")
      .attr("class", "cause-label")
      .attr("x", d => x(d.value) + 6)
      .attr("y", d => y(d.name) + y.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .text(d => d.value.toFixed(1));

    svg.append("text")
      .attr("x", margin.left + (width - margin.left - margin.right) / 2)
      .attr("y", height - 14)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Average Score Among High Risk Patients");
  }

});
