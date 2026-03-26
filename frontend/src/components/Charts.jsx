import React, { useRef, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const MONO   = "'Geist Mono','Fira Code',ui-monospace,monospace";
const BG     = '#0D1424';
const BORDER = '#1F2D45';
const MUTED  = '#64748B';

const TOOLTIP_BASE = {
  backgroundColor: '#0D1424',
  borderColor: '#1F2D45',
  borderWidth: 1,
  titleColor: '#F1F5F9',
  bodyColor: '#64748B',
  titleFont: { size: 12, family: MONO, weight: '600' },
  bodyFont:  { size: 12, family: MONO },
  padding: 14,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 5,
};

const LEGEND_BASE = {
  labels: {
    color: MUTED,
    font: { size: 11, family: MONO },
    usePointStyle: true,
    pointStyleWidth: 10,
    padding: 20,
  },
};

const AXES_BASE = {
  x: {
    grid: { display: false },
    border: { display: false },
    ticks: { color: MUTED, font: { size: 11, family: MONO }, padding: 8 },
  },
  y: {
    beginAtZero: true,
    grid: { color: BORDER, drawBorder: false },
    border: { display: false },
    ticks: { color: MUTED, font: { size: 11, family: MONO }, padding: 8 },
  },
};

/* ── Bar chart (Error Magnitude) ─────────────────────── */
export const ErrorBarChart = ({ results }) => {
  if (!results?.length) return null;
  const labels = results.map(r => `S${String(r.id).padStart(2,'0')}`);

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: 'AI Error',
            data: results.map(r => r.AIError),
            backgroundColor: 'rgba(59,130,246,0.75)',
            hoverBackgroundColor: '#3B82F6',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Human Error',
            data: results.map(r => r.HumanError),
            backgroundColor: 'rgba(244,63,94,0.65)',
            hoverBackgroundColor: '#F43F5E',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: LEGEND_BASE, tooltip: TOOLTIP_BASE },
        scales: AXES_BASE,
      }}
    />
  );
};

/* ── Line chart (Predictions vs Actual) ──────────────── */
export const PredictionsLineChart = ({ results }) => {
  const ref = useRef(null);

  if (!results?.length) return null;
  const labels = results.map(r => `S${String(r.id).padStart(2,'0')}`);

  // Gradient fill for AI teal line
  const getGradient = (ctx, chartArea) => {
    if (!chartArea) return 'rgba(6,182,212,0.15)';
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(6,182,212,0.22)');
    g.addColorStop(1, 'rgba(6,182,212,0)');
    return g;
  };

  return (
    <Line
      ref={ref}
      data={{
        labels,
        datasets: [
          {
            label: 'Actual',
            data: results.map(r => r.Actual),
            borderColor: '#F1F5F9',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#F1F5F9',
            pointBorderColor: '#0D1424',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2.5,
          },
          {
            label: 'AI Prediction',
            data: results.map(r => r.AIPred),
            borderColor: '#06B6D4',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: c, chartArea } = chart;
              return getGradient(c, chartArea);
            },
            fill: true,
            pointBackgroundColor: '#06B6D4',
            pointBorderColor: '#0D1424',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
          },
          {
            label: 'Human Prediction',
            data: results.map(r => r.HumanPred),
            borderColor: '#F43F5E',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#F43F5E',
            pointBorderColor: '#0D1424',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: LEGEND_BASE, tooltip: TOOLTIP_BASE },
        scales: AXES_BASE,
      }}
    />
  );
};
