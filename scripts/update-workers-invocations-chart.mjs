import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const README_PATH = path.join(REPO_ROOT, 'README.md');
const OUTPUT_DIR = path.join(REPO_ROOT, 'assets', 'analytics');
const CHART_PATH = path.join(OUTPUT_DIR, 'workers-invocations.png');
const DATA_PATH = path.join(OUTPUT_DIR, 'workers-invocations.json');

const README_START = '<!-- WORKERS_INVOCATIONS_CHART:START -->';
const README_END = '<!-- WORKERS_INVOCATIONS_CHART:END -->';

const DAYS = Number(process.env.WORKERS_CHART_DAYS ?? '30');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SCRIPT_NAME = process.env.CF_WORKER_SCRIPT_NAME ?? 'daiso-mcp';

if (!ACCOUNT_ID || !API_TOKEN) {
  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN 환경 변수가 필요합니다.',
  );
}

if (!Number.isInteger(DAYS) || DAYS < 7 || DAYS > 90) {
  throw new Error('WORKERS_CHART_DAYS는 7~90 범위의 정수여야 합니다.');
}

function formatKstDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatKstDateTime(date) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} KST`;
}

function buildKstDateRange(days, now = new Date()) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    list.push(formatKstDate(date));
  }
  return list;
}

function formatNumber(value) {
  return Number(value).toLocaleString('ko-KR');
}

async function fetchWorkerInvocations({ accountId, apiToken, scriptName, days }) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const query = `
    query WorkerInvocations($accountTag: string, $scriptName: string, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            limit: 10000
            filter: { scriptName: $scriptName, datetime_geq: $start, datetime_lt: $end }
          ) {
            dimensions {
              datetime
            }
            sum {
              requests
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        scriptName,
        start: start.toISOString(),
        end: now.toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare GraphQL 호출 실패: ${response.status} ${body}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`Cloudflare GraphQL 오류: ${JSON.stringify(payload.errors)}`);
  }

  const rows = payload?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive;
  if (!Array.isArray(rows)) {
    throw new Error('Cloudflare 응답에서 workersInvocationsAdaptive 데이터를 찾지 못했습니다.');
  }

  return rows;
}

function aggregateByKstDate(rows, days) {
  const dateRange = buildKstDateRange(days);
  const map = new Map(dateRange.map((date) => [date, 0]));

  for (const row of rows) {
    const datetime = row?.dimensions?.datetime;
    const requests = Number(row?.sum?.requests ?? 0);
    if (!datetime || Number.isNaN(requests)) {
      continue;
    }

    const dateKey = formatKstDate(new Date(datetime));
    if (map.has(dateKey)) {
      map.set(dateKey, map.get(dateKey) + requests);
    }
  }

  return Array.from(map.entries()).map(([date, requests]) => ({ date, requests }));
}

async function renderChart(points) {
  const width = 1400;
  const height = 560;

  const canvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: '#ffffff',
    chartCallback: (ChartJS) => {
      ChartJS.register(ChartDataLabels);
    },
  });

  const labels = points.map((point) => point.date.slice(5));
  const values = points.map((point) => point.requests);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '호출 수',
          data: values,
          borderColor: '#f48120',
          backgroundColor: 'rgba(244,129,32,0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.25,
          pointRadius: 2.5,
          pointHoverRadius: 3,
        },
      ],
    },
    options: {
      responsive: false,
      layout: {
        padding: {
          top: 28,
          right: 16,
          left: 8,
          bottom: 8,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        datalabels: {
          display: true,
          color: '#7a4a1f',
          anchor: 'end',
          align: 'top',
          offset: 2,
          clamp: true,
          formatter(value) {
            return formatNumber(value);
          },
          font: {
            size: 10,
            weight: 'bold',
          },
        },
        title: {
          display: true,
          text: `Cloudflare Workers 호출량 (최근 ${DAYS}일)`,
          color: '#111111',
          font: {
            size: 20,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: false,
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatNumber(value);
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
  };

  return canvas.renderToBuffer(configuration);
}

function buildReadmeSection({ scriptName, updatedAt, days, total, average, peak }) {
  return [
    README_START,
    '<br>',
    '',
    `<h3>Cloudflare Workers 호출량 (최근 ${days}일)</h3>`,
    '',
    `<img src="./assets/analytics/workers-invocations.png" alt="Cloudflare Workers 호출량 그래프 (최근 ${days}일)" width="860">`,
    '',
    `<p><strong>전체 호출량:</strong> ${formatNumber(total)}회 · <strong>일평균:</strong> ${formatNumber(average)}회 · <strong>최대:</strong> ${formatNumber(peak.requests)}회 (${peak.date.slice(5)})</p>`,
    '',
    `<sub>기준 워커: <code>${scriptName}</code> · 마지막 갱신: ${updatedAt}</sub>`,
    '',
    README_END,
  ].join('\n');
}

async function updateReadme(section) {
  const readme = await fs.readFile(README_PATH, 'utf8');
  const pattern = new RegExp(`${README_START}[\\s\\S]*?${README_END}`, 'm');

  const next = pattern.test(readme)
    ? readme.replace(pattern, section)
    : readme.replace('</div>', `${section}\n\n</div>`);

  await fs.writeFile(README_PATH, next, 'utf8');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const rows = await fetchWorkerInvocations({
    accountId: ACCOUNT_ID,
    apiToken: API_TOKEN,
    scriptName: SCRIPT_NAME,
    days: DAYS,
  });

  const points = aggregateByKstDate(rows, DAYS);
  const chartBuffer = await renderChart(points);
  await fs.writeFile(CHART_PATH, chartBuffer);
  const total = points.reduce((sum, point) => sum + point.requests, 0);
  const average = Math.round(total / DAYS);
  const peak = points.reduce(
    (max, point) => (point.requests > max.requests ? point : max),
    points[0] ?? { date: formatKstDate(new Date()), requests: 0 },
  );

  const summary = {
    scriptName: SCRIPT_NAME,
    timezone: 'Asia/Seoul',
    days: DAYS,
    updatedAt: new Date().toISOString(),
    total,
    average,
    peak,
    points,
  };

  await fs.writeFile(DATA_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const section = buildReadmeSection({
    scriptName: SCRIPT_NAME,
    updatedAt: formatKstDateTime(new Date()),
    days: DAYS,
    total,
    average,
    peak,
  });
  await updateReadme(section);

  // GitHub Actions 로그에서 빠르게 확인할 수 있도록 요약을 남깁니다.
  console.log(
    `[workers-chart] script=${SCRIPT_NAME} days=${DAYS} total=${summary.total.toLocaleString('ko-KR')}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
