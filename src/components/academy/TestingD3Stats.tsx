import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { TimePerQuestion, ScoreDistribution } from "@/lib/testingApi";

interface StatsProps {
  timePerQuestion: TimePerQuestion[];
  scoreDistribution: ScoreDistribution[];
}

export function TestingD3Stats({ timePerQuestion, scoreDistribution }: StatsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow">
        <h4 className="font-mono text-xs text-gold uppercase tracking-wider mb-4 border-b border-tactical-border pb-2">
          Время ответа (сек)
        </h4>
        <TimePerQuestionChart data={timePerQuestion} />
      </div>

      <div className="corner-mark bg-tactical-card border border-tactical-border p-4 card-glow">
        <h4 className="font-mono text-xs text-gold uppercase tracking-wider mb-4 border-b border-tactical-border pb-2">
          Распределение баллов
        </h4>
        <ScoreDistributionChart data={scoreDistribution} />
      </div>
    </div>
  );
}

function TimePerQuestionChart({ data }: { data: TimePerQuestion[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    d3.select(containerRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Translation dictionary for types
    const typeLabels: Record<string, string> = {
      choice: "Базовый",
      multichoice: "Выбор+",
      matching: "Сетка",
      essay: "Эссе"
    };

    // X Scale (Question types)
    const x = d3
      .scaleBand()
      .domain(data.map((d) => typeLabels[d.type] || d.type))
      .range([0, width])
      .padding(0.4);

    // Y Scale (Average time in seconds)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.avg_time_seconds) || 60])
      .nice()
      .range([height, 0]);

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .call((g) => g.select(".domain").attr("stroke", "rgba(255, 255, 255, 0.1)"))
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) =>
        g.selectAll(".tick text").attr("fill", "rgba(255, 255, 255, 0.6)").style("font-family", "monospace")
      );

    // Y Axis
    svg
      .append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", "rgba(255, 255, 255, 0.05)")
      )
      .call((g) =>
        g.selectAll(".tick text").attr("fill", "rgba(255, 255, 255, 0.5)").style("font-family", "monospace")
      );

    // Draw vertical bars
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "yellow-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(234, 179, 8, 0.2)");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(234, 179, 8, 0.8)");

    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(typeLabels[d.type] || d.type) || 0)
      .attr("y", height) // Start at bottom for grow animation
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", "url(#yellow-gradient)")
      .attr("stroke", "rgba(234, 179, 8, 0.5)")
      .attr("stroke-width", 1)
      .transition()
      .duration(800)
      .attr("y", (d) => y(d.avg_time_seconds))
      .attr("height", (d) => height - y(d.avg_time_seconds));

    // Draw value labels above bars
    svg
      .selectAll(".value-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", (d) => (x(typeLabels[d.type] || d.type) || 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.avg_time_seconds) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(234, 179, 8, 1)")
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .text((d) => `${Math.round(d.avg_time_seconds)}с`);
  }, [data]);

  return <div ref={containerRef} className="w-full h-[240px]" />;
}

function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    d3.select(containerRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = 240;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal<string>()
      .domain(data.map((d) => d.bucket))
      .range([
        "rgba(239, 68, 68, 0.6)",   // Red (0-20%)
        "rgba(249, 115, 22, 0.6)",  // Orange (21-40%)
        "rgba(234, 179, 8, 0.6)",   // Yellow (41-60%)
        "rgba(34, 197, 94, 0.6)",   // Green (61-80%)
        "rgba(59, 130, 246, 0.6)"   // Blue (81-100%)
      ]);

    const pie = d3
      .pie<ScoreDistribution>()
      .value((d) => d.count)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<ScoreDistribution>>()
      .innerRadius(radius * 0.5) // Donut chart
      .outerRadius(radius);

    const outerArc = d3
      .arc<d3.PieArcDatum<ScoreDistribution>>()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    const arcs = svg
      .selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Add path with slice animation
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.bucket))
      .attr("stroke", "#0e1520")
      .attr("stroke-width", 2)
      .transition()
      .duration(800)
      .attrTween("d", function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t)) || "";
        };
      });

    // Add labels on tick lines if count > 0
    arcs
      .filter((d) => d.data.count > 0)
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .text((d) => `${d.data.count}`);

    // Simple legend below or overlay
    // For space reasons, we add small text pointers
    arcs
      .filter((d) => d.data.count > 0)
      .append("text")
      .attr("transform", (d) => {
        const pos = outerArc.centroid(d);
        pos[0] = radius * (midAngle(d) < Math.PI ? 1.05 : -1.05);
        return `translate(${pos})`;
      })
      .attr("text-anchor", (d) => (midAngle(d) < Math.PI ? "start" : "end"))
      .attr("fill", "rgba(255,255,255,0.7)")
      .style("font-size", "9px")
      .style("font-family", "monospace")
      .text((d) => d.data.bucket);
      
    function midAngle(d: d3.PieArcDatum<any>) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }
  }, [data]);

  return <div ref={containerRef} className="w-full h-[240px]" />;
}
