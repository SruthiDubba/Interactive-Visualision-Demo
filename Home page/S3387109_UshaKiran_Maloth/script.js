// ===== URL PARAM =====
const params = new URLSearchParams(window.location.search)
const stageParam = params.get("stage")

let dataset = []
let selectedStage = "all"
let selectedTreatment = "all"
let compareType = "none"

// ===== PAGE SWITCH =====
if(stageParam){
  document.getElementById("dashboardPage").style.display = "none"
  document.getElementById("stagePage").style.display = "block"
  loadStage(+stageParam)
}else{
  loadDashboard()
}


// ===== DASHBOARD =====
function loadDashboard(){

const svg = d3.select("svg")
const tooltip = d3.select("#tooltip")

d3.csv("survival_summary.csv").then(data=>{

// FORMAT
data.forEach(d=>{
  d.stage = +d.stage
  d.chemo_yes = +d.chemo_yes
  d.chemo_no = +d.chemo_no
  d.overall_mean = +d.overall_mean
})

dataset = data

// KPI
document.getElementById("avgSurvival").innerText =
Math.round(d3.mean(data,d=>d.overall_mean))+" months"

document.getElementById("bestStage").innerText =
"Stage "+data.reduce((a,b)=>a.overall_mean>b.overall_mean?a:b).stage

document.getElementById("stageCount").innerText = data.length

updateChart()

// RADIO LISTENER
document.querySelectorAll('input[name="compare"]').forEach(radio=>{
  radio.addEventListener("change", function(){
    compareType = this.value
    updateChart()
  })
})


// ===== CHART =====
function updateChart(){

svg.selectAll("*").remove()

const width = 500
const height = 250

const chart = svg.append("g")
.attr("transform","translate(60,40)")

let filtered = dataset

// FILTER LOGIC
if(compareType === "1v4"){
  filtered = dataset.filter(d=>d.stage===1 || d.stage===4)
}
else if(compareType === "1v2"){
  filtered = dataset.filter(d=>d.stage===1 || d.stage===2)
}
else if(selectedStage !== "all"){
  filtered = dataset.filter(d=>d.stage==selectedStage)
}

// GROUPS
let groups = ["chemo_yes","chemo_no"]
if(selectedTreatment !== "all"){
  groups = [selectedTreatment]
}

// SCALES
const x0 = d3.scaleBand()
.domain(filtered.map(d=>d.stage))
.range([0,width])
.padding(0.3)

const x1 = d3.scaleBand()
.domain(groups)
.range([0,x0.bandwidth()])
.padding(0.1)

const yMax = d3.max(dataset,d=>Math.max(d.chemo_yes,d.chemo_no))

const y = d3.scaleLinear()
.domain([0,yMax])
.range([height,0])

// GRID
chart.append("g")
.call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
.selectAll("line")
.attr("stroke","#ddd")

// AXES
chart.append("g")
.attr("transform",`translate(0,${height})`)
.call(d3.axisBottom(x0))

chart.append("g").call(d3.axisLeft(y))

// LABELS
chart.append("text")
.attr("x",width/2)
.attr("y",height+35)
.attr("text-anchor","middle")
.text("Tumor Stage")

chart.append("text")
.attr("transform","rotate(-90)")
.attr("x",-height/2)
.attr("y",-45)
.attr("text-anchor","middle")
.text("Average Survival (Months)")

// BARS
const g = chart.selectAll(".g")
.data(filtered)
.enter()
.append("g")
.attr("transform",d=>`translate(${x0(d.stage)},0)`)

g.selectAll("rect")
.data(d=>groups.map(k=>({
  key:k,
  value:d[k],
  stage:d.stage,
  yes:d.chemo_yes,
  no:d.chemo_no
})))
.enter()
.append("rect")
.attr("x",d=>x1(d.key))
.attr("width",x1.bandwidth())
.attr("y",height)
.attr("height",0)
.attr("fill",d=>{

  if(compareType==="1v4" && d.stage===1) return "#43a047"
  if(compareType==="1v4" && d.stage===4) return "#e53935"

  if(compareType==="1v2" && d.stage===1) return "#43a047"
  if(compareType==="1v2" && d.stage===2) return "#e53935"

  return d.key==="chemo_yes" ? "#ad1457" : "#f48fb1"
})
.transition().duration(500)
.attr("y",d=>y(d.value))
.attr("height",d=>height-y(d.value))

// TOOLTIP
g.selectAll("rect")
.on("mouseover",(event,d)=>{

const rect = event.currentTarget.getBoundingClientRect()
const container = document.querySelector(".chart-container").getBoundingClientRect()

const total = d.yes + d.no

tooltip.style("opacity",1)
.html(`
<b>Stage ${d.stage}</b><br>
Chemo: ${Math.round(d.yes)}<br>
No Chemo: ${Math.round(d.no)}
`)
.style("left",(rect.x - container.x + rect.width + 10)+"px")
.style("top",(rect.y - container.y)+"px")

})
.on("mouseout",()=>tooltip.style("opacity",0))
.on("click",(event,d)=>{
  window.location.search="?stage="+d.stage
})

// TREND LINE
const line = d3.line()
.x(d=>x0(d.stage)+x0.bandwidth()/2)
.y(d=>y(d.overall_mean))

chart.append("path")
.datum(filtered)
.attr("fill","none")
.attr("stroke","#333")
.attr("stroke-width",2)
.attr("d",line)

// LEGEND
const legend = chart.append("g")
.attr("transform",`translate(${width+20}, 20)`)

legend.append("rect").attr("width",15).attr("height",15).attr("fill","#ad1457")
legend.append("text").attr("x",20).attr("y",12).text("Chemo")

legend.append("rect").attr("y",25).attr("width",15).attr("height",15).attr("fill","#f48fb1")
legend.append("text").attr("x",20).attr("y",37).text("No Chemo")

legend.append("line")
.attr("x1",0).attr("x2",15)
.attr("y1",55).attr("y2",55)
.attr("stroke","#333")

legend.append("text").attr("x",20).attr("y",60).text("Trend")

// INSIGHT
updateInsight(filtered)

}

// FILTER FUNCTIONS
window.setStage = (s)=>{selectedStage=s; updateChart()}
window.setTreatment = (t)=>{selectedTreatment=t; updateChart()}
window.resetDashboard = ()=>{
  selectedStage="all"
  selectedTreatment="all"
  compareType="none"
  document.querySelector('input[value="none"]').checked = true
  updateChart()
}

})
}


// ===== AUTO INSIGHT =====
function updateInsight(filtered){

const box = document.getElementById("autoInsight")
if(!box) return

const s1 = filtered.find(d=>d.stage===1)
const s2 = filtered.find(d=>d.stage===2)
const s4 = filtered.find(d=>d.stage===4)

let text = ""

if(compareType==="1v4" && s1 && s4){
  text = `Stage 1 lives ${Math.round(s1.overall_mean - s4.overall_mean)} months longer than Stage 4`
}
else if(compareType==="1v2" && s1 && s2){
  text = `Stage 1 lives ${Math.round(s1.overall_mean - s2.overall_mean)} months longer than Stage 2`
}
else{
  text = "Survival decreases as stage increases"
}

box.innerText = text
}


// ===== MODAL =====
function openModal(){
  document.getElementById("modal").style.display="flex"
}

function closeModal(){
  document.getElementById("modal").style.display="none"
}

window.onclick = function(e){
  const modal = document.getElementById("modal")
  if(e.target === modal){
    modal.style.display="none"
  }
}


// ===== STAGE PAGE =====
function loadStage(stage){

document.getElementById("stageTitle").innerText =
"Stage "+stage+" Analysis"

d3.csv("survival_summary.csv").then(data=>{

data.forEach(d=>{
d.stage=+d.stage
d.chemo_yes=+d.chemo_yes
d.chemo_no=+d.chemo_no
})

const d = data.find(x=>x.stage===stage)
if(!d) return

const chemo = d.chemo_yes
const noChemo = d.chemo_no
const gap = Math.abs(noChemo - chemo)
const max = Math.max(chemo,noChemo)

// GAP
d3.select("#gapBar").html("")
d3.select("#gapBar")
.append("div")
.attr("class","bar")
.style("width",(gap/max)*250+"px")
.style("background","#f48fb1")

d3.select("#gapText").html(`<b>${Math.round(gap)} months difference</b>`)
d3.select("#gapPercent").html(`${Math.round((gap/max)*100)}% difference`)

// TREATMENT
const c = d3.select("#compare")
c.html("")

c.append("div").text(`Chemo: ${Math.round(chemo)} months`)
c.append("div")
.attr("class","bar")
.style("width",(chemo/max)*250+"px")
.style("background","#ad1457")

c.append("div").text(`No Chemo: ${Math.round(noChemo)} months`)
c.append("div")
.attr("class","bar")
.style("width",(noChemo/max)*250+"px")
.style("background","#f48fb1")

// RISK
const risk = document.getElementById("riskBox")

if(stage===1){
risk.innerText="Low Risk"
risk.className="low"
}
else if(stage===2){
risk.innerText="Moderate Risk"
risk.className="medium"
}
else{
risk.innerText="High Risk"
risk.className="high"
}

// INSIGHT
let insight = ""
let meaning = ""

if(stage === 1){
  insight = "Patients diagnosed at Stage 1 have the highest survival rates."
  meaning = "Early detection allows effective treatment, leading to significantly better outcomes."
}
else if(stage === 2){
  insight = "Survival begins to decline at Stage 2 compared to early stages."
  meaning = "Cancer progression reduces treatment effectiveness, but outcomes are still manageable."
}
else if(stage === 3){
  insight = "Stage 3 shows a noticeable drop in survival rates."
  meaning = "Advanced progression requires aggressive treatment with reduced success rates."
}
else{
  insight = "Stage 4 has the lowest survival rates among all stages."
  meaning = "Late detection severely limits treatment options, highlighting the need for early screening."
}

document.getElementById("insightText").innerText = insight
document.getElementById("meaningText").innerText = meaning

})
}


// ===== BACK =====
function goBack(){
  window.location.href="index.html"
}