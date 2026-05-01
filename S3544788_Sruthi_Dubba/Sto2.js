const svg = d3.select("#chart2"),
      margin = { top: 30, right: 50, bottom: 85, left: 80 },
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");

const params = new URLSearchParams(window.location.search);
const selectedSize = +params.get("size");

d3.csv("cleaned_data.csv").then(data => {

    data.forEach(d => {
        d.tumor_size = +d.tumor_size;
        d.overall_survival_months = +d.overall_survival_months;
    });

    const bins = d3.bin()
        .value(d => d.tumor_size)
        .thresholds(5)(data);

    const binData = bins
        .filter(bin => bin.length > 0)
        .map(bin => {
            return {
                x0: bin.x0,
                x1: bin.x1,
                range: `${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)} cm`,
                avgSurvival: Math.round(d3.mean(bin, d => d.overall_survival_months))
            };
        });

    const selectedBin = binData.find(b =>
        selectedSize >= b.x0 && selectedSize < b.x1
    );

    const x = d3.scaleBand()
        .domain(binData.map(d => d.range))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(binData, d => d.avgSurvival)])
        .nice()
        .range([height, 0]);

    // X Axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px");

    // Y Axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

    // X Axis Label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Tumor Size (cm)");

    // Y Axis Label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Average Survival Months");

    // Bars
    g.selectAll("rect")
        .data(binData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.range))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", d =>
            selectedBin && d.range === selectedBin.range
                ? "#9b0056"
                : "#f48fb1"
        )
        .attr("opacity", 0.9)
        .transition()
        .duration(900)
        .attr("y", d => y(d.avgSurvival))
        .attr("height", d => height - y(d.avgSurvival));

    // Labels on bars
    g.selectAll(".bar-label")
        .data(binData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.range) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgSurvival) - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", "#7a0177")
        .text(d => d.avgSurvival + "m");

    // Tooltip
    g.selectAll("rect")
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(
                    `Size Range: ${d.range}<br>
                     Average Survival: ${d.avgSurvival} months`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

});

// Modal logic
const modal = document.getElementById("aboutModal");
const btn = document.getElementById("aboutBtn");
const closeBtn = document.getElementById("closeModal");

btn.onclick = function() {
    modal.style.display = "block";
};

closeBtn.onclick = function() {
    modal.style.display = "none";
};

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};